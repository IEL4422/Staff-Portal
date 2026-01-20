/**
 * AddAssetDebtModal - Modal content for adding new asset/debt records
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, Check, X, Search, Upload, File } from 'lucide-react';
import { toast } from 'sonner';
import { assetsDebtsApi, filesApi } from '../../services/api';
import { useDataCache } from '../../context/DataCacheContext';
import { getErrorMessage, ASSET_TYPE_OPTIONS, DEBT_TYPE_OPTIONS, ASSET_STATUS_OPTIONS } from './modalUtils';

const AddAssetDebtModalContent = ({ onSuccess, onCancel, preselectedMatter = null }) => {
  const { matters, fetchMatters } = useDataCache();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '', assetOrDebt: '', typeOfAsset: '', typeOfDebt: '', value: '', status: '', notes: ''
  });
  const [matterSearchQuery, setMatterSearchQuery] = useState('');
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState(preselectedMatter);
  const [uploadedFile, setUploadedFile] = useState(null);

  useEffect(() => { fetchMatters(); }, [fetchMatters]);
  
  // Update selectedMatter if preselectedMatter changes
  useEffect(() => {
    if (preselectedMatter) {
      setSelectedMatter(preselectedMatter);
    }
  }, [preselectedMatter]);

  const filteredMatters = matters.filter(m => {
    if (!matterSearchQuery) return true;
    const query = matterSearchQuery.toLowerCase();
    return m.name?.toLowerCase().includes(query) || m.client?.toLowerCase().includes(query);
  }).slice(0, 50);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Name is required'); return; }
    if (!formData.assetOrDebt) { toast.error('Please select Asset or Debt'); return; }

    setLoading(true);
    try {
      // Use camelCase keys to match backend AssetDebtCreate model
      const data = {
        name: formData.name.trim(),
        asset_or_debt: formData.assetOrDebt
      };
      if (formData.assetOrDebt === 'Asset' && formData.typeOfAsset) data.type_of_asset = formData.typeOfAsset;
      if (formData.assetOrDebt === 'Debt' && formData.typeOfDebt) data.type_of_debt = formData.typeOfDebt;
      if (formData.value) data.value = parseFloat(formData.value);
      if (formData.status) data.status = formData.status;
      if (formData.notes) data.notes = formData.notes;
      if (selectedMatter) data.master_list_id = selectedMatter.id;

      await assetsDebtsApi.create(data);
      toast.success('Asset/Debt added successfully!');
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add asset/debt'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label>Name of Asset/Debt <span className="text-red-500">*</span></Label>
        <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Enter name" autoComplete="off" />
      </div>
      <div className="space-y-2">
        <Label>Asset or Debt? <span className="text-red-500">*</span></Label>
        <Select value={formData.assetOrDebt} onValueChange={(v) => setFormData({...formData, assetOrDebt: v, typeOfAsset: '', typeOfDebt: ''})}>
          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Asset">Asset</SelectItem>
            <SelectItem value="Debt">Debt</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {formData.assetOrDebt === 'Asset' && (
        <div className="space-y-2">
          <Label>Type of Asset</Label>
          <Select value={formData.typeOfAsset} onValueChange={(v) => setFormData({...formData, typeOfAsset: v})}>
            <SelectTrigger><SelectValue placeholder="Select asset type" /></SelectTrigger>
            <SelectContent>{ASSET_TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {formData.assetOrDebt === 'Debt' && (
        <div className="space-y-2">
          <Label>Type of Debt</Label>
          <Select value={formData.typeOfDebt} onValueChange={(v) => setFormData({...formData, typeOfDebt: v})}>
            <SelectTrigger><SelectValue placeholder="Select debt type" /></SelectTrigger>
            <SelectContent>{DEBT_TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Value ($)</Label>
          <Input type="number" value={formData.value} onChange={(e) => setFormData({...formData, value: e.target.value})} placeholder="0.00" />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>{ASSET_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2 relative">
        <Label>Link to Matter</Label>
        {selectedMatter ? (
          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
            <span className="flex-1 text-sm">{selectedMatter.name}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedMatter(null); setMatterSearchQuery(''); }}><X className="w-4 h-4" /></Button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={matterSearchQuery}
                onChange={(e) => { setMatterSearchQuery(e.target.value); setShowMatterDropdown(true); }}
                onFocus={() => setShowMatterDropdown(true)}
                placeholder="Search matters..."
                className="pl-9"
              />
            </div>
            {showMatterDropdown && filteredMatters.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredMatters.map(m => (
                  <button key={m.id} type="button" onClick={() => { setSelectedMatter(m); setShowMatterDropdown(false); setMatterSearchQuery(''); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm">{m.name} <span className="text-slate-500">({m.client})</span></button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Additional notes..." rows={3} />
      </div>
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-full" disabled={loading}>Cancel</Button>
        <Button type="submit" className="flex-1 rounded-full bg-[#2E7DA1] hover:bg-[#246585]" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Adding...</> : <><Check className="w-4 h-4 mr-2" />Add Asset/Debt</>}
        </Button>
      </div>
    </form>
  );
};

export default AddAssetDebtModalContent;
