import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { FileText, File, FilePlus, Download, Loader2, FolderOpen, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { templatesApi, mappingProfilesApi, documentGenerationApi } from '../services/documentsApi';

const GenerateDocumentsPanel = ({ clientId, clientName }) => {
  const [templates, setTemplates] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [saveToDropbox, setSaveToDropbox] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastGenerated, setLastGenerated] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, profilesRes] = await Promise.all([
          templatesApi.getAll(),
          mappingProfilesApi.getAll()
        ]);
        setTemplates(templatesRes.data.templates || []);
        setProfiles(profilesRes.data.profiles || []);
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
            No templates uploaded yet. Go to Documents to upload templates.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Generate Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selection */}
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
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center gap-2">
                    {template.type === 'DOCX' ? (
                      <FileText className="w-3 h-3 text-blue-500" />
                    ) : (
                      <File className="w-3 h-3 text-red-500" />
                    )}
                    {template.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Profile Selection (if template has profiles) */}
        {templateProfiles.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs">Mapping Profile (Optional)</Label>
            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Use default mapping..." />
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
              <span className="truncate">{lastGenerated.filename}</span>
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
