import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { masterListApi, caseContactsApi, caseTasksApi, documentsApi, callLogApi, webhooksApi, datesDeadlinesApi, assetsDebtsApi, filesApi, mailApi } from '../services/api';
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
import { ArrowLeft, Loader2, User, Phone, Mail, FileText, Edit2, Check, X, Users, ClipboardList, PhoneCall, Calendar, MapPin, StickyNote, Plus, ExternalLink, Send, CheckCircle, ChevronDown, Circle, Clock, Trash2, Wallet, DollarSign, Paperclip, Upload, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import AssetDebtModal from '../components/probate/AssetDebtModal';
import AddRecordModal from '../components/probate/AddRecordModal';
import { useActionModals } from '../context/ActionModalsContext';
import { CopyableEmail, CopyablePhone } from '../components/ui/copyable-text';

const EstatePlanningDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openModal } = useActionModals();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStage, setSavingStage] = useState(false);
  const [sendingQuestionnaire, setSendingQuestionnaire] = useState(false);
  const [completingCase, setCompletingCase] = useState(false);
  const [savingTask, setSavingTask] = useState(null);
  const [record, setRecord] = useState(null);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');

  const [contacts, setContacts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [callLog, setCallLog] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [assetsDebts, setAssetsDebts] = useState([]);
  
  // Detail view modals
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedDeadline, setSelectedDeadline] = useState(null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactEditForm, setContactEditForm] = useState({});
  const [savingContact, setSavingContact] = useState(false);
  
  // Add modal states
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [addingRecord, setAddingRecord] = useState(false);
  
  // Edit modal states
  const [editingContact, setEditingContact] = useState(false);
  const [editContactForm, setEditContactForm] = useState({});
  const [deletingContact, setDeletingContact] = useState(null);
  const [deletingCallLog, setDeletingCallLog] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [deletingDocument, setDeletingDocument] = useState(null);
  
  // Mail state
  const [mails, setMails] = useState([]);
  const [showMailModal, setShowMailModal] = useState(false);
  const [deletingMail, setDeletingMail] = useState(null);
  
  // Asset/Debt edit state
  const [selectedAssetDebt, setSelectedAssetDebt] = useState(null);
  const [editingAssetDebt, setEditingAssetDebt] = useState(false);
  const [assetDebtForm, setAssetDebtForm] = useState({});
  const [savingAssetDebt, setSavingAssetDebt] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // First fetch the main record
      const recordRes = await masterListApi.getOne(id);
      const recordData = recordRes.data;
      setRecord(recordData);
      
      const fields = recordData.fields || {};
      
      // Get linked record IDs from the master record
      const linkedContactIds = fields['Case Contacts'] || [];
      const linkedTaskIds = fields['Task List'] || [];
      const linkedDocIds = fields['Documents'] || [];
      
      // Fetch linked records using their IDs
      const fetchPromises = [];
      
      // Case Contacts
      if (linkedContactIds.length > 0) {
        fetchPromises.push(
          caseContactsApi.getByIds(linkedContactIds).catch(() => ({ data: { records: [] } }))
        );
      } else {
        fetchPromises.push(Promise.resolve({ data: { records: [] } }));
      }
      
      // Tasks
      if (linkedTaskIds.length > 0) {
        fetchPromises.push(
          caseTasksApi.getByIds(linkedTaskIds).catch(() => ({ data: { records: [] } }))
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
      
      // Call Log - fetch by case_id (Matter field) to get all linked records
      fetchPromises.push(
        callLogApi.getAll(id).catch(() => ({ data: { records: [] } }))
      );
      
      // Assets & Debts - fetch by case_id
      fetchPromises.push(
        assetsDebtsApi.getByCase(id).catch(() => ({ data: { records: [] } }))
      );
      
      // Mail - fetch by case_id
      fetchPromises.push(
        mailApi.getAll(id).catch(() => ({ data: { records: [] } }))
      );
      
      const [contactsRes, tasksRes, docsRes, callLogRes, assetsDebtsRes, mailRes] = await Promise.all(fetchPromises);
      
      setContacts(contactsRes.data.records || []);
      setTasks(tasksRes.data.records || []);
      setDocuments(docsRes.data.records || []);
      setCallLog(callLogRes.data.records || []);
      setAssetsDebts(assetsDebtsRes.data.records || []);
      setMails(mailRes.data.records || []);
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

  // Handle task update for Estate Planning Task Tracker
  const handleUpdateTask = async (taskKey, newStatus) => {
    setSavingTask(taskKey);
    try {
      await masterListApi.update(id, { [taskKey]: newStatus });
      setRecord(prev => ({
        ...prev,
        fields: { ...prev.fields, [taskKey]: newStatus }
      }));
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Failed to update task:', error);
      let errorMessage = error.response?.data?.detail || 'Failed to update task';
      // Check for Airtable permission error
      if (typeof errorMessage === 'string' && errorMessage.includes('Insufficient permissions')) {
        errorMessage = `Cannot set "${newStatus}" - this option may not exist in Airtable. Please add it in Airtable first.`;
      }
      toast.error(errorMessage);
    } finally {
      setSavingTask(null);
    }
  };

  const startEdit = (field, value) => {
    setEditField(field);
    setEditValue(value || '');
  };

  const cancelEdit = () => {
    setEditField(null);
    setEditValue('');
  };

  // Boolean fields that need Yes/No to true/false conversion
  const booleanFieldNames = ['Has Trust?', 'Has Will?', 'Has POA?', 'Has Healthcare Directive?'];

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
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  // Handle stage change from progress bar
  const handleStageChange = async (newStage) => {
    setSavingStage(true);
    try {
      await masterListApi.update(id, { 'Stage (EP)': newStage });
      setRecord(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          'Stage (EP)': newStage
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Field options for dropdown fields - must match Airtable values exactly
  const fieldOptions = {
    'Stage (EP)': ['Questionnaire', 'Planning Session', 'Drafting', 'Review', 'Notary Session', 'Digital & Physical Portfolio', 'Trust Funding', 'Completed'],
    'Package Purchased': ['Probate Package', 'Partial Probate Package', 'Small Estate Probate Package', 'Individual Trust Package', 'Joint Trust Package', 'Individual Will Package', 'Married Will Package', 'Quit Claim Deed', 'Transfer-on-Death Deed', 'Adult Guardianship Package', 'Asset Search', 'Consult', 'Legal Letter', 'Legal Insurance', 'Small Estate Affidavit', 'Trust Restatement', 'Family Law', 'ALC: Trust (Individual)', 'ALC: Will (Individual)', 'ALC: Will (Married)'],
    'Active/Inactive': ['Active', 'Inactive'],
    'Type of Case': ['Probate', 'Estate Planning', 'Deed/LLC', 'Lead'],
  };

  // Boolean fields (Yes/No)
  const booleanFields = ['Has Trust?', 'Has Will?', 'Has POA?', 'Has Healthcare Directive?'];

  // Format currency helper
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '—';
    const num = parseFloat(value);
    if (isNaN(num)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  // Asset/Debt handlers
  const handleStartEditAssetDebt = () => {
    if (!selectedAssetDebt) return;
    const fields = selectedAssetDebt.fields || {};
    setAssetDebtForm({
      name: fields['Name of Asset/Debt'] || fields['Name of Asset'] || '',
      assetOrDebt: fields['Asset or Debt?'] || fields['Asset or Debt'] || 'Asset',
      status: fields.Status || '',
      value: fields.Value || '',
      typeOfAsset: fields['Type of Asset'] || '',
      typeOfDebt: fields['Type of Debt'] || '',
      notes: fields.Notes || '',
      matterId: (fields.Matters || [])[0] || id
    });
    setEditingAssetDebt(true);
  };

  const handleCancelEditAssetDebt = () => {
    setEditingAssetDebt(false);
    setAssetDebtForm({});
  };

  const handleSaveAssetDebt = async () => {
    if (!selectedAssetDebt) return;
    setSavingAssetDebt(true);
    try {
      const updateData = {
        'Name of Asset': assetDebtForm.name,
        'Asset or Debt': assetDebtForm.assetOrDebt,
        Status: assetDebtForm.status,
        Value: assetDebtForm.value ? parseFloat(assetDebtForm.value) : null,
        Notes: assetDebtForm.notes
      };

      if (assetDebtForm.assetOrDebt === 'Asset') {
        updateData['Type of Asset'] = assetDebtForm.typeOfAsset;
      } else {
        updateData['Type of Debt'] = assetDebtForm.typeOfDebt;
      }

      if (assetDebtForm.matterId) {
        updateData['Matters'] = [assetDebtForm.matterId];
      }

      await assetsDebtsApi.update(selectedAssetDebt.id, updateData);
      toast.success('Asset/Debt updated successfully');

      setAssetsDebts(prev => prev.map(item => 
        item.id === selectedAssetDebt.id 
          ? { ...item, fields: { ...item.fields, ...updateData } }
          : item
      ));
      setEditingAssetDebt(false);
      setSelectedAssetDebt(null);
    } catch (error) {
      console.error('Failed to update asset/debt:', error);
      toast.error('Failed to update asset/debt');
    } finally {
      setSavingAssetDebt(false);
    }
  };

  const handleDeleteAssetDebt = async (assetId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    setDeletingAsset(assetId);
    try {
      await assetsDebtsApi.delete(assetId);
      toast.success('Asset/Debt deleted successfully');
      setAssetsDebts(prev => prev.filter(a => a.id !== assetId));
    } catch (error) {
      console.error('Failed to delete asset/debt:', error);
      toast.error('Failed to delete asset/debt');
    } finally {
      setDeletingAsset(null);
    }
  };

  // Add Contact Handler
  const handleAddContact = async (formData) => {
    setAddingRecord(true);
    try {
      await caseContactsApi.create({
        name: formData.name,
        type: formData.contactType,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        streetAddress: formData.streetAddress || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
        relationshipToDecedent: formData.relationshipToDecedent || undefined,
        matterId: id
      });
      toast.success('Contact added successfully');
      setShowContactModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to add contact:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to add contact';
      toast.error(errorMsg);
    } finally {
      setAddingRecord(false);
    }
  };

  // Add Document Handler
  const handleAddDocument = async (formData) => {
    setAddingRecord(true);
    try {
      let documentUrl = null;
      let documentFilename = null;
      
      if (formData.document && formData.document.file) {
        const uploadResponse = await filesApi.upload(formData.document.file);
        const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
        documentUrl = backendUrl + uploadResponse.data.url;
        documentFilename = formData.document.name;
      }
      
      await documentsApi.create({
        name: formData.name,
        master_list_id: id,
        document_url: documentUrl,
        document_filename: documentFilename
      });
      toast.success('Document added successfully');
      setShowDocumentModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to add document:', error);
      toast.error('Failed to add document');
    } finally {
      setAddingRecord(false);
    }
  };

  // Add Call Log Handler
  const handleAddCallLog = async (formData) => {
    setAddingRecord(true);
    try {
      await callLogApi.create({
        date: formData.date,
        method: formData.method || undefined,
        purpose: formData.purpose || undefined,
        outcome: formData.outcome || undefined,
        notes: formData.notes || undefined,
        matterId: id
      });
      toast.success('Call log added successfully');
      setShowCallLogModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to add call log:', error);
      toast.error('Failed to add call log');
    } finally {
      setAddingRecord(false);
    }
  };

  // Add Mail Handler
  const handleAddMail = async (formData) => {
    setAddingRecord(true);
    try {
      await mailApi.create({
        whatIsBeingMailed: formData.whatIsBeingMailed,
        matterId: id,
        recipientName: formData.recipientName || undefined,
        streetAddress: formData.streetAddress || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
        mailingSpeed: formData.mailingSpeed || undefined
      });
      toast.success('Mail record added successfully');
      setShowMailModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to add mail record:', error);
      toast.error('Failed to add mail record');
    } finally {
      setAddingRecord(false);
    }
  };

  // Add Asset Handler
  const handleAddAsset = async (formData) => {
    setAddingRecord(true);
    try {
      const result = await assetsDebtsApi.create({
        name: formData.name,
        asset_or_debt: formData.assetOrDebt,
        type_of_asset: formData.assetOrDebt === 'Asset' ? formData.typeOfAsset : undefined,
        type_of_debt: formData.assetOrDebt === 'Debt' ? formData.typeOfDebt : undefined,
        value: formData.value ? parseFloat(formData.value) : undefined,
        status: formData.status || undefined,
        notes: formData.notes || undefined,
        master_list_id: id
      });
      
      // If we have a file and we got a record ID, upload the attachment
      if (formData.fileUrl && result.data?.id) {
        try {
          await assetsDebtsApi.uploadAttachment(result.data.id, 'attachment', formData.fileUrl, 'Attachments');
        } catch (attachError) {
          console.error('Attachment upload failed:', attachError);
          toast.warning('Asset/Debt created but file attachment failed');
        }
      }
      
      toast.success('Asset/Debt added successfully');
      setShowAssetModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to add asset/debt:', error);
      toast.error('Failed to add asset/debt');
    } finally {
      setAddingRecord(false);
    }
  };

  // Delete Contact Handler
  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    setDeletingContact(contactId);
    try {
      await caseContactsApi.delete(contactId);
      toast.success('Contact deleted successfully');
      setContacts(prev => prev.filter(c => c.id !== contactId));
      setSelectedContact(null);
    } catch (error) {
      console.error('Failed to delete contact:', error);
      toast.error('Failed to delete contact');
    } finally {
      setDeletingContact(null);
    }
  };

  // Edit Contact Handlers
  const handleStartEditContact = () => {
    if (!selectedContact) return;
    setContactEditForm({
      name: selectedContact.fields?.Name || '',
      type: selectedContact.fields?.Type || selectedContact.fields?.['Contact Type'] || '',
      streetAddress: selectedContact.fields?.['Street Address'] || selectedContact.fields?.Address || '',
      city: selectedContact.fields?.City || '',
      state: selectedContact.fields?.['State (Abbreviation)'] || selectedContact.fields?.State || '',
      zipCode: selectedContact.fields?.['Zip Code'] || selectedContact.fields?.Zip || '',
      email: selectedContact.fields?.Email || selectedContact.fields?.['Email Address'] || '',
      phone: selectedContact.fields?.Phone || selectedContact.fields?.['Phone Number'] || '',
      relationship: selectedContact.fields?.['Relationship to Decedent'] || ''
    });
    setIsEditingContact(true);
  };

  const handleCancelEditContact = () => {
    setIsEditingContact(false);
    setContactEditForm({});
  };

  const handleSaveContact = async () => {
    if (!selectedContact) return;
    setSavingContact(true);
    try {
      await caseContactsApi.update(selectedContact.id, {
        Name: contactEditForm.name,
        Type: contactEditForm.type,
        'Street Address': contactEditForm.streetAddress,
        City: contactEditForm.city,
        'State (Abbreviation)': contactEditForm.state,
        'Zip Code': contactEditForm.zipCode,
        Email: contactEditForm.email,
        Phone: contactEditForm.phone,
        'Relationship to Decedent': contactEditForm.relationship
      });
      toast.success('Contact updated successfully');
      setIsEditingContact(false);
      setSelectedContact(null);
      fetchData();
    } catch (error) {
      console.error('Failed to update contact:', error);
      toast.error('Failed to update contact');
    } finally {
      setSavingContact(false);
    }
  };

  // Delete Document Handler
  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    setDeletingDocument(docId);
    try {
      await documentsApi.delete(docId);
      toast.success('Document deleted successfully');
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('Failed to delete document');
    } finally {
      setDeletingDocument(null);
    }
  };

  // Delete Call Log Handler
  const handleDeleteCallLog = async (callId) => {
    if (!window.confirm('Are you sure you want to delete this call log?')) return;
    setDeletingCallLog(callId);
    try {
      await callLogApi.delete(callId);
      toast.success('Call log deleted successfully');
      setCallLog(prev => prev.filter(c => c.id !== callId));
    } catch (error) {
      console.error('Failed to delete call log:', error);
      toast.error('Failed to delete call log');
    } finally {
      setDeletingCallLog(null);
    }
  };

  // Delete Mail Handler
  const handleDeleteMail = async (mailId) => {
    if (!window.confirm('Are you sure you want to delete this mail record?')) return;
    setDeletingMail(mailId);
    try {
      await mailApi.delete(mailId);
      toast.success('Mail record deleted successfully');
      setMails(prev => prev.filter(m => m.id !== mailId));
    } catch (error) {
      console.error('Failed to delete mail record:', error);
      toast.error('Failed to delete mail record');
    } finally {
      setDeletingMail(null);
    }
  };

  // Delete Task Handler
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    setDeletingTask(taskId);
    try {
      await caseTasksApi.delete(taskId);
      toast.success('Task deleted successfully');
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    } finally {
      setDeletingTask(null);
    }
  };

  const EditableField = ({ label, field, icon: Icon, type = 'text', options }) => {
    const rawValue = record?.fields?.[field];
    const value = rawValue !== undefined ? rawValue : '';
    const isEditing = editField === field;
    
    // Determine display value based on type
    const getDisplayValue = () => {
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
              data-testid={`edit-${field}`}
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

  // Estate Planning Progress Bar Component - Clickable - linked to Master List -> Stage (EP)
  const EstatePlanningProgressBar = () => {
    // Stage values must match Airtable exactly
    const stages = [
      'Questionnaire',
      'Planning Session',
      'Drafting',
      'Review',
      'Notary Session',
      'Digital & Physical Portfolio',
      'Trust Funding',
      'Completed'
    ];

    const currentStage = fields['Stage (EP)'];
    const currentIndex = stages.findIndex(s => s === currentStage);
    const progress = currentIndex >= 0 ? ((currentIndex + 1) / stages.length) * 100 : 0;

    return (
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Case Progress</span>
            <div className="flex items-center gap-2">
              {savingStage && <Loader2 className="w-4 h-4 animate-spin text-[#2E7DA1]" />}
              <Badge className="bg-blue-100 text-blue-700">
                {currentStage || 'Not Set'}
              </Badge>
            </div>
          </div>
          <div className="relative">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500 rounded-full"
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
                    onClick={() => handleStageChange(stage)}
                    disabled={savingStage}
                    className={`flex flex-col items-center group cursor-pointer transition-all ${index === 0 ? 'items-start' : index === stages.length - 1 ? 'items-end' : ''}`}
                    style={{ width: `${100 / stages.length}%` }}
                    title={`Click to set stage to: ${stage}`}
                  >
                    <div 
                      className={`w-3 h-3 rounded-full border-2 transition-all group-hover:scale-125 group-hover:ring-4 group-hover:ring-blue-500/20 ${
                        isCurrent 
                          ? 'bg-blue-500 border-blue-500 ring-4 ring-blue-500/20' 
                          : isCompleted 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'bg-white border-slate-300 group-hover:border-blue-500'
                      }`}
                    />
                    <span 
                      className={`text-xs mt-1 text-center hidden sm:block transition-colors ${
                        isCurrent ? 'text-blue-600 font-medium' : isCompleted ? 'text-slate-600' : 'text-slate-400 group-hover:text-blue-500'
                      }`}
                      style={{ maxWidth: '70px', fontSize: '10px' }}
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
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="estate-planning-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/clients')} className="p-2" data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                {fields['Matter Name'] || fields.Matter || 'Estate Planning Case'}
              </h1>
              <Badge className="bg-blue-100 text-blue-700">Estate Planning</Badge>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openModal('sendInvoice', { 
              preselectedMatter: { 
                id, 
                fields: record?.fields,
                name: record?.fields?.['Matter Name'] || record?.fields?.Client
              } 
            })}
            className="rounded-full bg-[#2E7DA1] text-white hover:bg-[#246585]"
            data-testid="send-invoice-btn"
          >
            <Receipt className="w-4 h-4 mr-2" />
            Send Invoice
          </Button>
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

      {/* Progress Bar - Clickable */}
      <EstatePlanningProgressBar />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-[#2E7DA1]" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditableField label="Client Name" field="Client" icon={User} />
            <EditableField label="Phone Number" field="Phone Number" icon={Phone} />
            <EditableField label="Email" field="Email Address" icon={Mail} />
            <EditableField label="Address" field="Address" icon={MapPin} />
            <EditableField label="Spouse Full Name" field="Spouse Full Name" icon={Users} />
            <EditableField label="Spouse Email" field="Spouse Email" icon={Mail} />
            <EditableField label="Last Contacted" field="Last Contacted" icon={Calendar} type="date" />
          </CardContent>
        </Card>

        {/* Case Information */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#2E7DA1]" />
              Case Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditableField label="Matter Name" field="Matter Name" />
            <EditableField label="Type of Case" field="Type of Case" />
            <EditableField label="Package Purchased" field="Package Purchased" />
            <EditableField label="Stage (EP)" field="Stage (EP)" />
            <EditableField label="Case Notes" field="Case Notes" icon={FileText} />
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-500">Documents</p>
                <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-500">Tasks</p>
                <p className="text-2xl font-bold text-slate-900">{tasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Linked Data Tabs */}
      <Card className="border-0 shadow-sm">
        <Tabs defaultValue="documents" className="w-full">
          <CardHeader className="pb-0 px-3 sm:px-6">
            <TabsList className="bg-slate-100 p-1 flex overflow-x-auto sm:flex-wrap h-auto gap-1 scrollbar-hide">
              <TabsTrigger value="documents" className="flex-shrink-0 text-xs sm:text-sm">
                <Paperclip className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Documents ({documents.length})
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex-shrink-0 text-xs sm:text-sm">
                <ClipboardList className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Tasks ({tasks.length})
              </TabsTrigger>
              <TabsTrigger value="assetsDebts" data-testid="assets-debts-tab" className="flex-shrink-0 text-xs sm:text-sm">
                <Wallet className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Assets & Debts ({assetsDebts.length})
              </TabsTrigger>
              <TabsTrigger value="calllog" className="flex-shrink-0 text-xs sm:text-sm">
                <PhoneCall className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Call Log ({callLog.length})
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex-shrink-0 text-xs sm:text-sm">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Contacts ({contacts.length})
              </TabsTrigger>
              <TabsTrigger value="mail" className="flex-shrink-0 text-xs sm:text-sm">
                <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Mail ({mails.length})
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4 px-3 sm:px-6">
            {/* Documents Tab */}
            <TabsContent value="documents">
              <div className="flex justify-end mb-4">
                <Button 
                  size="sm" 
                  onClick={() => setShowDocumentModal(true)}
                  className="bg-[#2E7DA1] hover:bg-[#256a8a] rounded-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Document
                </Button>
              </div>
              {documents.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No documents linked</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.fields?.['Document Name'] || doc.fields?.Name || '—'}</TableCell>
                        <TableCell>
                          {doc.fields?.Document && doc.fields.Document.length > 0 ? (
                            <a 
                              href={doc.fields.Document[0].url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[#2E7DA1] hover:underline flex items-center gap-1"
                            >
                              <Paperclip className="w-4 h-4" />
                              {doc.fields.Document[0].filename || 'Download'}
                            </a>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={deletingDocument === doc.id}
                          >
                            {deletingDocument === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
                <Button 
                  size="sm" 
                  onClick={() => setShowTaskModal(true)}
                  className="bg-[#2E7DA1] hover:bg-[#256a8a] rounded-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Task
                </Button>
              </div>
              {tasks.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No tasks linked</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.fields?.Title || t.fields?.Task || t.fields?.Name || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{t.fields?.Status || 'Unknown'}</Badge></TableCell>
                        <TableCell>{t.fields?.Priority || '—'}</TableCell>
                        <TableCell>{formatDate(t.fields?.['Due Date'])}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteTask(t.id)}
                            disabled={deletingTask === t.id}
                          >
                            {deletingTask === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Assets & Debts Tab */}
            <TabsContent value="assetsDebts" data-testid="assets-debts-content">
              <div className="flex justify-end mb-4">
                <Button 
                  size="sm" 
                  onClick={() => setShowAssetModal(true)}
                  className="bg-[#2E7DA1] hover:bg-[#256a8a] rounded-full"
                  data-testid="add-asset-debt-btn"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Asset/Debt
                </Button>
              </div>
              {assetsDebts.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No assets or debts linked</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Asset/Debt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...assetsDebts].sort((a, b) => {
                      const statusA = a.fields?.Status || '';
                      const statusB = b.fields?.Status || '';
                      if (statusA === 'Found' && statusB !== 'Found') return -1;
                      if (statusA !== 'Found' && statusB === 'Found') return 1;
                      return 0;
                    }).map((item) => (
                      <TableRow 
                        key={item.id} 
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => setSelectedAssetDebt(item)}
                        data-testid={`asset-row-${item.id}`}
                      >
                        <TableCell className="font-medium">{item.fields?.['Name of Asset/Debt'] || item.fields?.['Name of Asset'] || item.fields?.Name || '—'}</TableCell>
                        <TableCell>{item.fields?.['Type of Asset'] || item.fields?.['Type of Debt'] || item.fields?.Type || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={item.fields?.['Asset or Debt?'] === 'Asset' || item.fields?.['Asset or Debt'] === 'Asset' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
                            {item.fields?.['Asset or Debt?'] || item.fields?.['Asset or Debt'] || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={item.fields?.Status === 'Found' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}>
                            {item.fields?.Status || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.fields?.Value)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => { e.stopPropagation(); handleDeleteAssetDebt(item.id); }}
                            disabled={deletingAsset === item.id}
                          >
                            {deletingAsset === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Call Log Tab */}
            <TabsContent value="calllog">
              <div className="flex justify-end mb-4">
                <Button 
                  size="sm" 
                  onClick={() => setShowCallLogModal(true)}
                  className="bg-[#2E7DA1] hover:bg-[#256a8a] rounded-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Call Log
                </Button>
              </div>
              {callLog.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No call logs</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callLog.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{formatDate(c.fields?.Date)}</TableCell>
                        <TableCell>{c.fields?.Method || '—'}</TableCell>
                        <TableCell>{c.fields?.Purpose || '—'}</TableCell>
                        <TableCell>{c.fields?.Outcome || '—'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteCallLog(c.id)}
                            disabled={deletingCallLog === c.id}
                          >
                            {deletingCallLog === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Contacts Tab */}
            <TabsContent value="contacts">
              <div className="flex justify-end mb-4">
                <Button 
                  size="sm" 
                  onClick={() => setShowContactModal(true)}
                  className="bg-[#2E7DA1] hover:bg-[#256a8a] rounded-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Contact
                </Button>
              </div>
              {contacts.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No contacts linked</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-16"></TableHead>
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
                        <TableCell>{c.fields?.Type || c.fields?.['Contact Type'] || '—'}</TableCell>
                        <TableCell>{c.fields?.Phone || c.fields?.['Phone Number'] || '—'}</TableCell>
                        <TableCell>{c.fields?.Email || c.fields?.['Email Address'] || '—'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => { e.stopPropagation(); handleDeleteContact(c.id); }}
                            disabled={deletingContact === c.id}
                          >
                            {deletingContact === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Mail Tab */}
            <TabsContent value="mail">
              <div className="flex justify-end mb-4">
                <Button 
                  size="sm" 
                  onClick={() => setShowMailModal(true)}
                  className="bg-[#2E7DA1] hover:bg-[#256a8a] rounded-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Mail
                </Button>
              </div>
              {mails.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No mail records</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>What is Being Mailed</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>City, State</TableHead>
                      <TableHead>Mailing Speed</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mails.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.fields?.['What is being mailed?'] || '—'}</TableCell>
                        <TableCell>{m.fields?.['Recipient Name'] || '—'}</TableCell>
                        <TableCell>
                          {m.fields?.City || m.fields?.State ? 
                            `${m.fields?.City || ''}${m.fields?.City && m.fields?.State ? ', ' : ''}${m.fields?.State || ''}` 
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{m.fields?.['Mailing Speed'] || '—'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteMail(m.id)}
                            disabled={deletingMail === m.id}
                          >
                            {deletingMail === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Estate Planning Task Tracker */}
      <EstatePlanningTaskTracker 
        fields={fields}
        onUpdateTask={handleUpdateTask}
        savingTask={savingTask}
      />

      {/* Contact Detail Modal with Edit */}
      <Dialog open={!!selectedContact} onOpenChange={() => { setSelectedContact(null); setIsEditingContact(false); setContactEditForm({}); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{isEditingContact ? 'Edit Contact' : 'Contact Details'}</span>
              {!isEditingContact && (
                <Button variant="ghost" size="sm" onClick={handleStartEditContact} className="h-8 px-2">
                  <Edit2 className="w-4 h-4 mr-1" /> Edit
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedContact && !isEditingContact && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500 text-xs">Name</Label>
                  <p className="font-medium">{selectedContact.fields?.Name || '—'}</p>
                </div>
                <div>
                  <Label className="text-slate-500 text-xs">Type</Label>
                  <p className="font-medium">{selectedContact.fields?.Type || selectedContact.fields?.Role || '—'}</p>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500 text-xs">Phone</Label>
                  <p className="font-medium">{selectedContact.fields?.Phone || selectedContact.fields?.['Phone Number'] || '—'}</p>
                </div>
                <div>
                  <Label className="text-slate-500 text-xs">Email</Label>
                  <p className="font-medium">{selectedContact.fields?.Email || selectedContact.fields?.['Email Address'] || '—'}</p>
                </div>
              </div>
              <div>
                <Label className="text-slate-500 text-xs">Relationship to Decedent</Label>
                <p className="font-medium">{selectedContact.fields?.['Relationship to Decedent'] || '—'}</p>
              </div>
            </div>
          )}
          {selectedContact && isEditingContact && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={contactEditForm.name} onChange={(e) => setContactEditForm({...contactEditForm, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={contactEditForm.type} onValueChange={(v) => setContactEditForm({...contactEditForm, type: v})}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {['Heir', 'Beneficiary', 'Personal Representative', 'Client', 'Creditor', 'Other'].map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Street Address</Label>
                <Input value={contactEditForm.streetAddress} onChange={(e) => setContactEditForm({...contactEditForm, streetAddress: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">City</Label>
                  <Input value={contactEditForm.city} onChange={(e) => setContactEditForm({...contactEditForm, city: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">State</Label>
                  <Select value={contactEditForm.state} onValueChange={(v) => setContactEditForm({...contactEditForm, state: v})}>
                    <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                    <SelectContent>
                      {['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Zip Code</Label>
                  <Input value={contactEditForm.zipCode} onChange={(e) => setContactEditForm({...contactEditForm, zipCode: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input value={contactEditForm.phone} onChange={(e) => setContactEditForm({...contactEditForm, phone: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={contactEditForm.email} onChange={(e) => setContactEditForm({...contactEditForm, email: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Relationship to Decedent</Label>
                <Input value={contactEditForm.relationship} onChange={(e) => setContactEditForm({...contactEditForm, relationship: e.target.value})} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {isEditingContact ? (
              <>
                <Button variant="outline" onClick={handleCancelEditContact} disabled={savingContact}>Cancel</Button>
                <Button onClick={handleSaveContact} disabled={savingContact} className="bg-[#2E7DA1] hover:bg-[#246585]">
                  {savingContact ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => { handleDeleteContact(selectedContact.id); }}
                  disabled={deletingContact === selectedContact?.id}
                >
                  {deletingContact === selectedContact?.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Delete
                </Button>
                <Button variant="outline" onClick={() => setSelectedContact(null)}>Close</Button>
              </>
            )}
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
                  <p className="font-medium">{selectedDeadline.fields?.['All Day Event?'] || selectedDeadline.fields?.['All Day Event'] ? 'Yes' : 'No'}</p>
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

      {/* Asset/Debt Modal */}
      <AssetDebtModal
        selectedItem={selectedAssetDebt}
        isEditing={editingAssetDebt}
        formData={assetDebtForm}
        saving={savingAssetDebt}
        onClose={() => {
          setSelectedAssetDebt(null);
          setEditingAssetDebt(false);
          setAssetDebtForm({});
        }}
        onStartEdit={handleStartEditAssetDebt}
        onCancelEdit={handleCancelEditAssetDebt}
        onSave={handleSaveAssetDebt}
        onDelete={handleDeleteAssetDebt}
        onFormChange={setAssetDebtForm}
        showMatterField={false}
      />

      {/* Add Contact Modal */}
      <AddContactModal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
        loading={addingRecord}
        onSubmit={handleAddContact}
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
          { name: 'document', label: 'Document', type: 'file', required: true }
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
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'method', label: 'Method', type: 'select', options: ['Phone', 'Video Call', 'In Person', 'Email'] },
          { name: 'purpose', label: 'Purpose', type: 'text' },
          { name: 'outcome', label: 'Outcome', type: 'text' },
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
          { name: 'whatIsBeingMailed', label: 'What is being mailed?', type: 'text', required: true },
          { name: 'recipientName', label: 'Recipient Name', type: 'text' },
          { name: 'streetAddress', label: 'Street Address', type: 'text' },
          { name: 'city', label: 'City', type: 'text' },
          { name: 'state', label: 'State', type: 'select', options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'] },
          { name: 'zipCode', label: 'Zip Code', type: 'text' },
          { name: 'mailingSpeed', label: 'Mailing Speed', type: 'select', options: ['Regular Mail', 'Certified Mail', 'Registered Mail', 'Priority Mail', 'Express Mail'] }
        ]}
      />

      {/* Add Task Modal */}
      <AddRecordModal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Add Task"
        loading={addingRecord}
        onSubmit={async (formData) => {
          setAddingRecord(true);
          try {
            await caseTasksApi.create({
              task: formData.task,
              status: formData.status || 'Not Started',
              priority: formData.priority || 'Normal',
              dueDate: formData.dueDate || undefined,
              notes: formData.notes || undefined,
              matterId: id
            });
            toast.success('Task added successfully');
            setShowTaskModal(false);
            fetchData();
          } catch (error) {
            console.error('Failed to add task:', error);
            toast.error('Failed to add task');
          } finally {
            setAddingRecord(false);
          }
        }}
        fields={[
          { name: 'task', label: 'Task', type: 'text', required: true },
          { name: 'status', label: 'Status', type: 'select', options: ['Not Started', 'In Progress', 'Need Information from Client', 'Done'] },
          { name: 'priority', label: 'Priority', type: 'select', options: ['Normal', 'High Priority'] },
          { name: 'dueDate', label: 'Due Date', type: 'date' },
          { name: 'notes', label: 'Notes', type: 'textarea' }
        ]}
      />

      {/* Add Asset/Debt Modal */}
      <AddRecordModal
        open={showAssetModal}
        onClose={() => setShowAssetModal(false)}
        title="Add Asset/Debt"
        loading={addingRecord}
        onSubmit={handleAddAsset}
        fields={[
          { name: 'name', label: 'Name of Asset/Debt', type: 'text', required: true },
          { name: 'assetOrDebt', label: 'Asset or Debt?', type: 'select', options: ['Asset', 'Debt'], required: true },
          { name: 'typeOfAsset', label: 'Type of Asset', type: 'select', options: ['Bank Account', 'Real Estate', 'Vehicle', 'Stocks/Bonds', 'Retirement Account', 'Life Insurance', 'Unclaimed Property', 'Personal Property', 'Other'], showIf: { field: 'assetOrDebt', value: 'Asset' } },
          { name: 'typeOfDebt', label: 'Type of Debt', type: 'select', options: ['Credit Card', 'Loan', 'Mortgage', 'Medical Debt', 'Other'], showIf: { field: 'assetOrDebt', value: 'Debt' } },
          { name: 'value', label: 'Value', type: 'number' },
          { name: 'status', label: 'Status', type: 'select', options: ['Found', 'Reported by Client', 'Transferred to Estate Bank Account', 'Claim Paid', 'Contesting Claim', 'Abandoned', 'To Be Sold', 'Sold', 'Not Found'] },
          { name: 'notes', label: 'Notes', type: 'textarea' },
          { name: 'attachment', label: 'Attachment', type: 'file' }
        ]}
      />
    </div>
  );
};

// Estate Planning Task Tracker Component
const EstatePlanningTaskTracker = ({ fields, onUpdateTask, savingTask }) => {
  const [isOpen, setIsOpen] = useState(true);

  // Status options for tasks - matching actual Airtable field options
  // Note: Options must exist in Airtable - API key doesn't have permission to create new options
  const yesNoOptions = ['Yes', 'No'];
  
  // Define options per field based on what exists in Airtable
  // Planning Session 2 options match the Master List field in Airtable
  const estatePlanningTasks = [
    { key: 'Questionnaire Completed?', label: 'Questionnaire Completed', options: yesNoOptions },
    { key: 'Planning Session 2', label: 'Planning Session', options: ['Done', 'In Progress', 'Needed', 'N/A'] },
    { key: 'Drafting', label: 'Drafting', options: ['Done', 'In Progress', 'Needed'] },
    { key: 'Client Review', label: 'Client Review', options: ['Done', 'In Progress', 'Needed'] },
    { key: 'Notarization Session', label: 'Notarization Session', options: ['Done', 'Needed'] },
    { key: 'Physical Portfolio', label: 'Physical Portfolio', options: ['Done', 'In Progress', 'Needed'] },
    { key: 'Trust Funding', label: 'Trust Funding', options: ['Done', 'Needed', 'N/A'] }
  ];

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'done': 
      case 'yes':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'in progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'needed':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'not applicable':
      case 'n/a':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'no':
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'done':
      case 'yes':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'in progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'needed':
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <Circle className="w-4 h-4 text-slate-400" />;
    }
  };

  const calculateProgress = () => {
    const completed = estatePlanningTasks.filter(task => {
      const status = (fields[task.key] || '').toLowerCase();
      return status === 'done' || status === 'yes' || status === 'not applicable' || status === 'n/a';
    }).length;
    return Math.round((completed / estatePlanningTasks.length) * 100);
  };

  const completedCount = estatePlanningTasks.filter(task => {
    const status = (fields[task.key] || '').toLowerCase();
    return status === 'done' || status === 'yes' || status === 'not applicable' || status === 'n/a';
  }).length;

  const progress = calculateProgress();

  return (
    <Card className="border-0 shadow-sm">
      {/* Header - Clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 transition-all rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/50">
            <ClipboardList className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-slate-800">Estate Planning Task Tracker</h4>
            <p className="text-xs text-slate-600">{completedCount} of {estatePlanningTasks.length} tasks completed</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Progress Ring */}
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 rotate-[-90deg]">
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="4"
              />
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke="#2E7DA1"
                strokeWidth="4"
                strokeDasharray={`${progress * 1.26} 126`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-slate-700">{progress}%</span>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Task List */}
      {isOpen && (
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {estatePlanningTasks.map((task) => {
              const currentStatus = fields[task.key] || 'Not Started';
              const isSaving = savingTask === task.key;

              return (
                <div
                  key={task.key}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(currentStatus)}
                    <span className="text-sm font-medium text-slate-700">{task.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin text-[#2E7DA1]" />}
                    <Select
                      value={currentStatus}
                      onValueChange={(value) => onUpdateTask(task.key, value)}
                      disabled={isSaving}
                    >
                      <SelectTrigger className={`w-36 h-8 text-xs rounded-full border ${getStatusColor(currentStatus)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {task.options.map((option) => (
                          <SelectItem key={option} value={option} className="text-sm">
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// Add Contact Modal Component for Estate Planning
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!formData.contactType) {
      toast.error('Contact type is required');
      return;
    }
    onSubmit(formData);
  };

  const contactTypes = ['Heir', 'Legatee', 'Creditor', 'Attorney'];
  const showRelationshipField = formData.contactType === 'Heir' || formData.contactType === 'Legatee';
  const states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter contact name"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactType">Type <span className="text-red-500">*</span></Label>
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
          {showRelationshipField && (
            <div className="space-y-2">
              <Label htmlFor="relationshipToDecedent">Relationship to Decedent</Label>
              <Input
                id="relationshipToDecedent"
                value={formData.relationshipToDecedent}
                onChange={(e) => setFormData({ ...formData, relationshipToDecedent: e.target.value })}
                placeholder="e.g., Spouse, Child, Parent"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
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
          <div className="space-y-2">
            <Label htmlFor="streetAddress">Street Address</Label>
            <Input
              id="streetAddress"
              value={formData.streetAddress}
              onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
              placeholder="Street address"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
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
              <Select value={formData.state} onValueChange={(v) => setFormData({ ...formData, state: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="Zip"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" className="bg-[#2E7DA1] hover:bg-[#246585]" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Adding...</> : 'Add Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EstatePlanningDetail;
