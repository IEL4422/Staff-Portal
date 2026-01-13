import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { masterListApi, documentGenerationApi, judgeInfoApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { RichTextEditor } from '../../components/ui/rich-text-editor';
import { ArrowLeft, Loader2, Search, Scale, Check, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const CourtOrderPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState(null);
  const [linkedJudgeName, setLinkedJudgeName] = useState('');
  const [loadingJudge, setLoadingJudge] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    draftingDate: '',
    county: '',
    appearancePurpose: '',
    courtOrderLanguage: '',
    caseNumber: '',
    judgeName: '',
  });

  // County options (same as used in Probate cases)
  const countyOptions = [
    'Cook', 'DuPage', 'Lake', 'Will', 'Kane', 'McHenry', 'Winnebago', 
    'Madison', 'St. Clair', 'Champaign', 'Sangamon', 'Peoria', 'McLean', 
    'Rock Island', 'Tazewell', 'Kankakee', 'DeKalb', 'Kendall', 'Grundy', 
    'LaSalle', 'Macon', 'Adams', 'Vermilion', 'Coles', 'Other'
  ];

  // Search for matters with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await masterListApi.search(searchQuery);
        setSearchResults(response.data.records || []);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectMatter = async (record) => {
    setSelectedMatter(record);
    setSearchQuery('');
    setSearchResults([]);
    setLinkedJudgeName('');
    
    // Auto-fill case number, county from selected matter if available
    const fields = record.fields || {};
    console.log('Selected matter fields:', fields); // Debug log
    
    if (fields['Case Number']) {
      setFormData(prev => ({ ...prev, caseNumber: fields['Case Number'] }));
    }
    if (fields['County']) {
      setFormData(prev => ({ ...prev, county: fields['County'] }));
    }
    
    // Check for "Name (from Judge Information 2)" lookup field first
    // This is the Airtable lookup field that shows the judge name directly
    const judgeNameField = fields['Name (from Judge Information 2)'];
    if (judgeNameField) {
      const judgeName = Array.isArray(judgeNameField) ? judgeNameField[0] : judgeNameField;
      setLinkedJudgeName(judgeName);
      setFormData(prev => ({ ...prev, judgeName: judgeName }));
      return;
    }
    
    // Fallback: Fetch Judge name from linked Judge Information 2 field
    if (fields['Judge Information 2'] && Array.isArray(fields['Judge Information 2']) && fields['Judge Information 2'].length > 0) {
      const judgeRecordId = fields['Judge Information 2'][0];
      setLoadingJudge(true);
      try {
        // Fetch all judges and find the one matching the ID
        const response = await judgeInfoApi.getAll();
        const judges = response.data.records || [];
        const linkedJudge = judges.find(j => j.id === judgeRecordId);
        if (linkedJudge) {
          const judgeName = linkedJudge.fields?.['Judge Name'] || linkedJudge.fields?.['Name'] || '';
          setLinkedJudgeName(judgeName);
          setFormData(prev => ({ ...prev, judgeName: judgeName }));
        }
      } catch (error) {
        console.error('Failed to fetch judge info:', error);
      } finally {
        setLoadingJudge(false);
      }
    }
    
    // Also check for direct Judge Name field if available
    if (fields['Judge Name']) {
      setLinkedJudgeName(fields['Judge Name']);
      setFormData(prev => ({ ...prev, judgeName: fields['Judge Name'] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedMatter) {
      toast.error('Please select a matter');
      return;
    }

    setSubmitting(true);
    try {
      await documentGenerationApi.create({
        document_type: 'Court Order',
        matter_id: selectedMatter.id,
        drafting_date: formData.draftingDate,
        county: formData.county,
        appearance_purpose: formData.appearancePurpose,
        court_order_language: formData.courtOrderLanguage,
        case_number: formData.caseNumber,
        judge_name: formData.judgeName,
      });

      toast.success('Court Order record created successfully!');
      navigate('/actions/generate-documents');
    } catch (error) {
      console.error('Failed to create document:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Unknown error';
      toast.error(`Failed to create document: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Get matter fields for display
  const matterFields = selectedMatter?.fields || {};

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in" data-testid="court-order-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/actions/generate-documents')}
          className="p-2"
          data-testid="back-button"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Scale className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              Court Order
            </h1>
            <p className="text-slate-500 text-sm">Generate a court order document</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Matter Search */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Link to Matter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedMatter ? (
              <div className="space-y-2">
                <Label>Search Matter *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search by matter name or client name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="matter-search-input"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#2E7DA1]" />
                  )}
                </div>
                
                {searchResults.length > 0 && (
                  <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    {searchResults.map((record) => (
                      <button
                        key={record.id}
                        type="button"
                        onClick={() => handleSelectMatter(record)}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 border-b last:border-0 transition-colors"
                        data-testid={`matter-option-${record.id}`}
                      >
                        <p className="font-medium text-slate-900">{record.fields?.['Matter Name'] || 'Unnamed'}</p>
                        <p className="text-sm text-slate-500">
                          {record.fields?.['Client'] || ''}
                          {record.fields?.['Case Number'] && ` • Case #${record.fields['Case Number']}`}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{selectedMatter.fields?.['Matter Name'] || 'Unnamed'}</p>
                  <p className="text-sm text-slate-500">
                    {selectedMatter.fields?.['Client'] || ''}
                    {selectedMatter.fields?.['Case Number'] && ` • Case #${selectedMatter.fields['Case Number']}`}
                  </p>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedMatter(null);
                    setLinkedJudgeName('');
                    setFormData(prev => ({ ...prev, caseNumber: '', county: '', judgeName: '' }));
                  }}
                >
                  Change
                </Button>
              </div>
            )}

            {/* Show Case Number and Assigned Judge from selected matter */}
            {selectedMatter && (matterFields['Case Number'] || matterFields['Judge Information 2'] || matterFields['Name (from Judge Information 2)'] || linkedJudgeName) && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-blue-900 mb-2">Matter Information</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {matterFields['Case Number'] && (
                    <div>
                      <span className="text-blue-600 font-medium">Case Number: </span>
                      <span className="text-blue-800">{matterFields['Case Number']}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-blue-600 font-medium">Assigned Judge: </span>
                    <span className="text-blue-800">
                      {loadingJudge ? (
                        <Loader2 className="w-3 h-3 inline animate-spin" />
                      ) : (
                        linkedJudgeName || 'None assigned'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Court Order Details */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Court Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Drafting Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="date"
                    value={formData.draftingDate}
                    onChange={(e) => handleChange('draftingDate', e.target.value)}
                    className="pl-10"
                    data-testid="drafting-date-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Case Number</Label>
                <Input
                  value={formData.caseNumber}
                  onChange={(e) => handleChange('caseNumber', e.target.value)}
                  placeholder="Enter case number"
                  data-testid="case-number-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>County</Label>
              <Select 
                value={formData.county} 
                onValueChange={(value) => handleChange('county', value)}
              >
                <SelectTrigger data-testid="county-select">
                  <SelectValue placeholder="Select county" />
                </SelectTrigger>
                <SelectContent>
                  {countyOptions.map((county) => (
                    <SelectItem key={county} value={county}>{county}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Appearance Purpose</Label>
              <Input
                value={formData.appearancePurpose}
                onChange={(e) => handleChange('appearancePurpose', e.target.value)}
                placeholder="Enter the purpose of appearance"
                data-testid="appearance-purpose-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Court Order Language</Label>
              <RichTextEditor
                value={formData.courtOrderLanguage}
                onChange={(value) => handleChange('courtOrderLanguage', value)}
                placeholder="Enter the court order language..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate('/actions/generate-documents')}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={submitting || !selectedMatter}
            className="bg-[#2E7DA1] hover:bg-[#256a8a]"
            data-testid="submit-button"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Generate Document
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CourtOrderPage;
