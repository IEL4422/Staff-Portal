/**
 * AddContactModal - Modal content for adding new case contacts
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Loader2, Check, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { caseContactsApi, masterListApi } from '../../services/api';
import { getErrorMessage, US_STATE_ABBREVIATIONS, CONTACT_TYPE_OPTIONS } from './modalUtils';

const AddContactModalContent = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', type: '', email: '', phone: '', streetAddress: '', city: '', state: '', zipCode: '', relationshipToDecedent: '', disabledMinor: false, matterId: '', matterName: ''
  });
  const [matterSearch, setMatterSearch] = useState('');
  const [matterResults, setMatterResults] = useState([]);
  const [searchingMatters, setSearchingMatters] = useState(false);
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (matterSearch.length >= 2) searchMatters(matterSearch);
      else setMatterResults([]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Name is required'); return; }
    if (!formData.type) { toast.error('Type is required'); return; }

    setLoading(true);
    try {
      // Use camelCase keys to match backend CaseContactCreate model
      const data = { 
        name: formData.name.trim(), 
        type: formData.type 
      };
      if (formData.email) data.email = formData.email;
      if (formData.phone) data.phone = formData.phone;
      if (formData.streetAddress) data.streetAddress = formData.streetAddress;
      if (formData.city) data.city = formData.city;
      if (formData.state) data.state = formData.state;
      if (formData.zipCode) data.zipCode = formData.zipCode;
      if (formData.type === 'Heir' && formData.relationshipToDecedent) data.relationshipToDecedent = formData.relationshipToDecedent;
      if (formData.disabledMinor) data.disabledMinor = true;
      if (formData.matterId) data.matterId = formData.matterId;

      await caseContactsApi.create(data);
      toast.success('Contact added successfully!');
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add contact'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name <span className="text-red-500">*</span></Label>
          <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Contact name" />
        </div>
        <div className="space-y-2">
          <Label>Type <span className="text-red-500">*</span></Label>
          <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>{CONTACT_TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      {formData.type === 'Heir' && (
        <div className="space-y-2">
          <Label>Relationship to Decedent</Label>
          <Input value={formData.relationshipToDecedent} onChange={(e) => setFormData({...formData, relationshipToDecedent: e.target.value})} placeholder="e.g., Son, Daughter, Spouse" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email Address</Label>
          <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="Email address" />
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Phone number" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Street Address</Label>
        <Input value={formData.streetAddress} onChange={(e) => setFormData({...formData, streetAddress: e.target.value})} placeholder="Street address" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>City</Label>
          <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} placeholder="City" />
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Select value={formData.state} onValueChange={(v) => setFormData({...formData, state: v})}>
            <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent>{US_STATE_ABBREVIATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Zip Code</Label>
          <Input value={formData.zipCode} onChange={(e) => setFormData({...formData, zipCode: e.target.value})} placeholder="Zip" />
        </div>
      </div>
      <div className="space-y-2 relative">
        <Label>Link to Matter</Label>
        {formData.matterId ? (
          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
            <span className="flex-1 text-sm">{formData.matterName}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setFormData({...formData, matterId: '', matterName: ''}); setMatterSearch(''); }}><X className="w-4 h-4" /></Button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={matterSearch} onChange={(e) => setMatterSearch(e.target.value)} onFocus={() => setShowMatterDropdown(true)} placeholder="Search matters..." className="pl-9" />
            </div>
            {showMatterDropdown && matterResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {matterResults.map(m => (
                  <button key={m.id} type="button" onClick={() => { setFormData({...formData, matterId: m.id, matterName: m.fields?.['Matter Name'] || m.fields?.Client || 'Unknown'}); setMatterSearch(''); setShowMatterDropdown(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm">{m.fields?.['Matter Name'] || m.fields?.Client || 'Unknown'}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox checked={formData.disabledMinor} onCheckedChange={(v) => setFormData({...formData, disabledMinor: v})} />
        <Label>Disabled/Minor?</Label>
      </div>
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-full" disabled={loading}>Cancel</Button>
        <Button type="submit" className="flex-1 rounded-full bg-[#2E7DA1] hover:bg-[#246585]" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Adding...</> : <><Check className="w-4 h-4 mr-2" />Add Contact</>}
        </Button>
      </div>
    </form>
  );
};

export default AddContactModalContent;
