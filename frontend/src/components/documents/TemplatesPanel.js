import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import {
  Upload, Search, FileText, File, Trash2, Loader2, Plus, X, FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { templatesApi } from '../../services/documentsApi';

const CASE_TYPES = ['Deed', 'Estate Planning', 'Probate', 'Prenuptial Agreement'];
const COUNTIES = ['Cook', 'Kane', 'DuPage', 'Lake', 'Will', 'Statewide'];
const CATEGORIES = ['Court Order', 'Legal Letter', 'Deed', 'Form', 'Agreement', 'Other'];

const TemplatesPanel = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCaseType, setFilterCaseType] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    file: null, name: '', caseType: '', county: '', category: 'Other'
  });
  const [detectedVars, setDetectedVars] = useState([]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (filterCaseType && filterCaseType !== 'all') filters.case_type = filterCaseType;
      if (searchQuery) filters.search = searchQuery;
      const res = await templatesApi.getAll(filters);
      setTemplates(res.data || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  }, [filterCaseType, searchQuery]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.name.endsWith('.docx') ? 'DOCX' : 'FILLABLE_PDF';
    setUploadForm(prev => ({ ...prev, file, name: prev.name || file.name.replace(/\.(docx|pdf)$/i, '') }));
    try {
      let res;
      if (type === 'DOCX') {
        res = await templatesApi.detectDocxVariables(file);
        setDetectedVars(res.data?.variables || []);
      } else {
        res = await templatesApi.detectPdfFields(file);
        setDetectedVars((res.data?.fields || []).map(f => f.name || f));
      }
    } catch {
      setDetectedVars([]);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.name || !uploadForm.caseType) {
      toast.error('Please fill in all required fields');
      return;
    }
    setUploading(true);
    try {
      const type = uploadForm.file.name.endsWith('.docx') ? 'DOCX' : 'FILLABLE_PDF';
      await templatesApi.upload(
        uploadForm.file, uploadForm.name, type,
        uploadForm.county, uploadForm.caseType, uploadForm.category
      );
      toast.success('Template uploaded');
      setShowUpload(false);
      setUploadForm({ file: null, name: '', caseType: '', county: '', category: 'Other' });
      setDetectedVars([]);
      fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete template "${name}"?`)) return;
    try {
      await templatesApi.delete(id);
      toast.success('Template deleted');
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const filtered = templates.filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.name?.toLowerCase().includes(q) && !t.template_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-10"
            />
          </div>
          <Select value={filterCaseType} onValueChange={setFilterCaseType}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Case type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Case Types</SelectItem>
              {CASE_TYPES.map(ct => (
                <SelectItem key={ct} value={ct}>{ct}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowUpload(true)} className="bg-[#2E7DA1] hover:bg-[#256a8a]">
          <Plus className="w-4 h-4 mr-2" />
          Upload Template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#2E7DA1]" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No templates found</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowUpload(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload your first template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const isDocx = t.template_type === 'DOCX';
            const vars = t.detected_variables || [];
            const pdfFields = t.detected_pdf_fields || [];
            const fieldCount = isDocx ? vars.length : pdfFields.length;
            const displayName = t.name || t.template_name || 'Untitled';
            return (
              <Card key={t.id} className="group hover:shadow-md transition-all duration-200 border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDocx ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                        {isDocx ? <FileText className="w-5 h-5" /> : <File className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm leading-tight">{displayName}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{isDocx ? 'DOCX' : 'PDF'}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-slate-400 hover:text-red-500"
                      onClick={() => handleDelete(t.id, displayName)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {t.case_type && (
                      <Badge variant="outline" className="text-xs bg-slate-50">{t.case_type}</Badge>
                    )}
                    {t.county && (
                      <Badge variant="outline" className="text-xs bg-slate-50">{t.county}</Badge>
                    )}
                    {t.category && t.category !== 'Other' && (
                      <Badge variant="outline" className="text-xs bg-slate-50">{t.category}</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{fieldCount} {fieldCount === 1 ? 'field' : 'fields'} detected</span>
                    {t.mapping_json && Object.keys(t.mapping_json?.fields || t.mapping_json?.pdfFields || {}).length > 0 && (
                      <Badge className="bg-green-100 text-green-700 text-xs border-0">Mapped</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Template File *</label>
              <Input type="file" accept=".docx,.pdf" onChange={handleFileChange} />
              <p className="text-xs text-slate-400 mt-1">Supports .docx and fillable .pdf files</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Template Name *</label>
              <Input
                value={uploadForm.name}
                onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Quit Claim Deed - Cook County"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Case Type *</label>
                <Select value={uploadForm.caseType} onValueChange={(v) => setUploadForm(prev => ({ ...prev, caseType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {CASE_TYPES.map(ct => <SelectItem key={ct} value={ct}>{ct}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">County</label>
                <Select value={uploadForm.county} onValueChange={(v) => setUploadForm(prev => ({ ...prev, county: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {COUNTIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Category</label>
              <Select value={uploadForm.category} onValueChange={(v) => setUploadForm(prev => ({ ...prev, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {detectedVars.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-medium text-slate-600 mb-2">
                  {detectedVars.length} fields detected:
                </p>
                <div className="flex flex-wrap gap-1">
                  {detectedVars.slice(0, 20).map((v, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-mono bg-white">{v}</Badge>
                  ))}
                  {detectedVars.length > 20 && (
                    <Badge variant="outline" className="text-xs">+{detectedVars.length - 20} more</Badge>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading} className="bg-[#2E7DA1] hover:bg-[#256a8a]">
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4 mr-2" /> Upload</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplatesPanel;
