import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoicesApi, masterListApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Receipt, Loader2, ArrowLeft, Check, Search, X, Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';

const SendInvoicePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    service: '',
    amount: '',
    notes: ''
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

  const handleAmountChange = (value) => {
    // Allow only numbers and decimal point
    const numValue = value.replace(/[^0-9.]/g, '');
    setFormData({ ...formData, amount: numValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.service.trim()) {
      toast.error('Service is required');
      return;
    }
    if (!formData.amount) {
      toast.error('Amount is required');
      return;
    }

    setLoading(true);

    try {
      const data = {
        service: formData.service.trim(),
        amount: parseFloat(formData.amount)
      };

      // Add matters if selected
      if (selectedMatters.length > 0) {
        data.master_list = selectedMatters.map(m => m.id);
      }

      // Add notes if provided
      if (formData.notes.trim()) {
        data.notes = formData.notes.trim();
      }

      await invoicesApi.create(data);
      toast.success('Invoice created successfully!');
      
      // Reset form
      setFormData({ service: '', amount: '', notes: '' });
      setSelectedMatters([]);
      
      // Navigate back
      setTimeout(() => navigate(-1), 1500);
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error(error.response?.data?.detail || 'Failed to create invoice');
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
            <Receipt className="w-7 h-7 inline-block mr-2 text-[#2E7DA1]" />
            Send Invoice
          </h1>
          <p className="text-slate-500 mt-1">Create a new invoice record</p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="border-0 shadow-sm max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Invoice Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Service */}
            <div className="space-y-2">
              <Label htmlFor="service">Service <span className="text-red-500">*</span></Label>
              <Input
                id="service"
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                placeholder="Enter service description"
                required
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount <span className="text-red-500">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <Input
                  id="amount"
                  type="text"
                  value={formData.amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                  required
                />
              </div>
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
                rows={4}
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
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Create Invoice
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

export default SendInvoicePage;
