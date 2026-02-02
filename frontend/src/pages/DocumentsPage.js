import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  FileText, Upload, Trash2, Settings, Eye, Loader2,
  File, ChevronRight, Search, Gavel, Home, ScrollText, Heart,
  MapPin, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { templatesApi, mappingProfilesApi, documentGenerationApi } from '../services/documentsApi';

// Constants
const COUNTIES = ["Cook", "Kane", "DuPage", "Lake", "Will", "Statewide"];
const CASE_TYPES = ["Probate", "Estate Planning", "Deed", "Prenuptial Agreement"];
const CATEGORIES = ["Court Order", "Legal Letter", "Deed", "Form", "Agreement", "Other"];

// Case type icons and colors
const CASE_TYPE_CONFIG = {
  "Probate": { icon: Gavel, color: "bg-purple-100 text-purple-700", borderColor: "border-purple-200" },
  "Estate Planning": { icon: Home, color: "bg-blue-100 text-blue-700", borderColor: "border-blue-200" },
  "Deed": { icon: ScrollText, color: "bg-green-100 text-green-700", borderColor: "border-green-200" },
  "Prenuptial Agreement": { icon: Heart, color: "bg-pink-100 text-pink-700", borderColor: "border-pink-200" },
};

// Template card component
const TemplateCard = ({ template, onMap, onDelete }) => {
  const config = CASE_TYPE_CONFIG[template.case_type] || CASE_TYPE_CONFIG["Probate"];
  
  return (
    <Card className={`hover:shadow-md transition-shadow border ${config.borderColor}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.color}`}>
              {template.type === 'DOCX' ? (
                <FileText className="w-5 h-5" />
              ) : (
                <File className="w-5 h-5" />
              )}
            </div>
            <div>
              <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
              <CardDescription className="text-xs flex items-center gap-2 mt-1">
                <MapPin className="w-3 h-3" />
                {template.county}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge variant="outline" className={`text-xs ${config.color}`}>
              {template.case_type}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {template.category || 'Other'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {template.detected_variables?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.detected_variables.slice(0, 4).map(v => (
              <Badge key={v} variant="secondary" className="text-xs font-mono bg-slate-100">
                {`{${v}}`}
              </Badge>
            ))}
            {template.detected_variables.length > 4 && (
              <Badge variant="secondary" className="text-xs bg-slate-100">
                +{template.detected_variables.length - 4}
              </Badge>
            )}
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={() => onMap(template)}
          >
            <Settings className="w-3 h-3 mr-1" />
            Map Fields
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2"
            onClick={() => onDelete(template.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const DocumentsPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [templates, setTemplates] = useState([]);
  const [mappingProfiles, setMappingProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState('DOCX');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadCounty, setUploadCounty] = useState('');
  const [uploadCaseType, setUploadCaseType] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Other');
  const [uploading, setUploading] = useState(false);
  const [detectedVariables, setDetectedVariables] = useState([]);
  
  // Mapping profile modal state
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [mappingName, setMappingName] = useState('');
  const [mappingJson, setMappingJson] = useState({});
  const [availableFields, setAvailableFields] = useState({});
  const [savingMapping, setSavingMapping] = useState(false);
  const [fieldSearchQuery, setFieldSearchQuery] = useState('');  // Search filter for field mappings
  
  // Profile view/edit modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesRes, profilesRes, fieldsRes] = await Promise.all([
        templatesApi.getAll(),
        mappingProfilesApi.getAll(),
        documentGenerationApi.getAirtableFields()
      ]);
      
      setTemplates(templatesRes.data.templates || []);
      setMappingProfiles(profilesRes.data.profiles || []);
      setAvailableFields(fieldsRes.data || {});
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadFile(file);
    setUploadName(file.name.replace(/\.(docx|pdf)$/i, ''));
    
    // Auto-detect variables/fields
    try {
      if (uploadType === 'DOCX' && file.name.toLowerCase().endsWith('.docx')) {
        const result = await templatesApi.detectDocxVariables(file);
        setDetectedVariables(result.data.all_detected || []);
      } else if (uploadType === 'FILLABLE_PDF' && file.name.toLowerCase().endsWith('.pdf')) {
        const result = await templatesApi.detectPdfFields(file);
        setDetectedVariables(result.data.fields?.map(f => f.name) || []);
      }
    } catch (error) {
      console.error('Failed to detect variables:', error);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadName || !uploadCounty || !uploadCaseType) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setUploading(true);
    try {
      await templatesApi.upload(uploadFile, uploadName, uploadType, uploadCounty, uploadCaseType, uploadCategory);
      toast.success('Template uploaded successfully');
      setShowUploadModal(false);
      resetUploadForm();
      fetchData();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload template');
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadName('');
    setUploadCounty('');
    setUploadCaseType('');
    setUploadCategory('Other');
    setDetectedVariables([]);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await templatesApi.delete(templateId);
      toast.success('Template deleted');
      fetchData();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete template');
    }
  };

  const openMappingModal = (template) => {
    setSelectedTemplate(template);
    setMappingName(`${template.name} - Default Mapping`);
    
    // Initialize mapping JSON with detected variables (DOCX) or PDF fields
    // Default to __LEAVE_BLANK__ for all fields
    const initialMapping = {};
    
    if (template.type === 'DOCX') {
      // For DOCX templates, use detected_variables
      (template.detected_variables || []).forEach(variable => {
        initialMapping[variable] = { source: '__LEAVE_BLANK__', staffInputLabel: '' };
      });
    } else if (template.type === 'FILLABLE_PDF') {
      // For PDF templates, use detected_pdf_fields
      (template.detected_pdf_fields || []).forEach(field => {
        const fieldName = field.name || field;
        initialMapping[fieldName] = { source: '__LEAVE_BLANK__', type: field.type || 'text', staffInputLabel: '' };
      });
    }
    
    setMappingJson({ fields: initialMapping, pdfFields: template.type === 'FILLABLE_PDF' ? initialMapping : {} });
    setFieldSearchQuery('');  // Reset search when opening modal
    
    setShowMappingModal(true);
  };

  const handleSaveMapping = async () => {
    if (!mappingName || !selectedTemplate) {
      toast.error('Please enter a mapping name');
      return;
    }
    
    setSavingMapping(true);
    try {
      await mappingProfilesApi.create({
        name: mappingName,
        template_id: selectedTemplate.id,
        mapping_json: mappingJson,
        repeat_rules_json: {},
        output_rules_json: {
          fileNamePattern: '{clientname} - ' + selectedTemplate.name + ' - {yyyy}-{mm}-{dd}',
          docx: true,
          pdf: false
        },
        dropbox_rules_json: {
          enabled: false,
          baseFolder: '/Illinois Estate Law/Generated Documents',
          folderPattern: '/{clientname}/{yyyy}/{templateName}/'
        }
      });
      toast.success('Mapping profile saved');
      setShowMappingModal(false);
      fetchData();
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save mapping profile');
    } finally {
      setSavingMapping(false);
    }
  };

  // Filter templates based on active tab and search
  const getFilteredTemplates = () => {
    let filtered = templates;
    
    // Filter by case type (tab)
    if (activeTab !== 'all' && activeTab !== 'mappings') {
      filtered = filtered.filter(t => t.case_type === activeTab);
    }
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.county?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  // Group templates by category
  const getGroupedTemplates = (templateList) => {
    const grouped = {};
    templateList.forEach(t => {
      const cat = t.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(t);
    });
    return grouped;
  };

  const filteredTemplates = getFilteredTemplates();
  const groupedTemplates = getGroupedTemplates(filteredTemplates);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            Document Templates
          </h1>
          <p className="text-slate-500 mt-1">Upload and configure document templates</p>
        </div>
        <Button 
          onClick={() => setShowUploadModal(true)}
          className="bg-[#2E7DA1] hover:bg-[#256a8a] text-white"
          data-testid="upload-template-btn"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Template
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search templates..."
          className="pl-10"
          data-testid="template-search"
        />
      </div>

      {/* Tabs by Case Type */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-lg flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="all" className="data-[state=active]:bg-white">
            <Filter className="w-4 h-4 mr-2" />
            All ({templates.length})
          </TabsTrigger>
          {CASE_TYPES.map(caseType => {
            const count = templates.filter(t => t.case_type === caseType).length;
            const config = CASE_TYPE_CONFIG[caseType];
            const Icon = config?.icon || FileText;
            return (
              <TabsTrigger key={caseType} value={caseType} className="data-[state=active]:bg-white">
                <Icon className="w-4 h-4 mr-2" />
                {caseType} ({count})
              </TabsTrigger>
            );
          })}
          <TabsTrigger value="mappings" className="data-[state=active]:bg-white">
            <Settings className="w-4 h-4 mr-2" />
            Mappings ({mappingProfiles.length})
          </TabsTrigger>
        </TabsList>

        {/* Template Tabs */}
        {['all', ...CASE_TYPES].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-6">
            {filteredTemplates.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 mb-4">
                    {searchQuery 
                      ? `No templates matching "${searchQuery}"` 
                      : `No ${tab === 'all' ? '' : tab + ' '}templates uploaded yet`}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowUploadModal(true)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#2E7DA1]"></span>
                    {category}
                    <Badge variant="secondary" className="text-xs">{categoryTemplates.length}</Badge>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryTemplates.map(template => (
                      <TemplateCard 
                        key={template.id} 
                        template={template}
                        onMap={openMappingModal}
                        onDelete={handleDeleteTemplate}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        ))}

        {/* Mapping Profiles Tab */}
        <TabsContent value="mappings" className="space-y-4">
          {mappingProfiles.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center">
                <Settings className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 mb-4">No mapping profiles created yet</p>
                <p className="text-xs text-slate-400">Create a mapping by clicking &quot;Map Fields&quot; on a template</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mappingProfiles.map(profile => {
                const template = templates.find(t => t.id === profile.template_id);
                const fieldsCount = Object.keys(profile.mapping_json?.fields || {}).length;
                const pdfFieldsCount = Object.keys(profile.mapping_json?.pdfFields || {}).length;
                const totalMappings = fieldsCount + pdfFieldsCount;
                
                // Count mapping types
                const allMappings = { ...(profile.mapping_json?.fields || {}), ...(profile.mapping_json?.pdfFields || {}) };
                const airtableCount = Object.values(allMappings).filter(m => m.source && !['__LEAVE_BLANK__', '__STAFF_INPUT__'].includes(m.source)).length;
                const staffInputCount = Object.values(allMappings).filter(m => m.source === '__STAFF_INPUT__').length;
                const leaveBlankCount = Object.values(allMappings).filter(m => m.source === '__LEAVE_BLANK__').length;
                
                return (
                  <Card key={profile.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm font-medium">{profile.name}</CardTitle>
                          <CardDescription className="text-xs">
                            Template: {template?.name || 'Unknown'}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {totalMappings} fields
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Mapping summary badges */}
                      <div className="flex flex-wrap gap-1">
                        {airtableCount > 0 && (
                          <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
                            {airtableCount} Airtable
                          </Badge>
                        )}
                        {staffInputCount > 0 && (
                          <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-700">
                            {staffInputCount} Staff Input
                          </Badge>
                        )}
                        {leaveBlankCount > 0 && (
                          <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                            {leaveBlankCount} Blank
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedProfile(profile);
                            setShowProfileModal(true);
                            setEditingProfile(false);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            // Open edit mode in the mapping modal
                            const tmpl = templates.find(t => t.id === profile.template_id);
                            if (tmpl) {
                              setSelectedTemplate(tmpl);
                              setMappingName(profile.name);
                              setMappingJson(profile.mapping_json || {});
                              setShowMappingModal(true);
                            }
                          }}
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={async () => {
                            if (window.confirm('Delete this mapping profile?')) {
                              try {
                                await mappingProfilesApi.delete(profile.id);
                                toast.success('Profile deleted');
                                fetchData();
                              } catch (error) {
                                toast.error('Failed to delete profile');
                              }
                            }
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Template Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Template</DialogTitle>
            <DialogDescription>
              Upload a DOCX template or fillable PDF
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Type *</Label>
                <Select value={uploadType} onValueChange={(v) => {
                  setUploadType(v);
                  setUploadFile(null);
                  setDetectedVariables([]);
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOCX">DOCX Template</SelectItem>
                    <SelectItem value="FILLABLE_PDF">Fillable PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input 
                value={uploadName} 
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g., Trust Agreement Template"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>County *</Label>
                <Select value={uploadCounty} onValueChange={setUploadCounty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select county..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTIES.map(county => (
                      <SelectItem key={county} value={county}>{county}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Case Type *</Label>
                <Select value={uploadCaseType} onValueChange={setUploadCaseType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select case type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_TYPES.map(ct => (
                      <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>File *</Label>
              <Input 
                type="file" 
                accept={uploadType === 'DOCX' ? '.docx' : '.pdf'}
                onChange={handleFileSelect}
              />
              {uploadFile && (
                <p className="text-xs text-slate-500">Selected: {uploadFile.name}</p>
              )}
            </div>
            
            {detectedVariables.length > 0 && (
              <div className="space-y-2">
                <Label>Detected Variables ({detectedVariables.length})</Label>
                <div className="max-h-32 overflow-y-auto p-2 bg-slate-50 rounded border">
                  <div className="flex flex-wrap gap-1">
                    {detectedVariables.map(v => (
                      <Badge key={v} variant="secondary" className="text-xs font-mono">
                        {uploadType === 'DOCX' ? `{${v}}` : v}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowUploadModal(false);
              resetUploadForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={uploading || !uploadFile || !uploadName || !uploadCounty || !uploadCaseType}
              className="bg-[#2E7DA1] hover:bg-[#256a8a]"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mapping Profile Modal */}
      <Dialog open={showMappingModal} onOpenChange={setShowMappingModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Mapping Profile</DialogTitle>
            <DialogDescription>
              Map template variables to Airtable fields for: {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Profile Name</Label>
              <Input 
                value={mappingName} 
                onChange={(e) => setMappingName(e.target.value)}
                placeholder="e.g., Standard Trust Mapping"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Field Mappings</Label>
                <div className="relative w-48">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <Input 
                    value={fieldSearchQuery}
                    onChange={(e) => setFieldSearchQuery(e.target.value)}
                    placeholder="Search fields..."
                    className="pl-7 h-7 text-xs"
                  />
                </div>
              </div>
              
              {/* Legend for mapping options */}
              <div className="flex gap-4 text-[10px] text-slate-500 px-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-400"></span> Staff Input
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span> Leave Blank
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span> Airtable Field
                </span>
              </div>
              
              <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
                {/* For DOCX templates - show detected_variables */}
                {selectedTemplate?.type === 'DOCX' && selectedTemplate?.detected_variables
                  ?.filter(variable => 
                    !fieldSearchQuery || variable.toLowerCase().includes(fieldSearchQuery.toLowerCase())
                  )
                  .map(variable => (
                  <div key={variable} className="p-3 flex items-center gap-4 hover:bg-slate-50">
                    <div className="w-1/3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {`{${variable}}`}
                      </Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                    <div className="flex-1 space-y-1">
                      <Select 
                        value={mappingJson.fields?.[variable]?.source || '__LEAVE_BLANK__'}
                        onValueChange={(value) => {
                          setMappingJson(prev => ({
                            ...prev,
                            fields: {
                              ...prev.fields,
                              [variable]: { 
                                ...prev.fields?.[variable],
                                source: value,
                                staffInputLabel: value === '__STAFF_INPUT__' ? (prev.fields?.[variable]?.staffInputLabel || variable) : ''
                              }
                            }
                          }));
                        }}
                      >
                        <SelectTrigger className={`h-8 text-xs ${
                          mappingJson.fields?.[variable]?.source === '__LEAVE_BLANK__' || !mappingJson.fields?.[variable]?.source ? 'border-slate-300 bg-slate-50' :
                          mappingJson.fields?.[variable]?.source === '__STAFF_INPUT__' ? 'border-orange-300 bg-orange-50' :
                          'border-green-300 bg-green-50'
                        }`}>
                          <SelectValue placeholder="Select mapping..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__LEAVE_BLANK__" className="text-xs">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                              Leave Blank
                            </span>
                          </SelectItem>
                          <SelectItem value="__STAFF_INPUT__" className="text-xs">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                              Staff Input Required
                            </span>
                          </SelectItem>
                          <div className="px-2 py-1 text-[10px] text-slate-400 border-t mt-1">Airtable Fields</div>
                          {availableFields.bundle_keys?.map(key => (
                            <SelectItem key={key} value={key} className="text-xs">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                {key}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Show variable name input when Staff Input is selected */}
                      {mappingJson.fields?.[variable]?.source === '__STAFF_INPUT__' && (
                        <Input
                          placeholder="Variable display name (e.g., Case Number, Property Value)"
                          value={mappingJson.fields?.[variable]?.staffInputLabel || ''}
                          onChange={(e) => {
                            setMappingJson(prev => ({
                              ...prev,
                              fields: {
                                ...prev.fields,
                                [variable]: { 
                                  ...prev.fields?.[variable],
                                  staffInputLabel: e.target.value
                                }
                              }
                            }));
                          }}
                          className="h-7 text-xs mt-1 border-orange-200"
                        />
                      )}
                    </div>
                  </div>
                ))}
                
                {/* For PDF templates - show detected_pdf_fields */}
                {selectedTemplate?.type === 'FILLABLE_PDF' && selectedTemplate?.detected_pdf_fields
                  ?.filter(field => {
                    const fieldName = field.name || field;
                    return !fieldSearchQuery || fieldName.toLowerCase().includes(fieldSearchQuery.toLowerCase());
                  })
                  .map(field => {
                  const fieldName = field.name || field;
                  const fieldType = field.type || 'text';
                  return (
                    <div key={fieldName} className="p-3 flex items-start gap-4 hover:bg-slate-50">
                      <div className="w-1/3 pt-1">
                        <Badge variant="outline" className="font-mono text-xs bg-red-50 text-red-700">
                          {fieldName}
                        </Badge>
                        <span className="text-[10px] text-slate-400 ml-1">({fieldType})</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 mt-2" />
                      <div className="flex-1 space-y-1">
                        <Select 
                          value={mappingJson.pdfFields?.[fieldName]?.source || '__LEAVE_BLANK__'}
                          onValueChange={(value) => {
                            setMappingJson(prev => ({
                              ...prev,
                              pdfFields: {
                                ...prev.pdfFields,
                                [fieldName]: { 
                                  ...prev.pdfFields?.[fieldName],
                                  source: value, 
                                  type: fieldType,
                                  staffInputLabel: value === '__STAFF_INPUT__' ? (prev.pdfFields?.[fieldName]?.staffInputLabel || fieldName) : ''
                                }
                              }
                            }));
                          }}
                        >
                          <SelectTrigger className={`h-8 text-xs ${
                            mappingJson.pdfFields?.[fieldName]?.source === '__LEAVE_BLANK__' || !mappingJson.pdfFields?.[fieldName]?.source ? 'border-slate-300 bg-slate-50' :
                            mappingJson.pdfFields?.[fieldName]?.source === '__STAFF_INPUT__' ? 'border-orange-300 bg-orange-50' :
                            'border-green-300 bg-green-50'
                          }`}>
                            <SelectValue placeholder="Select mapping..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__LEAVE_BLANK__" className="text-xs">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                Leave Blank
                              </span>
                            </SelectItem>
                            <SelectItem value="__STAFF_INPUT__" className="text-xs">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                Staff Input Required
                              </span>
                            </SelectItem>
                            <div className="px-2 py-1 text-[10px] text-slate-400 border-t mt-1">Airtable Fields</div>
                            {availableFields.bundle_keys?.map(key => (
                              <SelectItem key={key} value={key} className="text-xs">
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                  {key}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {/* Show variable name input when Staff Input is selected */}
                        {mappingJson.pdfFields?.[fieldName]?.source === '__STAFF_INPUT__' && (
                          <Input
                            placeholder="Variable display name (e.g., Case Number, Property Value)"
                            value={mappingJson.pdfFields?.[fieldName]?.staffInputLabel || ''}
                            onChange={(e) => {
                              setMappingJson(prev => ({
                                ...prev,
                                pdfFields: {
                                  ...prev.pdfFields,
                                  [fieldName]: { 
                                    ...prev.pdfFields?.[fieldName],
                                    staffInputLabel: e.target.value
                                  }
                                }
                              }));
                            }}
                            className="h-7 text-xs mt-1 border-orange-200"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Show message if no fields detected */}
                {selectedTemplate?.type === 'DOCX' && (!selectedTemplate?.detected_variables || selectedTemplate.detected_variables.length === 0) && (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No variables detected in this DOCX template. 
                    <br />
                    <span className="text-xs">Variables should use format: {'{variablename}'}</span>
                  </div>
                )}
                {selectedTemplate?.type === 'FILLABLE_PDF' && (!selectedTemplate?.detected_pdf_fields || selectedTemplate.detected_pdf_fields.length === 0) && (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No fillable fields detected in this PDF.
                    <br />
                    <span className="text-xs">Make sure the PDF has fillable form fields.</span>
                  </div>
                )}
                
                {/* Show message when search yields no results */}
                {fieldSearchQuery && selectedTemplate?.type === 'DOCX' && 
                  selectedTemplate?.detected_variables?.length > 0 &&
                  selectedTemplate.detected_variables.filter(v => v.toLowerCase().includes(fieldSearchQuery.toLowerCase())).length === 0 && (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No fields matching &quot;{fieldSearchQuery}&quot;
                  </div>
                )}
                {fieldSearchQuery && selectedTemplate?.type === 'FILLABLE_PDF' && 
                  selectedTemplate?.detected_pdf_fields?.length > 0 &&
                  selectedTemplate.detected_pdf_fields.filter(f => (f.name || f).toLowerCase().includes(fieldSearchQuery.toLowerCase())).length === 0 && (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No fields matching &quot;{fieldSearchQuery}&quot;
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">
                <span className="font-medium text-orange-600">Staff Input</span> = prompt during generation • 
                <span className="font-medium text-slate-500 ml-1">Leave Blank</span> = empty in document • 
                <span className="font-medium text-green-600 ml-1">Airtable Field</span> = auto-fill from client data
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMappingModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveMapping}
              disabled={savingMapping || !mappingName}
              className="bg-[#2E7DA1] hover:bg-[#256a8a]"
            >
              {savingMapping ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Mapping'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile View Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#2E7DA1]" />
              {selectedProfile?.name}
            </DialogTitle>
            <DialogDescription>
              Template: {templates.find(t => t.id === selectedProfile?.template_id)?.name || 'Unknown'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProfile && (
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Summary */}
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const allMappings = { ...(selectedProfile.mapping_json?.fields || {}), ...(selectedProfile.mapping_json?.pdfFields || {}) };
                  const airtableCount = Object.values(allMappings).filter(m => m.source && !['__LEAVE_BLANK__', '__STAFF_INPUT__'].includes(m.source)).length;
                  const staffInputCount = Object.values(allMappings).filter(m => m.source === '__STAFF_INPUT__').length;
                  const leaveBlankCount = Object.values(allMappings).filter(m => m.source === '__LEAVE_BLANK__').length;
                  
                  return (
                    <>
                      <Badge className="bg-green-100 text-green-700">{airtableCount} Airtable Fields</Badge>
                      <Badge className="bg-orange-100 text-orange-700">{staffInputCount} Staff Input</Badge>
                      <Badge className="bg-slate-100 text-slate-600">{leaveBlankCount} Leave Blank</Badge>
                    </>
                  );
                })()}
              </div>
              
              {/* Mappings Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Field</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Mapping</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries({ ...(selectedProfile.mapping_json?.fields || {}), ...(selectedProfile.mapping_json?.pdfFields || {}) }).map(([fieldName, config]) => {
                      const source = config.source || '';
                      let mappingType = 'Unknown';
                      let mappingDisplay = source;
                      let badgeColor = 'bg-slate-100 text-slate-600';
                      
                      if (source === '__LEAVE_BLANK__') {
                        mappingType = 'Leave Blank';
                        mappingDisplay = '—';
                        badgeColor = 'bg-slate-100 text-slate-500';
                      } else if (source === '__STAFF_INPUT__') {
                        mappingType = 'Staff Input';
                        mappingDisplay = config.staffInputLabel || 'Manual Entry';
                        badgeColor = 'bg-orange-100 text-orange-700';
                      } else if (source) {
                        mappingType = 'Airtable';
                        badgeColor = 'bg-green-100 text-green-700';
                      }
                      
                      return (
                        <tr key={fieldName} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono text-xs">{fieldName}</td>
                          <td className="px-4 py-2 text-xs">{mappingDisplay}</td>
                          <td className="px-4 py-2">
                            <Badge variant="secondary" className={`text-xs ${badgeColor}`}>
                              {mappingType}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowProfileModal(false)}>
              Close
            </Button>
            <Button 
              onClick={() => {
                const tmpl = templates.find(t => t.id === selectedProfile?.template_id);
                if (tmpl && selectedProfile) {
                  setSelectedTemplate(tmpl);
                  setMappingName(selectedProfile.name);
                  setMappingJson(selectedProfile.mapping_json || {});
                  setShowProfileModal(false);
                  setShowMappingModal(true);
                }
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
