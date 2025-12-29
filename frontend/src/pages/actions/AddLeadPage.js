import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const AddLeadPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    lead_type: '',
    referral_source: '',
    inquiry_notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await leadsApi.create(formData);
      toast.success('Lead created successfully');
      setFormData({ name: '', email: '', phone: '', lead_type: '', referral_source: '', inquiry_notes: '' });
    } catch (error) {
      toast.error('Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="add-lead-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <Users className="w-8 h-8 inline-block mr-3 text-[#2E7DA1]" />
            Add Lead
          </h1>
          <p className="text-slate-500 mt-1">Add a new lead to the Master List in Airtable</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope' }}>Lead Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Lead Name / Matter</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name or matter"
                required
                data-testid="name-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  data-testid="email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  data-testid="phone-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leadType">Lead Type</Label>
                <Select
                  value={formData.lead_type}
                  onValueChange={(value) => setFormData({ ...formData, lead_type: value })}
                >
                  <SelectTrigger data-testid="lead-type-select">
                    <SelectValue placeholder="Select lead type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Probate">Probate</SelectItem>
                    <SelectItem value="Estate Planning">Estate Planning</SelectItem>
                    <SelectItem value="Deed">Deed</SelectItem>
                    <SelectItem value="Trust">Trust</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="referralSource">Referral Source</Label>
                <Select
                  value={formData.referral_source}
                  onValueChange={(value) => setFormData({ ...formData, referral_source: value })}
                >
                  <SelectTrigger data-testid="referral-source-select">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Advertisement">Advertisement</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inquiryNotes">Inquiry Notes</Label>
              <Textarea
                id="inquiryNotes"
                value={formData.inquiry_notes}
                onChange={(e) => setFormData({ ...formData, inquiry_notes: e.target.value })}
                placeholder="Notes about the lead inquiry..."
                rows={4}
                data-testid="inquiry-notes-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
              disabled={loading}
              data-testid="submit-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Users className="w-5 h-5 mr-2" />}
              Create Lead
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddLeadPage;
