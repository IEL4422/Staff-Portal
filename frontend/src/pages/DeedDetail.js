import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { masterListApi, caseContactsApi, caseTasksApi, documentsApi, callLogApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Loader2, User, Phone, Mail, FileText, Edit2, Check, X, Home, StickyNote, Plus, CheckCircle, Paperclip, PhoneCall, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DeedDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completingCase, setCompletingCase] = useState(false);
  const [record, setRecord] = useState(null);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');

  const [contacts, setContacts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [callLog, setCallLog] = useState([]);

  const fetchData = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Action Handlers
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

  const startEdit = (field, value) => {
    setEditField(field);
    setEditValue(value || '');
  };

  const cancelEdit = () => {
    setEditField(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editField) return;
    setSaving(true);
    try {
      await masterListApi.update(id, { [editField]: editValue });
      setRecord(prev => ({
        ...prev,
        fields: { ...prev.fields, [editField]: editValue }
      }));
      toast.success('Field updated');
      cancelEdit();
    } catch (error) {
      toast.error('Failed to update');
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

  // Field options for dropdown fields
  const fieldOptions = {
    'Stage (EP)': ['Not Started', 'In Progress', 'Pending Recording', 'Recorded', 'Complete'],
    'Deed Type': ['Warranty Deed', 'Quitclaim Deed', 'Lady Bird Deed', 'Beneficiary Deed', 'Transfer on Death Deed'],
    'Recording Status': ['Not Recorded', 'Pending', 'Recorded'],
    'Active/Inactive': ['Active', 'Inactive', 'Completed']
  };

  const EditableField = ({ label, field, icon: Icon, type = 'text', options }) => {
    const rawValue = record?.fields?.[field];
    const value = rawValue !== undefined ? rawValue : '';
    const isEditing = editField === field;

    const getDisplayValue = () => {
      if (type === 'date') return formatDate(value);
      return value || '—';
    };

    const getInputType = () => {
      if (options || fieldOptions[field]) return 'select';
      if (type === 'date') return 'date';
      return 'text';
    };

    const inputType = getInputType();
    const selectOptions = options || fieldOptions[field];

    const handleStartEdit = () => {
      let initialValue = value;
      if (type === 'date' && value) {
        try {
          const date = new Date(value);
          initialValue = date.toISOString().split('T')[0];
        } catch {
          initialValue = value;
        }
      }
      startEdit(field, initialValue);
    };

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
            <button onClick={handleStartEdit} className="p-1 hover:bg-slate-100 rounded transition-colors">
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
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="deed-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/')} className="p-2" data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                {fields.Matter || fields['Matter Name'] || 'Deed Case'}
              </h1>
              <Badge className="bg-green-100 text-green-700">Deed</Badge>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
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
            <EditableField label="Matter" field="Matter" />
            <EditableField label="Client" field="Client" icon={User} />
            <EditableField label="Email" field="Email" icon={Mail} />
            <EditableField label="Email Address" field="Email Address" icon={Mail} />
            <EditableField label="Phone Number" field="Phone Number" icon={Phone} />
            <EditableField label="Package Purchased" field="Package Purchased" />
            <EditableField label="Stage" field="Stage (EP)" />
          </CardContent>
        </Card>

        {/* Property Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="w-4 h-4 text-[#2E7DA1]" />
              Property Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditableField label="Property Address" field="Address" />
            <EditableField label="County" field="County" />
            <EditableField label="Deed Type" field="Deed Type" />
            <EditableField label="Recording Status" field="Recording Status" />
            <EditableField label="Case Notes" field="Case Notes" icon={FileText} />
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
              <TabsTrigger value="documents">
                <Paperclip className="w-4 h-4 mr-1" />
                Documents ({documents.length})
              </TabsTrigger>
              <TabsTrigger value="tasks">
                <FileText className="w-4 h-4 mr-1" />
                Tasks ({tasks.length})
              </TabsTrigger>
              <TabsTrigger value="calllog">
                <PhoneCall className="w-4 h-4 mr-1" />
                Call Log ({callLog.length})
              </TabsTrigger>
              <TabsTrigger value="contacts">
                <Users className="w-4 h-4 mr-1" />
                Contacts ({contacts.length})
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Documents Tab */}
            <TabsContent value="documents">
              <div className="flex justify-end mb-4">
                <Button
                  size="sm"
                  onClick={() => navigate('/actions/upload-file')}
                  className="bg-[#2E7DA1] hover:bg-[#256a8a] rounded-full"
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
                        <TableCell>{formatDate(doc.fields?.Date)}</TableCell>
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
                  onClick={() => navigate('/actions/add-task')}
                  className="bg-[#2E7DA1] hover:bg-[#256a8a] rounded-full"
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.fields?.Title || t.fields?.Name || t.fields?.Task || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{t.fields?.Status || 'Unknown'}</Badge></TableCell>
                        <TableCell>{t.fields?.Priority || '—'}</TableCell>
                        <TableCell>{formatDate(t.fields?.['Due Date'])}</TableCell>
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
                  onClick={() => navigate('/actions/add-call-log')}
                  className="bg-[#2E7DA1] hover:bg-[#256a8a] rounded-full"
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

            {/* Contacts Tab */}
            <TabsContent value="contacts">
              <div className="flex justify-end mb-4">
                <Button
                  size="sm"
                  onClick={() => navigate('/actions/add-case-contact')}
                  className="bg-[#2E7DA1] hover:bg-[#256a8a] rounded-full"
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
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.fields?.Name || '—'}</TableCell>
                        <TableCell>{c.fields?.['Contact Type'] || c.fields?.Role || '—'}</TableCell>
                        <TableCell>{c.fields?.Phone || c.fields?.['Phone Number'] || '—'}</TableCell>
                        <TableCell>{c.fields?.Email || c.fields?.['Email Address'] || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default DeedDetail;
