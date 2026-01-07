import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assetsDebtsApi } from '../../services/api';
import { useDataCache } from '../../context/DataCacheContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Wallet, Loader2, ArrowLeft, Check, Search, X, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';

// Asset type options (from Airtable)
const ASSET_TYPE_OPTIONS = [
  'Bank Account',
  'Real Estate',
  'Vehicle',
  'Stocks/Bonds',
  'Retirement Account',
  'Life Insurance',
  'Unclaimed Property',
  'Personal Property',
  'Other'
];

// Debt type options (from Airtable)
const DEBT_TYPE_OPTIONS = [
  'Credit Card',
  'Loan',
  'Mortgage',
  'Medical Debt',
  'Other'
];

// Status options (from Airtable Assets & Debts table)
const STATUS_OPTIONS = [
  'Found',
  'Not Found',
  'Reported by Client',
  'Sold'
];

const AddAssetDebtPage = () => {
  const navigate = useNavigate();
  const { matters, fetchMatters, loadingMatters } = useDataCache();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    assetOrDebt: '',
    typeOfAsset: '',
    typeOfDebt: '',
    value: '',
    status: '',
    notes: '',
    files: []
  });
  
  // Matter search state
  const [matterSearchQuery, setMatterSearchQuery] = useState('');
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState(null);

  // Load matters on mount
  useEffect(() => {
    fetchMatters();
  }, [fetchMatters]);

  // Filter matters based on search query
  const filteredMatters = matters.filter(m => {
    if (!matterSearchQuery) return true;
    const query = matterSearchQuery.toLowerCase();
    return (
      m.name?.toLowerCase().includes(query) ||
      m.client?.toLowerCase().includes(query)
    );
  });

  const handleSelectMatter = (matter) => {
    setSelectedMatter(matter);
    setMatterSearchQuery(matter.name);
    setShowMatterDropdown(false);
  };

  const handleClearMatter = () => {
    setSelectedMatter(null);
    setMatterSearchQuery('');
  };

  const handleAssetOrDebtChange = (value) => {
    setFormData({
      ...formData,
      assetOrDebt: value,
      typeOfAsset: value === 'Asset' ? formData.typeOfAsset : '',
      typeOfDebt: value === 'Debt' ? formData.typeOfDebt : ''
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      files: [...prev.files, ...files]
    }));
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
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

      // Add status if provided
      if (formData.status) {
        data.status = formData.status;
      }

      // Add notes if provided
      if (formData.notes.trim()) {
        data.notes = formData.notes.trim();
      }

      // Add linked matter
      if (selectedMatter) {
        data.master_list = [selectedMatter.id];
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
        status: '',
        notes: '',
        files: []
      });
      setSelectedMatter(null);
      setMatterSearchQuery('');
      
      // Navigate back or stay on page
      navigate(-1);
    } catch (error) {
      console.error('Failed to add asset/debt:', error);
      toast.error(error.response?.data?.detail || 'Failed to add asset/debt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in" data-testid="add-asset-debt-page">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            Add Asset/Debt
          </h1>
          <p className="text-slate-500 text-sm">Add a new asset or debt record to Airtable</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
            <Wallet className="w-5 h-5 text-[#2E7DA1]" />
            Asset/Debt Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name of Asset */}
            <div className="space-y-2">
              <Label htmlFor="name">Name of Asset <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter asset/debt name"
              />
            </div>

            {/* Asset or Debt Selection */}
            <div className="space-y-2">
              <Label>Asset or Debt</Label>
              <Select value={formData.assetOrDebt} onValueChange={handleAssetOrDebtChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset or debt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asset">Asset</SelectItem>
                  <SelectItem value="Debt">Debt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type of Asset (shown when Asset is selected) */}
            {formData.assetOrDebt === 'Asset' && (
              <div className="space-y-2">
                <Label>Type of Asset</Label>
                <Select 
                  value={formData.typeOfAsset} 
                  onValueChange={(value) => setFormData({ ...formData, typeOfAsset: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPE_OPTIONS.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Type of Debt (shown when Debt is selected) */}
            {formData.assetOrDebt === 'Debt' && (
              <div className="space-y-2">
                <Label>Type of Debt</Label>
                <Select 
                  value={formData.typeOfDebt} 
                  onValueChange={(value) => setFormData({ ...formData, typeOfDebt: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select debt type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEBT_TYPE_OPTIONS.map(type => (
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
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Master List (Matter) Search */}
            <div className="space-y-2">
              <Label>Link to Matter (Master List)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={matterSearchQuery}
                  onChange={(e) => {
                    setMatterSearchQuery(e.target.value);
                    setShowMatterDropdown(true);
                    if (!e.target.value) setSelectedMatter(null);
                  }}
                  onFocus={() => setShowMatterDropdown(true)}
                  placeholder="Search for a matter..."
                  className="pl-9 pr-9"
                />
                {selectedMatter && (
                  <button
                    type="button"
                    onClick={handleClearMatter}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                {/* Dropdown */}
                {showMatterDropdown && !selectedMatter && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {loadingMatters ? (
                      <div className="p-4 text-center text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      </div>
                    ) : filteredMatters.length === 0 ? (
                      <div className="p-4 text-center text-slate-500">
                        {matterSearchQuery ? 'No matters found' : 'Start typing to search...'}
                      </div>
                    ) : (
                      filteredMatters.slice(0, 50).map(matter => (
                        <button
                          key={matter.id}
                          type="button"
                          onClick={() => handleSelectMatter(matter)}
                          className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{matter.name}</p>
                            <p className="text-xs text-slate-500">{matter.type}</p>
                          </div>
                          {matter.type && (
                            <Badge variant="outline" className="text-xs">
                              {matter.type}
                            </Badge>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedMatter && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-[#2E7DA1]/10 text-[#2E7DA1]">
                    <Check className="w-3 h-3 mr-1" />
                    {selectedMatter.name}
                  </Badge>
                </div>
              )}
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:border-slate-300 transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600">Click to upload files</p>
                  <p className="text-xs text-slate-400">Supports multiple files</p>
                </label>
              </div>
              {formData.files.length > 0 && (
                <div className="space-y-2 mt-2">
                  {formData.files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-slate-700 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
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
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="flex-1 bg-[#2E7DA1] hover:bg-[#256a8a]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
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
