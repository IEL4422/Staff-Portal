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
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  FileText, FilePlus, Loader2, FolderOpen, CheckCircle, Search,
  File, Gavel, Home, ScrollText, Heart, MapPin, User, AlertCircle,
  Download, History, ChevronRight, Files, X, Send, Folder, ArrowLeft, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { templatesApi, mappingProfilesApi, documentGenerationApi, dropboxApi, approvalsApi, staffInputsApi } from '../services/documentsApi';
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
  
  // Document preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // Selection state
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedTemplates, setSelectedTemplates] = useState([]);  // Array for batch selection
  const [selectedProfiles, setSelectedProfiles] = useState({});    // {template_id: profile_id}
  const [clientSearch, setClientSearch] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  
  // Client data and staff inputs
  const [clientBundle, setClientBundle] = useState(null);
  const [savedStaffInputs, setSavedStaffInputs] = useState({});
  const [savedStaffLabels, setSavedStaffLabels] = useState({});
  const [staffInputs, setStaffInputs] = useState({});
  const [staffInputLabels, setStaffInputLabels] = useState({});
  const [loadingBundle, setLoadingBundle] = useState(false);
  const [batchVariables, setBatchVariables] = useState([]);
  const [loadingVariables, setLoadingVariables] = useState(false);
  
  // Confirmation state for staff-entered values
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingConfirmations, setPendingConfirmations] = useState([]);
  const [confirmedInputs, setConfirmedInputs] = useState({});
  
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
    if (selectedTemplates.length === 0 || !selectedClient) {
      console.log('[fetchBatchVariables] Skipping - no templates or client selected');
      return;
    }
    
    console.log('[fetchBatchVariables] Starting fetch for', selectedTemplates.length, 'templates');
    setLoadingVariables(true);
    try {
      const payload = {
        template_ids: selectedTemplates.map(t => t.id),
        client_id: selectedClient.id,
        profile_mappings: selectedProfiles
      };
      console.log('[fetchBatchVariables] Payload:', JSON.stringify(payload));
      
      const result = await documentGenerationApi.getBatchVariables(payload);
      
      console.log('[fetchBatchVariables] Response:', result.data);
      console.log('[fetchBatchVariables] Variables count:', result.data.variables?.length || 0);
      
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
      console.log('[fetchBatchVariables] State updated successfully');
    } catch (error) {
      console.error('[fetchBatchVariables] Error:', error);
    } finally {
      setLoadingVariables(false);
      console.log('[fetchBatchVariables] Done - loadingVariables set to false');
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
        staffInputsApi.getWithLabels(client.id)
      ]);
      
      setClientBundle(bundleRes.data);
      setSavedStaffInputs(inputsRes.data.inputs || {});
      setSavedStaffLabels(inputsRes.data.labels || {});
      setStaffInputs(inputsRes.data.inputs || {});
      setStaffInputLabels(inputsRes.data.labels || {});
      
      // Check if there are staff-entered values that need confirmation
      if (inputsRes.data.labeled_inputs?.length > 0) {
        setPendingConfirmations(inputsRes.data.labeled_inputs);
      }
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

  // Check if staff-entered values need confirmation before generating
  const checkForConfirmations = () => {
    // Find variables that are staff-entered (from saved inputs) and need confirmation
    const needsConfirmation = batchVariables.filter(v => {
      const hasSavedValue = savedStaffInputs[v.variable];
      const isStaffEntered = !v.has_airtable_data && hasSavedValue;
      return isStaffEntered;
    });
    
    if (needsConfirmation.length > 0) {
      setPendingConfirmations(needsConfirmation.map(v => ({
        variable: v.variable,
        label: savedStaffLabels[v.variable] || v.variable,
        value: staffInputs[v.variable] || savedStaffInputs[v.variable]
      })));
      setShowConfirmationModal(true);
      return true;
    }
    return false;
  };

  // Handle confirmation and then generate
  const handleConfirmAndGenerate = async () => {
    // Save confirmed inputs
    try {
      await staffInputsApi.confirm(selectedClient.id, {
        inputs: staffInputs,
        labels: staffInputLabels
      });
    } catch (error) {
      console.error('Failed to confirm inputs:', error);
    }
    
    setShowConfirmationModal(false);
    await executeGeneration();
  };

  // Execute the actual generation
  const executeGeneration = async () => {
    setGenerating(true);
    try {
      const result = await documentGenerationApi.generateBatch({
        client_id: selectedClient.id,
        template_ids: selectedTemplates.map(t => t.id),
        profile_mappings: selectedProfiles,
        staff_inputs: staffInputs,
        save_to_dropbox: false,
        save_inputs: saveInputs
      });
      
      setLastGenerated(result.data);
      
      if (result.data.total_generated > 0) {
        setGeneratedResults(result.data.results || []);
        setShowSuccessModal(true);
      }
      
      if (result.data.total_failed > 0) {
        toast.warning(`${result.data.total_failed} document(s) failed to generate`);
      }
      
      const generatedRes = await documentGenerationApi.getGenerated();
      setGeneratedDocs(generatedRes.data.documents || []);
      
      if (saveInputs) {
        // Save with labels for future confirmation
        await staffInputsApi.saveWithLabels(selectedClient.id, {
          inputs: staffInputs,
          labels: staffInputLabels
        });
        setSavedStaffInputs({ ...savedStaffInputs, ...staffInputs });
      }
    } catch (error) {
      console.error('Batch generation failed:', error);
      toast.error('Failed to generate documents');
    } finally {
      setGenerating(false);
    }
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
    
    // Check if staff-entered values need confirmation
    if (checkForConfirmations()) {
      return; // Will continue after confirmation
    }
    
    // No confirmation needed, proceed directly
    await executeGeneration();
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
      // Check for expired token error
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load Dropbox folders';
      if (errorMessage.includes('expired') || error.response?.status === 401) {
        toast.error('Dropbox token expired. Please update your Dropbox access token in settings.', {
          duration: 6000
        });
      } else {
        toast.error(errorMessage);
      }
      setDropboxFolders([]);
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
      const errorMessage = error.response?.data?.detail || error.message || 'Search failed';
      if (errorMessage.includes('expired') || error.response?.status === 401) {
        toast.error('Dropbox token expired. Please update your access token.');
      } else {
        toast.error('Dropbox search failed');
      }
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

  const handleDownload = async (doc) => {
    const filename = doc.docx_filename || doc.pdf_filename;
    const fileType = doc.file_type || (doc.pdf_path ? 'pdf' : 'docx');
    const docId = doc.doc_id;
    
    if (!docId) {
      // If no doc_id, try to download from local path via a blob
      toast.error('Download not available - document ID missing');
      return;
    }
    
    try {
      // Get the download URL
      const token = localStorage.getItem('token');
      const baseUrl = process.env.REACT_APP_BACKEND_URL;
      const downloadUrl = `${baseUrl}/api/documents/generated/${docId}/download?file_type=${fileType}`;
      
      // Fetch the file as a blob
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `document.${fileType}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  // Preview document
  const handlePreviewDocument = async (doc) => {
    setPreviewDoc(doc);
    setShowPreviewModal(true);
    setLoadingPreview(true);
    
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${baseUrl}/api/documents/preview-generated/${doc.doc_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreviewContent(data);
      } else {
        setPreviewContent({ success: false, error: 'Failed to load preview' });
      }
    } catch (error) {
      console.error('Preview error:', error);
      setPreviewContent({ success: false, error: error.message });
    } finally {
      setLoadingPreview(false);
    }
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
                    {/* Show "ready to generate" if no variables need input */}
                    {batchVariables.length === 0 || !batchVariables.some(v => v.needs_input) ? (
                      <p className="text-sm text-green-600 text-center py-4">
                        <CheckCircle className="w-4 h-4 inline mr-1" />
                        All fields ready - no input required!
                      </p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {/* Only show variables that actually need input */}
                        {batchVariables
                          .filter(v => v.needs_input)
                          .map(({ variable, current_value, has_airtable_data, has_saved_input, needs_input }) => (
                          <div key={variable} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs font-mono">{`{${variable}}`}</Label>
                              {has_airtable_data && (
                                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700">Airtable</Badge>
                              )}
                              {has_saved_input && (
                                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">Saved</Badge>
                              )}
                              {!staffInputs[variable] && (
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
                              className={`h-8 text-xs ${!staffInputs[variable] ? 'border-orange-300 focus:border-orange-500' : ''}`}
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

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              Documents Generated Successfully!
            </DialogTitle>
            <DialogDescription>
              {generatedResults.length} document(s) ready for: {selectedClient?.name || selectedClient?.fields?.['Matter Name']}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {generatedResults.map((doc, index) => (
              <div key={index} className="p-3 border rounded-lg bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      {doc.file_type === 'docx' ? (
                        <FileText className="w-4 h-4 text-blue-600" />
                      ) : (
                        <File className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{doc.template_name}</p>
                      <p className="text-xs text-slate-500">{doc.docx_filename || doc.pdf_filename}</p>
                    </div>
                  </div>
                  {doc.dropbox_path && (
                    <Badge variant="outline" className="text-xs text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Saved to Dropbox
                    </Badge>
                  )}
                </div>
                
                {/* Action buttons - only show after generation */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                  {/* View button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreviewDocument(doc)}
                    className="h-7 text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  
                  {/* Download button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    className="h-7 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  
                  {/* Save to Dropbox - only if not already saved */}
                  {!doc.dropbox_path && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDocForDropbox(doc);
                        setShowDropboxBrowser(true);
                        loadDropboxFolders('');
                      }}
                      disabled={savingToDropbox[doc.template_id]}
                      className="h-7 text-xs"
                    >
                      {savingToDropbox[doc.template_id] ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <FolderOpen className="w-3 h-3 mr-1" />
                      )}
                      Save to Dropbox
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setShowSuccessModal(false)}
            >
              Close
            </Button>
            <Button
              onClick={handleSendForApproval}
              disabled={sendingForApproval}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {sendingForApproval ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send to Attorney for Approval
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Document Preview
            </DialogTitle>
            <DialogDescription>
              {previewDoc?.template_name} - {previewDoc?.docx_filename || previewDoc?.pdf_filename}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] border rounded-lg bg-white">
            {loadingPreview ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#2E7DA1]" />
                <span className="ml-2 text-slate-500">Loading preview...</span>
              </div>
            ) : previewContent?.success ? (
              <div className="p-6 space-y-4">
                {/* DOCX Preview */}
                {previewContent.file_type === 'docx' && (
                  <>
                    {previewContent.paragraphs?.map((para, index) => (
                      <div key={index} className={`
                        ${para.style?.includes('Heading 1') ? 'text-xl font-bold text-slate-800' : ''}
                        ${para.style?.includes('Heading 2') ? 'text-lg font-semibold text-slate-700' : ''}
                        ${para.style?.includes('Heading 3') ? 'text-base font-medium text-slate-700' : ''}
                        ${para.style === 'Normal' || !para.style?.includes('Heading') ? 'text-sm text-slate-600' : ''}
                      `}>
                        {para.text}
                      </div>
                    ))}
                    {previewContent.tables?.map((table, tableIndex) => (
                      <div key={`table-${tableIndex}`} className="mt-4 overflow-x-auto">
                        <table className="w-full border-collapse border border-slate-200 text-sm">
                          <tbody>
                            {table.map((row, rowIndex) => (
                              <tr key={rowIndex} className={rowIndex === 0 ? 'bg-slate-100' : ''}>
                                {row.map((cell, cellIndex) => (
                                  <td key={cellIndex} className="border border-slate-200 px-3 py-2">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </>
                )}
                
                {/* PDF Preview */}
                {previewContent.file_type === 'pdf' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                      <File className="w-4 h-4" />
                      <span>{previewContent.page_count} page(s)</span>
                    </div>
                    {previewContent.pages?.map((pageText, index) => (
                      <div key={index} className="border-b pb-4 last:border-b-0">
                        <Badge variant="outline" className="mb-2 text-xs">Page {index + 1}</Badge>
                        <div className="text-sm text-slate-600 whitespace-pre-wrap font-mono bg-slate-50 p-3 rounded">
                          {pageText || '(No text content on this page)'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">{previewContent?.error || 'Unable to load preview'}</p>
              </div>
            )}
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              Close
            </Button>
            {previewDoc && (
              <Button onClick={() => handleDownload(previewDoc)}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dropbox Folder Browser Modal */}
      <Dialog open={showDropboxBrowser} onOpenChange={setShowDropboxBrowser}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              Choose Dropbox Folder
            </DialogTitle>
            <DialogDescription>
              Saving: {selectedDocForDropbox?.docx_filename || selectedDocForDropbox?.pdf_filename}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={dropboxSearch}
                onChange={(e) => {
                  setDropboxSearch(e.target.value);
                  if (e.target.value) {
                    searchDropboxFolders(e.target.value);
                  } else {
                    loadDropboxFolders(dropboxPath);
                  }
                }}
                placeholder="Search folders..."
                className="pl-9"
              />
            </div>
            
            {/* Current path */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {dropboxPath && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const parentPath = dropboxPath.split('/').slice(0, -1).join('/');
                    loadDropboxFolders(parentPath);
                    setDropboxSearch('');
                  }}
                  className="h-6 px-2"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back
                </Button>
              )}
              <span className="truncate">{dropboxPath || '/ (Root)'}</span>
            </div>
            
            {/* Folder list */}
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {loadingDropbox ? (
                <div className="p-4 text-center">
                  <Loader2 className="w-5 h-5 mx-auto animate-spin text-blue-600" />
                </div>
              ) : dropboxFolders.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">
                  No folders found
                </div>
              ) : (
                dropboxFolders.map((folder, index) => (
                  <div
                    key={index}
                    className="p-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer border-b last:border-b-0"
                  >
                    <div 
                      className="flex items-center gap-2 flex-1"
                      onClick={() => {
                        loadDropboxFolders(folder.path);
                        setDropboxSearch('');
                      }}
                    >
                      <Folder className="w-4 h-4 text-blue-500" />
                      <span className="text-sm truncate">{folder.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSaveToDropbox(selectedDocForDropbox, folder.path)}
                      className="h-7 text-xs text-green-600 hover:text-green-700"
                    >
                      Save Here
                    </Button>
                  </div>
                ))
              )}
            </div>
            
            {/* Save to current folder */}
            <Button
              onClick={() => handleSaveToDropbox(selectedDocForDropbox, dropboxPath || '/')}
              className="w-full"
              disabled={!dropboxPath && dropboxFolders.length > 0}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Save to Current Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Staff Input Confirmation Modal */}
      <Dialog open={showConfirmationModal} onOpenChange={setShowConfirmationModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-5 h-5" />
              Confirm Staff-Entered Values
            </DialogTitle>
            <DialogDescription>
              Please verify the following values that were previously entered for this client.
              You can edit them if needed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {pendingConfirmations.map((item, index) => (
              <div key={index} className="p-3 border rounded-lg bg-orange-50">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-orange-800">
                    {item.label || item.variable}
                  </Label>
                  <Badge variant="outline" className="text-[10px] text-orange-600">
                    Staff Entry
                  </Badge>
                </div>
                <Input
                  value={staffInputs[item.variable] || item.value || ''}
                  onChange={(e) => setStaffInputs(prev => ({
                    ...prev,
                    [item.variable]: e.target.value
                  }))}
                  className="bg-white"
                  placeholder={`Enter ${item.label || item.variable}...`}
                />
              </div>
            ))}
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmationModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAndGenerate}
              disabled={generating}
              className="bg-[#2E7DA1] hover:bg-[#256a8a]"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm & Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GenerateDocumentsPage;
