import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { masterListApi, caseContactsApi, assetsDebtsApi, caseTasksApi, datesDeadlinesApi, judgeInfoApi, mailApi, documentsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ArrowLeft, Save, Loader2, User, Phone, Mail, MapPin, Calendar, FileText, DollarSign, Users, Gavel, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

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
  const [judges, setJudges] = useState([]);
  const [mails, setMails] = useState([]);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recordRes, contactsRes, assetsRes, tasksRes, judgesRes, mailsRes, docsRes] = await Promise.all([
        masterListApi.getOne(id),
        caseContactsApi.getAll(id).catch(() => ({ data: { records: [] } })),
        assetsDebtsApi.getAll(id).catch(() => ({ data: { records: [] } })),
        caseTasksApi.getAll(id).catch(() => ({ data: { records: [] } })),
        judgeInfoApi.getAll().catch(() => ({ data: { records: [] } })),
        mailApi.getAll(id).catch(() => ({ data: { records: [] } })),
        documentsApi.getAll(id).catch(() => ({ data: { records: [] } }))
      ]);

      setRecord(recordRes.data);
      setContacts(contactsRes.data.records || []);
      setAssetsDebts(assetsRes.data.records || []);
      setTasks(tasksRes.data.records || []);
      setJudges(judgesRes.data.records || []);
      setMails(mailsRes.data.records || []);
      setDocuments(docsRes.data.records || []);
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

  const EditableField = ({ label, field, icon: Icon }) => {
    const value = record?.fields?.[field] || '';
    const isEditing = editField === field;

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
              data-testid={`edit-${field}`}
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
              data-testid={`input-${field}`}
            />
            <Button size="sm" onClick={saveEdit} disabled={saving} className="h-9 w-9 p-0 bg-[#2E7DA1]">
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEdit} className="h-9 w-9 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <p className="font-medium text-slate-900 mt-1">{value || '—'}</p>
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
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="p-2"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              {fields.Matter || 'Probate Case'}
            </h1>
            <Badge className="bg-purple-100 text-purple-700">Probate</Badge>
          </div>
          <p className="text-slate-500 mt-1">Case #{fields['Case Number'] || id}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Client Info */}
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-[#2E7DA1]" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditableField label="Matter" field="Matter" />
            <EditableField label="Case Number" field="Case Number" />
            <EditableField label="Case Type" field="Case Type" />
            <EditableField label="Package Purchased" field="Package Purchased" />
            <EditableField label="Client" field="Client" icon={User} />
            <EditableField label="Phone Number" field="Phone Number" icon={Phone} />
            <EditableField label="Email" field="Email" icon={Mail} />
            <EditableField label="Address" field="Address" icon={MapPin} />
            <EditableField label="Last Contact" field="Last Contact" icon={Calendar} />
          </CardContent>
        </Card>

        {/* Middle Column - Decedent Info */}
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2E7DA1]" />
              Decedent Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditableField label="Decedent Name" field="Decedent Name" />
            <EditableField label="Decedent Last Known Address" field="Decedent Last Known Address" />
            <EditableField label="Decedent Date of Birth" field="Decedent Date of Birth" />
            <EditableField label="Decedent Date of Death" field="Decedent Date of Death" />
            <EditableField label="Real Estate to be sold" field="Real Estate to be sold" />
            <EditableField label="Case Notes" field="Case Notes" />
          </CardContent>
        </Card>

        {/* Right Column - Case Info */}
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gavel className="w-4 h-4 text-[#2E7DA1]" />
              Case Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditableField label="Stage (Probate)" field="Stage (Probate)" />
            <EditableField label="County" field="County" />
            <EditableField label="Is there a will" field="Is there a will" />
            <EditableField label="Opening Date" field="Opening Date" />
            <EditableField label="Closing Date" field="Closing Date" />
            <EditableField label="Creditor Notification Deadline" field="Creditor Notification Deadline" />
            <EditableField label="Total Personal Property Value" field="Total Personal Property Value" icon={DollarSign} />
            <EditableField label="Real Estate Value" field="Real Estate Value" icon={DollarSign} />
            <EditableField label="Total Asset Value" field="Total Asset Value" icon={DollarSign} />
            <EditableField label="Net Value" field="Net Value" icon={DollarSign} />
            <EditableField label="Total Debt Value" field="Total Debt Value" icon={DollarSign} />
          </CardContent>
        </Card>
      </div>

      {/* Linked Data Tabs */}
      <Card className="border-0 shadow-sm">
        <Tabs defaultValue="contacts" className="w-full">
          <CardHeader className="pb-0">
            <TabsList className="bg-slate-100 p-1">
              <TabsTrigger value="contacts" data-testid="tab-contacts">Contacts ({contacts.length})</TabsTrigger>
              <TabsTrigger value="assets" data-testid="tab-assets">Assets & Debts ({assetsDebts.length})</TabsTrigger>
              <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks ({tasks.length})</TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents">Documents ({documents.length})</TabsTrigger>
              <TabsTrigger value="mail" data-testid="tab-mail">Mail ({mails.length})</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
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

            <TabsContent value="assets">
              {assetsDebts.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No assets or debts linked</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assetsDebts.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.fields?.Description || item.fields?.Name || '—'}</TableCell>
                        <TableCell>{item.fields?.Type || '—'}</TableCell>
                        <TableCell>{item.fields?.Value ? `$${item.fields.Value.toLocaleString()}` : '—'}</TableCell>
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
                        <TableCell>
                          <Badge variant="outline">{t.fields?.Status || 'Unknown'}</Badge>
                        </TableCell>
                        <TableCell>{t.fields?.Priority || '—'}</TableCell>
                        <TableCell>{t.fields?.['Due Date'] || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

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

            <TabsContent value="mail">
              {mails.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No mail records</p>
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
                        <TableCell className="font-medium">{m.fields?.Recipient || '—'}</TableCell>
                        <TableCell>{m.fields?.Subject || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{m.fields?.Status || 'Unknown'}</Badge>
                        </TableCell>
                        <TableCell>{m.fields?.Date || '—'}</TableCell>
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

export default ProbateCaseDetail;
