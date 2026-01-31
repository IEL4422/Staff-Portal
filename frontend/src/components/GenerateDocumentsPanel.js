import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { FileText, File, FilePlus, Loader2, FolderOpen, CheckCircle, MapPin, Gavel, Home } from 'lucide-react';
import { toast } from 'sonner';
import { templatesApi, mappingProfilesApi, documentGenerationApi } from '../services/documentsApi';

const GenerateDocumentsPanel = ({ clientId, clientName, caseType }) => {
  const [templates, setTemplates] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [saveToDropbox, setSaveToDropbox] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [clientBundle, setClientBundle] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, profilesRes] = await Promise.all([
          templatesApi.getAll(),
          mappingProfilesApi.getAll()
        ]);
        
        // Filter templates by case type if provided
        let allTemplates = templatesRes.data.templates || [];
        if (caseType) {
          // Map case types - Probate detail page passes "Probate", Estate Planning passes "Estate Planning"
          const normalizedCaseType = caseType;
          allTemplates = allTemplates.filter(t => 
            t.case_type === normalizedCaseType || 
            // Deed templates can be used for both Probate and Estate Planning
            (t.case_type === 'Deed' && (normalizedCaseType === 'Probate' || normalizedCaseType === 'Estate Planning'))
          );
        }
        
        setTemplates(allTemplates);
        setProfiles(profilesRes.data.profiles || []);
        
        // Auto-load client bundle for preview
        if (clientId) {
          try {
            const bundleRes = await documentGenerationApi.getClientBundle(clientId);
            setClientBundle(bundleRes.data);
          } catch (e) {
            console.error('Failed to load client bundle:', e);
          }
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clientId, caseType]);

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    setGenerating(true);
    try {
      const isDocx = template.type === 'DOCX';
      const endpoint = isDocx ? documentGenerationApi.generateDocx : documentGenerationApi.fillPdf;

      const result = await endpoint({
        client_id: clientId,
        template_id: selectedTemplate,
        profile_id: selectedProfile && selectedProfile !== '__DEFAULT__' ? selectedProfile : null,
        output_format: 'DOCX',
        save_to_dropbox: saveToDropbox,
        flatten: false
      });

      setLastGenerated({
        filename: result.data.docx_filename || result.data.pdf_filename,
        dropboxPath: result.data.dropbox_docx_path || result.data.dropbox_pdf_path
      });

      if (saveToDropbox && (result.data.dropbox_docx_path || result.data.dropbox_pdf_path)) {
        toast.success('Document generated and saved to Dropbox!');
      } else {
        toast.success('Document generated successfully!');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  const templateProfiles = selectedTemplate 
    ? profiles.filter(p => p.template_id === selectedTemplate)
    : [];

  // Group templates by category for better organization
  const groupedTemplates = templates.reduce((acc, t) => {
    const cat = t.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Generate Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-4">
            No templates available for {caseType || 'this case type'}. Go to Documents to upload templates.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Generate Documents
          {caseType && (
            <Badge variant="outline" className="text-xs ml-2">
              {caseType}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selection - Grouped by Category */}
        <div className="space-y-2">
          <Label className="text-xs">Template</Label>
          <Select value={selectedTemplate} onValueChange={(v) => {
            setSelectedTemplate(v);
            setSelectedProfile('');
          }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select template..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
                    {category}
                  </div>
                  {categoryTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        {template.type === 'DOCX' ? (
                          <FileText className="w-3 h-3 text-blue-500" />
                        ) : (
                          <File className="w-3 h-3 text-red-500" />
                        )}
                        <span>{template.name}</span>
                        <span className="text-xs text-slate-400">({template.county})</span>
                      </div>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Show selected template info */}
        {selectedTemplateData && (
          <div className="p-2 bg-slate-50 rounded-lg text-xs space-y-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span className="text-slate-600">County: {selectedTemplateData.county}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Category: {selectedTemplateData.category}</span>
            </div>
            {selectedTemplateData.detected_variables?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedTemplateData.detected_variables.slice(0, 5).map(v => (
                  <Badge key={v} variant="secondary" className="text-[10px] font-mono">
                    {`{${v}}`}
                  </Badge>
                ))}
                {selectedTemplateData.detected_variables.length > 5 && (
                  <Badge variant="secondary" className="text-[10px]">
                    +{selectedTemplateData.detected_variables.length - 5}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Profile Selection (if template has profiles) */}
        {templateProfiles.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs">Mapping Profile (Optional)</Label>
            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
              <SelectTrigger className="h-9">
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

        {/* Preview client data that will be used */}
        {clientBundle && selectedTemplate && (
          <div className="space-y-2">
            <Label className="text-xs">Data Preview</Label>
            <div className="p-2 bg-blue-50 rounded text-xs max-h-24 overflow-y-auto">
              <div className="grid grid-cols-2 gap-1">
                <div><span className="text-slate-500">Client:</span> {clientBundle.clientname}</div>
                <div><span className="text-slate-500">Case #:</span> {clientBundle.casenumber}</div>
                {clientBundle.decedentname && (
                  <div><span className="text-slate-500">Decedent:</span> {clientBundle.decedentname}</div>
                )}
                {clientBundle.judge && (
                  <div><span className="text-slate-500">Judge:</span> {clientBundle.judge}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dropbox Toggle */}
        <div className="flex items-center gap-2">
          <Switch 
            id="dropbox-save" 
            checked={saveToDropbox} 
            onCheckedChange={setSaveToDropbox}
          />
          <Label htmlFor="dropbox-save" className="text-xs cursor-pointer flex items-center gap-1">
            <FolderOpen className="w-3 h-3" />
            Save to Dropbox
          </Label>
        </div>

        {/* Generate Button */}
        <Button 
          onClick={handleGenerate}
          disabled={generating || !selectedTemplate}
          className="w-full bg-[#2E7DA1] hover:bg-[#256a8a]"
          data-testid="generate-document-btn"
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

        {/* Last Generated Info */}
        {lastGenerated && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Generated:</span>
              <span className="truncate text-xs">{lastGenerated.filename}</span>
            </div>
            {lastGenerated.dropboxPath && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <FolderOpen className="w-3 h-3" />
                Saved to Dropbox
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GenerateDocumentsPanel;
