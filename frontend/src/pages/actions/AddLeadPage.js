import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { masterListApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { UserPlus, Loader2, Check, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

// Consult Status Options (adjust based on your Airtable schema)
const CONSULT_STATUS_OPTIONS = [
  'Scheduled',
  'Completed',
  'No Show',
  'Rescheduled',
  'Cancelled',
  'Pending'
];

// Add Lead Form Component (reusable)
export const AddLeadForm = ({ onSuccess, onCancel, isModal = false }) => {
  const [formData, setFormData] = useState({
    clientName: '',
    email: '',
    phone: '',
    consultStatus: '',
    dateOfConsult: '',
    inquiryNotes: ''
  });
  const [saving, setSaving] = useState(false);

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

    setSaving(true);
    try {
      const data = {
        'Client': formData.clientName.trim(),
        'Email Address': formData.email.trim(),
        'Phone Number': formData.phone.trim(),
        'Type of Case': 'Lead', // Always set to Lead
        'Active/Inactive': 'Active' // New leads are active
      };

      // Add optional fields if provided
      if (formData.consultStatus) {
        data['Consult Status'] = formData.consultStatus;
      }
      if (formData.dateOfConsult) {
        data['Date of Consult'] = formData.dateOfConsult;
      }
      if (formData.inquiryNotes.trim()) {
        data['Inquiry Notes'] = formData.inquiryNotes.trim();
      }

      await masterListApi.create(data);
      toast.success('Lead added successfully!');
      
      // Reset form
      setFormData({
        clientName: '',
        email: '',
        phone: '',
        consultStatus: '',
        dateOfConsult: '',
        inquiryNotes: ''
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to add lead:', error);
      toast.error(error.response?.data?.detail || 'Failed to add lead');
    } finally {
      setSaving(false);
    }
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

      {/* Email Address - Required */}
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

      {/* Phone Number - Required */}
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

      {/* Consult Status */}
      <div className="space-y-2">
        <Label htmlFor="consultStatus">Consult Status</Label>
        <Select
          value={formData.consultStatus}
          onValueChange={(value) => setFormData({ ...formData, consultStatus: value })}
        >
          <SelectTrigger data-testid="consult-status-select">
            <SelectValue placeholder="Select consult status" />
          </SelectTrigger>
          <SelectContent>
            {CONSULT_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date of Consult */}
      <div className="space-y-2">
        <Label htmlFor="dateOfConsult">Date of Consult</Label>
        <Input
          id="dateOfConsult"
          type="date"
          value={formData.dateOfConsult}
          onChange={(e) => setFormData({ ...formData, dateOfConsult: e.target.value })}
          data-testid="date-of-consult-input"
        />
      </div>

      {/* Inquiry Notes */}
      <div className="space-y-2">
        <Label htmlFor="inquiryNotes">Inquiry Notes</Label>
        <Textarea
          id="inquiryNotes"
          value={formData.inquiryNotes}
          onChange={(e) => setFormData({ ...formData, inquiryNotes: e.target.value })}
          placeholder="Enter any notes about the inquiry..."
          rows={4}
          data-testid="inquiry-notes-input"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 rounded-full"
            disabled={saving}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={saving}
          className={`${onCancel ? 'flex-1' : 'w-full'} bg-[#2E7DA1] hover:bg-[#256a8a] text-white rounded-full`}
          data-testid="submit-btn"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Add Lead
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

// Add Lead Modal Component (exported for use in LeadsPage)
export const AddLeadModal = ({ isOpen, onClose, onSuccess }) => {
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#2E7DA1]" />
            Add New Lead
          </DialogTitle>
        </DialogHeader>
        <AddLeadForm onSuccess={handleSuccess} onCancel={onClose} isModal={true} />
      </DialogContent>
    </Dialog>
  );
};

// Add Lead Page Component (for sidebar navigation)
const AddLeadPage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Navigate to leads page after success
    setTimeout(() => {
      navigate('/leads');
    }, 1500);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="add-lead-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <UserPlus className="w-7 h-7 inline-block mr-2 text-[#2E7DA1]" />
            Add New Lead
          </h1>
          <p className="text-slate-500 mt-1">Create a new lead in the Master List</p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="border-0 shadow-sm max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Lead Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AddLeadForm onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AddLeadPage;
