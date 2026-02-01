import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { 
  FileText, FilePlus, Upload, Trash2, Settings, Download, 
  Eye, Loader2, CheckCircle, XCircle, FolderOpen,
  File, ChevronRight, Plus, Search, Gavel, Home, ScrollText, Heart,
  MapPin, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { templatesApi, mappingProfilesApi, documentGenerationApi } from '../services/documentsApi';
import { masterListApi } from '../services/api';

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

// Template card component - moved outside to avoid re-creation on each render
const TemplateCard = ({ template, onMap, onGenerate, onDelete }) => {
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
            Map
          </Button>
          <Button 
            size="sm" 
            className="flex-1 bg-[#2E7DA1] hover:bg-[#256a8a]"
            onClick={() => onGenerate(template)}
          >
            <FilePlus className="w-3 h-3 mr-1" />
            Generate
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
  const [generatedDocs, setGeneratedDocs] = useState([]);
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
  
  // Generate document modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateTemplate, setGenerateTemplate] = useState(null);
  const [generateProfile, setGenerateProfile] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saveToDropbox, setSaveToDropbox] = useState(false);
  const [clientBundle, setClientBundle] = useState(null);
  const [loadingBundle, setLoadingBundle] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesRes, profilesRes, generatedRes, fieldsRes, clientsRes] = await Promise.all([
        templatesApi.getAll(),
        mappingProfilesApi.getAll(),
        documentGenerationApi.getGenerated(),
        documentGenerationApi.getAirtableFields(),
        masterListApi.getAllMatters()
      ]);
      
      setTemplates(templatesRes.data.templates || []);
      setMappingProfiles(profilesRes.data.profiles || []);
      setGeneratedDocs(generatedRes.data.documents || []);
      setAvailableFields(fieldsRes.data || {});
      setClients(clientsRes.data.records || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load documents data');
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
    
    // Initialize mapping JSON with detected variables
    const initialMapping = {};
    (template.detected_variables || []).forEach(variable => {
      initialMapping[variable] = { source: '' };
    });
    setMappingJson({ fields: initialMapping });
    
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

  const openGenerateModal = (template) => {
    setGenerateTemplate(template);
    setGenerateProfile(null);
    setSelectedClientId('');
    setClientBundle(null);
    setShowGenerateModal(true);
  };

  const handleClientSelect = async (clientId) => {
    setSelectedClientId(clientId);
    if (!clientId) {
      setClientBundle(null);
      return;
    }
    
    setLoadingBundle(true);
    try {
      const result = await documentGenerationApi.getClientBundle(clientId);
      setClientBundle(result.data);
    } catch (error) {
      console.error('Failed to load client data:', error);
      toast.error('Failed to load client data');
    } finally {
      setLoadingBundle(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedClientId || !generateTemplate) {
      toast.error('Please select a client');
      return;
    }
    
    setGenerating(true);
    try {
      const isDocx = generateTemplate.type === 'DOCX';
      const endpoint = isDocx ? documentGenerationApi.generateDocx : documentGenerationApi.fillPdf;
      
      const result = await endpoint({
        client_id: selectedClientId,
        template_id: generateTemplate.id,
        profile_id: generateProfile && generateProfile !== '__DEFAULT__' ? generateProfile : null,
        output_format: 'DOCX',
        save_to_dropbox: saveToDropbox,
        flatten: false
      });
      
      toast.success('Document generated successfully!');
      setShowGenerateModal(false);
      fetchData();
      
      // Show download link
      if (result.data.docx_filename || result.data.pdf_filename) {
        toast.info(`File ready: ${result.data.docx_filename || result.data.pdf_filename}`);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  // Filter templates based on active tab and search
  const getFilteredTemplates = () => {
    let filtered = templates;
    
    // Filter by case type (tab)
    if (activeTab !== 'all' && activeTab !== 'generated' && activeTab !== 'mappings') {
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

  const filteredClients = clients.filter(c => {
    const name = c.fields?.['Matter Name'] || c.fields?.['Client'] || '';
    return name.toLowerCase().includes(clientSearch.toLowerCase());
  });

  const templateProfiles = generateTemplate 
    ? mappingProfiles.filter(p => p.template_id === generateTemplate?.id)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
      </div>
    );
  }

  // Template card component
  const TemplateCard = ({ template }) => {
    const config = CASE_TYPE_CONFIG[template.case_type] || CASE_TYPE_CONFIG["Probate"];
    const Icon = config.icon;
    
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
              onClick={() => openMappingModal(template)}
            >
              <Settings className="w-3 h-3 mr-1" />
              Map
            </Button>
            <Button 
              size="sm" 
              className="flex-1 bg-[#2E7DA1] hover:bg-[#256a8a]"
              onClick={() => openGenerateModal(template)}
            >
              <FilePlus className="w-3 h-3 mr-1" />
              Generate
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2"
              onClick={() => handleDeleteTemplate(template.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            Document Generation
          </h1>
          <p className="text-slate-500 mt-1">Manage templates and generate documents</p>
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
          placeholder="Search all templates..."
          className="pl-10"
          data-testid="template-search"
        />
      </div>

      {/* Tabs by Case Type */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-lg flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="all" className="data-[state=active]:bg-white">
            <Filter className="w-4 h-4 mr-2" />
            All Templates ({templates.length})
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
          <TabsTrigger value="generated" className="data-[state=active]:bg-white">
            <FolderOpen className="w-4 h-4 mr-2" />
            Generated ({generatedDocs.length})
          </TabsTrigger>
          <TabsTrigger value="mappings" className="data-[state=active]:bg-white">
            <Settings className="w-4 h-4 mr-2" />
            Mappings ({mappingProfiles.length})
          </TabsTrigger>
        </TabsList>

        {/* All Templates / Case Type Tabs */}
        {['all', ...CASE_TYPES].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-6">
            {filteredTemplates.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 mb-4">
                    {searchQuery 
                      ? `No templates found matching "${searchQuery}"` 
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
                      <TemplateCard key={template.id} template={template} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        ))}

        {/* Generated Files Tab */}
        <TabsContent value="generated" className="space-y-4">
          {generatedDocs.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center">
                <FolderOpen className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No documents generated yet</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {generatedDocs.map(doc => (
                    <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                          {doc.status === 'SUCCESS' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{doc.log}</p>
                          <p className="text-xs text-slate-500">
                            Generated {doc.created_at ? format(new Date(doc.created_at), 'MMM d, yyyy h:mm a') : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.dropbox_paths?.length > 0 && (
                          <Badge variant="outline" className="text-xs text-blue-600">
                            <FolderOpen className="w-3 h-3 mr-1" />
                            Dropbox
                          </Badge>
                        )}
                        <Badge variant={doc.status === 'SUCCESS' ? 'default' : 'destructive'} className="text-xs">
                          {doc.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Mapping Profiles Tab */}
        <TabsContent value="mappings" className="space-y-4">
          {mappingProfiles.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center">
                <Settings className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 mb-4">No mapping profiles created yet</p>
                <p className="text-xs text-slate-400">Create a mapping by clicking &quot;Map&quot; on a template</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mappingProfiles.map(profile => {
                const template = templates.find(t => t.id === profile.template_id);
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
                          {Object.keys(profile.mapping_json?.fields || {}).length} mappings
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={async () => {
                            if (window.confirm('Delete this mapping profile?')) {
                              await mappingProfilesApi.delete(profile.id);
                              toast.success('Profile deleted');
                              fetchData();
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
                <Label>Detected Variables/Fields ({detectedVariables.length})</Label>
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
              <Label>Field Mappings</Label>
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {selectedTemplate?.detected_variables?.map(variable => (
                  <div key={variable} className="p-3 flex items-center gap-4">
                    <div className="w-1/3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {`{${variable}}`}
                      </Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                    <div className="flex-1">
                      <Select 
                        value={mappingJson.fields?.[variable]?.source || '__NOT_MAPPED__'}
                        onValueChange={(value) => {
                          setMappingJson(prev => ({
                            ...prev,
                            fields: {
                              ...prev.fields,
                              [variable]: { source: value === '__NOT_MAPPED__' ? '' : value }
                            }
                          }));
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select source field..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__NOT_MAPPED__" className="text-xs text-slate-400">-- Not mapped --</SelectItem>
                          {availableFields.bundle_keys?.map(key => (
                            <SelectItem key={key} value={key} className="text-xs">
                              {key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
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

      {/* Generate Document Modal */}
      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Generate Document</DialogTitle>
            <DialogDescription>
              Generate from: {generateTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Client/Matter</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Search clients..."
                  className="pl-9"
                />
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                {filteredClients.slice(0, 20).map(client => (
                  <div 
                    key={client.id}
                    className={`p-2 text-sm cursor-pointer hover:bg-slate-50 ${selectedClientId === client.id ? 'bg-blue-50 border-l-2 border-[#2E7DA1]' : ''}`}
                    onClick={() => handleClientSelect(client.id)}
                  >
                    <p className="font-medium">{client.fields?.['Matter Name'] || client.fields?.['Client']}</p>
                    <p className="text-xs text-slate-500">{client.fields?.['Type of Case']}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mapping Profile Selection */}
            {templateProfiles.length > 0 && (
              <div className="space-y-2">
                <Label>Mapping Profile (Optional)</Label>
                <Select value={generateProfile || '__DEFAULT__'} onValueChange={setGenerateProfile}>
                  <SelectTrigger>
                    <SelectValue placeholder="Use auto-mapping..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__DEFAULT__">Use auto-mapping</SelectItem>
                    {templateProfiles.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {loadingBundle && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading client data...
              </div>
            )}
            
            {clientBundle && (
              <div className="space-y-2">
                <Label>Preview Data</Label>
                <div className="max-h-32 overflow-y-auto p-3 bg-slate-50 rounded border text-xs font-mono">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(clientBundle).slice(0, 10).map(([key, value]) => {
                      if (key.startsWith('_') || typeof value === 'object') return null;
                      return (
                        <div key={key}>
                          <span className="text-slate-500">{key}:</span>{' '}
                          <span className="text-slate-900">{String(value).substring(0, 30)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Switch 
                checked={saveToDropbox} 
                onCheckedChange={setSaveToDropbox}
                id="dropbox-toggle"
              />
              <Label htmlFor="dropbox-toggle" className="text-sm cursor-pointer">
                Save to Dropbox
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={generating || !selectedClientId}
              className="bg-[#2E7DA1] hover:bg-[#256a8a]"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FilePlus className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
