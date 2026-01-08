import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { masterListApi, caseContactsApi, caseTasksApi, documentsApi, callLogApi, webhooksApi, datesDeadlinesApi } from '../services/api';
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
import { ArrowLeft, Loader2, User, Phone, Mail, FileText, Edit2, Check, X, Users, ClipboardList, PhoneCall, Calendar, MapPin, StickyNote, Plus, ExternalLink, Send, CheckCircle, ChevronDown, Circle, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const EstatePlanningDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
  
  // Detail view modals
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedDeadline, setSelectedDeadline] = useState(null);

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
      const linkedCallLogIds = fields['Call Log'] || [];
      
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
      
      // Call Log
      if (linkedCallLogIds.length > 0) {
        fetchPromises.push(
          callLogApi.getByIds(linkedCallLogIds).catch(() => ({ data: { records: [] } }))
        );
      } else {
        fetchPromises.push(Promise.resolve({ data: { records: [] } }));
      }
      
      const [contactsRes, tasksRes, docsRes, callLogRes] = await Promise.all(fetchPromises);
      
      setContacts(contactsRes.data.records || []);
      setTasks(tasksRes.data.records || []);
      setDocuments(docsRes.data.records || []);
      setCallLog(callLogRes.data.records || []);
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
      const errorMessage = error.response?.data?.detail || 'Failed to update task';
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
          <CardHeader className="pb-0">
            <TabsList className="bg-slate-100 p-1">
              <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
              <TabsTrigger value="calllog">Call Log ({callLog.length})</TabsTrigger>
              <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            <TabsContent value="documents">
              <div className="flex justify-end mb-4">
                <Button 
                  size="sm" 
                  onClick={() => navigate('/actions/upload-file')}
                  className="bg-[#2E7DA1] hover:bg-[#256a8a]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document
                </Button>
              </div>
              {documents.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No documents linked</p>
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
                        <TableCell>{doc.fields?.Date || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="tasks">
              <div className="flex justify-end mb-4">
                <Button 
                  size="sm" 
                  onClick={() => navigate('/actions/add-task')}
                  className="bg-[#2E7DA1] hover:bg-[#256a8a]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
              {tasks.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No tasks linked</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Completed Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.fields?.Title || t.fields?.Task || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{t.fields?.Status || 'Unknown'}</Badge></TableCell>
                        <TableCell>{t.fields?.Priority || '—'}</TableCell>
                        <TableCell>{formatDate(t.fields?.['Due Date'])}</TableCell>
                        <TableCell>{formatDate(t.fields?.['Completed Date'] || t.fields?.['Date Completed'])}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="calllog">
              <div className="flex justify-end mb-4">
                <Button 
                  size="sm" 
                  onClick={() => navigate('/actions/add-call-log')}
                  className="bg-[#2E7DA1] hover:bg-[#256a8a]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Call Log
                </Button>
              </div>
              {callLog.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No call log entries</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callLog.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.fields?.Date || '—'}</TableCell>
                        <TableCell>{c.fields?.Duration || '—'}</TableCell>
                        <TableCell>{c.fields?.Notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="contacts">
              <div className="flex justify-end mb-4">
                <Button 
                  size="sm" 
                  onClick={() => navigate('/actions/add-case-contact')}
                  className="bg-[#2E7DA1] hover:bg-[#256a8a]"
                >
                  <Plus className="w-4 h-4 mr-2" />
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
                      <TableHead>Role</TableHead>
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
                        <TableCell>{c.fields?.Role || c.fields?.Type || '—'}</TableCell>
                        <TableCell>{c.fields?.Phone || '—'}</TableCell>
                        <TableCell>{c.fields?.Email || '—'}</TableCell>
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
    </div>
  );
};

// Estate Planning Task Tracker Component
const EstatePlanningTaskTracker = ({ fields, onUpdateTask, savingTask }) => {
  const [isOpen, setIsOpen] = useState(true);

  // Status options for tasks
  const yesNoOptions = ['Yes', 'No', 'Not Applicable'];
  const statusOptions = ['Done', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable'];

  const estatePlanningTasks = [
    { key: 'Questionnaire Completed?', label: 'Questionnaire Completed', options: yesNoOptions },
    { key: 'Planning Session 2', label: 'Planning Session', options: statusOptions },
    { key: 'Drafting', label: 'Drafting', options: statusOptions },
    { key: 'Client Review', label: 'Client Review', options: statusOptions },
    { key: 'Notarization Session', label: 'Notarization Session', options: statusOptions },
    { key: 'Physical Portfolio', label: 'Physical Portfolio', options: statusOptions },
    { key: 'Trust Funding', label: 'Trust Funding', options: statusOptions }
  ];

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'done': 
      case 'yes':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'in progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'waiting':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'not applicable':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'no':
      case 'not started':
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
      case 'waiting':
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <Circle className="w-4 h-4 text-slate-400" />;
    }
  };

  const calculateProgress = () => {
    const completed = estatePlanningTasks.filter(task => {
      const status = (fields[task.key] || '').toLowerCase();
      return status === 'done' || status === 'yes';
    }).length;
    return Math.round((completed / estatePlanningTasks.length) * 100);
  };

  const completedCount = estatePlanningTasks.filter(task => {
    const status = (fields[task.key] || '').toLowerCase();
    return status === 'done' || status === 'yes';
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

export default EstatePlanningDetail;
