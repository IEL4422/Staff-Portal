import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Save, Loader2, Search, ChevronRight, CheckCircle2, AlertCircle,
  RefreshCw, FileText, File, Repeat
} from 'lucide-react';
import { toast } from 'sonner';
import { templatesApi, documentGenerationApi } from '../../services/documentsApi';

const FieldMappingPanel = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [template, setTemplate] = useState(null);
  const [mappingJson, setMappingJson] = useState({ fields: {}, pdfFields: {} });
  const [availableFields, setAvailableFields] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [repeatConfig, setRepeatConfig] = useState({});

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await templatesApi.getAll();
        setTemplates(res.data || []);
      } catch {
        console.error('Failed to load templates');
      } finally {
        setLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, []);

  const loadMapping = useCallback(async () => {
    if (!selectedTemplateId) return;
    setLoading(true);
    try {
      const [mappingRes, fieldsRes] = await Promise.all([
        templatesApi.getMapping(selectedTemplateId),
        documentGenerationApi.getAirtableFields()
      ]);
      const templateData = mappingRes.data;
      setTemplate(templateData);
      setAvailableFields(fieldsRes.data || {});

      const existingMapping = templateData.mapping_json || {};
      const fields = { ...(existingMapping.fields || {}) };
      const pdfFields = { ...(existingMapping.pdfFields || {}) };

      if (templateData.template_type === 'DOCX') {
        (templateData.detected_variables || []).forEach(v => {
          if (!fields[v]) fields[v] = { source: '__LEAVE_BLANK__', staffInputLabel: '' };
        });
      } else {
        (templateData.detected_pdf_fields || []).forEach(f => {
          const name = f.name || f;
          if (!pdfFields[name]) pdfFields[name] = { source: '__LEAVE_BLANK__', type: f.type || 'text', staffInputLabel: '' };
        });
      }

      setMappingJson({ fields, pdfFields });
      setRepeatConfig(existingMapping.repeatConfig || {});
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to load mapping:', err);
      toast.error('Failed to load template mapping');
    } finally {
      setLoading(false);
    }
  }, [selectedTemplateId]);

  useEffect(() => { loadMapping(); }, [loadMapping]);

  const handleFieldChange = (fieldName, value, isDocx) => {
    setHasChanges(true);
    setMappingJson(prev => {
      const key = isDocx ? 'fields' : 'pdfFields';
      return {
        ...prev,
        [key]: {
          ...prev[key],
          [fieldName]: {
            ...prev[key]?.[fieldName],
            source: value,
            staffInputLabel: value === '__STAFF_INPUT__' ? (prev[key]?.[fieldName]?.staffInputLabel || fieldName) : ''
          }
        }
      };
    });
  };

  const handleStaffLabelChange = (fieldName, label, isDocx) => {
    setHasChanges(true);
    setMappingJson(prev => {
      const key = isDocx ? 'fields' : 'pdfFields';
      return {
        ...prev,
        [key]: { ...prev[key], [fieldName]: { ...prev[key]?.[fieldName], staffInputLabel: label } }
      };
    });
  };

  const handleRepeatSourceChange = (blockName, source) => {
    setHasChanges(true);
    setRepeatConfig(prev => ({ ...prev, [blockName]: { ...prev[blockName], source } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await templatesApi.saveMapping(selectedTemplateId, {
        ...mappingJson,
        repeatConfig
      });
      toast.success('Mapping saved');
      setHasChanges(false);
    } catch (err) {
      toast.error('Failed to save mapping');
    } finally {
      setSaving(false);
    }
  };

  const getStats = () => {
    const all = { ...mappingJson.fields, ...mappingJson.pdfFields };
    const total = Object.keys(all).length;
    const airtable = Object.values(all).filter(m => m.source && !['__LEAVE_BLANK__', '__STAFF_INPUT__'].includes(m.source)).length;
    const staffInput = Object.values(all).filter(m => m.source === '__STAFF_INPUT__').length;
    const blank = total - airtable - staffInput;
    return { total, airtable, staffInput, blank };
  };

  const getFilteredFields = () => {
    if (!template) return [];
    const isDocx = template.template_type === 'DOCX';
    const items = isDocx
      ? (template.detected_variables || [])
      : (template.detected_pdf_fields || []).map(f => ({ name: f.name || f, type: f.type || 'text' }));
    if (!searchQuery) return items;
    return items.filter(f => {
      const name = typeof f === 'string' ? f : f.name;
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const detectRepeatBlocks = () => {
    if (!template || template.template_type !== 'DOCX') return [];
    const vars = template.detected_variables || [];
    const blocks = [];
    vars.forEach(v => {
      if (v.includes('.')) {
        const prefix = v.split('.')[0];
        if (!blocks.includes(prefix)) blocks.push(prefix);
      }
    });
    return blocks;
  };

  const repeatBlocks = detectRepeatBlocks();
  const REPEAT_SOURCES = [
    { value: 'assets_debts', label: 'Assets & Debts' },
    { value: 'case_contacts', label: 'Case Contacts' },
    { value: 'beneficiaries', label: 'Beneficiaries' },
    { value: 'dates_deadlines', label: 'Dates & Deadlines' },
  ];

  if (!selectedTemplateId) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-6">
            <label className="text-sm font-medium text-slate-700 block mb-2">Select a template to configure field mapping</label>
            {loadingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading templates...
              </div>
            ) : (
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Choose template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        {t.template_type === 'DOCX' ? <FileText className="w-3 h-3" /> : <File className="w-3 h-3" />}
                        {t.name || t.template_name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#2E7DA1]" />
      </div>
    );
  }

  const isDocx = template?.template_type === 'DOCX';
  const filteredFields = getFilteredFields();
  const stats = getStats();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name || t.template_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadMapping}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && <Badge className="bg-amber-100 text-amber-700 border-amber-200">Unsaved</Badge>}
          <Button onClick={handleSave} disabled={saving || !hasChanges} className="bg-[#2E7DA1] hover:bg-[#256a8a]">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Mapping</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="py-3 text-center">
          <p className="text-xl font-bold text-slate-800">{stats.total}</p>
          <p className="text-xs text-slate-500">Total Fields</p>
        </CardContent></Card>
        <Card className="border-green-200 bg-green-50/50"><CardContent className="py-3 text-center">
          <p className="text-xl font-bold text-green-700">{stats.airtable}</p>
          <p className="text-xs text-green-600">Airtable Mapped</p>
        </CardContent></Card>
        <Card className="border-orange-200 bg-orange-50/50"><CardContent className="py-3 text-center">
          <p className="text-xl font-bold text-orange-700">{stats.staffInput}</p>
          <p className="text-xs text-orange-600">Staff Input</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <p className="text-xl font-bold text-slate-500">{stats.blank}</p>
          <p className="text-xs text-slate-400">Leave Blank</p>
        </CardContent></Card>
      </div>

      {repeatBlocks.length > 0 && (
        <Card className="border-teal-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Repeat className="w-4 h-4 text-teal-600" />
              Repeating Item Blocks
            </CardTitle>
            <CardDescription className="text-xs">
              Configure data sources for repeating sections in your template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {repeatBlocks.map(block => (
              <div key={block} className="flex items-center gap-3 p-3 bg-teal-50/50 rounded-lg border border-teal-100">
                <Badge className="font-mono text-xs bg-teal-100 text-teal-700 border-teal-200">
                  {'{#'}{block}{'}'}...{'{'}/{block}{'}'}
                </Badge>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <Select
                  value={repeatConfig[block]?.source || ''}
                  onValueChange={(v) => handleRepeatSourceChange(block, v)}
                >
                  <SelectTrigger className="w-52 h-8 text-sm">
                    <SelectValue placeholder="Select data source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REPEAT_SOURCES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Field Mappings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fields..."
              className="pl-10 h-9"
            />
          </div>
          <div className="flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Airtable</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> Staff Input</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" /> Blank</span>
          </div>

          <div className="border rounded-lg divide-y max-h-[500px] overflow-y-auto">
            {filteredFields.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                {searchQuery ? `No fields matching "${searchQuery}"` : 'No fields detected'}
              </div>
            ) : (
              filteredFields.map((field, idx) => {
                const fieldName = typeof field === 'string' ? field : field.name;
                const mapping = isDocx ? mappingJson.fields?.[fieldName] : mappingJson.pdfFields?.[fieldName];
                const source = mapping?.source || '__LEAVE_BLANK__';
                let bgClass = '';
                if (source === '__STAFF_INPUT__') bgClass = 'bg-orange-50/50';
                else if (source && source !== '__LEAVE_BLANK__') bgClass = 'bg-green-50/50';

                return (
                  <div key={fieldName} className={`p-3 flex items-start gap-3 ${bgClass} transition-colors`}>
                    <div className="w-1/3 pt-1">
                      <Badge variant="outline" className={`font-mono text-xs ${isDocx ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {isDocx ? `{${fieldName}}` : fieldName}
                      </Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 mt-2 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Select value={source} onValueChange={(v) => handleFieldChange(fieldName, v, isDocx)}>
                        <SelectTrigger className={`h-8 text-sm ${
                          source === '__STAFF_INPUT__' ? 'border-orange-300' :
                          source !== '__LEAVE_BLANK__' ? 'border-green-300' : ''
                        }`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="__LEAVE_BLANK__">
                            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-300" /> Leave Blank</span>
                          </SelectItem>
                          <SelectItem value="__STAFF_INPUT__">
                            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400" /> Staff Input</span>
                          </SelectItem>
                          {availableFields.master_list_fields?.length > 0 && (
                            <>
                              <div className="px-2 py-1 text-[10px] text-slate-400 border-t mt-1 font-semibold">MASTER LIST</div>
                              {availableFields.master_list_fields.map(f => (
                                <SelectItem key={`ml_${f}`} value={f}>
                                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /> {f}</span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {availableFields.bundle_keys?.filter(k => !availableFields.master_list_fields?.includes(k)).length > 0 && (
                            <>
                              <div className="px-2 py-1 text-[10px] text-slate-400 border-t mt-1 font-semibold">COMPUTED</div>
                              {availableFields.bundle_keys.filter(k => !availableFields.master_list_fields?.includes(k)).map(k => (
                                <SelectItem key={k} value={k}>
                                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" /> {k}</span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      {source === '__STAFF_INPUT__' && (
                        <Input
                          placeholder="Display label..."
                          value={mapping?.staffInputLabel || ''}
                          onChange={(e) => handleStaffLabelChange(fieldName, e.target.value, isDocx)}
                          className="h-7 text-xs border-orange-200"
                        />
                      )}
                      {source && !['__LEAVE_BLANK__', '__STAFF_INPUT__'].includes(source) && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="w-3 h-3" /> Mapped to: {source}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FieldMappingPanel;
