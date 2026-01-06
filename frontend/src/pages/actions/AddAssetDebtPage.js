import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assetsDebtsApi, masterListApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Wallet, Loader2, ArrowLeft, Check, Search, X, Plus, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';

// Asset type options
const ASSET_TYPE_OPTIONS = [
  'Real Estate',
  'Bank Account',
  'Investment Account',
  'Retirement Account',
  'Vehicle',
  'Life Insurance',
  'Business Interest',
  'Personal Property',
  'Other'
];

// Debt type options
const DEBT_TYPE_OPTIONS = [
  'Mortgage',
  'Credit Card',
  'Auto Loan',
  'Personal Loan',
  'Medical Debt',
  'Student Loan',
  'Tax Debt',
  'Other'
];

// Status options - Removed as Airtable has preset select options
// If needed in future, fetch valid options from Airtable

const AddAssetDebtPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    assetOrDebt: '',
    typeOfAsset: '',
    typeOfDebt: '',
    value: '',
    notes: '',
    files: []
  });
  
  // Matter search state
  const [matterSearchQuery, setMatterSearchQuery] = useState('');
  const [matterSearchResults, setMatterSearchResults] = useState([]);
  const [searchingMatters, setSearchingMatters] = useState(false);
  const [selectedMatters, setSelectedMatters] = useState([]);

  const searchMatters = async (query) => {
    if (!query || query.length < 2) {
      setMatterSearchResults([]);
      return;
    }
    
    setSearchingMatters(true);
    try {
      const response = await masterListApi.search(query);
      // Filter out already selected matters
      const selectedIds = selectedMatters.map(m => m.id);
      const filtered = (response.data.records || []).filter(r => !selectedIds.includes(r.id));
      setMatterSearchResults(filtered);
    } catch (error) {
      console.error('Failed to search matters:', error);
      toast.error('Failed to search matters');
    } finally {
      setSearchingMatters(false);
    }
  };

  const handleMatterSearch = (e) => {
    const query = e.target.value;
    setMatterSearchQuery(query);
    searchMatters(query);
  };

  const addMatter = (matter) => {
    setSelectedMatters([...selectedMatters, matter]);
    setMatterSearchQuery('');
    setMatterSearchResults([]);
  };

  const removeMatter = (matterId) => {
    setSelectedMatters(selectedMatters.filter(m => m.id !== matterId));
  };

  const handleValueChange = (value) => {
    // Allow only numbers and decimal point
    const numValue = value.replace(/[^0-9.]/g, '');
    setFormData({ ...formData, value: numValue });
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFormData({ ...formData, files: [...formData.files, ...newFiles] });
  };

  const removeFile = (index) => {
    const newFiles = formData.files.filter((_, i) => i !== index);
    setFormData({ ...formData, files: newFiles });
  };

  const handleAssetOrDebtChange = (value) => {
    // Reset type fields when switching between Asset and Debt
    setFormData({
      ...formData,
      assetOrDebt: value,
      typeOfAsset: value === 'Asset' ? formData.typeOfAsset : '',
      typeOfDebt: value === 'Debt' ? formData.typeOfDebt : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Name of Asset is required');
      return;
    }

    setLoading(true);

    try {
      const data = {
        name: formData.name.trim()
      };

      // Add asset or debt type
      if (formData.assetOrDebt) {
        data.asset_or_debt = formData.assetOrDebt;
      }

      // Add type based on selection
      if (formData.assetOrDebt === 'Asset' && formData.typeOfAsset) {
        data.type_of_asset = formData.typeOfAsset;
      }
      if (formData.assetOrDebt === 'Debt' && formData.typeOfDebt) {
        data.type_of_debt = formData.typeOfDebt;
      }

      // Add value if provided
      if (formData.value) {
        data.value = parseFloat(formData.value);
      }

      // Add notes if provided
      if (formData.notes.trim()) {
        data.notes = formData.notes.trim();
      }

      // Add matters if selected
      if (selectedMatters.length > 0) {
        data.master_list = selectedMatters.map(m => m.id);
      }

      // Handle file attachments
      if (formData.files.length > 0) {
        const filePromises = formData.files.map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                url: reader.result,
                filename: file.name
              });
            };
            reader.readAsDataURL(file);
          });
        });
        
        data.attachments = await Promise.all(filePromises);
      }

      await assetsDebtsApi.create(data);
      toast.success('Asset/Debt added successfully!');
      
      // Reset form
      setFormData({
        name: '',
        assetOrDebt: '',
        typeOfAsset: '',
        typeOfDebt: '',
        value: '',
        notes: '',
        files: []
      });
      setSelectedMatters([]);
      
      // Navigate back
      setTimeout(() => navigate(-1), 1500);
    } catch (error) {
      console.error('Failed to add asset/debt:', error);
      toast.error(error.response?.data?.detail || 'Failed to add asset/debt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <Wallet className="w-7 h-7 inline-block mr-2 text-[#2E7DA1]" />
            Add Asset/Debt
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <Card className="border-0 shadow-sm max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Asset/Debt Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name of Asset */}
            <div className="space-y-2">
              <Label htmlFor="name">Name of Asset <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name of asset or debt"
                required
              />
            </div>

            {/* Asset or Debt */}
            <div className="space-y-2">
              <Label htmlFor="assetOrDebt">Asset or Debt</Label>
              <Select
                value={formData.assetOrDebt}
                onValueChange={handleAssetOrDebtChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Asset or Debt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asset">Asset</SelectItem>
                  <SelectItem value="Debt">Debt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type of Asset - Only shows if Asset is selected */}
            {formData.assetOrDebt === 'Asset' && (
              <div className="space-y-2">
                <Label htmlFor="typeOfAsset">Type of Asset</Label>
                <Select
                  value={formData.typeOfAsset}
                  onValueChange={(value) => setFormData({ ...formData, typeOfAsset: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type of asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Type of Debt - Only shows if Debt is selected */}
            {formData.assetOrDebt === 'Debt' && (
              <div className="space-y-2">
                <Label htmlFor="typeOfDebt">Type of Debt</Label>
                <Select
                  value={formData.typeOfDebt}
                  onValueChange={(value) => setFormData({ ...formData, typeOfDebt: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type of debt" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEBT_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Value */}
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <Input
                  id="value"
                  type="text"
                  value={formData.value}
                  onChange={(e) => handleValueChange(e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:border-[#2E7DA1] transition-colors">
                <input
                  type="file"
                  id="attachments"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="attachments" className="cursor-pointer block">
                  <Upload className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="text-sm text-slate-600 mt-2">Click to upload files</p>
                  <p className="text-xs text-slate-400">Multiple files allowed</p>
                </label>
              </div>
              
              {/* Selected Files List */}
              {formData.files.length > 0 && (
                <div className="space-y-2 mt-2">
                  {formData.files.map((file, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
                    >
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="flex-1 text-sm truncate">{file.name}</span>
                      <span className="text-xs text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Matters Search */}
            <div className="space-y-2">
              <Label>Matters</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={matterSearchQuery}
                  onChange={handleMatterSearch}
                  placeholder="Search matters to link..."
                  className="pl-9"
                />
                {searchingMatters && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                )}
              </div>
              
              {/* Search Results */}
              {matterSearchResults.length > 0 && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {matterSearchResults.map((matter) => (
                    <button
                      key={matter.id}
                      type="button"
                      onClick={() => addMatter(matter)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b last:border-b-0 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{matter.fields?.['Matter Name'] || matter.fields?.Client || 'Unnamed'}</div>
                        {matter.fields?.['Type of Case'] && (
                          <div className="text-xs text-slate-500">{matter.fields['Type of Case']}</div>
                        )}
                      </div>
                      <Plus className="w-4 h-4 text-[#2E7DA1]" />
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Matters */}
              {selectedMatters.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedMatters.map((matter) => (
                    <Badge 
                      key={matter.id} 
                      variant="secondary"
                      className="flex items-center gap-1 pr-1 bg-[#2E7DA1]/10 text-[#2E7DA1]"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      {matter.fields?.['Matter Name'] || matter.fields?.Client || 'Unnamed'}
                      <button
                        type="button"
                        onClick={() => removeMatter(matter.id)}
                        className="ml-1 hover:bg-[#2E7DA1]/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter any additional notes..."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Add Asset/Debt
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddAssetDebtPage;
