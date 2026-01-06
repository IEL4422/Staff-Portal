import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsApi, masterListApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Upload, Loader2, ArrowLeft, Check, Search, X, FileText } from 'lucide-react';
import { toast } from 'sonner';

const UploadFilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    documentName: '',
    matter: null,
    file: null
  });
  
  // Matter search state
  const [matterSearchQuery, setMatterSearchQuery] = useState('');
  const [matterSearchResults, setMatterSearchResults] = useState([]);
  const [searchingMatters, setSearchingMatters] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState(null);

  const searchMatters = async (query) => {
    if (!query || query.length < 2) {
      setMatterSearchResults([]);
      return;
    }
    
    setSearchingMatters(true);
    try {
      const response = await masterListApi.search(query);
      setMatterSearchResults(response.data.records || []);
    } catch (error) {
      console.error('Failed to search matters:', error);
      toast.error('Failed to search matters');
    } finally {
      setSearchingMatters(false);
    }
  };

  const handleMatterSearch = (e) => {
    const query = e.target.value;
    setMatterSearchQuery(query);
    searchMatters(query);
  };

  const selectMatter = (matter) => {
    setSelectedMatter(matter);
    setFormData({ ...formData, matter: matter.id });
    setMatterSearchQuery('');
    setMatterSearchResults([]);
  };

  const clearMatter = () => {
    setSelectedMatter(null);
    setFormData({ ...formData, matter: null });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, file });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.documentName.trim()) {
      toast.error('Document Name is required');
      return;
    }

    setLoading(true);

    try {
      const data = {
        name: formData.documentName.trim()
      };

      // Add matter if selected
      if (formData.matter) {
        data.master_list = [formData.matter];
      }

      // Handle file upload - Airtable accepts URL or base64
      if (formData.file) {
        // For Airtable, we need to convert to base64 or use a URL
        // Here we'll create an attachment object with the file
        const reader = new FileReader();
        reader.onload = async () => {
          data.attachments = [{
            url: reader.result,
            filename: formData.file.name
          }];
          
          try {
            await documentsApi.create(data);
            toast.success('Document uploaded successfully!');
            
            // Reset form
            setFormData({ documentName: '', matter: null, file: null });
            setSelectedMatter(null);
            
            // Navigate back
            setTimeout(() => navigate(-1), 1500);
          } catch (error) {
            console.error('Failed to upload document:', error);
            toast.error(error.response?.data?.detail || 'Failed to upload document');
          } finally {
            setLoading(false);
          }
        };
        reader.readAsDataURL(formData.file);
      } else {
        // No file, just create the record
        await documentsApi.create(data);
        toast.success('Document record created successfully!');
        
        // Reset form
        setFormData({ documentName: '', matter: null, file: null });
        setSelectedMatter(null);
        
        // Navigate back
        setTimeout(() => navigate(-1), 1500);
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to upload document:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload document');
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <Upload className="w-7 h-7 inline-block mr-2 text-[#2E7DA1]" />
            Upload File
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <Card className="border-0 shadow-sm max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Document Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Document Name */}
            <div className="space-y-2">
              <Label htmlFor="documentName">Document Name <span className="text-red-500">*</span></Label>
              <Input
                id="documentName"
                value={formData.documentName}
                onChange={(e) => setFormData({ ...formData, documentName: e.target.value })}
                placeholder="Enter document name"
                required
              />
            </div>

            {/* Matter Search */}
            <div className="space-y-2">
              <Label>Matter</Label>
              {selectedMatter ? (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  <FileText className="w-4 h-4 text-[#2E7DA1]" />
                  <span className="flex-1 font-medium">
                    {selectedMatter.fields?.['Matter Name'] || selectedMatter.fields?.Client || 'Selected Matter'}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearMatter}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={matterSearchQuery}
                    onChange={handleMatterSearch}
                    placeholder="Search matters..."
                    className="pl-9"
                  />
                  {searchingMatters && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                  )}
                </div>
              )}
              
              {/* Search Results */}
              {matterSearchResults.length > 0 && !selectedMatter && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {matterSearchResults.map((matter) => (
                    <button
                      key={matter.id}
                      type="button"
                      onClick={() => selectMatter(matter)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b last:border-b-0"
                    >
                      <div className="font-medium">{matter.fields?.['Matter Name'] || matter.fields?.Client || 'Unnamed'}</div>
                      {matter.fields?.['Type of Case'] && (
                        <div className="text-xs text-slate-500">{matter.fields['Type of Case']}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file">Document</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-[#2E7DA1] transition-colors">
                <input
                  type="file"
                  id="file"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file" className="cursor-pointer">
                  {formData.file ? (
                    <div className="space-y-2">
                      <FileText className="w-10 h-10 mx-auto text-[#2E7DA1]" />
                      <p className="font-medium text-slate-900">{formData.file.name}</p>
                      <p className="text-sm text-slate-500">
                        {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setFormData({ ...formData, file: null });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-10 h-10 mx-auto text-slate-400" />
                      <p className="text-slate-600">Click to upload a file</p>
                      <p className="text-sm text-slate-400">PDF, DOC, DOCX, XLS, XLSX, etc.</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Upload Document
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadFilePage;
