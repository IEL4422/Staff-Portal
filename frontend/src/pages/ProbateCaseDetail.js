import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { masterListApi, caseContactsApi, assetsDebtsApi, tasksApi, datesDeadlinesApi, mailApi, documentsApi, callLogApi } from '../services/api';
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
import { ArrowLeft, Loader2, User, Phone, Mail, MapPin, Calendar, FileText, DollarSign, Gavel, Edit2, Check, X, Users, Clock, Paperclip, PhoneCall, Plus } from 'lucide-react';
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
      const linkedAssetIds = fields['Assets & Debts'] || [];
      const linkedCallLogIds = fields['Call Log'] || [];
      const linkedDeadlineIds = fields['Dates & Deadlines'] || [];
      const linkedTaskIds = fields['Task List'] || [];
      const linkedDocIds = fields['Documents'] || [];
      const linkedContactIds = fields['Case Contacts'] || fields['Heirs 3'] || [];
      
      // Fetch linked records using their IDs
      const fetchPromises = [];
      
      // Assets & Debts
      if (linkedAssetIds.length > 0) {
        fetchPromises.push(
          assetsDebtsApi.getByIds(linkedAssetIds).catch(() => ({ data: { records: [] } }))
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

  // Add record handlers
  const handleAddContact = async (formData) => {
    setAddingRecord(true);
    try {
      await caseContactsApi.create({
        name: formData.name,
        contact_type: formData.contactType,
        phone: formData.phone,
        email: formData.email,
        case_id: id
      });
      toast.success('Contact added successfully');
      setShowContactModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add contact');
    } finally {
      setAddingRecord(false);
    }
  };

  const handleAddAsset = async (formData) => {
    setAddingRecord(true);
    try {
      await assetsDebtsApi.create({
        name: formData.name,
        asset_type: formData.assetType,
        asset_or_debt: formData.assetOrDebt,
        value: formData.value ? parseFloat(formData.value) : null,
        status: formData.status,
        notes: formData.notes,
        master_list_id: id
      });
      toast.success('Asset/Debt added successfully');
      setShowAssetModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add asset/debt');
    } finally {
      setAddingRecord(false);
    }
  };

  const handleAddTask = async (formData) => {
    setAddingRecord(true);
    try {
      await tasksApi.create({
        task: formData.task,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.dueDate || null,
        link_to_matter: id,
        assigned_to: formData.assignedTo || null,
        notes: formData.notes || null
      });
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

  const EditableField = ({ label, field, icon: Icon, type = 'text' }) => {
    const value = record?.fields?.[field] || '';
    const isEditing = editField === field;
    const displayValue = type === 'currency' ? formatCurrency(value) : (type === 'date' ? formatDate(value) : value);

    return (
      <div className="py-3 border-b border-slate-100 last:border-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            {Icon && <Icon className="w-4 h-4" />}
            {label}
          </div>
          {!isEditing && (
            <button
              onClick={() => startEdit(field, value)}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-1">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-9 flex-1"
              autoFocus
              type={type === 'date' ? 'date' : 'text'}
            />
            <Button size="sm" onClick={saveEdit} disabled={saving} className="h-9 w-9 p-0 bg-[#2E7DA1]">
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEdit} className="h-9 w-9 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <p className="font-medium text-slate-900 mt-1">{displayValue || '—'}</p>
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="p-2" data-testid="back-btn">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              {fields['Matter Name'] || 'Probate Case'}
            </h1>
            <Badge className="bg-purple-100 text-purple-700">Probate</Badge>
          </div>
          <p className="text-slate-500 mt-1">Case #{fields['Case Number'] || '—'}</p>
        </div>
      </div>

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
            <EditableField label="Case Number" field="Case Number" />
            <EditableField label="Stage (Probate)" field="Stage (Probate)" />
            <EditableField label="County" field="County" />
            <EditableField label="Package Purchased" field="Package Purchased" />
            <EditableField label="Is there a will?" field="Is there a will?" />
            <EditableField label="Opening Date" field="Opening Date" type="date" />
            <EditableField label="Closing Date" field="Closing Date" type="date" />
          </CardContent>
        </Card>
      </div>

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

      {/* Financial Values Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#2E7DA1]" />
            Estate Values
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Personal Property</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(fields['Total Personal Property Value'])}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Real Estate</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(fields['Real Estate Value'])}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-xs text-blue-600 mb-1">Total Assets</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(fields['Total Asset Value'])}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-xs text-red-600 mb-1">Total Debts</p>
              <p className="text-lg font-bold text-red-700">{formatCurrency(fields['Total Debt Value'])}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-xs text-green-600 mb-1">Net Value</p>
              <p className="text-lg font-bold text-green-700">{formatCurrency(fields['Net Value'])}</p>
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
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deadlines.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.fields?.Event || d.fields?.Name || d.fields?.Title || '—'}</TableCell>
                        <TableCell>{formatDate(d.fields?.Date)}</TableCell>
                        <TableCell>{d.fields?.['All Day Event'] ? 'Yes' : 'No'}</TableCell>
                        <TableCell className="max-w-xs truncate">{d.fields?.Notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Add Contact Modal */}
      <AddRecordModal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Add Contact"
        loading={addingRecord}
        onSubmit={handleAddContact}
        fields={[
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'contactType', label: 'Contact Type', type: 'select', options: ['Heir', 'Beneficiary', 'Attorney', 'Accountant', 'Financial Advisor', 'Other'] },
          { name: 'phone', label: 'Phone', type: 'text' },
          { name: 'email', label: 'Email', type: 'email' }
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
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'assetType', label: 'Type', type: 'text' },
          { name: 'assetOrDebt', label: 'Asset or Debt', type: 'select', options: ['Asset', 'Debt'], defaultValue: 'Asset' },
          { name: 'value', label: 'Value', type: 'number' },
          { name: 'status', label: 'Status', type: 'select', options: ['Not Found', 'In Progress', 'Completed'] },
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
          { name: 'status', label: 'Status', type: 'select', options: ['Not Started', 'In Progress', 'Waiting', 'Done'], defaultValue: 'Not Started' },
          { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Normal', 'High', 'Urgent'], defaultValue: 'Normal' },
          { name: 'dueDate', label: 'Due Date', type: 'date' },
          { name: 'assignedTo', label: 'Assigned To', type: 'select', options: ['Brittany Hardy', 'Mary Liberty', 'Jessica Sallows'] },
          { name: 'notes', label: 'Notes', type: 'textarea' }
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
          { name: 'docType', label: 'Type', type: 'text' },
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
          { name: 'subject', label: 'Mailing Speed', type: 'select', options: ['Regular', 'Certified', 'Priority', 'Overnight'] },
          { name: 'body', label: 'Notes', type: 'textarea' }
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
    </div>
  );
};

// Reusable Add Record Modal Component
const AddRecordModal = ({ open, onClose, title, loading, onSubmit, fields }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (open) {
      // Initialize form with default values
      const defaults = {};
      fields.forEach(f => {
        defaults[f.name] = f.defaultValue || '';
      });
      setFormData(defaults);
    }
  }, [open, fields]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
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
          ))}
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
