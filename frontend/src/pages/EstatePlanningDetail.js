import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { masterListApi, caseContactsApi, caseTasksApi, documentsApi, callLogApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Loader2, User, Phone, Mail, FileText, Edit2, Check, X, Users, ClipboardList, PhoneCall, Calendar, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const EstatePlanningDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStage, setSavingStage] = useState(false);
  const [record, setRecord] = useState(null);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');

  const [contacts, setContacts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [callLog, setCallLog] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recordRes, contactsRes, tasksRes, docsRes, callLogRes] = await Promise.all([
        masterListApi.getOne(id),
        caseContactsApi.getAll(id).catch(() => ({ data: { records: [] } })),
        caseTasksApi.getAll(id).catch(() => ({ data: { records: [] } })),
        documentsApi.getAll(id).catch(() => ({ data: { records: [] } })),
        callLogApi.getAll(id).catch(() => ({ data: { records: [] } }))
      ]);

      setRecord(recordRes.data);
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

  // Field options for dropdown fields
  const fieldOptions = {
    'Stage (EP)': ['1 - Questionnaire', '2 - Drafting', '3 - Sent to Client', '4 - Review', '5 - Signing', '6 - Complete'],
    'Package Purchased': ['Estate Planning Package', 'Trust Package', 'Will Only', 'POA Only', 'Comprehensive Package'],
    'Active/Inactive': ['Active', 'Inactive'],
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="p-2" data-testid="back-btn">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              {fields.Matter || 'Estate Planning Case'}
            </h1>
            <Badge className="bg-blue-100 text-blue-700">Estate Planning</Badge>
          </div>
          <p className="text-slate-500 mt-1">Case #{fields['Case Number'] || id}</p>
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
            <EditableField label="Package Purchased" field="Package Purchased" />
            <EditableField label="Stage (EP)" field="Stage (EP)" />
            <EditableField label="Email" field="Email" icon={Mail} />
            <EditableField label="Phone Number" field="Phone Number" icon={Phone} />
            <EditableField label="Spouse Full Name" field="Spouse Full Name" icon={Users} />
            <EditableField label="Spouse Email" field="Spouse Email" icon={Mail} />
            <EditableField label="Case Notes" field="Case Notes" icon={FileText} />
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#2E7DA1]" />
              Case Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500">Documents</p>
                <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500">Tasks</p>
                <p className="text-2xl font-bold text-slate-900">{tasks.length}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500">Contacts</p>
                <p className="text-2xl font-bold text-slate-900">{contacts.length}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500">Call Log</p>
                <p className="text-2xl font-bold text-slate-900">{callLog.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                        <TableCell className="font-medium">{t.fields?.Title || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{t.fields?.Status || 'Unknown'}</Badge></TableCell>
                        <TableCell>{t.fields?.Priority || '—'}</TableCell>
                        <TableCell>{t.fields?.['Due Date'] || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="calllog">
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
                        <TableCell>{c.fields?.Role || '—'}</TableCell>
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
    </div>
  );
};

export default EstatePlanningDetail;
