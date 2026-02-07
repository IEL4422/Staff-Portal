import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import {
  Search, Loader2, Zap, Download, Send, FolderOpen, CheckCircle,
  User, FileText, File, Clock, ChevronRight, AlertCircle, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { masterListApi } from '../../services/api';
import {
  templatesApi, documentGenerationApi, approvalsApi, dropboxApi
} from '../../services/documentsApi';

const GeneratePanel = () => {
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientBundle, setClientBundle] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const [batchVars, setBatchVars] = useState([]);
  const [staffInputs, setStaffInputs] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generatedDocs, setGeneratedDocs] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingBundle, setLoadingBundle] = useState(false);
  const [loadingVars, setLoadingVars] = useState(false);
  const [history, setHistory] = useState([]);
  const [sendingApproval, setSendingApproval] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoadingClients(true);
      try {
        const res = await masterListApi.getAllMatters();
        setClients(res.data?.matters || res.data?.records || res.data || []);
      } catch {
        console.error('Failed to load clients');
      } finally {
        setLoadingClients(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await templatesApi.getAll();
        setTemplates(res.data || []);
      } catch {
        console.error('Failed to load templates');
      }
    };
    loadTemplates();
  }, []);

  const selectClient = async (client) => {
    const id = client.id;
    setSelectedClient(client);
    setStep(2);
    setLoadingBundle(true);
    try {
      const res = await documentGenerationApi.getClientBundle(id);
      setClientBundle(res.data);
    } catch (err) {
      console.error('Failed to load client bundle:', err);
      toast.error('Failed to load client data');
    } finally {
      setLoadingBundle(false);
    }
  };

  const toggleTemplate = (id) => {
    setSelectedTemplateIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const proceedToReview = async () => {
    if (selectedTemplateIds.length === 0) {
      toast.error('Select at least one template');
      return;
    }
    setStep(3);
    setLoadingVars(true);
    try {
      const res = await documentGenerationApi.getBatchVariables({
        client_id: selectedClient.id,
        template_ids: selectedTemplateIds
      });
      const vars = res.data?.variables || [];
      setBatchVars(vars);
      const inputs = {};
      vars.filter(v => v.needs_input).forEach(v => {
        inputs[v.variable] = v.current_value || '';
      });
      setStaffInputs(inputs);
    } catch (err) {
      console.error('Failed to get batch variables:', err);
      setBatchVars([]);
    } finally {
      setLoadingVars(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await documentGenerationApi.generateBatch({
        client_id: selectedClient.id,
        template_ids: selectedTemplateIds,
        staff_inputs: staffInputs
      });
      const docs = res.data?.results || [];
      setGeneratedDocs(docs);
      const successCount = docs.filter(d => d.success).length;
      toast.success(`${successCount} document(s) generated`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendForApproval = async (doc) => {
    setSendingApproval(doc.doc_id);
    try {
      await approvalsApi.sendForApproval({
        doc_id: doc.doc_id,
        template_name: doc.template_name || doc.filename,
        matter_name: selectedClient?.fields?.['Matter Name'] || selectedClient?.fields?.['Full Name'] || 'Client',
        client_id: selectedClient?.id
      });
      toast.success('Sent for attorney review');
    } catch (err) {
      toast.error('Failed to send for approval');
    } finally {
      setSendingApproval(null);
    }
  };

  const getDownloadUrl = (docId) => {
    return documentGenerationApi.getDownloadUrl(docId);
  };

  const filteredClients = clients.filter(c => {
    if (!clientSearch) return true;
    const q = clientSearch.toLowerCase();
    const name = c.fields?.['Matter Name'] || c.fields?.['Full Name'] || '';
    return name.toLowerCase().includes(q);
  });

  const needsInputVars = batchVars.filter(v => v.needs_input);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <button
              onClick={() => s < step && setStep(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                step === s ? 'bg-[#2E7DA1] text-white' :
                step > s ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200' :
                'bg-slate-100 text-slate-400'
              }`}
            >
              {step > s ? <CheckCircle className="w-3 h-3" /> : null}
              {s === 1 ? 'Select Client' : s === 2 ? 'Select Templates' : 'Review & Generate'}
            </button>
            {s < 3 && <ChevronRight className="w-4 h-4 text-slate-300" />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" /> Select Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Search by client name..."
                className="pl-10"
              />
            </div>
            {loadingClients ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-[#2E7DA1]" />
              </div>
            ) : (
              <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                {filteredClients.slice(0, 50).map(c => {
                  const name = c.fields?.['Matter Name'] || c.fields?.['Full Name'] || 'Unknown';
                  const caseType = c.fields?.['Case Type'] || '';
                  const status = c.fields?.['Case Status'] || c.fields?.['Status'] || '';
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectClient(c)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                    >
                      <div>
                        <p className="font-medium text-sm text-slate-800">{name}</p>
                        <p className="text-xs text-slate-500">{caseType} {status ? `- ${status}` : ''}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  );
                })}
                {filteredClients.length === 0 && (
                  <div className="py-8 text-center text-sm text-slate-500">No clients found</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Select Templates</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Client: <span className="font-medium text-slate-700">
                    {selectedClient?.fields?.['Matter Name'] || selectedClient?.fields?.['Full Name']}
                  </span>
                  {loadingBundle && <span className="ml-2 text-[#2E7DA1]">(loading data...)</span>}
                </p>
              </div>
              <Button
                onClick={proceedToReview}
                disabled={selectedTemplateIds.length === 0}
                className="bg-[#2E7DA1] hover:bg-[#256a8a]"
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
              {templates.map(t => {
                const isSelected = selectedTemplateIds.includes(t.id);
                const isDocx = t.template_type === 'DOCX';
                const displayName = t.name || t.template_name;
                const hasMappings = t.mapping_json && Object.keys(t.mapping_json?.fields || t.mapping_json?.pdfFields || {}).length > 0;
                return (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleTemplate(t.id)} />
                    <div className={`p-1.5 rounded ${isDocx ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                      {isDocx ? <FileText className="w-4 h-4" /> : <File className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{displayName}</p>
                      <p className="text-xs text-slate-500">{t.case_type} {t.county ? `- ${t.county}` : ''}</p>
                    </div>
                    {hasMappings ? (
                      <Badge className="bg-green-100 text-green-700 text-xs border-0">Mapped</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-slate-400">No mapping</Badge>
                    )}
                  </label>
                );
              })}
            </div>
            {selectedTemplateIds.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">{selectedTemplateIds.length} template(s) selected</p>
            )}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Review & Generate</CardTitle>
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="bg-[#2E7DA1] hover:bg-[#256a8a]"
                  size="lg"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><Zap className="w-4 h-4 mr-2" /> Generate Documents</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Client</p>
                    <p className="font-medium">{selectedClient?.fields?.['Matter Name'] || selectedClient?.fields?.['Full Name']}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Templates</p>
                    <p className="font-medium">{selectedTemplateIds.length} selected</p>
                  </div>
                </div>
              </div>

              {loadingVars ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#2E7DA1]" />
                  <span className="ml-2 text-sm text-slate-500">Loading variables...</span>
                </div>
              ) : needsInputVars.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">Staff Input Required ({needsInputVars.length})</p>
                  {needsInputVars.map(v => (
                    <div key={v.variable} className="flex items-start gap-3">
                      <Badge variant="outline" className="font-mono text-xs mt-1 shrink-0 bg-orange-50 text-orange-700 border-orange-200">
                        {v.variable}
                      </Badge>
                      <Input
                        value={staffInputs[v.variable] || ''}
                        onChange={(e) => setStaffInputs(prev => ({ ...prev, [v.variable]: e.target.value }))}
                        placeholder={v.label || `Enter ${v.variable}...`}
                        className="h-9"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-green-600 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  All variables are mapped. Ready to generate.
                </div>
              )}
            </CardContent>
          </Card>

          {generatedDocs.length > 0 && (
            <Card className="border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-green-800">Generated Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {generatedDocs.map((doc, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${doc.success ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                    <div className="flex items-center gap-3">
                      {doc.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-800">{doc.template_name || doc.filename}</p>
                        {doc.error && <p className="text-xs text-red-500">{doc.error}</p>}
                      </div>
                    </div>
                    {doc.success && (
                      <div className="flex items-center gap-2">
                        <a
                          href={getDownloadUrl(doc.doc_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                        >
                          <Download className="w-3 h-3" /> Download
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendForApproval(doc)}
                          disabled={sendingApproval === doc.doc_id}
                          className="text-xs h-8"
                        >
                          {sendingApproval === doc.doc_id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <><Send className="w-3 h-3 mr-1" /> Send for Review</>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default GeneratePanel;
