import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { masterListApi, callLogApi, webhooksApi, filesApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ArrowLeft, Loader2, User, Phone, Mail, Calendar, FileText, Edit2, Check, X, MessageSquare, Target, Send, Briefcase, Upload, Paperclip, ExternalLink, File, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingCSA, setSendingCSA] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [record, setRecord] = useState(null);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [callLog, setCallLog] = useState([]);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recordRes, callLogRes] = await Promise.all([
        masterListApi.getOne(id),
        callLogApi.getAll(id).catch(() => ({ data: { records: [] } }))
      ]);

      setRecord(recordRes.data);
      setCallLog(callLogRes.data.records || []);
    } catch (error) {
      console.error('Failed to fetch lead data:', error);
      toast.error('Failed to load lead details');
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

  const handleSendCSA = async () => {
    const fields = record?.fields || {};
    const clientName = fields.Client || fields['Matter Name'] || '';
    const firstName = clientName.split(' ')[0] || '';
    const emailAddress = fields['Email Address'] || '';
    const recommendedService = fields['Recommended Service'] || '';

    if (!emailAddress) {
      toast.error('Email address is required to send CSA');
      return;
    }

    setSendingCSA(true);
    try {
      const response = await webhooksApi.sendCSA({
        record_id: id,
        first_name: firstName,
        email_address: emailAddress,
        recommended_service: recommendedService
      });

      setRecord(prev => ({
        ...prev,
        fields: { ...prev.fields, 'Date CSA Sent': response.data.date_sent }
      }));

      toast.success('CSA sent successfully!');
    } catch (error) {
      console.error('Failed to send CSA:', error);
      toast.error('Failed to send CSA');
    } finally {
      setSendingCSA(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For Airtable attachments, we need to upload to a publicly accessible URL first
    // Since we don't have a file hosting service, we'll show a message about this limitation
    toast.info('File selected: ' + file.name + '. Note: Direct file upload requires a file hosting service. Please use a URL to attach files.');
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddFileUrl = async () => {
    const url = prompt('Enter the URL of the file to attach:');
    if (!url) return;

    setUploadingFile(true);
    try {
      // Get existing attachments
      const existingAttachments = record?.fields?.['Files & Notes'] || [];
      const newAttachment = { url: url };
      
      // Update with new attachment
      await masterListApi.update(id, { 
        'Files & Notes': [...existingAttachments, newAttachment]
      });
      
      // Refresh record
      const updatedRecord = await masterListApi.getOne(id);
      setRecord(updatedRecord.data);
      
      toast.success('File attached successfully!');
    } catch (error) {
      console.error('Failed to attach file:', error);
      toast.error('Failed to attach file. Make sure the URL is valid.');
    } finally {
      setUploadingFile(false);
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
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
            <button onClick={() => startEdit(field, value)} className="p-1 hover:bg-slate-100 rounded transition-colors">
              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-1">
            <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-9 flex-1" autoFocus />
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

  // Render attachments for Files & Notes field
  const renderAttachments = () => {
    const attachments = record?.fields?.['Files & Notes'];
    
    if (!attachments || attachments.length === 0) {
      return <p className="text-slate-500 text-sm">No files attached</p>;
    }

    return (
      <div className="space-y-2">
        {attachments.map((attachment, index) => (
          <a
            key={index}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#2E7DA1] hover:underline"
          >
            <Paperclip className="w-4 h-4" />
            {attachment.filename || attachment.url.split('/').pop() || `Attachment ${index + 1}`}
            <ExternalLink className="w-3 h-3" />
          </a>
        ))}
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
        <p className="text-slate-500">Lead not found</p>
        <Button onClick={() => navigate('/')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  const fields = record.fields || {};

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="lead-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/')} className="p-2" data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                {fields['Matter Name'] || fields.Client || 'Lead'}
              </h1>
              <Badge className="bg-amber-100 text-amber-700">Lead</Badge>
            </div>
            <p className="text-slate-500 mt-1">Lead ID: {id}</p>
          </div>
        </div>
        
        <Button
          onClick={handleSendCSA}
          disabled={sendingCSA}
          className="rounded-full bg-[#2E7DA1] hover:bg-[#246585] px-6"
          data-testid="send-csa-btn"
        >
          {sendingCSA ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Send CSA
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-[#2E7DA1]" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditableField label="Matter" field="Matter Name" />
            <EditableField label="Consult Status" field="Consult Status" />
            <EditableField label="Client" field="Client" icon={User} />
            <EditableField label="Email" field="Email Address" icon={Mail} />
            <EditableField label="Phone Number" field="Phone Number" icon={Phone} />
            <EditableField label="Date of Consult" field="Date of Consult" icon={Calendar} />
          </CardContent>
        </Card>

        {/* Lead Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-[#2E7DA1]" />
              Lead Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditableField label="Lead Type" field="Lead Type" />
            <EditableField label="Referral Source" field="Referral Source" />
            <EditableField label="Recommended Service" field="Recommended Service" icon={Briefcase} />
            <EditableField label="Inquiry Notes" field="Inquiry Notes" icon={MessageSquare} />
            <EditableField label="Case Notes" field="Case Notes" icon={FileText} />
          </CardContent>
        </Card>
      </div>

      {/* Files & Notes Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-[#2E7DA1]" />
              Files & Notes
            </CardTitle>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                data-testid="file-input"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddFileUrl}
                disabled={uploadingFile}
                className="rounded-full"
                data-testid="add-file-url-btn"
              >
                {uploadingFile ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Upload className="w-4 h-4 mr-1" />
                )}
                Add File URL
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderAttachments()}
        </CardContent>
      </Card>

      {/* Call Log */}
      <Card className="border-0 shadow-sm">
        <Tabs defaultValue="calllog" className="w-full">
          <CardHeader className="pb-0">
            <TabsList className="bg-slate-100 p-1">
              <TabsTrigger value="calllog">Call Log ({callLog.length})</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            <TabsContent value="calllog">
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
                        <TableCell className="font-medium">
                          {formatDate(c.fields?.Date)}
                        </TableCell>
                        <TableCell>
                          {c.fields?.['Call Summary'] || c.fields?.Notes || c.fields?.Summary || '—'}
                        </TableCell>
                        <TableCell>
                          {c.fields?.['Staff Caller'] || c.fields?.Caller || c.fields?.Staff || '—'}
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

      {/* Follow Up Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-[#2E7DA1]" />
            Follow Up Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="py-3">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Calendar className="w-4 h-4" />
                  Date CSA Sent
                </div>
                <p className="font-medium text-slate-900 mt-1">
                  {fields['Date CSA Sent'] ? formatDateTime(fields['Date CSA Sent']) : '—'}
                </p>
              </div>
            </div>
            <div>
              <EditableField label="Custom CSA Sent" field="Custom CSA Sent" />
            </div>
            <div>
              <EditableField label="Follow Up Sent" field="Follow Up Sent" />
            </div>
            <div>
              <EditableField label="Auto Lead Follow Up" field="Auto Lead Follow Up" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadDetail;
