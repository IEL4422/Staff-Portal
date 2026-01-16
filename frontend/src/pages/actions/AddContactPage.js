import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { caseContactsApi, masterListApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Loader2, ArrowLeft, Search, X } from 'lucide-react';
import { toast } from 'sonner';

const US_STATE_ABBREVIATIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

const CONTACT_TYPES = [
  'Heir',
  'Legatee',
  'Creditor',
  'Attorney'
];

const AddContactPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    relationshipToDecedent: '',
    disabledMinor: false,
    matterId: '',
    matterName: ''
  });

  const [matterSearch, setMatterSearch] = useState('');
  const [matterResults, setMatterResults] = useState([]);
  const [searchingMatters, setSearchingMatters] = useState(false);
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);

  const showRelationshipField = formData.type === 'Heir';

  // Debounced matter search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (matterSearch.length >= 2) {
        searchMatters(matterSearch);
      } else {
        setMatterResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [matterSearch]);

  const searchMatters = async (query) => {
    setSearchingMatters(true);
    try {
      const response = await masterListApi.search(query);
      setMatterResults(response.data.records || []);
      setShowMatterDropdown(true);
    } catch (error) {
      console.error('Failed to search matters:', error);
    } finally {
      setSearchingMatters(false);
    }
  };

  const selectMatter = (matter) => {
    setFormData({
      ...formData,
      matterId: matter.id,
      matterName: matter.fields?.['Matter Name'] || matter.fields?.Client || 'Unknown'
    });
    setMatterSearch(matter.fields?.['Matter Name'] || matter.fields?.Client || '');
    setShowMatterDropdown(false);
  };

  const clearMatter = () => {
    setFormData({ ...formData, matterId: '', matterName: '' });
    setMatterSearch('');
  };

  const handleTypeChange = (value) => {
    setFormData({
      ...formData,
      type: value,
      relationshipToDecedent: value !== 'Heir' ? '' : formData.relationshipToDecedent
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }
    if (!formData.type) {
      toast.error('Type is required');
      return;
    }

    setLoading(true);
    try {
      const contactData = {
        name: formData.name,
        type: formData.type,
        streetAddress: formData.streetAddress || null,
        city: formData.city || null,
        state: formData.state || null,
        zipCode: formData.zipCode || null,
        relationshipToDecedent: showRelationshipField ? formData.relationshipToDecedent : null,
        disabledMinor: formData.disabledMinor,
        matterId: formData.matterId || null
      };

      await caseContactsApi.create(contactData);
      toast.success('Contact created successfully');
      
      // Reset form
      setFormData({
        name: '',
        type: '',
        streetAddress: '',
        city: '',
        state: '',
        zipCode: '',
        relationshipToDecedent: '',
        disabledMinor: false,
        matterId: '',
        matterName: ''
      });
      setMatterSearch('');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to create contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="add-contact-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <UserPlus className="w-7 h-7 inline-block mr-3 text-[#2E7DA1]" />
            Add Case Contact
          </h1>
        </div>
      </div>

      <Card className="border-0 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope' }}>Contact Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
                required
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Type <span className="text-red-500">*</span></Label>
              <Select
                value={formData.type}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Conditional: Relationship to Decedent (only for Heir) */}
            {showRelationshipField && (
              <div className="space-y-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <Label htmlFor="relationshipToDecedent">Relationship to Decedent</Label>
                <Input
                  id="relationshipToDecedent"
                  value={formData.relationshipToDecedent}
                  onChange={(e) => setFormData({ ...formData, relationshipToDecedent: e.target.value })}
                  placeholder="e.g., Son, Daughter, Spouse, Sibling"
                />
              </div>
            )}

            {/* Address Section */}
            <div className="space-y-4 border-t pt-4">
              <Label className="text-slate-700 font-semibold">Address</Label>
              
              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input
                  id="streetAddress"
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {US_STATE_ABBREVIATIONS.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="60601"
                  />
                </div>
              </div>
            </div>

            {/* Disabled/Minor */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="disabledMinor"
                checked={formData.disabledMinor}
                onCheckedChange={(checked) => setFormData({ ...formData, disabledMinor: checked })}
              />
              <Label htmlFor="disabledMinor" className="font-normal cursor-pointer">
                Disabled/Minor
              </Label>
            </div>

            {/* Matter (Searchable) */}
            <div className="space-y-2">
              <Label>Matter</Label>
              <div className="relative">
                {formData.matterId ? (
                  <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
                    <span className="flex-1 text-sm">{formData.matterName}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={clearMatter} className="h-6 w-6 p-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={matterSearch}
                        onChange={(e) => setMatterSearch(e.target.value)}
                        onFocus={() => matterSearch.length >= 2 && setShowMatterDropdown(true)}
                        placeholder="Search for a matter..."
                        className="pl-9"
                      />
                      {searchingMatters && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                      )}
                    </div>
                    {showMatterDropdown && matterResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {matterResults.map((matter) => (
                          <button
                            key={matter.id}
                            type="button"
                            onClick={() => selectMatter(matter)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 border-b border-slate-100 last:border-0"
                          >
                            <div className="font-medium">{matter.fields?.['Matter Name'] || matter.fields?.Client}</div>
                            <div className="text-xs text-slate-500">{matter.fields?.['Type of Case']}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
              Create Contact
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddContactPage;
