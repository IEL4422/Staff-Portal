import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  ArrowLeft, Save, Loader2, FileText, File, Search,
  ChevronRight, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { templatesApi, documentGenerationApi } from '../services/documentsApi';

const TemplateMappingPage = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState(null);
  const [mappingJson, setMappingJson] = useState({ fields: {}, pdfFields: {} });
  const [availableFields, setAvailableFields] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mappingRes, fieldsRes] = await Promise.all([
        templatesApi.getMapping(templateId),
        documentGenerationApi.getAirtableFields()
      ]);
      
      const templateData = mappingRes.data;
      setTemplate(templateData);
      setAvailableFields(fieldsRes.data || {});
      
      // Initialize mapping from template or create default
      const existingMapping = templateData.mapping_json || {};
      const fields = existingMapping.fields || {};
      const pdfFields = existingMapping.pdfFields || {};
      
      // Initialize any missing variables with __LEAVE_BLANK__
      if (templateData.template_type === 'DOCX') {
        (templateData.detected_variables || []).forEach(variable => {
          if (!fields[variable]) {
            fields[variable] = { source: '__LEAVE_BLANK__', staffInputLabel: '' };
          }
        });
      } else if (templateData.template_type === 'FILLABLE_PDF') {
        (templateData.detected_pdf_fields || []).forEach(field => {
          const fieldName = field.name || field;
          if (!pdfFields[fieldName]) {
            pdfFields[fieldName] = { source: '__LEAVE_BLANK__', type: field.type || 'text', staffInputLabel: '' };
          }
        });
      }
      
      setMappingJson({ fields, pdfFields });
    } catch (error) {
      console.error('Failed to fetch template mapping:', error);
      toast.error('Failed to load template mapping');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFieldChange = (fieldName, value, isDocx = true) => {
    setHasChanges(true);
    setMappingJson(prev => {
      const fieldType = isDocx ? 'fields' : 'pdfFields';
      return {
        ...prev,
        [fieldType]: {
          ...prev[fieldType],
          [fieldName]: {
            ...prev[fieldType]?.[fieldName],
            source: value,
            staffInputLabel: value === '__STAFF_INPUT__' 
              ? (prev[fieldType]?.[fieldName]?.staffInputLabel || fieldName) 
              : ''
          }
        }
      };
    });
  };

  const handleStaffInputLabelChange = (fieldName, label, isDocx = true) => {
    setHasChanges(true);
    setMappingJson(prev => {
      const fieldType = isDocx ? 'fields' : 'pdfFields';
      return {
        ...prev,
        [fieldType]: {
          ...prev[fieldType],
          [fieldName]: {
            ...prev[fieldType]?.[fieldName],
            staffInputLabel: label
          }
        }
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await templatesApi.saveMapping(templateId, mappingJson);
      toast.success('Mapping saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save mapping:', error);
      toast.error('Failed to save mapping');
    } finally {
      setSaving(false);
    }
  };

  // Calculate mapping stats
  const getMappingStats = () => {
    const allMappings = { ...mappingJson.fields, ...mappingJson.pdfFields };
    const total = Object.keys(allMappings).length;
    const airtable = Object.values(allMappings).filter(m => m.source && !['__LEAVE_BLANK__', '__STAFF_INPUT__'].includes(m.source)).length;
    const staffInput = Object.values(allMappings).filter(m => m.source === '__STAFF_INPUT__').length;
    const leaveBlank = Object.values(allMappings).filter(m => m.source === '__LEAVE_BLANK__' || !m.source).length;
    return { total, airtable, staffInput, leaveBlank };
  };

  const stats = getMappingStats();

  // Get filtered fields based on search
  const getFilteredFields = () => {
    const isDocx = template?.template_type === 'DOCX';
    const fields = isDocx 
      ? template?.detected_variables || []
      : (template?.detected_pdf_fields || []).map(f => ({ name: f.name || f, type: f.type || 'text' }));
    
    if (!searchQuery) return fields;
    
    return fields.filter(f => {
      const fieldName = typeof f === 'string' ? f : f.name;
      return fieldName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Template Not Found</h2>
            <p className="text-slate-500 mb-4">The requested template could not be found.</p>
            <Button onClick={() => navigate('/documents')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Templates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDocx = template.template_type === 'DOCX';
  const filteredFields = getFilteredFields();

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/documents')}
            data-testid="back-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDocx ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                {isDocx ? <FileText className="w-5 h-5" /> : <File className="w-5 h-5" />}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                  {template.template_name}
                </h1>
                <p className="text-sm text-slate-500">Field Mapping Configuration</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchData}
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-[#2E7DA1] hover:bg-[#256a8a]"
            data-testid="save-mapping-btn"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Mapping
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            <p className="text-xs text-slate-500">Total Fields</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-700">{stats.airtable}</p>
            <p className="text-xs text-green-600">Airtable Mapped</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-orange-700">{stats.staffInput}</p>
            <p className="text-xs text-orange-600">Staff Input</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-slate-500">{stats.leaveBlank}</p>
            <p className="text-xs text-slate-400">Leave Blank</p>
          </CardContent>
        </Card>
      </div>

      {/* Mapping Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Field Mappings</CardTitle>
              <CardDescription>
                Configure how each template field is populated from Airtable or staff input
              </CardDescription>
            </div>
            {hasChanges && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                Unsaved Changes
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fields..."
              className="pl-10"
              data-testid="field-search"
            />
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs text-slate-500 px-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Airtable Field
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-400"></span> Staff Input Required
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span> Leave Blank
            </span>
          </div>

          {/* Field List */}
          <div className="border rounded-lg divide-y max-h-[500px] overflow-y-auto">
            {filteredFields.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                {searchQuery ? (
                  <>No fields matching &quot;{searchQuery}&quot;</>
                ) : (
                  <>No fields detected in this template</>
                )}
              </div>
            ) : (
              filteredFields.map((field, index) => {
                const fieldName = typeof field === 'string' ? field : field.name;
                const fieldType = typeof field === 'string' ? 'text' : field.type;
                const mapping = isDocx 
                  ? mappingJson.fields?.[fieldName] 
                  : mappingJson.pdfFields?.[fieldName];
                const source = mapping?.source || '__LEAVE_BLANK__';
                
                // Determine background color
                let bgClass = 'bg-white hover:bg-slate-50';
                if (source === '__STAFF_INPUT__') {
                  bgClass = 'bg-orange-50/50 hover:bg-orange-50';
                } else if (source && source !== '__LEAVE_BLANK__') {
                  bgClass = 'bg-green-50/50 hover:bg-green-50';
                }

                return (
                  <div 
                    key={fieldName} 
                    className={`p-4 flex items-start gap-4 ${bgClass} transition-colors`}
                    data-testid={`field-row-${index}`}
                  >
                    {/* Field Name */}
                    <div className="w-1/3 pt-1">
                      <Badge 
                        variant="outline" 
                        className={`font-mono text-xs ${isDocx ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                      >
                        {isDocx ? `{${fieldName}}` : fieldName}
                      </Badge>
                      {!isDocx && (
                        <span className="text-[10px] text-slate-400 ml-1">({fieldType})</span>
                      )}
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-4 h-4 text-slate-400 mt-2 flex-shrink-0" />

                    {/* Mapping Selection */}
                    <div className="flex-1 space-y-2">
                      <Select 
                        value={source}
                        onValueChange={(value) => handleFieldChange(fieldName, value, isDocx)}
                      >
                        <SelectTrigger 
                          className={`h-9 text-sm ${
                            source === '__LEAVE_BLANK__' ? 'border-slate-300' :
                            source === '__STAFF_INPUT__' ? 'border-orange-300 bg-orange-50' :
                            'border-green-300 bg-green-50'
                          }`}
                          data-testid={`field-select-${index}`}
                        >
                          <SelectValue placeholder="Select mapping..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__LEAVE_BLANK__" className="text-sm">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                              Leave Blank
                            </span>
                          </SelectItem>
                          <SelectItem value="__STAFF_INPUT__" className="text-sm">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                              Staff Input Required
                            </span>
                          </SelectItem>
                          <div className="px-2 py-1 text-[10px] text-slate-400 border-t mt-1 font-semibold">
                            AIRTABLE FIELDS
                          </div>
                          {availableFields.bundle_keys?.map(key => (
                            <SelectItem key={key} value={key} className="text-sm">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                {key}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Staff Input Label */}
                      {source === '__STAFF_INPUT__' && (
                        <Input
                          placeholder="Display label (e.g., Property Address, Case Number)"
                          value={mapping?.staffInputLabel || ''}
                          onChange={(e) => handleStaffInputLabelChange(fieldName, e.target.value, isDocx)}
                          className="h-8 text-sm border-orange-200"
                          data-testid={`staff-label-${index}`}
                        />
                      )}

                      {/* Mapping Status */}
                      {source && source !== '__LEAVE_BLANK__' && source !== '__STAFF_INPUT__' && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Mapped to: {source}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Help Text */}
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-2">
            <p className="font-medium">How Field Mappings Work:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong className="text-green-600">Airtable Field</strong> - Auto-populated from the client&apos;s Airtable data</li>
              <li><strong className="text-orange-600">Staff Input Required</strong> - Staff will be prompted to enter this value during generation</li>
              <li><strong className="text-slate-500">Leave Blank</strong> - Field will be empty in the generated document</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      {template.mapping_updated_at && (
        <p className="text-xs text-slate-400 text-center">
          Last updated: {new Date(template.mapping_updated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default TemplateMappingPage;
