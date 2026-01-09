import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { masterListApi, documentGenerationApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ArrowLeft, Loader2, Search, FileSignature, Check, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const QuitClaimDeedPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    draftingDate: '',
    grantorName: '',
    grantorDesignation: '',
    grantor2Name: '',
    grantorStreetAddress: '',
    grantorCityStateZip: '',
    granteeName: '',
    granteeDesignation: '',
    granteeLanguage: '',
    granteeStreetAddress: '',
    granteeCityStateZip: '',
    propertyStreetAddress: '',
    propertyCityStateZip: '',
    parcelIdNumber: '',
    legalPropertyDescription: '',
  });

  // Designation options
  const grantorDesignationOptions = [
    'an individual',
    'a married couple',
    'individuals',
    'a trust',
    'an LLC',
    'a corporation',
  ];

  const granteeDesignationOptions = [
    'an individual',
    'a married couple',
    'individuals',
    'a trust',
    'an LLC',
    'a corporation',
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

  const handleSelectMatter = (record) => {
    setSelectedMatter(record);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedMatter) {
      toast.error('Please select a matter');
      return;
    }

    if (!formData.grantorName || !formData.granteeName) {
      toast.error('Please fill in required fields');
      return;
    }

    setSubmitting(true);
    try {
      await documentGenerationApi.create({
        document_type: 'Quit Claim Deed',
        matter_id: selectedMatter.id,
        drafting_date: formData.draftingDate,
        grantor_name: formData.grantorName,
        grantor_designation: formData.grantorDesignation,
        grantor_2_name: formData.grantor2Name,
        grantor_street_address: formData.grantorStreetAddress,
        grantor_city_state_zip: formData.grantorCityStateZip,
        grantee_name: formData.granteeName,
        grantee_designation: formData.granteeDesignation,
        grantee_language: formData.granteeLanguage,
        grantee_street_address: formData.granteeStreetAddress,
        grantee_city_state_zip: formData.granteeCityStateZip,
        property_street_address: formData.propertyStreetAddress,
        property_city_state_zip: formData.propertyCityStateZip,
        parcel_id_number: formData.parcelIdNumber,
        legal_property_description: formData.legalPropertyDescription,
      });

      toast.success('Quit Claim Deed record created successfully!');
      navigate('/actions/generate-documents');
    } catch (error) {
      console.error('Failed to create document:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Unknown error';
      toast.error(`Failed to create document: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Show Grantor 2 field only if designation is "a married couple" or "individuals"
  const showGrantor2 = formData.grantorDesignation === 'a married couple' || formData.grantorDesignation === 'individuals';
  
  // Show Grantee Language field only if designation is "a trust" or "an LLC"
  const showGranteeLanguage = formData.granteeDesignation === 'a trust' || formData.granteeDesignation === 'an LLC';

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in" data-testid="quit-claim-deed-page">
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
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <FileSignature className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              Quit Claim Deed
            </h1>
            <p className="text-slate-500 text-sm">Generate a quit claim deed document</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Link to Matter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Matter Search */}
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
                        <p className="text-sm text-slate-500">{record.fields?.['Client'] || ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{selectedMatter.fields?.['Matter Name'] || 'Unnamed'}</p>
                  <p className="text-sm text-slate-500">{selectedMatter.fields?.['Client'] || ''}</p>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedMatter(null)}
                >
                  Change
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grantor Information */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Grantor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Grantor Name *</Label>
              <Input
                value={formData.grantorName}
                onChange={(e) => handleChange('grantorName', e.target.value)}
                placeholder="Enter grantor name"
                data-testid="grantor-name-input"
              />
              <p className="text-xs text-slate-500">If there is more than one grantor, you will add the second grantor in a later question</p>
            </div>

            <div className="space-y-2">
              <Label>Grantor Designation</Label>
              <Select 
                value={formData.grantorDesignation} 
                onValueChange={(value) => handleChange('grantorDesignation', value)}
              >
                <SelectTrigger data-testid="grantor-designation-select">
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {grantorDesignationOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showGrantor2 && (
              <div className="space-y-2 animate-fade-in">
                <Label>Grantor 2 Name</Label>
                <Input
                  value={formData.grantor2Name}
                  onChange={(e) => handleChange('grantor2Name', e.target.value)}
                  placeholder="Enter second grantor name"
                  data-testid="grantor2-name-input"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Grantor Street Address</Label>
              <Input
                value={formData.grantorStreetAddress}
                onChange={(e) => handleChange('grantorStreetAddress', e.target.value)}
                placeholder="Enter street address"
                data-testid="grantor-street-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Grantor City, State, Zip</Label>
              <Input
                value={formData.grantorCityStateZip}
                onChange={(e) => handleChange('grantorCityStateZip', e.target.value)}
                placeholder="e.g., Chicago, IL 60601"
                data-testid="grantor-city-state-zip-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Grantee Information */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Grantee Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Grantee(s) Name *</Label>
              <Input
                value={formData.granteeName}
                onChange={(e) => handleChange('granteeName', e.target.value)}
                placeholder="Enter grantee name(s)"
                data-testid="grantee-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Grantee Designation</Label>
              <Select 
                value={formData.granteeDesignation} 
                onValueChange={(value) => handleChange('granteeDesignation', value)}
              >
                <SelectTrigger data-testid="grantee-designation-select">
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {granteeDesignationOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showGranteeLanguage && (
              <div className="space-y-2 animate-fade-in">
                <Label>Grantee Language</Label>
                <Textarea
                  value={formData.granteeLanguage}
                  onChange={(e) => handleChange('granteeLanguage', e.target.value)}
                  placeholder="Enter specific language for trust or LLC"
                  rows={3}
                  data-testid="grantee-language-input"
                />
                <p className="text-xs text-slate-500">Ex. Jane Doe, as trustee and the successors in interest of the Jane Doe Living Trust</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Grantee Street Address</Label>
              <Input
                value={formData.granteeStreetAddress}
                onChange={(e) => handleChange('granteeStreetAddress', e.target.value)}
                placeholder="Enter street address"
                data-testid="grantee-street-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Grantee City, State, Zip</Label>
              <Input
                value={formData.granteeCityStateZip}
                onChange={(e) => handleChange('granteeCityStateZip', e.target.value)}
                placeholder="e.g., Chicago, IL 60601"
                data-testid="grantee-city-state-zip-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Property Information */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Property Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Street Address of Property</Label>
              <Input
                value={formData.propertyStreetAddress}
                onChange={(e) => handleChange('propertyStreetAddress', e.target.value)}
                placeholder="Enter property street address"
                data-testid="property-street-input"
              />
            </div>

            <div className="space-y-2">
              <Label>City, State, Zip of Property</Label>
              <Input
                value={formData.propertyCityStateZip}
                onChange={(e) => handleChange('propertyCityStateZip', e.target.value)}
                placeholder="e.g., Chicago, IL 60601"
                data-testid="property-city-state-zip-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Parcel ID Number</Label>
              <Input
                value={formData.parcelIdNumber}
                onChange={(e) => handleChange('parcelIdNumber', e.target.value)}
                placeholder="Enter parcel ID number"
                data-testid="parcel-id-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Legal Property Description</Label>
              <Textarea
                value={formData.legalPropertyDescription}
                onChange={(e) => handleChange('legalPropertyDescription', e.target.value)}
                placeholder="Enter the legal property description"
                rows={4}
                data-testid="legal-description-input"
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
                Create Document Record
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default QuitClaimDeedPage;
