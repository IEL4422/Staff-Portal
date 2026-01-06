import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { masterListApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Users, Loader2, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';

// Type of Case options
const CASE_TYPE_OPTIONS = [
  'Probate',
  'Estate Planning',
  'Deed',
  'Trust Administration',
  'Family Law',
  'Guardianship',
  'Other'
];

// Package Purchased options (adjust based on your Airtable schema)
const PACKAGE_OPTIONS = [
  'ALC: Trust',
  'ALC: Will',
  'Probate Package',
  'Estate Planning Package',
  'Family Law',
  'Deed Package',
  'Consultation Only',
  'Other'
];

// Add Client Form Component (reusable)
export const AddClientForm = ({ onSuccess, onCancel, isModal = false }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    email: '',
    phone: '',
    caseType: '',
    caseNotes: '',
    amountPaid: '',
    datePaid: '',
    packagePurchased: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.clientName.trim()) {
      toast.error('Client Name is required');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email Address is required');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Phone Number is required');
      return;
    }
    if (!formData.caseType) {
      toast.error('Type of Case is required');
      return;
    }

    setLoading(true);

    try {
      const data = {
        'Client': formData.clientName.trim(),
        'Email Address': formData.email.trim(),
        'Phone Number': formData.phone.trim(),
        'Type of Case': formData.caseType,
        'Active/Inactive': 'Active' // New clients are active
      };

      // Add optional fields if provided
      if (formData.caseNotes.trim()) {
        data['Case Notes'] = formData.caseNotes.trim();
      }
      if (formData.amountPaid) {
        data['Amount Paid'] = parseFloat(formData.amountPaid);
      }
      if (formData.datePaid) {
        data['Date Paid'] = formData.datePaid;
      }
      if (formData.packagePurchased) {
        data['Package Purchased'] = formData.packagePurchased;
      }

      await masterListApi.create(data);
      toast.success('Client added successfully!');
      
      // Reset form
      setFormData({
        clientName: '',
        email: '',
        phone: '',
        caseType: '',
        caseNotes: '',
        amountPaid: '',
        datePaid: '',
        packagePurchased: ''
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to add client:', error);
      toast.error(error.response?.data?.detail || 'Failed to add client');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (value) => {
    // Allow only numbers and decimal point
    const numValue = value.replace(/[^0-9.]/g, '');
    setFormData({ ...formData, amountPaid: numValue });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Client Name - Required */}
      <div className="space-y-2">
        <Label htmlFor="clientName">Client Name <span className="text-red-500">*</span></Label>
        <Input
          id="clientName"
          value={formData.clientName}
          onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
          placeholder="Enter client's full name"
          required
          data-testid="client-name-input"
        />
      </div>

      {/* Email and Phone - Required */}
      <div className={`grid ${isModal ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@example.com"
            required
            data-testid="email-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(555) 555-5555"
            required
            data-testid="phone-input"
          />
        </div>
      </div>

      {/* Type of Case - Required */}
      <div className="space-y-2">
        <Label htmlFor="caseType">Type of Case <span className="text-red-500">*</span></Label>
        <Select
          value={formData.caseType}
          onValueChange={(value) => setFormData({ ...formData, caseType: value })}
        >
          <SelectTrigger data-testid="case-type-select">
            <SelectValue placeholder="Select case type" />
          </SelectTrigger>
          <SelectContent>
            {CASE_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Case Notes */}
      <div className="space-y-2">
        <Label htmlFor="caseNotes">Case Notes</Label>
        <Textarea
          id="caseNotes"
          value={formData.caseNotes}
          onChange={(e) => setFormData({ ...formData, caseNotes: e.target.value })}
          placeholder="Enter any notes about this case..."
          rows={3}
          data-testid="case-notes-input"
        />
      </div>

      {/* Payment Section */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Payment Information (Optional)</h3>
        
        <div className={`grid ${isModal ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
          {/* Amount Paid */}
          <div className="space-y-2">
            <Label htmlFor="amountPaid">Amount Paid</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <Input
                id="amountPaid"
                type="text"
                value={formData.amountPaid}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="pl-7"
                data-testid="amount-paid-input"
              />
            </div>
          </div>

          {/* Date Paid */}
          <div className="space-y-2">
            <Label htmlFor="datePaid">Date Paid</Label>
            <Input
              id="datePaid"
              type="date"
              value={formData.datePaid}
              onChange={(e) => setFormData({ ...formData, datePaid: e.target.value })}
              data-testid="date-paid-input"
            />
          </div>
        </div>

        {/* Package Purchased */}
        <div className="space-y-2 mt-4">
          <Label htmlFor="packagePurchased">Package Purchased</Label>
          <Select
            value={formData.packagePurchased}
            onValueChange={(value) => setFormData({ ...formData, packagePurchased: value })}
          >
            <SelectTrigger data-testid="package-select">
              <SelectValue placeholder="Select package" />
            </SelectTrigger>
            <SelectContent>
              {PACKAGE_OPTIONS.map((pkg) => (
                <SelectItem key={pkg} value={pkg}>{pkg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 rounded-full"
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          className={`${onCancel ? 'flex-1' : 'w-full'} rounded-full bg-[#2E7DA1] hover:bg-[#246585]`}
          disabled={loading}
          data-testid="submit-btn"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Adding...
            </>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Add Client
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

// Add Client Modal Component (exported for use in ClientsPage)
export const AddClientModal = ({ isOpen, onClose, onSuccess }) => {
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2E7DA1]" />
            Add New Client
          </DialogTitle>
        </DialogHeader>
        <AddClientForm onSuccess={handleSuccess} onCancel={onClose} isModal={true} />
      </DialogContent>
    </Dialog>
  );
};

// Add Client Page Component (for sidebar navigation)
const AddClientPage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Navigate to clients page after success
    setTimeout(() => {
      navigate('/clients');
    }, 1500);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="add-client-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <Users className="w-7 h-7 inline-block mr-2 text-[#2E7DA1]" />
            Add New Client
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <Card className="border-0 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <AddClientForm onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AddClientPage;
