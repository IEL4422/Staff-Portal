import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { 
  FileText, FilePlus, Loader2, FolderOpen, CheckCircle, Search,
  File, Gavel, Home, ScrollText, Heart, MapPin, User, AlertCircle,
  Download, History, ChevronRight, Files, X, Send, Folder, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { templatesApi, mappingProfilesApi, documentGenerationApi, dropboxApi, approvalsApi } from '../services/documentsApi';
import { masterListApi } from '../services/api';

// Case type config
const CASE_TYPE_CONFIG = {
  "Probate": { icon: Gavel, color: "bg-purple-100 text-purple-700" },
  "Estate Planning": { icon: Home, color: "bg-blue-100 text-blue-700" },
  "Deed": { icon: ScrollText, color: "bg-green-100 text-green-700" },
  "Prenuptial Agreement": { icon: Heart, color: "bg-pink-100 text-pink-700" },
};

const GenerateDocumentsPage = () => {
  const [searchParams] = useSearchParams();
  const preSelectedClientId = searchParams.get('clientId');
  
  const [activeTab, setActiveTab] = useState('generate');
  const [templates, setTemplates] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [clients, setClients] = useState([]);
  const [generatedDocs, setGeneratedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedResults, setGeneratedResults] = useState([]);
  
  // Dropbox folder browser state
  const [showDropboxBrowser, setShowDropboxBrowser] = useState(false);
  const [dropboxFolders, setDropboxFolders] = useState([]);
  const [dropboxPath, setDropboxPath] = useState('');
  const [dropboxSearch, setDropboxSearch] = useState('');
  const [loadingDropbox, setLoadingDropbox] = useState(false);
  const [selectedDocForDropbox, setSelectedDocForDropbox] = useState(null);
  const [savingToDropbox, setSavingToDropbox] = useState({});
  
  // Send to attorney state
  const [sendingForApproval, setSendingForApproval] = useState(false);
  // Selection state
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedTemplates, setSelectedTemplates] = useState([]);  // Array for batch selection
  const [selectedProfiles, setSelectedProfiles] = useState({});    // {template_id: profile_id}
  const [clientSearch, setClientSearch] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  
  // Client data and staff inputs
  const [clientBundle, setClientBundle] = useState(null);
  const [savedStaffInputs, setSavedStaffInputs] = useState({});
  const [staffInputs, setStaffInputs] = useState({});
  const [loadingBundle, setLoadingBundle] = useState(false);
  const [batchVariables, setBatchVariables] = useState([]);
  const [loadingVariables, setLoadingVariables] = useState(false);
  
  // Generation state
  const [saveToDropbox, setSaveToDropbox] = useState(false);
  const [saveInputs, setSaveInputs] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Pre-select client if coming from detail page
  useEffect(() => {
    if (preSelectedClientId && clients.length > 0 && !selectedClient) {
      const client = clients.find(c => c.id === preSelectedClientId);
      if (client) {
        handleClientSelect(client);
      }
    }
  }, [preSelectedClientId, clients, selectedClient]);

  // Fetch batch variables when templates change
  useEffect(() => {
    if (selectedTemplates.length > 0 && selectedClient) {
      fetchBatchVariables();
    } else {
      setBatchVariables([]);
    }
  }, [selectedTemplates, selectedClient, selectedProfiles]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesRes, profilesRes, clientsRes, generatedRes] = await Promise.all([
        templatesApi.getAll(),
        mappingProfilesApi.getAll(),
        masterListApi.getAllMatters(),
        documentGenerationApi.getGenerated()
      ]);
      
      setTemplates(templatesRes.data.templates || []);
      setProfiles(profilesRes.data.profiles || []);
      // The cached endpoint returns 'matters' not 'records'
      setClients(clientsRes.data.matters || clientsRes.data.records || []);
      setGeneratedDocs(generatedRes.data.documents || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchVariables = async () => {
    if (selectedTemplates.length === 0 || !selectedClient) return;
    
    setLoadingVariables(true);
    try {
      const result = await documentGenerationApi.getBatchVariables({
        template_ids: selectedTemplates.map(t => t.id),
        client_id: selectedClient.id,
        profile_mappings: selectedProfiles
      });
      
      setBatchVariables(result.data.variables || []);
      setSavedStaffInputs(result.data.saved_inputs || {});
      
      // Initialize staff inputs with saved values
      const initialInputs = { ...(result.data.saved_inputs || {}) };
      (result.data.variables || []).forEach(v => {
        if (!(v.variable in initialInputs) && v.current_value) {
          initialInputs[v.variable] = v.current_value;
        }
      });
      setStaffInputs(initialInputs);
    } catch (error) {
      console.error('Failed to fetch batch variables:', error);
    } finally {
      setLoadingVariables(false);
    }
  };

  // When client is selected, load their data and saved inputs
  const handleClientSelect = async (client) => {
    setSelectedClient(client);
    setSelectedTemplates([]);  // Reset template selection
    setSelectedProfiles({});
    setLoadingBundle(true);
    
    try {
      const [bundleRes, inputsRes] = await Promise.all([
        documentGenerationApi.getClientBundle(client.id),
        documentGenerationApi.getStaffInputs(client.id)
      ]);
      
      setClientBundle(bundleRes.data);
      setSavedStaffInputs(inputsRes.data.inputs || {});
      setStaffInputs(inputsRes.data.inputs || {});
    } catch (error) {
      console.error('Failed to load client data:', error);
      toast.error('Failed to load client data');
    } finally {
      setLoadingBundle(false);
    }
  };

  // Toggle template selection (for batch)
  const toggleTemplateSelection = (template) => {
    setSelectedTemplates(prev => {
      const isSelected = prev.some(t => t.id === template.id);
      if (isSelected) {
        // Remove template and its profile
        const newProfiles = { ...selectedProfiles };
        delete newProfiles[template.id];
        setSelectedProfiles(newProfiles);
        return prev.filter(t => t.id !== template.id);
      } else {
        return [...prev, template];
      }
    });
  };

  // Set profile for a specific template
  const setTemplateProfile = (templateId, profileId) => {
    setSelectedProfiles(prev => ({
      ...prev,
      [templateId]: profileId
    }));
  };

  // Handle batch generation
  const handleBatchGenerate = async () => {
    if (!selectedClient || selectedTemplates.length === 0) {
      toast.error('Please select a client and at least one template');
      return;
    }
    
    // Check if all required variables have values
    const missingVars = batchVariables.filter(v => 
      v.needs_input && !staffInputs[v.variable] && !v.current_value
    );
    
    if (missingVars.length > 0) {
      toast.error(`Please fill in all required fields (${missingVars.length} missing)`);
      return;
    }
    
    setGenerating(true);
    try {
      const result = await documentGenerationApi.generateBatch({
        client_id: selectedClient.id,
        template_ids: selectedTemplates.map(t => t.id),
        profile_mappings: selectedProfiles,
        staff_inputs: staffInputs,
        save_to_dropbox: false,  // Don't auto-save - let user choose in success modal
        save_inputs: saveInputs
      });
      
      setLastGenerated(result.data);
      
      if (result.data.total_generated > 0) {
        // Show success modal with generated documents
        setGeneratedResults(result.data.results || []);
        setShowSuccessModal(true);
      }
      
      if (result.data.total_failed > 0) {
        toast.warning(`${result.data.total_failed} document(s) failed to generate`);
      }
      
      // Refresh generated docs list
      const generatedRes = await documentGenerationApi.getGenerated();
      setGeneratedDocs(generatedRes.data.documents || []);
      
      // Update saved inputs
      if (saveInputs) {
        setSavedStaffInputs({ ...savedStaffInputs, ...staffInputs });
      }
    } catch (error) {
      console.error('Batch generation failed:', error);
      toast.error('Failed to generate documents');
    } finally {
      setGenerating(false);
    }
  };

  // Dropbox folder browsing
  const loadDropboxFolders = async (path = '') => {
    setLoadingDropbox(true);
    try {
      const result = await dropboxApi.listFolders(path);
      setDropboxFolders(result.data.folders || []);
      setDropboxPath(path);
    } catch (error) {
      console.error('Failed to load Dropbox folders:', error);
      toast.error('Failed to load Dropbox folders');
    } finally {
      setLoadingDropbox(false);
    }
  };

  const searchDropboxFolders = async (query) => {
    if (!query) {
      loadDropboxFolders(dropboxPath);
      return;
    }
    setLoadingDropbox(true);
    try {
      const result = await dropboxApi.searchFolders(query);
      setDropboxFolders(result.data.folders || []);
    } catch (error) {
      console.error('Failed to search Dropbox:', error);
    } finally {
      setLoadingDropbox(false);
    }
  };

  const handleSaveToDropbox = async (doc, folderPath) => {
    const filename = doc.docx_filename || doc.pdf_filename;
    const localPath = doc.docx_path || doc.pdf_path;
    
    setSavingToDropbox(prev => ({ ...prev, [doc.template_id]: true }));
    try {
      await dropboxApi.saveToFolder({
        doc_id: doc.doc_id,
        local_path: localPath,
        dropbox_folder: folderPath,
        filename: filename
      });
      toast.success(`Saved ${filename} to Dropbox`);
      
      // Update the result to show it's saved
      setGeneratedResults(prev => prev.map(r => 
        r.template_id === doc.template_id 
          ? { ...r, dropbox_path: `${folderPath}/${filename}` }
          : r
      ));
      setShowDropboxBrowser(false);
    } catch (error) {
      console.error('Failed to save to Dropbox:', error);
      toast.error('Failed to save to Dropbox');
    } finally {
      setSavingToDropbox(prev => ({ ...prev, [doc.template_id]: false }));
    }
  };

  const handleDownload = (doc) => {
    const filename = doc.docx_filename || doc.pdf_filename;
    const localPath = doc.docx_path || doc.pdf_path;
    // For now, create a download link - in production this would be a proper download endpoint
    toast.info(`Download: ${filename}`);
  };

  const handleSendForApproval = async () => {
    if (generatedResults.length === 0) return;
    
    const matterName = selectedClient?.name || selectedClient?.fields?.['Matter Name'] || 'Unknown Matter';
    
    setSendingForApproval(true);
    try {
      const documents = generatedResults.map(doc => ({
        doc_id: doc.doc_id,
        template_name: doc.template_name,
        local_path: doc.docx_path || doc.pdf_path
      }));
      
      const result = await approvalsApi.sendForApproval({
        documents,
        matter_name: matterName,
        client_id: selectedClient.id
      });
      
      toast.success(result.data.message);
      setShowSuccessModal(false);
    } catch (error) {
      console.error('Failed to send for approval:', error);
      toast.error('Failed to send for approval');
    } finally {
      setSendingForApproval(false);
    }
  };

  // Clear all selected templates
  const clearTemplateSelection = () => {
    setSelectedTemplates([]);
    setSelectedProfiles({});
    setBatchVariables([]);
  };

  // Filter clients by search (handle both cached 'matters' and raw 'records' format)
  const filteredClients = clients.filter(c => {
    // Handle cached format (name at top level) or raw format (fields.Matter Name)
    const name = c.name || c.fields?.['Matter Name'] || c.fields?.['Client'] || '';
    return name.toLowerCase().includes(clientSearch.toLowerCase());
  });

  // Filter templates by case type and search
  const filteredTemplates = templates.filter(t => {
    // If client is selected, filter by matching case type
    if (selectedClient) {
      // Handle both cached format (type at top level) and raw format (fields.Type of Case)
      const clientCaseType = selectedClient.type || selectedClient.fields?.['Type of Case'];
      if (clientCaseType === 'Probate' && t.case_type !== 'Probate' && t.case_type !== 'Deed') return false;
      if (clientCaseType === 'Estate Planning' && t.case_type !== 'Estate Planning' && t.case_type !== 'Deed') return false;
    }
    
    // Apply search filter
    if (templateSearch) {
      return t.name.toLowerCase().includes(templateSearch.toLowerCase());
    }
    return true;
  });

  // Get profiles for a specific template
  const getTemplateProfiles = (templateId) => {
    return profiles.filter(p => p.template_id === templateId);
  };

  // Determine which variables need staff input
  const unmappedCount = batchVariables.filter(v => 
    v.needs_input && !staffInputs[v.variable] && !v.current_value
  ).length;

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
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
          Generate Documents
        </h1>
        <p className="text-slate-500 mt-1">Generate one or multiple documents from templates with client data</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="generate" className="data-[state=active]:bg-white">
            <FilePlus className="w-4 h-4 mr-2" />
            Generate New
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white">
            <History className="w-4 h-4 mr-2" />
            Generated History ({generatedDocs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Step 1: Select Client */}
            <Card className={selectedClient ? 'border-green-300' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedClient ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    1
                  </div>
                  Select Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Search clients..."
                    className="pl-9 h-9"
                    data-testid="client-search"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  {filteredClients.slice(0, 30).map(client => {
                    const isSelected = selectedClient?.id === client.id;
                    // Handle both cached format and raw format
                    const caseType = client.type || client.fields?.['Type of Case'];
                    const clientName = client.name || client.fields?.['Matter Name'] || client.fields?.['Client'];
                    const caseNumber = client.fields?.['Case Number'];
                    const config = CASE_TYPE_CONFIG[caseType] || {};
                    
                    return (
                      <div 
                        key={client.id}
                        className={`p-2 text-sm cursor-pointer hover:bg-slate-50 border-b last:border-b-0 ${isSelected ? 'bg-blue-50 border-l-2 border-l-[#2E7DA1]' : ''}`}
                        onClick={() => handleClientSelect(client)}
                        data-testid={`client-item-${client.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{clientName}</p>
                          {isSelected && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`text-[10px] ${config.color || ''}`}>
                            {caseType}
                          </Badge>
                          {caseNumber && (
                            <span className="text-xs text-slate-400">{caseNumber}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {selectedClient && (
                  <div className="p-2 bg-green-50 rounded-lg text-xs">
                    <p className="font-medium text-green-800">{selectedClient.name || selectedClient.fields?.['Matter Name']}</p>
                    {loadingBundle ? (
                      <span className="text-green-600 flex items-center gap-1 mt-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading data...
                      </span>
                    ) : clientBundle ? (
                      <span className="text-green-600">Data loaded ✓</span>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Select Templates (Multi-select) */}
            <Card className={selectedTemplates.length > 0 ? 'border-green-300' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedTemplates.length > 0 ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    2
                  </div>
                  Select Templates
                  {selectedTemplates.length > 0 && (
                    <Badge variant="default" className="bg-[#2E7DA1] text-white text-[10px]">
                      <Files className="w-3 h-3 mr-1" />
                      {selectedTemplates.length} selected
                    </Badge>
                  )}
                </CardTitle>
                {selectedTemplates.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearTemplateSelection}
                    className="text-xs text-slate-500 hover:text-slate-700 h-6 px-2"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Search templates..."
                    className="pl-9 h-9"
                    data-testid="template-search"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  {!selectedClient ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      Select a client first
                    </div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      No templates for this case type
                    </div>
                  ) : (
                    filteredTemplates.map(template => {
                      const isSelected = selectedTemplates.some(t => t.id === template.id);
                      const config = CASE_TYPE_CONFIG[template.case_type] || {};
                      const templateProfiles = getTemplateProfiles(template.id);
                      
                      return (
                        <div 
                          key={template.id}
                          className={`p-2 text-sm border-b last:border-b-0 ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox 
                              checked={isSelected}
                              onCheckedChange={() => toggleTemplateSelection(template)}
                              className="mt-1"
                              data-testid={`template-checkbox-${template.id}`}
                            />
                            <div className="flex-1 cursor-pointer" onClick={() => toggleTemplateSelection(template)}>
                              <div className="flex items-center gap-2">
                                {template.type === 'DOCX' ? (
                                  <FileText className="w-4 h-4 text-blue-500" />
                                ) : (
                                  <File className="w-4 h-4 text-red-500" />
                                )}
                                <p className="font-medium truncate text-sm">{template.name}</p>
                              </div>
                              <div className="flex items-center gap-2 mt-1 ml-6">
                                <Badge variant="outline" className={`text-[10px] ${config.color || ''}`}>
                                  {template.case_type}
                                </Badge>
                                <span className="text-[10px] text-slate-400">{template.county}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Profile selector for selected templates */}
                          {isSelected && templateProfiles.length > 0 && (
                            <div className="mt-2 ml-6">
                              <Select 
                                value={selectedProfiles[template.id] || '__DEFAULT__'} 
                                onValueChange={(v) => setTemplateProfile(template.id, v)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="Mapping profile" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__DEFAULT__">Default mapping</SelectItem>
                                  {templateProfiles.map(profile => (
                                    <SelectItem key={profile.id} value={profile.id}>
                                      {profile.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Selected templates summary */}
                {selectedTemplates.length > 0 && (
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs font-medium text-blue-800 mb-1">Selected Templates:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTemplates.map(t => (
                        <Badge 
                          key={t.id} 
                          variant="secondary" 
                          className="text-[10px] bg-white"
                        >
                          {t.name}
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleTemplateSelection(t); }}
                            className="ml-1 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 3: Review & Fill Variables (Consolidated) */}
            <Card className={selectedTemplates.length > 0 && selectedClient ? 'border-green-300' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedTemplates.length > 0 && selectedClient ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    3
                  </div>
                  Review & Fill
                  {unmappedCount > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {unmappedCount} need input
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!selectedClient || selectedTemplates.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Select a client and at least one template
                  </p>
                ) : loadingVariables ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-[#2E7DA1]" />
                    <span className="ml-2 text-sm text-slate-500">Loading variables...</span>
                  </div>
                ) : (
                  <>
                    {batchVariables.length === 0 ? (
                      <p className="text-sm text-green-600 text-center py-4">
                        <CheckCircle className="w-4 h-4 inline mr-1" />
                        All variables have data - ready to generate!
                      </p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {batchVariables.map(({ variable, current_value, has_airtable_data, has_saved_input, needs_input }) => (
                          <div key={variable} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs font-mono">{`{${variable}}`}</Label>
                              {has_airtable_data && (
                                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700">Airtable</Badge>
                              )}
                              {has_saved_input && (
                                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">Saved</Badge>
                              )}
                              {needs_input && !staffInputs[variable] && (
                                <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Required
                                </Badge>
                              )}
                            </div>
                            <Input 
                              value={staffInputs[variable] || current_value || ''}
                              onChange={(e) => setStaffInputs(prev => ({ ...prev, [variable]: e.target.value }))}
                              placeholder={has_airtable_data ? `From Airtable: ${current_value}` : 'Enter value...'}
                              className={`h-8 text-xs ${needs_input && !staffInputs[variable] ? 'border-orange-300 focus:border-orange-500' : ''}`}
                              disabled={has_airtable_data && !needs_input}
                              data-testid={`variable-input-${variable}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Switch 
                          id="save-inputs" 
                          checked={saveInputs} 
                          onCheckedChange={setSaveInputs}
                        />
                        <Label htmlFor="save-inputs" className="text-xs cursor-pointer">
                          Save inputs for future use
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          id="save-dropbox" 
                          checked={saveToDropbox} 
                          onCheckedChange={setSaveToDropbox}
                        />
                        <Label htmlFor="save-dropbox" className="text-xs cursor-pointer flex items-center gap-1">
                          <FolderOpen className="w-3 h-3" />
                          Save to Dropbox
                        </Label>
                      </div>
                    </div>

                    <Button 
                      onClick={handleBatchGenerate}
                      disabled={generating || unmappedCount > 0}
                      className="w-full bg-[#2E7DA1] hover:bg-[#256a8a]"
                      data-testid="generate-btn"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating {selectedTemplates.length} Document{selectedTemplates.length > 1 ? 's' : ''}...
                        </>
                      ) : (
                        <>
                          <Files className="w-4 h-4 mr-2" />
                          Generate {selectedTemplates.length} Document{selectedTemplates.length > 1 ? 's' : ''}
                        </>
                      )}
                    </Button>

                    {lastGenerated && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-medium">
                            {lastGenerated.total_generated} of {lastGenerated.total_requested} generated!
                          </span>
                        </div>
                        {lastGenerated.results?.map((r, i) => (
                          <p key={i} className="text-xs text-green-600 mt-1">
                            ✓ {r.template_name}
                            {r.dropbox_path && (
                              <span className="ml-1 text-blue-600">
                                <FolderOpen className="w-3 h-3 inline" /> Dropbox
                              </span>
                            )}
                          </p>
                        ))}
                        {lastGenerated.errors?.map((e, i) => (
                          <p key={i} className="text-xs text-red-600 mt-1">
                            ✗ Template {e.template_id}: {e.error}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
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
                            <AlertCircle className="w-5 h-5 text-red-600" />
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
      </Tabs>
    </div>
  );
};

export default GenerateDocumentsPage;
