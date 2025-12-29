import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { webhooksApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, ArrowLeft, File } from 'lucide-react';
import { toast } from 'sonner';

const UploadFilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    caseId: '',
    clientName: '',
    fileName: '',
    fileType: '',
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await webhooksApi.uploadFile(formData);
      toast.success('File upload initiated (placeholder)');
      setFormData({ caseId: '', clientName: '', fileName: '', fileType: '', notes: '' });
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="upload-file-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <Upload className="w-8 h-8 inline-block mr-3 text-[#2E7DA1]" />
            Upload File to Client Portal
          </h1>
          <p className="text-slate-500 mt-1">Upload file notification (webhook placeholder)</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope' }}>File Upload Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="caseId">Case ID</Label>
                <Input
                  id="caseId"
                  value={formData.caseId}
                  onChange={(e) => setFormData({ ...formData, caseId: e.target.value })}
                  placeholder="Enter case ID"
                  required
                  data-testid="case-id-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="Enter client name"
                  required
                  data-testid="client-name-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fileName">File Name</Label>
                <Input
                  id="fileName"
                  value={formData.fileName}
                  onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                  placeholder="document.pdf"
                  required
                  data-testid="file-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fileType">File Type</Label>
                <Input
                  id="fileType"
                  value={formData.fileType}
                  onChange={(e) => setFormData({ ...formData, fileType: e.target.value })}
                  placeholder="PDF, DOCX, etc."
                  data-testid="file-type-input"
                />
              </div>
            </div>

            {/* File drop zone placeholder */}
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50">
              <File className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <p className="text-slate-600 font-medium">File upload area</p>
              <p className="text-slate-400 text-sm mt-1">This is a placeholder for the actual file upload webhook</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about the file..."
                rows={3}
                data-testid="notes-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
              disabled={loading}
              data-testid="submit-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Upload className="w-5 h-5 mr-2" />}
              Upload File
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadFilePage;
