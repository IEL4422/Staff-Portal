import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Users, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const AddClientPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    case_type: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await clientsApi.create(formData);
      toast.success('Client created successfully');
      setFormData({ name: '', email: '', phone: '', address: '', case_type: '' });
    } catch (error) {
      toast.error('Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="add-client-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <Users className="w-8 h-8 inline-block mr-3 text-[#2E7DA1]" />
            Add Client
          </h1>
          <p className="text-slate-500 mt-1">Add a new client to the Master List in Airtable</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope' }}>Client Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
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

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter full address"
                rows={2}
                data-testid="address-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caseType">Case Type</Label>
              <Select
                value={formData.case_type}
                onValueChange={(value) => setFormData({ ...formData, case_type: value })}
              >
                <SelectTrigger data-testid="case-type-select">
                  <SelectValue placeholder="Select case type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Probate">Probate</SelectItem>
                  <SelectItem value="Estate Planning">Estate Planning</SelectItem>
                  <SelectItem value="Deed">Deed</SelectItem>
                  <SelectItem value="Trust Administration">Trust Administration</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
              disabled={loading}
              data-testid="submit-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Users className="w-5 h-5 mr-2" />}
              Create Client
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddClientPage;
