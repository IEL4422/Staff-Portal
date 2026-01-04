import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { mailApi, masterListApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Mail, Loader2, ArrowLeft, Search, Upload, X, FileText } from 'lucide-react';
import { toast } from 'sonner';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming', 'District of Columbia'
];

const MAILING_SPEEDS = [
  { value: 'first_class', label: 'First Class' },
  { value: 'priority', label: 'Priority Mail' },
  { value: 'express', label: 'Express Mail' },
  { value: 'certified', label: 'Certified Mail' },
  { value: 'registered', label: 'Registered Mail' }
];

const SendMailPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    recipientName: '',
    whatIsBeingMailed: '',
    matterId: '',
    matterName: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    mailingSpeed: ''
  });

  const [uploadedFile, setUploadedFile] = useState(null);
  const [matterSearch, setMatterSearch] = useState('');
  const [matterResults, setMatterResults] = useState([]);
  const [searchingMatters, setSearchingMatters] = useState(false);
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);
  const [stateSearch, setStateSearch] = useState('');

  // Debounced matter search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (matterSearch.length >= 2) {
        searchMatters(matterSearch);
      } else {
        setMatterResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [matterSearch]);

  const searchMatters = async (query) => {
    setSearchingMatters(true);
    try {
      const response = await masterListApi.search(query);
      setMatterResults(response.data.results || []);
      setShowMatterDropdown(true);
    } catch (error) {
      console.error('Failed to search matters:', error);
    } finally {
      setSearchingMatters(false);
    }
  };

  const selectMatter = (matter) => {
    setFormData({
      ...formData,
      matterId: matter.id,
      matterName: matter.fields?.['Matter Name'] || matter.fields?.Client || 'Unknown'
    });
    setMatterSearch(matter.fields?.['Matter Name'] || matter.fields?.Client || '');
    setShowMatterDropdown(false);
  };

  const clearMatter = () => {
    setFormData({ ...formData, matterId: '', matterName: '' });
    setMatterSearch('');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataUpload
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      setUploadedFile({
        name: file.name,
        url: data.url,
        size: file.size
      });
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.recipientName) {
      toast.error('Recipient name is required');
      return;
    }
    if (!formData.whatIsBeingMailed) {
      toast.error('Please specify what is being mailed');
      return;
    }

    setLoading(true);
    try {
      const mailData = {
        recipientName: formData.recipientName,
        whatIsBeingMailed: formData.whatIsBeingMailed,
        matterId: formData.matterId || null,
        streetAddress: formData.streetAddress,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        mailingSpeed: formData.mailingSpeed,
        fileUrl: uploadedFile?.url || null,
        fileName: uploadedFile?.name || null
      };

      await mailApi.create(mailData);
      toast.success('Mail record created successfully');
      
      // Reset form
      setFormData({
        recipientName: '',
        whatIsBeingMailed: '',
        matterId: '',
        matterName: '',
        streetAddress: '',
        city: '',
        state: '',
        zipCode: '',
        mailingSpeed: '',
      });
      setMatterSearch('');
      setUploadedFile(null);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to create mail record');
    } finally {
      setLoading(false);
    }
  };

  const filteredStates = stateSearch
    ? US_STATES.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()))
    : US_STATES;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="send-mail-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <Mail className="w-7 h-7 inline-block mr-3 text-[#2E7DA1]" />
            Send Mail
          </h1>
          <p className="text-slate-500 mt-1">Create a mail record in Airtable</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope' }}>Mail Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Recipient Name */}
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name <span className="text-red-500">*</span></Label>
              <Input
                id="recipientName"
                value={formData.recipientName}
                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                placeholder="Enter recipient name"
                required
              />
            </div>

            {/* What is being mailed */}
            <div className="space-y-2">
              <Label htmlFor="whatIsBeingMailed">What is being mailed? <span className="text-red-500">*</span></Label>
              <Textarea
                id="whatIsBeingMailed"
                value={formData.whatIsBeingMailed}
                onChange={(e) => setFormData({ ...formData, whatIsBeingMailed: e.target.value })}
                placeholder="Describe what is being mailed..."
                rows={2}
                required
              />
            </div>

            {/* Matter (Searchable) */}
            <div className="space-y-2">
              <Label>Matter</Label>
              <div className="relative">
                {formData.matterId ? (
                  <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
                    <span className="flex-1 text-sm">{formData.matterName}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={clearMatter} className="h-6 w-6 p-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={matterSearch}
                        onChange={(e) => setMatterSearch(e.target.value)}
                        onFocus={() => matterSearch.length >= 2 && setShowMatterDropdown(true)}
                        placeholder="Search for a matter..."
                        className="pl-9"
                      />
                      {searchingMatters && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                      )}
                    </div>
                    {showMatterDropdown && matterResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {matterResults.map((matter) => (
                          <button
                            key={matter.id}
                            type="button"
                            onClick={() => selectMatter(matter)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 border-b border-slate-100 last:border-0"
                          >
                            <div className="font-medium">{matter.fields?.['Matter Name'] || matter.fields?.Client}</div>
                            <div className="text-xs text-slate-500">{matter.fields?.['Type of Case']}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4 border-t pt-4">
              <Label className="text-slate-700 font-semibold">Mailing Address</Label>
              
              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input
                  id="streetAddress"
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <div className="px-2 pb-2">
                        <Input
                          placeholder="Search states..."
                          value={stateSearch}
                          onChange={(e) => setStateSearch(e.target.value)}
                          className="h-8"
                        />
                      </div>
                      {filteredStates.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="60601"
                  />
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>File Attachment</Label>
              {uploadedFile ? (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <FileText className="w-8 h-8 text-[#2E7DA1]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{uploadedFile.name}</p>
                    <p className="text-xs text-slate-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={removeFile}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#2E7DA1] hover:bg-slate-50 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1] mx-auto" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Click to upload a file</p>
                      <p className="text-xs text-slate-400 mt-1">Max size: 10MB</p>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
            </div>

            {/* Mailing Speed */}
            <div className="space-y-2">
              <Label>Mailing Speed</Label>
              <Select
                value={formData.mailingSpeed}
                onValueChange={(value) => setFormData({ ...formData, mailingSpeed: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mailing speed" />
                </SelectTrigger>
                <SelectContent>
                  {MAILING_SPEEDS.map((speed) => (
                    <SelectItem key={speed.value} value={speed.value}>{speed.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Mail className="w-5 h-5 mr-2" />}
              Create Mail Record
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SendMailPage;
