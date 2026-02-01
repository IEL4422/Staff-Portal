import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  FileText, FilePlus, Loader2, FolderOpen, CheckCircle, Search,
  File, Gavel, Home, ScrollText, Heart, MapPin, User, AlertCircle,
  Download, History, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { templatesApi, mappingProfilesApi, documentGenerationApi } from '../services/documentsApi';
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
  
  // Selection state
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  
  // Client data and staff inputs
  const [clientBundle, setClientBundle] = useState(null);
  const [savedStaffInputs, setSavedStaffInputs] = useState({});
  const [staffInputs, setStaffInputs] = useState({});
  const [loadingBundle, setLoadingBundle] = useState(false);
  
  // Generation state
  const [saveToDropbox, setSaveToDropbox] = useState(false);
  const [saveInputs, setSaveInputs] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

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
      setClients(clientsRes.data.records || []);
      setGeneratedDocs(generatedRes.data.documents || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // When client is selected, load their data and saved inputs
  const handleClientSelect = async (client) => {
    setSelectedClient(client);
    setLoadingBundle(true);
    
    try {
      const [bundleRes, inputsRes] = await Promise.all([
        documentGenerationApi.getClientBundle(client.id),
        documentGenerationApi.getStaffInputs(client.id)
      ]);
      
      setClientBundle(bundleRes.data);
      setSavedStaffInputs(inputsRes.data.inputs || {});
      
      // Pre-fill staff inputs with saved values
      setStaffInputs(inputsRes.data.inputs || {});
    } catch (error) {
      console.error('Failed to load client data:', error);
      toast.error('Failed to load client data');
    } finally {
      setLoadingBundle(false);
    }
  };

  // When template is selected, initialize staff inputs for unmapped variables
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setSelectedProfile('');
    
    // Initialize staff inputs for all template variables
    const initialInputs = { ...savedStaffInputs };
    (template.detected_variables || []).forEach(variable => {
      if (!(variable in initialInputs)) {
        initialInputs[variable] = '';
      }
    });
    setStaffInputs(initialInputs);
  };

  // Get the value for a variable (from client bundle, mapping, or staff input)
  const getVariableValue = (variable) => {
    // Check if mapped in profile
    if (selectedProfile && selectedProfile !== '__DEFAULT__') {
      const profile = profiles.find(p => p.id === selectedProfile);
      if (profile?.mapping_json?.fields?.[variable]) {
        const source = profile.mapping_json.fields[variable].source;
        if (source && clientBundle && clientBundle[source]) {
          return { value: clientBundle[source], source: 'mapping' };
        }
      }
    }
    
    // Check if exists in client bundle directly
    if (clientBundle && clientBundle[variable]) {
      return { value: clientBundle[variable], source: 'airtable' };
    }
    
    // Check saved staff inputs
    if (savedStaffInputs[variable]) {
      return { value: savedStaffInputs[variable], source: 'saved' };
    }
    
    // No value found - needs staff input
    return { value: '', source: 'none' };
  };

  const handleGenerate = async () => {
    if (!selectedClient || !selectedTemplate) {
      toast.error('Please select a client and template');
      return;
    }
    
    setGenerating(true);
    try {
      const result = await documentGenerationApi.generateWithInputs({
        client_id: selectedClient.id,
        template_id: selectedTemplate.id,
        profile_id: selectedProfile && selectedProfile !== '__DEFAULT__' ? selectedProfile : null,
        staff_inputs: staffInputs,
        save_to_dropbox: saveToDropbox,
        save_inputs: saveInputs
      });
      
      setLastGenerated(result.data);
      
      if (saveToDropbox && result.data.dropbox_path) {
        toast.success('Document generated and saved to Dropbox!');
      } else {
        toast.success('Document generated successfully!');
      }
      
      // Refresh generated docs list
      const generatedRes = await documentGenerationApi.getGenerated();
      setGeneratedDocs(generatedRes.data.documents || []);
      
      // Update saved inputs
      if (saveInputs) {
        setSavedStaffInputs({ ...savedStaffInputs, ...staffInputs });
      }
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  // Filter clients by search
  const filteredClients = clients.filter(c => {
    const name = c.fields?.['Matter Name'] || c.fields?.['Client'] || '';
    return name.toLowerCase().includes(clientSearch.toLowerCase());
  });

  // Filter templates by case type and search
  const filteredTemplates = templates.filter(t => {
    // If client is selected, filter by matching case type
    if (selectedClient) {
      const clientCaseType = selectedClient.fields?.['Type of Case'];
      if (clientCaseType === 'Probate' && t.case_type !== 'Probate' && t.case_type !== 'Deed') return false;
      if (clientCaseType === 'Estate Planning' && t.case_type !== 'Estate Planning' && t.case_type !== 'Deed') return false;
    }
    
    // Apply search filter
    if (templateSearch) {
      return t.name.toLowerCase().includes(templateSearch.toLowerCase());
    }
    return true;
  });

  // Get profiles for selected template
  const templateProfiles = selectedTemplate 
    ? profiles.filter(p => p.template_id === selectedTemplate.id)
    : [];

  // Determine which variables need staff input
  const getVariablesWithStatus = () => {
    if (!selectedTemplate) return [];
    
    return (selectedTemplate.detected_variables || []).map(variable => {
      const { value, source } = getVariableValue(variable);
      const currentInput = staffInputs[variable] || '';
      
      return {
        variable,
        value: currentInput || value,
        source,
        needsInput: source === 'none' && !currentInput,
        hasAirtableData: source === 'airtable' || source === 'mapping',
        hasSavedInput: source === 'saved'
      };
    });
  };

  const variablesStatus = getVariablesWithStatus();
  const unmappedCount = variablesStatus.filter(v => v.needsInput).length;

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
        <p className="text-slate-500 mt-1">Generate documents from templates with client data</p>
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
                  />
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  {filteredClients.slice(0, 30).map(client => {
                    const isSelected = selectedClient?.id === client.id;
                    const caseType = client.fields?.['Type of Case'];
                    const config = CASE_TYPE_CONFIG[caseType] || {};
                    
                    return (
                      <div 
                        key={client.id}
                        className={`p-2 text-sm cursor-pointer hover:bg-slate-50 border-b last:border-b-0 ${isSelected ? 'bg-blue-50 border-l-2 border-l-[#2E7DA1]' : ''}`}
                        onClick={() => handleClientSelect(client)}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{client.fields?.['Matter Name'] || client.fields?.['Client']}</p>
                          {isSelected && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`text-[10px] ${config.color || ''}`}>
                            {caseType}
                          </Badge>
                          {client.fields?.['Case Number'] && (
                            <span className="text-xs text-slate-400">{client.fields?.['Case Number']}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {selectedClient && (
                  <div className="p-2 bg-green-50 rounded-lg text-xs">
                    <p className="font-medium text-green-800">{selectedClient.fields?.['Matter Name']}</p>
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

            {/* Step 2: Select Template */}
            <Card className={selectedTemplate ? 'border-green-300' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedTemplate ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    2
                  </div>
                  Select Template
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Search templates..."
                    className="pl-9 h-9"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  {filteredTemplates.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      {selectedClient ? 'No templates for this case type' : 'Select a client first'}
                    </div>
                  ) : (
                    filteredTemplates.map(template => {
                      const isSelected = selectedTemplate?.id === template.id;
                      const config = CASE_TYPE_CONFIG[template.case_type] || {};
                      
                      return (
                        <div 
                          key={template.id}
                          className={`p-2 text-sm cursor-pointer hover:bg-slate-50 border-b last:border-b-0 ${isSelected ? 'bg-blue-50 border-l-2 border-l-[#2E7DA1]' : ''}`}
                          onClick={() => handleTemplateSelect(template)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {template.type === 'DOCX' ? (
                                <FileText className="w-4 h-4 text-blue-500" />
                              ) : (
                                <File className="w-4 h-4 text-red-500" />
                              )}
                              <p className="font-medium truncate">{template.name}</p>
                            </div>
                            {isSelected && <CheckCircle className="w-4 h-4 text-green-500" />}
                          </div>
                          <div className="flex items-center gap-2 mt-1 ml-6">
                            <Badge variant="outline" className={`text-[10px] ${config.color || ''}`}>
                              {template.case_type}
                            </Badge>
                            <span className="text-[10px] text-slate-400">{template.county}</span>
                            <span className="text-[10px] text-slate-400">• {template.category}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedTemplate && templateProfiles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs">Mapping Profile</Label>
                    <Select value={selectedProfile || '__DEFAULT__'} onValueChange={setSelectedProfile}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Use default mapping" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__DEFAULT__">Use default mapping</SelectItem>
                        {templateProfiles.map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 3: Review & Fill Variables */}
            <Card className={selectedTemplate && selectedClient ? 'border-green-300' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedTemplate && selectedClient ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
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
                {!selectedTemplate || !selectedClient ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Select a client and template first
                  </p>
                ) : (
                  <>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {variablesStatus.map(({ variable, value, source, needsInput, hasAirtableData, hasSavedInput }) => (
                        <div key={variable} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs font-mono">{`{${variable}}`}</Label>
                            {hasAirtableData && (
                              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700">Airtable</Badge>
                            )}
                            {hasSavedInput && (
                              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">Saved</Badge>
                            )}
                            {needsInput && (
                              <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Needs input
                              </Badge>
                            )}
                          </div>
                          <Input 
                            value={staffInputs[variable] || value || ''}
                            onChange={(e) => setStaffInputs(prev => ({ ...prev, [variable]: e.target.value }))}
                            placeholder={hasAirtableData ? `From Airtable: ${value}` : 'Enter value...'}
                            className={`h-8 text-xs ${needsInput ? 'border-orange-300 focus:border-orange-500' : ''}`}
                            disabled={hasAirtableData && !needsInput}
                          />
                        </div>
                      ))}
                    </div>

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
                      onClick={handleGenerate}
                      disabled={generating || unmappedCount > 0}
                      className="w-full bg-[#2E7DA1] hover:bg-[#256a8a]"
                      data-testid="generate-btn"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FilePlus className="w-4 h-4 mr-2" />
                          Generate Document
                        </>
                      )}
                    </Button>

                    {lastGenerated && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-medium">Success!</span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          {lastGenerated.docx_filename || lastGenerated.pdf_filename}
                        </p>
                        {lastGenerated.dropbox_path && (
                          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                            <FolderOpen className="w-3 h-3" />
                            Saved to Dropbox
                          </p>
                        )}
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
