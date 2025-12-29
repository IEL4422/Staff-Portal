import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { caseContactsApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { UserPlus, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const AddContactPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    phone: '',
    email: '',
    case_id: '',
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await caseContactsApi.create(formData);
      toast.success('Contact created successfully');
      setFormData({ name: '', role: '', phone: '', email: '', case_id: '', notes: '' });
    } catch (error) {
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
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <UserPlus className="w-8 h-8 inline-block mr-3 text-[#2E7DA1]" />
            Add Case Contact
          </h1>
          <p className="text-slate-500 mt-1">Create a new case contact in Airtable</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope' }}>Contact Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Contact Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                  data-testid="name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger data-testid="role-select">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Heir">Heir</SelectItem>
                    <SelectItem value="Beneficiary">Beneficiary</SelectItem>
                    <SelectItem value="Executor">Executor</SelectItem>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                    <SelectItem value="Attorney">Attorney</SelectItem>
                    <SelectItem value="Accountant">Accountant</SelectItem>
                    <SelectItem value="Realtor">Realtor</SelectItem>
                    <SelectItem value="Financial Advisor">Financial Advisor</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="caseId">Case ID (Optional)</Label>
              <Input
                id="caseId"
                value={formData.case_id}
                onChange={(e) => setFormData({ ...formData, case_id: e.target.value })}
                placeholder="Airtable record ID to link"
                data-testid="case-id-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this contact..."
                rows={3}
                data-testid="notes-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
              disabled={loading}
              data-testid="submit-btn"
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
