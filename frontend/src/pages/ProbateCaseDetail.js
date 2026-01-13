import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { masterListApi, caseContactsApi, assetsDebtsApi, tasksApi, datesDeadlinesApi, mailApi, documentsApi, callLogApi, taskDatesApi, webhooksApi, judgeApi, filesApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { ArrowLeft, Loader2, User, Phone, Mail, MapPin, Calendar, FileText, DollarSign, Gavel, Edit2, Check, X, Users, Clock, Paperclip, PhoneCall, Plus, ChevronDown, Circle, AlertCircle, FolderOpen, ClipboardList, StickyNote, ExternalLink, Send, CheckCircle, Link2, Search, Video, BookOpen, Upload, Trash2, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ProbateCaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState(null);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Action button states
  const [sendingQuestionnaire, setSendingQuestionnaire] = useState(false);
  const [completingCase, setCompletingCase] = useState(false);
  const [showLinkJudgeModal, setShowLinkJudgeModal] = useState(false);
  const [linkingJudge, setLinkingJudge] = useState(false);
  const [judges, setJudges] = useState([]);
  const [selectedJudge, setSelectedJudge] = useState('');
  const [judgeSearchQuery, setJudgeSearchQuery] = useState('');

  // Related data
  const [contacts, setContacts] = useState([]);
  const [assetsDebts, setAssetsDebts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [mails, setMails] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [callLog, setCallLog] = useState([]);

  // Modal states
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showMailModal, setShowMailModal] = useState(false);
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [addingRecord, setAddingRecord] = useState(false);
  const [savingTask, setSavingTask] = useState(null);
  const [taskDates, setTaskDates] = useState({});
  const [savingStage, setSavingStage] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  
  // Detail view modals
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedDeadline, setSelectedDeadline] = useState(null);
  const [selectedAssetDebt, setSelectedAssetDebt] = useState(null);

  useEffect(() => {
    fetchData();
    fetchJudges();
  }, [id]);

  const fetchJudges = async () => {
    try {
      const response = await judgeApi.getAll();
      // Backend returns { judges: [...] } with direct properties, not Airtable record format
      setJudges(response.data.judges || []);
    } catch (error) {
      console.error('Failed to fetch judges:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // First fetch the main record
      const recordRes = await masterListApi.getOne(id);
      const recordData = recordRes.data;
      setRecord(recordData);
      
      const fields = recordData.fields || {};
      
      // Get linked record IDs from the master record
      const linkedDeadlineIds = fields['Dates & Deadlines'] || [];
      const linkedTaskIds = fields['Task List'] || [];
      const linkedDocIds = fields['Documents'] || [];
      const linkedContactIds = fields['Case Contacts'] || fields['Heirs 3'] || [];
      
      // Fetch linked records using their IDs
      const fetchPromises = [];
      
      // Assets & Debts - fetch by case_id directly (not by linked IDs) to get all including newly created
      fetchPromises.push(
        assetsDebtsApi.getByCase(id).catch(() => ({ data: { records: [] } }))
      );
      
      // Call Log - fetch by case_id (Matter field) to get all linked records
      fetchPromises.push(
        callLogApi.getAll(id).catch(() => ({ data: { records: [] } }))
      );
      
      // Dates & Deadlines
      if (linkedDeadlineIds.length > 0) {
        fetchPromises.push(
          datesDeadlinesApi.getByIds(linkedDeadlineIds).catch(() => ({ data: { records: [] } }))
        );
      } else {
        fetchPromises.push(Promise.resolve({ data: { records: [] } }));
      }
      
      // Tasks
      if (linkedTaskIds.length > 0) {
        fetchPromises.push(
          tasksApi.getByIds(linkedTaskIds).catch(() => ({ data: { records: [] } }))
        );
      } else {
        fetchPromises.push(Promise.resolve({ data: { records: [] } }));
      }
      
      // Documents
      if (linkedDocIds.length > 0) {
        fetchPromises.push(
          documentsApi.getByIds(linkedDocIds).catch(() => ({ data: { records: [] } }))
        );
      } else {
        fetchPromises.push(Promise.resolve({ data: { records: [] } }));
      }
      
      // Case Contacts
      if (linkedContactIds.length > 0) {
        fetchPromises.push(
          caseContactsApi.getByIds(linkedContactIds).catch(() => ({ data: { records: [] } }))
        );
      } else {
        fetchPromises.push(Promise.resolve({ data: { records: [] } }));
      }
      
      // Mail - try both by case_id and by record IDs
      fetchPromises.push(
        mailApi.getAll(id).catch(() => ({ data: { records: [] } }))
      );
      
      const [assetsRes, callLogRes, deadlinesRes, tasksRes, docsRes, contactsRes, mailsRes] = await Promise.all(fetchPromises);
      
      setAssetsDebts(assetsRes.data.records || []);
      setCallLog(callLogRes.data.records || []);
      setDeadlines(deadlinesRes.data.records || []);
      setTasks(tasksRes.data.records || []);
      setDocuments(docsRes.data.records || []);
      setContacts(contactsRes.data.records || []);
      setMails(mailsRes.data.records || []);
      
      // Fetch task completion dates from MongoDB
      try {
        const taskDatesRes = await taskDatesApi.getAll(id);
        setTaskDates(taskDatesRes.data.task_dates || {});
      } catch (err) {
        console.log('No task dates found:', err);
        setTaskDates({});
      }
      
    } catch (error) {
      console.error('Failed to fetch case data:', error);
      toast.error('Failed to load case details');
    } finally {
      setLoading(false);
    }
  };

  // Action Handlers
  const handleViewQuestionnaire = () => {
    const fields = record?.fields || {};
    const questionnaireUrl = fields['Intake Questionnaire Link'];
    if (questionnaireUrl) {
      window.open(questionnaireUrl, '_blank');
    } else {
      toast.error('No questionnaire link available for this case');
    }
  };

  const handleGenerateDocuments = () => {
    const fields = record?.fields || {};
    const docsUrl = fields['Probate Questionnaire Link'];
    if (docsUrl) {
      window.open(docsUrl, '_blank');
    } else {
      toast.error('No document link available for this case');
    }
  };

  const handleSendQuestionnaire = async () => {
    const fields = record?.fields || {};
    const clientName = fields.Client || fields['Matter Name'] || '';
    const emailAddress = fields['Email Address'] || '';

    if (!emailAddress) {
      toast.error('Email address is required to send questionnaire');
      return;
    }

    setSendingQuestionnaire(true);
    try {
      await webhooksApi.sendClientQuestionnaire({
        record_id: id,
        client_name: clientName,
        email_address: emailAddress
      });
      toast.success('Client questionnaire sent successfully!');
    } catch (error) {
      console.error('Failed to send questionnaire:', error);
      toast.error('Failed to send questionnaire');
    } finally {
      setSendingQuestionnaire(false);
    }
  };

  const handleCompleteCase = async () => {
    setCompletingCase(true);
    try {
      await masterListApi.update(id, { 'Active/Inactive': 'Completed' });
      setRecord(prev => ({
        ...prev,
        fields: { ...prev.fields, 'Active/Inactive': 'Completed' }
      }));
      toast.success('Case marked as completed!');
    } catch (error) {
      console.error('Failed to complete case:', error);
      toast.error('Failed to complete case');
    } finally {
      setCompletingCase(false);
    }
  };

  const handleLinkJudge = async () => {
    if (!selectedJudge) {
      toast.error('Please select a judge');
      return;
    }

    setLinkingJudge(true);
    try {
      await masterListApi.update(id, { 'Judge Information 2': [selectedJudge] });
      setRecord(prev => ({
        ...prev,
        fields: { ...prev.fields, 'Judge Information 2': [selectedJudge] }
      }));
      toast.success('Judge linked successfully!');
      setShowLinkJudgeModal(false);
      setSelectedJudge('');
      setJudgeSearchQuery('');
    } catch (error) {
      console.error('Failed to link judge:', error);
      toast.error('Failed to link judge');
    } finally {
      setLinkingJudge(false);
    }
  };

  const filteredJudges = judges.filter(judge => {
    // Backend returns judges with direct properties (name, county, etc.) not nested in fields
    const judgeName = judge.name || '';
    return judgeName.toLowerCase().includes(judgeSearchQuery.toLowerCase());
  });

  const startEdit = (field, value) => {
    setEditField(field);
    setEditValue(value || '');
  };

  const cancelEdit = () => {
    setEditField(null);
    setEditValue('');
  };

  // Boolean fields that need Yes/No to true/false conversion
  const booleanFieldNames = ['Is there a will?', 'Portal Invite Sent', 'Portal Notifications', 'Paid?'];

  const saveEdit = async () => {
    if (!editField) return;
    setSaving(true);
    try {
      // Convert Yes/No to boolean for boolean fields
      let valueToSave = editValue;
      if (booleanFieldNames.includes(editField)) {
        valueToSave = editValue === 'Yes' ? true : editValue === 'No' ? false : editValue;
      }
      
      await masterListApi.update(id, { [editField]: valueToSave });
      setRecord(prev => ({
        ...prev,
        fields: { ...prev.fields, [editField]: valueToSave }
      }));
      toast.success('Field updated');
      cancelEdit();
    } catch (error) {
      console.error('Failed to update field:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Unknown error';
      toast.error(`Failed to update: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null || value === '') return '—';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  // Handle stage change from progress bar
  const handleStageChange = async (newStage) => {
    setSavingStage(true);
    try {
      await masterListApi.update(id, { 'Stage (Probate)': newStage });
      setRecord(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          'Stage (Probate)': newStage
        }
      }));
      toast.success(`Stage updated to "${newStage}"`);
    } catch (error) {
      console.error('Failed to update stage:', error);
      toast.error('Failed to update stage');
    } finally {
      setSavingStage(false);
    }
  };

  // Handle task tracker update
  const handleUpdateTask = async (fieldKey, newValue) => {
    setSavingTask(fieldKey);
    try {
      // Update Airtable
      await masterListApi.update(id, { [fieldKey]: newValue });
      setRecord(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          [fieldKey]: newValue
        }
      }));
      
      // Save completion date to MongoDB
      try {
        const response = await taskDatesApi.save(id, fieldKey, newValue);
        if (response.data.completion_date) {
          setTaskDates(prev => ({
            ...prev,
            [fieldKey]: {
              task_key: fieldKey,
              status: newValue,
              completion_date: response.data.completion_date
            }
          }));
        } else {
          // Remove the date if status was changed to something incomplete
          setTaskDates(prev => {
            const updated = { ...prev };
            delete updated[fieldKey];
            return updated;
          });
        }
      } catch (dateErr) {
        console.log('Error saving task date:', dateErr);
      }
      
      toast.success('Task updated');
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    } finally {
      setSavingTask(null);
    }
  };

  // Add record handlers
  const handleAddContact = async (formData) => {
    setAddingRecord(true);
    try {
      await caseContactsApi.create({
        name: formData.name,
        type: formData.contactType,
        phone: formData.phone,
        email: formData.email,
        streetAddress: formData.streetAddress,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        relationshipToDecedent: formData.relationshipToDecedent,
        matterId: id
      });
      toast.success('Contact added successfully');
      setShowContactModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to add contact:', error);
      toast.error('Failed to add contact');
    } finally {
      setAddingRecord(false);
    }
  };

  const handleAddAsset = async (formData) => {
    setAddingRecord(true);
    try {
      const data = {
        name: formData.name,
        asset_or_debt: formData.assetOrDebt || 'Asset',
        value: (formData.value !== '' && formData.value !== null && formData.value !== undefined) ? parseFloat(formData.value) : null,
        master_list_id: id
      };
      
      // Set type field based on asset or debt
      if (formData.assetOrDebt === 'Debt') {
        data.type_of_debt = formData.typeOfDebt;
      } else {
        data.type_of_asset = formData.typeOfAsset;
      }
      
      // Add status if provided
      if (formData.status) {
        data.status = formData.status;
      }
      
      // Add notes if provided
      if (formData.notes) {
        data.notes = formData.notes;
      }
      
      console.log('Creating asset/debt with data:', JSON.stringify(data, null, 2));
      
      await assetsDebtsApi.create(data);
      toast.success('Asset/Debt added successfully');
      setShowAssetModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to add asset/debt:', error);
      toast.error(error.response?.data?.detail || 'Failed to add asset/debt');
    } finally {
      setAddingRecord(false);
    }
  };

  const handleAddTask = async (formData) => {
    setAddingRecord(true);
    try {
      const taskData = {
        task: formData.task,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.dueDate || null,
        link_to_matter: id,
        assigned_to: formData.assignedTo || null,
        notes: formData.notes || null
      };
      
      // Include file URL if uploaded
      if (formData.fileUrl) {
        taskData.file_url = formData.fileUrl;
      }
      
      await tasksApi.create(taskData);
      toast.success('Task added successfully');
      setShowTaskModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add task');
    } finally {
      setAddingRecord(false);
    }
  };

  const handleAddDocument = async (formData) => {
    setAddingRecord(true);
    try {
      await documentsApi.create({
        name: formData.name,
        doc_type: formData.docType,
        date: formData.date || null,
        notes: formData.notes,
        master_list_id: id
      });
      toast.success('Document added successfully');
      setShowDocumentModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add document');
    } finally {
      setAddingRecord(false);
    }
  };

  // Delete Asset/Debt handler
  const handleDeleteAsset = async (assetId) => {
    if (!window.confirm('Are you sure you want to delete this asset/debt?')) return;
    
    setDeletingAsset(assetId);
    try {
      await assetsDebtsApi.delete(assetId);
      toast.success('Asset/Debt deleted successfully');
      setAssetsDebts(prev => prev.filter(a => a.id !== assetId));
    } catch (error) {
      console.error('Failed to delete asset:', error);
      toast.error('Failed to delete asset/debt');
    } finally {
      setDeletingAsset(null);
    }
  };

  // Delete Task handler
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    setDeletingTask(taskId);
    try {
      await tasksApi.delete(taskId);
      toast.success('Task deleted successfully');
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    } finally {
      setDeletingTask(null);
    }
  };

  const handleAddMail = async (formData) => {
    setAddingRecord(true);
    try {
      await mailApi.create({
        recipient: formData.recipient,
        subject: formData.subject,
        body: formData.body,
        status: formData.status,
        case_id: id
      });
      toast.success('Mail record added successfully');
      setShowMailModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add mail record');
    } finally {
      setAddingRecord(false);
    }
  };

  const handleAddCallLog = async (formData) => {
    setAddingRecord(true);
    try {
      await callLogApi.create({
        date: formData.date || null,
        call_summary: formData.callSummary,
        staff_caller: formData.staffCaller,
        matter_id: id
      });
      toast.success('Call log added successfully');
      setShowCallLogModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add call log');
    } finally {
      setAddingRecord(false);
    }
  };

  const handleAddDeadline = async (formData) => {
    setAddingRecord(true);
    try {
      await datesDeadlinesApi.create({
        event: formData.event,
        date: formData.date,
        all_day: formData.allDay === 'true',
        notes: formData.notes,
        client_id: id
      });
      toast.success('Deadline added successfully');
      setShowDeadlineModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add deadline');
    } finally {
      setAddingRecord(false);
    }
  };

  // Calculate estate values from Assets & Debts records
  const estateValues = React.useMemo(() => {
    let totalDebts = 0;
    let totalAssets = 0;
    let realEstate = 0;
    let personalProperty = 0;

    assetsDebts.forEach((item) => {
      const fields = item.fields || {};
      const value = parseFloat(fields.Value) || 0;
      const assetOrDebt = fields['Asset or Debt'] || '';
      const typeOfAsset = fields['Type of Asset'] || '';

      if (assetOrDebt === 'Debt') {
        // Add to total debts (debts are typically negative values, but we'll use absolute value)
        totalDebts += Math.abs(value);
      } else if (assetOrDebt === 'Asset') {
        // Add to total assets
        totalAssets += value;
        
        // Categorize by type
        if (typeOfAsset === 'Real Estate') {
          realEstate += value;
        } else {
          // Personal property is everything that's NOT real estate
          personalProperty += value;
        }
      }
    });

    const netValue = totalAssets - totalDebts;

    return {
      totalDebts,
      totalAssets,
      realEstate,
      personalProperty,
      netValue
    };
  }, [assetsDebts]);

  // Field options for dropdown fields
  const fieldOptions = {
    'Stage (Probate)': ['Pre-Opening', 'Estate Opened', 'Creditor Notification Period', 'Administration', 'Estate Closed'],
    'County': ['Cook', 'DuPage', 'Lake', 'Will', 'Kane', 'McHenry', 'Winnebago', 'Madison', 'St. Clair', 'Champaign', 'Sangamon', 'Peoria', 'McLean', 'Rock Island', 'Tazewell', 'Kankakee', 'DeKalb', 'Kendall', 'Grundy', 'LaSalle', 'Macon', 'Adams', 'Vermilion', 'Coles', 'Other'],
    'Package Purchased': ['Probate Package', 'Partial Probate Package', 'Small Estate Probate Package', 'Individual Trust Package', 'Joint Trust Package', 'Individual Will Package', 'Married Will Package', 'Quit Claim Deed', 'Transfer-on-Death Deed', 'Adult Guardianship Package', 'Asset Search', 'Consult', 'Legal Letter', 'Legal Insurance', 'Small Estate Affidavit', 'Trust Restatement', 'Family Law', 'ALC: Trust (Individual)', 'ALC: Will (Individual)', 'ALC: Will (Married)'],
    'Active/Inactive': ['Active', 'Inactive'],
    'Type of Case': ['Probate', 'Estate Planning', 'Deed/LLC', 'Lead'],
    // Note: 'Client Role' field does not exist in Airtable schema - removed from UI
  };

  // Boolean fields (Yes/No or True/False)
  const booleanFields = ['Is there a will?', 'Portal Invite Sent', 'Portal Notifications', 'Paid?'];

  const EditableField = ({ label, field, icon: Icon, type = 'text', options }) => {
    const rawValue = record?.fields?.[field];
    const value = rawValue !== undefined ? rawValue : '';
    const isEditing = editField === field;
    
    // Determine display value based on type
    const getDisplayValue = () => {
      if (type === 'currency') return formatCurrency(value);
      if (type === 'date') return formatDate(value);
      if (booleanFields.includes(field)) {
        if (value === true || value === 'Yes') return 'Yes';
        if (value === false || value === 'No') return 'No';
        return value || '—';
      }
      return value || '—';
    };

    // Determine the input type for editing
    const getInputType = () => {
      if (options || fieldOptions[field]) return 'select';
      if (booleanFields.includes(field)) return 'boolean';
      if (type === 'date') return 'date';
      if (type === 'currency') return 'number';
      return 'text';
    };

    const inputType = getInputType();
    const selectOptions = options || fieldOptions[field];

    // Handle edit start with proper value conversion
    const handleStartEdit = () => {
      let initialValue = value;
      if (booleanFields.includes(field)) {
        initialValue = value === true ? 'Yes' : value === false ? 'No' : (value || 'No');
      } else if (type === 'date' && value) {
        // Convert date to YYYY-MM-DD format for date input
        try {
          const date = new Date(value);
          initialValue = date.toISOString().split('T')[0];
        } catch {
          initialValue = value;
        }
      }
      startEdit(field, initialValue);
    };

    // Render the edit input based on type
    const renderEditInput = () => {
      if (inputType === 'select') {
        return (
          <Select value={editValue} onValueChange={setEditValue}>
            <SelectTrigger className="h-9 flex-1">
              <SelectValue placeholder={`Select ${label}`} />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      
      if (inputType === 'boolean') {
        return (
          <Select value={editValue} onValueChange={setEditValue}>
            <SelectTrigger className="h-9 flex-1">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      
      if (inputType === 'date') {
        return (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-9 flex-1"
            autoFocus
            type="date"
          />
        );
      }

      if (inputType === 'number') {
        return (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-9 flex-1"
            autoFocus
            type="number"
            step="0.01"
          />
        );
      }
      
      return (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="h-9 flex-1"
          autoFocus
          type="text"
        />
      );
    };

    return (
      <div className="py-3 border-b border-slate-100 last:border-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            {Icon && <Icon className="w-4 h-4" />}
            {label}
          </div>
          {!isEditing && (
            <button
              onClick={handleStartEdit}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-1">
            {renderEditInput()}
            <Button size="sm" onClick={saveEdit} disabled={saving} className="h-9 w-9 p-0 bg-[#2E7DA1]">
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEdit} className="h-9 w-9 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <p className="font-medium text-slate-900 mt-1">{getDisplayValue()}</p>
        )}
      </div>
    );
  };

  const ReadOnlyField = ({ label, value, icon: Icon, type = 'text' }) => {
    const displayValue = type === 'currency' ? formatCurrency(value) : (type === 'date' ? formatDate(value) : value);
    return (
      <div className="py-3 border-b border-slate-100 last:border-0">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          {Icon && <Icon className="w-4 h-4" />}
          {label}
        </div>
        <p className="font-medium text-slate-900 mt-1">{displayValue || '—'}</p>
      </div>
    );
  };

  // Staff Notes Field Component
  const StaffNotesField = ({ value, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [noteValue, setNoteValue] = useState(value || '');
    const [savingNotes, setSavingNotes] = useState(false);

    const handleSave = async () => {
      setSavingNotes(true);
      try {
        await onSave(noteValue);
        setIsEditing(false);
      } catch (error) {
        // Error handling done in parent
      } finally {
        setSavingNotes(false);
      }
    };

    const handleCancel = () => {
      setNoteValue(value || '');
      setIsEditing(false);
    };

    return (
      <div>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Add staff notes about this case..."
              rows={4}
              className="resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={savingNotes}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={savingNotes} className="bg-[#2E7DA1] hover:bg-[#256a8a]">
                {savingNotes ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Save Notes
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="min-h-[100px] p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors group"
            onClick={() => setIsEditing(true)}
          >
            {value ? (
              <p className="text-slate-700 whitespace-pre-wrap">{value}</p>
            ) : (
              <p className="text-slate-400 italic">Click to add staff notes...</p>
            )}
            <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit2 className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Case not found</p>
        <Button onClick={() => navigate('/')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  const fields = record.fields || {};

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="probate-case-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/clients')} className="p-2" data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                {fields['Matter Name'] || 'Probate Case'}
              </h1>
              <Badge className="bg-purple-100 text-purple-700">Probate</Badge>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewQuestionnaire}
            className="rounded-full"
            disabled={!fields['Intake Questionnaire Link']}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Questionnaire
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendQuestionnaire}
            disabled={sendingQuestionnaire}
            className="rounded-full"
          >
            {sendingQuestionnaire ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send Questionnaire
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateDocuments}
            className="rounded-full"
            disabled={!fields['Probate Questionnaire Link']}
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Documents
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLinkJudgeModal(true)}
            className="rounded-full"
          >
            <Link2 className="w-4 h-4 mr-2" />
            Link Judge
          </Button>
          <Button
            size="sm"
            onClick={handleCompleteCase}
            disabled={completingCase || fields['Active/Inactive'] === 'Completed'}
            className="rounded-full bg-green-600 hover:bg-green-700"
          >
            {completingCase ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            {fields['Active/Inactive'] === 'Completed' ? 'Case Completed' : 'Complete Case'}
          </Button>
        </div>
      </div>

      {/* Link Judge Modal */}
      <Dialog open={showLinkJudgeModal} onOpenChange={setShowLinkJudgeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Judge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="judgeSearch">Select Judge</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="judgeSearch"
                  placeholder="Search judges..."
                  value={judgeSearchQuery}
                  onChange={(e) => setJudgeSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              {filteredJudges.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No judges found</p>
              ) : (
                filteredJudges.map((judge) => (
                  <div
                    key={judge.id}
                    onClick={() => setSelectedJudge(judge.id)}
                    className={`p-3 cursor-pointer hover:bg-slate-50 border-b last:border-b-0 ${
                      selectedJudge === judge.id ? 'bg-[#2E7DA1]/10 border-l-4 border-l-[#2E7DA1]' : ''
                    }`}
                  >
                    <p className="font-medium">{judge.name || 'Unknown'}</p>
                    <p className="text-sm text-slate-500">
                      {judge.county || ''} {judge.courtroom ? `• ${judge.courtroom}` : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowLinkJudgeModal(false); setSelectedJudge(''); setJudgeSearchQuery(''); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleLinkJudge} 
              disabled={linkingJudge || !selectedJudge}
              className="bg-[#2E7DA1] hover:bg-[#246585]"
            >
              {linkingJudge ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              Link Judge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Bar - Clickable */}
      <ProbateProgressBar 
        currentStage={fields['Stage (Probate)']} 
        onStageChange={handleStageChange}
        saving={savingStage}
      />

      {/* Client Information & Case Information - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Information */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-[#2E7DA1]" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReadOnlyField label="Matter" value={fields['Matter Name']} />
            <EditableField label="Client" field="Client" icon={User} />
            <EditableField label="Phone Number" field="Phone Number" icon={Phone} />
            <EditableField label="Email" field="Email Address" icon={Mail} />
            <EditableField label="Address" field="Address" icon={MapPin} />
            <EditableField label="Last Contacted" field="Last Contacted" icon={Calendar} type="date" />
          </CardContent>
        </Card>

        {/* Case Information */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gavel className="w-4 h-4 text-[#2E7DA1]" />
              Case Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditableField label="Type of Case" field="Type of Case" />
            <EditableField label="Case Number" field="Case Number" />
            <EditableField label="Stage (Probate)" field="Stage (Probate)" />
            <EditableField label="County" field="County" />
            {/* Note: "Client Role" field does not exist in Airtable Master List schema */}
            <EditableField label="Package Purchased" field="Package Purchased" />
            <EditableField label="Is there a will?" field="Is there a will?" />
            <EditableField label="Opening Date" field="Opening Date" type="date" />
            <EditableField label="Closing Date" field="Closing Date" type="date" />
          </CardContent>
        </Card>
      </div>

      {/* Judge Information - Dedicated Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gavel className="w-4 h-4 text-[#2E7DA1]" />
            Judge Information
            {!fields['Judge Information 2']?.[0] && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLinkJudgeModal(true)}
                className="ml-auto h-7 text-xs"
              >
                <Link2 className="w-3 h-3 mr-1" />
                Link Judge
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fields['Judge Information 2']?.[0] ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6">
              <ReadOnlyField 
                label="Judge Name" 
                value={fields['Name (from Judge Information 2)']?.[0] || ''} 
                icon={Gavel} 
              />
              <ReadOnlyField 
                label="Courtroom" 
                value={fields['Courtroom (from Judge Information 2)']?.[0] || ''} 
                icon={MapPin}
              />
              <ReadOnlyField 
                label="Calendar" 
                value={fields['Calendar (from Judge Information 2)']?.[0] || ''} 
                icon={Calendar} 
              />
              <ReadOnlyField 
                label="Email" 
                value={fields['Email (from Judge Information 2)']?.[0] || ''} 
                icon={Mail}
              />
              <ReadOnlyField 
                label="Zoom Information" 
                value={fields['Zoom Information (from Judge Information 2)']?.[0] || ''} 
                icon={Video}
              />
              {/* Standing Orders - Attachment field, render as link */}
              <div className="py-3 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <BookOpen className="w-4 h-4" />
                  Standing Orders
                </div>
                {fields['Standing Orders (from Judge Information 2)']?.[0]?.url ? (
                  <a 
                    href={fields['Standing Orders (from Judge Information 2)'][0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#2E7DA1] hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    <FileText className="w-4 h-4" />
                    View Document
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <p className="font-medium text-slate-900 mt-1">—</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Gavel className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No judge linked to this case</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLinkJudgeModal(true)}
                className="mt-3"
              >
                <Link2 className="w-4 h-4 mr-2" />
                Link Judge
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decedent Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#2E7DA1]" />
            Decedent Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6">
            <EditableField label="Decedent Name" field="Decedent Name" />
            <EditableField label="Date of Birth" field="Decedent Date of Birth" type="date" />
            <EditableField label="Date of Death" field="Date of Death" type="date" />
            <EditableField label="Last Known Address" field="Decedent Last Known Address" icon={MapPin} />
          </div>
        </CardContent>
      </Card>

      {/* Staff Notes */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-[#2E7DA1]" />
            Staff Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StaffNotesField 
            value={fields['Staff Notes']} 
            onSave={async (newValue) => {
              try {
                await masterListApi.update(id, { 'Staff Notes': newValue });
                setRecord(prev => ({
                  ...prev,
                  fields: { ...prev.fields, 'Staff Notes': newValue }
                }));
                toast.success('Staff notes saved');
              } catch (error) {
                console.error('Failed to save staff notes:', error);
                toast.error('Failed to save staff notes');
                throw error;
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Financial Values Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#2E7DA1]" />
            Estate Values
            <span className="text-xs font-normal text-slate-500 ml-2">(calculated from Assets & Debts)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Personal Property</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(estateValues.personalProperty)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Real Estate</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(estateValues.realEstate)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-xs text-blue-600 mb-1">Total Assets</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(estateValues.totalAssets)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-xs text-red-600 mb-1">Total Debts</p>
              <p className="text-lg font-bold text-red-700">{formatCurrency(estateValues.totalDebts)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-xs text-green-600 mb-1">Net Value</p>
              <p className={`text-lg font-bold ${estateValues.netValue >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(estateValues.netValue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Data Tabs */}
      <Card className="border-0 shadow-sm">
        <Tabs defaultValue="contacts" className="w-full">
          <CardHeader className="pb-0">
            <TabsList className="bg-slate-100 p-1 flex-wrap h-auto gap-1">
              <TabsTrigger value="contacts">
                <Users className="w-4 h-4 mr-1" />
                Contacts ({contacts.length})
              </TabsTrigger>
              <TabsTrigger value="assets">
                <DollarSign className="w-4 h-4 mr-1" />
                Assets & Debts ({assetsDebts.length})
              </TabsTrigger>
              <TabsTrigger value="tasks">
                <FileText className="w-4 h-4 mr-1" />
                Tasks ({tasks.length})
              </TabsTrigger>
              <TabsTrigger value="documents">
                <Paperclip className="w-4 h-4 mr-1" />
                Documents ({documents.length})
              </TabsTrigger>
              <TabsTrigger value="mail">
                <Mail className="w-4 h-4 mr-1" />
                Mail ({mails.length})
              </TabsTrigger>
              <TabsTrigger value="calllog">
                <PhoneCall className="w-4 h-4 mr-1" />
                Call Log ({callLog.length})
              </TabsTrigger>
              <TabsTrigger value="deadlines">
                <Calendar className="w-4 h-4 mr-1" />
                Dates & Deadlines ({deadlines.length})
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Contacts Tab */}
            <TabsContent value="contacts">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => setShowContactModal(true)} className="bg-[#2E7DA1] hover:bg-[#246585] rounded-full">
                  <Plus className="w-4 h-4 mr-1" /> Add Contact
                </Button>
              </div>
              {contacts.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No contacts linked to this case</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact Type</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((c) => (
                      <TableRow 
                        key={c.id} 
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => setSelectedContact(c)}
                      >
                        <TableCell className="font-medium text-[#2E7DA1]">{c.fields?.Name || '—'}</TableCell>
                        <TableCell>{c.fields?.Type || c.fields?.['Contact Type'] || c.fields?.Role || '—'}</TableCell>
                        <TableCell>{c.fields?.Phone || c.fields?.['Phone Number'] || '—'}</TableCell>
                        <TableCell>{c.fields?.Email || c.fields?.['Email Address'] || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Assets & Debts Tab */}
            <TabsContent value="assets">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => setShowAssetModal(true)} className="bg-[#2E7DA1] hover:bg-[#246585] rounded-full">
                  <Plus className="w-4 h-4 mr-1" /> Add Asset/Debt
                </Button>
              </div>
              {assetsDebts.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No assets or debts linked to this case</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Asset/Debt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assetsDebts.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.fields?.['Name of Asset'] || item.fields?.Name || '—'}</TableCell>
                        <TableCell>{item.fields?.['Type of Asset'] || item.fields?.['Type of Debt'] || item.fields?.Type || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={item.fields?.['Asset or Debt'] === 'Asset' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
                            {item.fields?.['Asset or Debt'] || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.fields?.Status || '—'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.fields?.Value)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteAsset(item.id)}
                            disabled={deletingAsset === item.id}
                          >
                            {deletingAsset === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => setShowTaskModal(true)} className="bg-[#2E7DA1] hover:bg-[#246585] rounded-full">
                  <Plus className="w-4 h-4 mr-1" /> Add Task
                </Button>
              </div>
              {tasks.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No tasks linked to this case</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Completed Date</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.fields?.Name || t.fields?.Title || t.fields?.Task || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{t.fields?.Status || 'Unknown'}</Badge>
                        </TableCell>
                        <TableCell>{t.fields?.Priority || '—'}</TableCell>
                        <TableCell>{formatDate(t.fields?.['Due Date'])}</TableCell>
                        <TableCell>{formatDate(t.fields?.['Completed Date'] || t.fields?.['Date Completed'])}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteTask(t.id)}
                            disabled={deletingTask === t.id}
                          >
                            {deletingTask === t.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => setShowDocumentModal(true)} className="bg-[#2E7DA1] hover:bg-[#246585] rounded-full">
                  <Plus className="w-4 h-4 mr-1" /> Add Document
                </Button>
              </div>
              {documents.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No documents linked to this case</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.fields?.Name || '—'}</TableCell>
                        <TableCell>{doc.fields?.Type || '—'}</TableCell>
                        <TableCell>{formatDate(doc.fields?.Date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Mail Tab */}
            <TabsContent value="mail">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => setShowMailModal(true)} className="bg-[#2E7DA1] hover:bg-[#246585] rounded-full">
                  <Plus className="w-4 h-4 mr-1" /> Add Mail
                </Button>
              </div>
              {mails.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No mail records for this case</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mails.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.fields?.Recipient || m.fields?.Name || '—'}</TableCell>
                        <TableCell>{m.fields?.Subject || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{m.fields?.Status || 'Unknown'}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(m.fields?.Date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Call Log Tab */}
            <TabsContent value="calllog">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => setShowCallLogModal(true)} className="bg-[#2E7DA1] hover:bg-[#246585] rounded-full">
                  <Plus className="w-4 h-4 mr-1" /> Add Call Log
                </Button>
              </div>
              {callLog.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No call log entries for this case</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Call Summary</TableHead>
                      <TableHead>Staff Caller</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callLog.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{formatDate(c.fields?.Date)}</TableCell>
                        <TableCell>{c.fields?.['Call Summary'] || c.fields?.Notes || c.fields?.Summary || '—'}</TableCell>
                        <TableCell>{c.fields?.['Staff Caller'] || c.fields?.Caller || c.fields?.Staff || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Dates & Deadlines Tab */}
            <TabsContent value="deadlines">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => setShowDeadlineModal(true)} className="bg-[#2E7DA1] hover:bg-[#246585] rounded-full">
                  <Plus className="w-4 h-4 mr-1" /> Add Deadline
                </Button>
              </div>
              {deadlines.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No dates or deadlines linked to this case</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>All Day</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deadlines.map((d) => (
                      <TableRow 
                        key={d.id} 
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => setSelectedDeadline(d)}
                      >
                        <TableCell className="font-medium text-[#2E7DA1]">{d.fields?.Event || d.fields?.Name || d.fields?.Title || '—'}</TableCell>
                        <TableCell>{formatDate(d.fields?.Date)}</TableCell>
                        <TableCell>{d.fields?.['All Day Event?'] || d.fields?.['All Day Event'] || d.fields?.['All Day'] ? 'Yes' : 'No'}</TableCell>
                        <TableCell className="max-w-xs truncate">{d.fields?.Location || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Probate Task Tracker - At Bottom */}
      <ProbateTaskTracker 
        fields={fields} 
        onUpdateTask={handleUpdateTask} 
        savingTask={savingTask}
        taskDates={taskDates}
      />

      {/* Add Contact Modal - Custom with conditional fields */}
      <AddContactModal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
        loading={addingRecord}
        onSubmit={handleAddContact}
      />

      {/* Add Asset/Debt Modal */}
      <AddRecordModal
        open={showAssetModal}
        onClose={() => setShowAssetModal(false)}
        title="Add Asset/Debt"
        loading={addingRecord}
        onSubmit={handleAddAsset}
        fields={[
          { name: 'name', label: 'Name of Asset', type: 'text', required: true },
          { name: 'assetOrDebt', label: 'Asset or Debt', type: 'select', options: ['Asset', 'Debt'], defaultValue: 'Asset' },
          { name: 'typeOfAsset', label: 'Type of Asset', type: 'select', options: ['Bank Account', 'Real Estate', 'Vehicle', 'Stocks/Bonds', 'Retirement Account', 'Life Insurance', 'Unclaimed Property', 'Personal Property', 'Other'], showIf: { field: 'assetOrDebt', value: 'Asset' } },
          { name: 'typeOfDebt', label: 'Type of Debt', type: 'select', options: ['Credit Card', 'Loan', 'Mortgage', 'Medical Debt', 'Other'], showIf: { field: 'assetOrDebt', value: 'Debt' } },
          { name: 'value', label: 'Value', type: 'number' },
          { name: 'status', label: 'Status', type: 'select', options: ['Found', 'Reported by Client', 'Transferred to Estate Bank Account', 'Claim Paid', 'Contesting Claim', 'Abandoned', 'To Be Sold', 'Sold', 'Not Found'] },
          { name: 'notes', label: 'Notes', type: 'textarea' }
        ]}
      />

      {/* Add Task Modal */}
      <AddRecordModal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Add Task"
        loading={addingRecord}
        onSubmit={handleAddTask}
        fields={[
          { name: 'task', label: 'Task', type: 'text', required: true },
          { name: 'status', label: 'Status', type: 'select', options: ['Not Started', 'In Progress', 'Need Information from Client', 'Done'], defaultValue: 'Not Started' },
          { name: 'priority', label: 'Priority', type: 'select', options: ['Normal', 'High Priority'], defaultValue: 'Normal' },
          { name: 'dueDate', label: 'Due Date', type: 'date' },
          { name: 'assignedTo', label: 'Assigned To', type: 'select', options: ['Brittany Hardy', 'Mary Liberty', 'Jessica Sallows'] },
          { name: 'notes', label: 'Notes', type: 'textarea' },
          { name: 'uploadFile', label: 'Upload File', type: 'file' }
        ]}
      />

      {/* Add Document Modal */}
      <AddRecordModal
        open={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        title="Add Document"
        loading={addingRecord}
        onSubmit={handleAddDocument}
        fields={[
          { name: 'name', label: 'Document Name', type: 'text', required: true },
          { name: 'date', label: 'Date', type: 'date' },
          { name: 'notes', label: 'Notes', type: 'textarea' }
        ]}
      />

      {/* Add Mail Modal */}
      <AddRecordModal
        open={showMailModal}
        onClose={() => setShowMailModal(false)}
        title="Add Mail Record"
        loading={addingRecord}
        onSubmit={handleAddMail}
        fields={[
          { name: 'recipient', label: 'What is being mailed?', type: 'text', required: true },
          { name: 'subject', label: 'Mailing Speed', type: 'select', options: ['Regular', 'Certified', 'Priority', 'Overnight'] }
        ]}
      />

      {/* Add Call Log Modal */}
      <AddRecordModal
        open={showCallLogModal}
        onClose={() => setShowCallLogModal(false)}
        title="Add Call Log"
        loading={addingRecord}
        onSubmit={handleAddCallLog}
        fields={[
          { name: 'date', label: 'Date', type: 'date' },
          { name: 'staffCaller', label: 'Staff Caller', type: 'select', options: ['Brittany Hardy', 'Mary Liberty', 'Jessica Sallows'] },
          { name: 'callSummary', label: 'Call Summary', type: 'textarea', required: true }
        ]}
      />

      {/* Add Deadline Modal */}
      <AddRecordModal
        open={showDeadlineModal}
        onClose={() => setShowDeadlineModal(false)}
        title="Add Date/Deadline"
        loading={addingRecord}
        onSubmit={handleAddDeadline}
        fields={[
          { name: 'event', label: 'Event', type: 'text', required: true },
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'notes', label: 'Location/Notes', type: 'textarea' }
        ]}
      />

      {/* Contact Detail Modal */}
      <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Details</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500 text-xs">Name</Label>
                  <p className="font-medium">{selectedContact.fields?.Name || '—'}</p>
                </div>
                <div>
                  <Label className="text-slate-500 text-xs">Type</Label>
                  <p className="font-medium">{selectedContact.fields?.Type || selectedContact.fields?.['Contact Type'] || '—'}</p>
                </div>
              </div>
              <div>
                <Label className="text-slate-500 text-xs">Street Address</Label>
                <p className="font-medium">{selectedContact.fields?.['Street Address'] || selectedContact.fields?.Address || '—'}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-500 text-xs">City</Label>
                  <p className="font-medium">{selectedContact.fields?.City || '—'}</p>
                </div>
                <div>
                  <Label className="text-slate-500 text-xs">State</Label>
                  <p className="font-medium">{selectedContact.fields?.['State (Abbreviation)'] || selectedContact.fields?.State || '—'}</p>
                </div>
                <div>
                  <Label className="text-slate-500 text-xs">Zip Code</Label>
                  <p className="font-medium">{selectedContact.fields?.['Zip Code'] || selectedContact.fields?.Zip || '—'}</p>
                </div>
              </div>
              <div>
                <Label className="text-slate-500 text-xs">Relationship to Decedent</Label>
                <p className="font-medium">{selectedContact.fields?.['Relationship to Decedent'] || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500 text-xs">Signed Waiver of Notice</Label>
                  <p className="font-medium">{selectedContact.fields?.['Signed Waiver of Notice'] || '—'}</p>
                </div>
                <div>
                  <Label className="text-slate-500 text-xs">Disabled or Minor?</Label>
                  <p className="font-medium">{selectedContact.fields?.['Disabled/Minor'] || selectedContact.fields?.['Disabled or Minor?'] ? 'Yes' : 'No'}</p>
                </div>
              </div>
              <div>
                <Label className="text-slate-500 text-xs">Email Address</Label>
                <p className="font-medium">{selectedContact.fields?.Email || selectedContact.fields?.['Email Address'] || '—'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedContact(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deadline Detail Modal */}
      <Dialog open={!!selectedDeadline} onOpenChange={() => setSelectedDeadline(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedDeadline && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-500 text-xs">Event</Label>
                <p className="font-medium">{selectedDeadline.fields?.Event || selectedDeadline.fields?.Name || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500 text-xs">Date</Label>
                  <p className="font-medium">{formatDate(selectedDeadline.fields?.Date)}</p>
                </div>
                <div>
                  <Label className="text-slate-500 text-xs">All Day Event</Label>
                  <p className="font-medium">{selectedDeadline.fields?.['All Day Event?'] || selectedDeadline.fields?.['All Day Event'] || selectedDeadline.fields?.['All Day'] ? 'Yes' : 'No'}</p>
                </div>
              </div>
              <div>
                <Label className="text-slate-500 text-xs">Invitee</Label>
                <p className="font-medium">{selectedDeadline.fields?.Invitee || selectedDeadline.fields?.['Client Name'] || '—'}</p>
              </div>
              <div>
                <Label className="text-slate-500 text-xs">Location</Label>
                <p className="font-medium">{selectedDeadline.fields?.Location || '—'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDeadline(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Add Contact Modal with conditional fields
const AddContactModal = ({ open, onClose, loading, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    contactType: '',
    phone: '',
    email: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    relationshipToDecedent: ''
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        contactType: '',
        phone: '',
        email: '',
        streetAddress: '',
        city: '',
        state: '',
        zipCode: '',
        relationshipToDecedent: ''
      });
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const contactTypes = ['Personal Representative', 'Heir', 'Attorney', 'Accountant', 'Financial Advisor', 'Other'];
  const showRelationshipField = formData.contactType === 'Heir';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter contact name"
              required
            />
          </div>

          {/* Contact Type */}
          <div className="space-y-2">
            <Label htmlFor="contactType">Type</Label>
            <Select
              value={formData.contactType}
              onValueChange={(value) => setFormData({ ...formData, contactType: value, relationshipToDecedent: value !== 'Heir' ? '' : formData.relationshipToDecedent })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contact type" />
              </SelectTrigger>
              <SelectContent>
                {contactTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditional: Relationship to Decedent (only for Heir) */}
          {showRelationshipField && (
            <div className="space-y-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
              <Label htmlFor="relationshipToDecedent">Relationship to Decedent</Label>
              <Input
                id="relationshipToDecedent"
                value={formData.relationshipToDecedent}
                onChange={(e) => setFormData({ ...formData, relationshipToDecedent: e.target.value })}
                placeholder="e.g., Son, Daughter, Spouse"
              />
            </div>
          )}

          {/* Phone & Email Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email address"
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-3 border-t pt-3">
            <Label className="text-slate-600 text-sm font-semibold">Address</Label>
            
            <div className="space-y-2">
              <Label htmlFor="streetAddress">Street Address</Label>
              <Input
                id="streetAddress"
                value={formData.streetAddress}
                onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                placeholder="123 Main St"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="IL"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">Zip Code</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="60601"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#2E7DA1] hover:bg-[#246585]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Contact
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Progress Bar for Probate Stages - Clickable to change stage
const ProbateProgressBar = ({ currentStage, onStageChange, saving }) => {
  const stages = [
    'Pre-Opening',
    'Estate Opened',
    'Creditor Notification Period',
    'Administration',
    'Estate Closed'
  ];

  const currentIndex = stages.findIndex(s => s === currentStage);
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / stages.length) * 100 : 0;

  const handleStageClick = (stage) => {
    if (onStageChange && stage !== currentStage) {
      onStageChange(stage);
    }
  };

  return (
    <Card className="border-0 shadow-sm mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Case Progress</span>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin text-[#2E7DA1]" />}
            <Badge className="bg-[#2E7DA1]/10 text-[#2E7DA1]">
              {currentStage || 'Not Set'}
            </Badge>
          </div>
        </div>
        <div className="relative">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#2E7DA1] transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {stages.map((stage, index) => {
              const isCompleted = currentIndex >= index;
              const isCurrent = currentIndex === index;
              return (
                <button 
                  key={stage}
                  onClick={() => handleStageClick(stage)}
                  disabled={saving}
                  className={`flex flex-col items-center group cursor-pointer transition-all ${index === 0 ? 'items-start' : index === stages.length - 1 ? 'items-end' : ''}`}
                  style={{ width: `${100 / stages.length}%` }}
                  title={`Click to set stage to: ${stage}`}
                >
                  <div 
                    className={`w-3 h-3 rounded-full border-2 transition-all group-hover:scale-125 group-hover:ring-4 group-hover:ring-[#2E7DA1]/20 ${
                      isCurrent 
                        ? 'bg-[#2E7DA1] border-[#2E7DA1] ring-4 ring-[#2E7DA1]/20' 
                        : isCompleted 
                          ? 'bg-[#2E7DA1] border-[#2E7DA1]' 
                          : 'bg-white border-slate-300 group-hover:border-[#2E7DA1]'
                    }`}
                  />
                  <span 
                    className={`text-xs mt-1 text-center hidden sm:block transition-colors ${
                      isCurrent ? 'text-[#2E7DA1] font-medium' : isCompleted ? 'text-slate-600' : 'text-slate-400 group-hover:text-[#2E7DA1]'
                    }`}
                    style={{ maxWidth: '70px' }}
                  >
                    {stage}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">Click on a stage to update the case progress</p>
      </CardContent>
    </Card>
  );
};

// Probate Task Tracker Component
const ProbateTaskTracker = ({ fields, onUpdateTask, savingTask, taskDates }) => {
  const [openSections, setOpenSections] = useState({
    preOpening: true,
    postOpening: false,
    administration: false
  });

  // Default status options for most fields
  const defaultStatusOptions = ['Done', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'];
  
  // Yes/No fields use different options
  const yesNoOptions = ['Yes', 'No', 'Not Applicable'];
  
  // Filed-type fields
  const filedOptions = ['Filed', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'];
  
  // Notice fields with dispatch status
  const noticeOptions = ['Dispatched & Complete', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'];
  
  // Oath and Bond specific options
  const oathBondOptions = ['Done', 'Application Submitted', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'];
  
  // Affidavit specific options
  const affidavitOptions = ['Done', 'Client Signature Needed', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'];
  
  // Estate Bank Account specific options
  const bankAccountOptions = ['Done', 'Waiting on Client Confirmation', 'Reminder Sent to Client', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'];
  
  // Estate Accounting specific options
  const accountingOptions = ['Complete & Sent to Heirs', 'Done', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'];
  
  // Estate Closed specific options
  const closedOptions = ['Done', 'Scheduled', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'];

  const preOpeningTasks = [
    { key: 'Questionnaire Completed?', label: 'Questionnaire Completed', options: yesNoOptions },
    { key: 'Petition filed?', label: 'Petition Filed', options: filedOptions },
    { key: 'Initial Orders', label: 'Initial Orders', options: defaultStatusOptions },
    { key: 'Oath and Bond', label: 'Oath and Bond', options: oathBondOptions },
    { key: 'Waivers of Notice', label: 'Waivers of Notice', options: defaultStatusOptions },
    { key: 'Affidavit of Heirship', label: 'Affidavit of Heirship', options: affidavitOptions },
    { key: 'Notice of Petition for Administration', label: 'Notice of Petition Filed', options: noticeOptions },
    { key: 'Copy of Will Filed', label: 'Copy of Will Filed', options: defaultStatusOptions },
    { key: 'Courtesy Copies to Judge', label: 'Courtesy Copies to Judge', options: defaultStatusOptions }
  ];

  const postOpeningTasks = [
    { key: 'Asset Search Started', label: 'Asset Search Started', options: defaultStatusOptions },
    { key: 'Unclaimed Property Report', label: 'Unclaimed Property Report', options: defaultStatusOptions },
    { key: 'Creditor Notification Published', label: 'Creditor Notification Published', options: defaultStatusOptions },
    { key: 'EIN Number', label: 'EIN Number', options: defaultStatusOptions },
    { key: 'Estate Bank Account Opened', label: 'Estate Bank Account', options: bankAccountOptions },
    { key: 'Notice of Will Admitted', label: 'Notice of Will Admitted', options: noticeOptions },
    { key: 'Letters of Office Uploaded', label: 'Letters of Office Uploaded', options: defaultStatusOptions },
    { key: 'Real Estate Bond', label: 'Real Estate Bond', options: defaultStatusOptions },
    { key: 'Tax Return Information Sent', label: 'Tax Return Information Sent', options: defaultStatusOptions }
  ];

  const administrationTasks = [
    { key: 'Estate Accounting', label: 'Estate Accounting', options: accountingOptions },
    { key: 'Tax Return Filed', label: 'Estate Tax Return', options: defaultStatusOptions },
    { key: 'Receipts of Distribution', label: 'Receipts of Distribution', options: defaultStatusOptions },
    { key: 'Final Report Filed', label: 'Final Report Filed', options: defaultStatusOptions },
    { key: 'Notice of Estate Closing', label: 'Notice of Estate Closing', options: defaultStatusOptions },
    { key: 'Order of Discharge', label: 'Order of Discharge', options: defaultStatusOptions },
    { key: 'Estate Closed', label: 'Estate Closed', options: closedOptions }
  ];

  // Kept for backwards compatibility - individual tasks now have their own options
  const statusOptions = defaultStatusOptions;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'done': 
      case 'yes':
      case 'filed':
      case 'dispatched & complete':
      case 'complete & sent to heirs':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'in progress':
      case 'application submitted':
      case 'scheduled':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'waiting':
      case 'waiting on client confirmation':
      case 'client signature needed':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'reminder sent to client':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'needed':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'not applicable':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'done':
      case 'yes':
      case 'filed':
      case 'dispatched & complete':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'in progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'waiting':
      case 'waiting on client confirmation':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'needed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Circle className="w-4 h-4 text-slate-400" />;
    }
  };

  const calculateProgress = (tasks) => {
    const completed = tasks.filter(task => {
      const status = (fields[task.key] || '').toLowerCase();
      return status === 'done' || status === 'yes' || status === 'filed' || status === 'dispatched & complete' || status === 'not applicable';
    }).length;
    return Math.round((completed / tasks.length) * 100);
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const renderTaskSection = (sectionKey, title, tasks, accentColor, iconColor) => {
    const progress = calculateProgress(tasks);
    const isOpen = openSections[sectionKey];
    const completedCount = tasks.filter(task => {
      const status = (fields[task.key] || '').toLowerCase();
      return status === 'done' || status === 'yes' || status === 'filed' || status === 'dispatched & complete';
    }).length;

    return (
      <div className={`border rounded-xl overflow-hidden transition-all duration-200 ${isOpen ? 'shadow-md' : 'shadow-sm'}`}>
        {/* Section Header - Clickable */}
        <button
          onClick={() => toggleSection(sectionKey)}
          className={`w-full flex items-center justify-between p-4 ${accentColor} hover:brightness-95 transition-all`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white/50`}>
              {sectionKey === 'preOpening' && <FileText className={`w-5 h-5 ${iconColor}`} />}
              {sectionKey === 'postOpening' && <FolderOpen className={`w-5 h-5 ${iconColor}`} />}
              {sectionKey === 'administration' && <ClipboardList className={`w-5 h-5 ${iconColor}`} />}
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-slate-800">{title}</h4>
              <p className="text-xs text-slate-600">{completedCount} of {tasks.length} tasks completed</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Progress Ring */}
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-white/50"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${progress * 1.256} 125.6`}
                  className={iconColor}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                {progress}%
              </span>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Section Content - Collapsible */}
        <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
          <div className="p-4 bg-white space-y-1">
            {tasks.map((task, index) => {
              const value = fields[task.key] || 'Not Started';
              const isDone = ['done', 'yes', 'filed', 'dispatched & complete'].includes(value.toLowerCase());
              const isNotApplicable = value.toLowerCase() === 'not applicable';
              const shouldStrikethrough = isNotApplicable; // Only strikethrough for Not Applicable, not Done
              const taskDate = taskDates?.[task.key];
              const completionDate = taskDate?.completion_date;
              
              return (
                <div 
                  key={task.key} 
                  className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all hover:bg-slate-50 ${isDone ? 'bg-green-50/50' : ''} ${isNotApplicable ? 'bg-slate-50/50' : ''}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(value)}
                    <div className="flex flex-col">
                      <span className={`text-sm ${shouldStrikethrough ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                        {task.label}
                      </span>
                      {completionDate && (
                        <span className="text-xs text-slate-400">
                          Completed: {format(new Date(completionDate), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Select
                    value={value}
                    onValueChange={(newValue) => onUpdateTask(task.key, newValue)}
                    disabled={savingTask === task.key}
                  >
                    <SelectTrigger className={`w-36 h-9 text-xs font-medium ${getStatusColor(value)}`}>
                      {savingTask === task.key ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {(task.options || statusOptions).map((option) => (
                        <SelectItem key={option} value={option} className="text-xs">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Calculate overall progress
  const allTasks = [...preOpeningTasks, ...postOpeningTasks, ...administrationTasks];
  const overallProgress = calculateProgress(allTasks);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#2E7DA1]" />
            Probate Task Tracker
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Overall Progress</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#2E7DA1] transition-all duration-500 rounded-full"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-[#2E7DA1]">{overallProgress}%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderTaskSection('preOpening', 'Pre-Opening', preOpeningTasks, 'bg-blue-50', 'text-blue-600')}
        {renderTaskSection('postOpening', 'Post-Opening', postOpeningTasks, 'bg-purple-50', 'text-purple-600')}
        {renderTaskSection('administration', 'Administration', administrationTasks, 'bg-emerald-50', 'text-emerald-600')}
      </CardContent>
    </Card>
  );
};

// Reusable Add Record Modal Component
const AddRecordModal = ({ open, onClose, title, loading, onSubmit, fields }) => {
  const [formData, setFormData] = useState({});
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Initialize form with default values
      const defaults = {};
      fields.forEach(f => {
        defaults[f.name] = f.defaultValue || '';
      });
      setFormData(defaults);
      setUploadedFile(null);
    }
  }, [open, fields]);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const maxSize = 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadingFile(true);
    try {
      const uploadRes = await filesApi.upload(file);
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const fileUrl = backendUrl + uploadRes.data.url;
      
      setUploadedFile({
        name: file.name,
        url: fileUrl
      });
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Include uploaded file URL in form data if present
    const submitData = { ...formData };
    if (uploadedFile) {
      submitData.fileUrl = uploadedFile.url;
    }
    onSubmit(submitData);
  };

  // Check if a field should be shown based on showIf condition
  const shouldShowField = (field) => {
    if (!field.showIf) return true;
    const { field: dependentField, value } = field.showIf;
    return formData[dependentField] === value;
  };

  // Check if any field is a file type
  const hasFileField = fields.some(f => f.type === 'file');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => {
            // Skip field if showIf condition is not met
            if (!shouldShowField(field)) return null;
            
            // Handle file type field
            if (field.type === 'file') {
              return (
                <div key={field.name} className="space-y-2">
                  <Label>{field.label}</Label>
                  {uploadedFile ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-700">{uploadedFile.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setUploadedFile(null)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative border-2 border-dashed rounded-lg p-4 text-center border-slate-200 hover:border-slate-300 bg-slate-50">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => handleFileUpload(Array.from(e.target.files || []))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {uploadingFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-[#2E7DA1]" />
                          <p className="text-sm text-slate-600">Uploading...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-6 h-6 text-slate-400" />
                          <p className="text-sm text-slate-600">Click or drag file to upload</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }
            
            return (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </Label>
                {field.type === 'select' ? (
                  <Select
                    value={formData[field.name] || ''}
                    onValueChange={(value) => setFormData({ ...formData, [field.name]: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options || []).map((opt) => (
                        <SelectItem key={typeof opt === 'object' ? opt.value : opt} value={typeof opt === 'object' ? opt.value : opt}>
                          {typeof opt === 'object' ? opt.label : opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'textarea' ? (
                  <Textarea
                    id={field.name}
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    rows={3}
                    required={field.required}
                  />
                ) : (
                  <Input
                    id={field.name}
                    type={field.type || 'text'}
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    required={field.required}
                  />
                )}
              </div>
            );
          })}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#2E7DA1] hover:bg-[#246585]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProbateCaseDetail;
