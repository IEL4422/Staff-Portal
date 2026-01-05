import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { caseUpdatesApi, masterListApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Send, Loader2, ArrowLeft, Check, Search, X, Plus, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';

// Method options for case updates
const METHOD_OPTIONS = [
  'Email',
  'Phone',
  'Text Message',
  'Portal',
  'Mail',
  'In Person',
  'Other'
];

const CaseUpdatePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    message: '',
    method: '',
    files: []
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
    setMatterSearchQuery('');
    setMatterSearchResults([]);
  };

  const clearMatter = () => {
    setSelectedMatter(null);
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFormData({ ...formData, files: [...formData.files, ...newFiles] });
  };

  const removeFile = (index) => {
    const newFiles = formData.files.filter((_, i) => i !== index);
    setFormData({ ...formData, files: newFiles });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.message.trim()) {
      toast.error('Message is required');
      return;
    }

    setLoading(true);

    try {
      const data = {
        message: formData.message.trim()
      };

      // Add matter if selected
      if (selectedMatter) {
        data.matter = selectedMatter.id;
      }

      // Add method if selected
      if (formData.method) {
        data.method = formData.method;
      }

      // Handle file attachments
      if (formData.files.length > 0) {
        const filePromises = formData.files.map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                url: reader.result,
                filename: file.name
              });
            };
            reader.readAsDataURL(file);
          });
        });
        
        data.files = await Promise.all(filePromises);
      }

      await caseUpdatesApi.create(data);
      toast.success('Case update sent successfully!');
      
      // Reset form
      setFormData({ message: '', method: '', files: [] });
      setSelectedMatter(null);
      
      // Navigate back
      setTimeout(() => navigate(-1), 1500);
    } catch (error) {
      console.error('Failed to send case update:', error);
      toast.error(error.response?.data?.detail || 'Failed to send case update');
    } finally {
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
            <Send className="w-7 h-7 inline-block mr-2 text-[#2E7DA1]" />
            Send Case Update
          </h1>
          <p className="text-slate-500 mt-1">Send an update to the Case Updates table</p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="border-0 shadow-sm max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Update Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message <span className="text-red-500">*</span></Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter your case update message..."
                rows={4}
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
                  {selectedMatter.fields?.['Type of Case'] && (
                    <Badge variant="outline" className="text-xs">
                      {selectedMatter.fields['Type of Case']}
                    </Badge>
                  )}
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
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b last:border-b-0 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{matter.fields?.['Matter Name'] || matter.fields?.Client || 'Unnamed'}</div>
                        {matter.fields?.['Type of Case'] && (
                          <div className="text-xs text-slate-500">{matter.fields['Type of Case']}</div>
                        )}
                      </div>
                      <Plus className="w-4 h-4 text-[#2E7DA1]" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Method */}
            <div className="space-y-2">
              <Label htmlFor="method">Method</Label>
              <Select
                value={formData.method}
                onValueChange={(value) => setFormData({ ...formData, method: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery method" />
                </SelectTrigger>
                <SelectContent>
                  {METHOD_OPTIONS.map((method) => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Files Upload */}
            <div className="space-y-2">
              <Label>Files</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:border-[#2E7DA1] transition-colors">
                <input
                  type="file"
                  id="files"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="files" className="cursor-pointer block">
                  <Upload className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="text-sm text-slate-600 mt-2">Click to upload files</p>
                  <p className="text-xs text-slate-400">Multiple files allowed</p>
                </label>
              </div>
              
              {/* Selected Files List */}
              {formData.files.length > 0 && (
                <div className="space-y-2 mt-2">
                  {formData.files.map((file, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
                    >
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="flex-1 text-sm truncate">{file.name}</span>
                      <span className="text-xs text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
                    Sending...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Send Case Update
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

export default CaseUpdatePage;
