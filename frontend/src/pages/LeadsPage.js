import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, masterListApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Search, Loader2, UserPlus, Phone, Mail, Calendar, ChevronRight, Plus, 
  Archive, Edit2, X, Check 
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AddLeadModal } from './actions/AddLeadPage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';

// Lead Type options
const LEAD_TYPE_OPTIONS = [
  'Probate',
  'Estate Planning',
  'Deed/LLC',
  'Guardianship',
  'Other'
];

// Type of Case options (must match Airtable exactly)
const TYPE_OF_CASE_OPTIONS = [
  'Lead',
  'Probate',
  'Estate Planning',
  'Deed/LLC'
];

// Consult Status options (from Airtable)
const CONSULT_STATUS_OPTIONS = [
  'Upcoming',
  'Hired',
  'Needs Follow Up',
  'Follow Up Sent',
  'CSA Sent',
  'Missed Consult',
  'Not a Good Fit - Archive',
  'Not a Good Fit - Send Review',
  'Ignored/Archive',
  'Contact Information Sent'
];

// Package Purchased options (from Airtable)
const PACKAGE_PURCHASED_OPTIONS = [
  'Probate Package',
  'Partial Probate Package',
  'Small Estate Probate Package',
  'Individual Trust Package',
  'Joint Trust Package',
  'Individual Will Package',
  'Married Will Package',
  'Quit Claim Deed',
  'Transfer-on-Death Deed',
  'Adult Guardianship Package',
  'Asset Search',
  'Consult',
  'Legal Letter',
  'Legal Insurance',
  'Small Estate Affidavit',
  'Trust Restatement',
  'Family Law',
  'ALC: Trust (Individual)',
  'ALC: Will (Individual)',
  'ALC: Will (Married)'
];

const LeadsPage = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Archive state
  const [archiving, setArchiving] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await dashboardApi.getActiveLeads();
      setLeads(response.data.records || []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLeadSuccess = () => {
    setIsAddLeadModalOpen(false);
    fetchLeads();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'yyyy-MM-dd');
    } catch {
      return '';
    }
  };

  const getLeadTypeColor = (leadType) => {
    const type = (leadType || '').toLowerCase();
    if (type.includes('probate')) return 'bg-purple-100 text-purple-700';
    if (type.includes('estate planning')) return 'bg-blue-100 text-blue-700';
    if (type.includes('deed')) return 'bg-green-100 text-green-700';
    if (type.includes('guardianship')) return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-700';
  };

  const handleRowClick = (lead) => {
    navigate(`/case/lead/${lead.id}`);
  };

  // Archive a lead
  const handleArchive = async (e, lead) => {
    e.stopPropagation();
    
    setArchiving(lead.id);
    try {
      await masterListApi.update(lead.id, {
        'Active/Inactive': 'Archived'
      });
      toast.success('Lead archived successfully');
      // Remove from list
      setLeads(prev => prev.filter(l => l.id !== lead.id));
    } catch (error) {
      console.error('Failed to archive lead:', error);
      toast.error('Failed to archive lead');
    } finally {
      setArchiving(null);
    }
  };

  // Open edit modal
  const handleEdit = (e, lead) => {
    e.stopPropagation();
    
    const fields = lead.fields || {};
    setEditingLead(lead);
    setEditFormData({
      matterName: fields['Matter Name'] || '',
      emailAddress: fields['Email Address'] || '',
      leadType: fields['Lead Type'] || '',
      typeOfCase: fields['Type of Case'] || 'Lead',
      amountPaid: fields['Amount Paid'] || '',
      datePaid: formatDateForInput(fields['Date Paid']),
      paid: fields['Paid?'] || '',
      caseNotes: fields['Case Notes'] || '',
      consultStatus: fields['Consult Status'] || '',
      packagePurchased: fields['Package Purchased'] || ''
    });
    setEditModalOpen(true);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingLead) return;
    
    setSaving(true);
    try {
      const updateFields = {
        'Matter Name': editFormData.matterName,
        'Email Address': editFormData.emailAddress,
        'Lead Type': editFormData.leadType,
        'Type of Case': editFormData.typeOfCase,
        'Case Notes': editFormData.caseNotes,
        'Consult Status': editFormData.consultStatus
      };
      
      // Only include optional fields if they have values
      if (editFormData.amountPaid) {
        updateFields['Amount Paid'] = parseFloat(editFormData.amountPaid);
      }
      if (editFormData.datePaid) {
        updateFields['Date Paid'] = editFormData.datePaid;
      }
      if (editFormData.paid) {
        updateFields['Paid?'] = editFormData.paid;
      }
      if (editFormData.packagePurchased) {
        updateFields['Package Purchased'] = editFormData.packagePurchased;
      }
      
      await masterListApi.update(editingLead.id, updateFields);
      toast.success('Lead updated successfully');
      setEditModalOpen(false);
      setEditingLead(null);
      fetchLeads();
    } catch (error) {
      console.error('Failed to update lead:', error);
      toast.error(error.response?.data?.detail || 'Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const fields = lead.fields || {};
    const searchLower = searchQuery.toLowerCase();
    return (
      (fields['Matter Name'] || '').toLowerCase().includes(searchLower) ||
      (fields['Client'] || '').toLowerCase().includes(searchLower) ||
      (fields['Email Address'] || '').toLowerCase().includes(searchLower) ||
      (fields['Phone Number'] || '').toLowerCase().includes(searchLower) ||
      (fields['Lead Type'] || '').toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => {
    // Sort by Date of Consult (most recent first)
    const dateA = a.fields?.['Date of Consult'] ? new Date(a.fields['Date of Consult']) : new Date(0);
    const dateB = b.fields?.['Date of Consult'] ? new Date(b.fields['Date of Consult']) : new Date(0);
    return dateB - dateA;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            Leads
          </h1>
          <p className="text-slate-500 mt-1">All active leads and potential clients</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsAddLeadModalOpen(true)}
            className="bg-[#2E7DA1] hover:bg-[#256a8a] text-white rounded-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
          <Badge className="bg-[#2E7DA1]/10 text-[#2E7DA1] font-medium text-sm px-3 py-1">
            <UserPlus className="w-4 h-4 mr-1" />
            {leads.length} Active Leads
          </Badge>
        </div>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by name, email, or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">All Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {searchQuery ? 'No leads match your search' : 'No active leads found'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLeads.map((lead) => {
                const fields = lead.fields || {};
                const isArchiving = archiving === lead.id;
                
                return (
                  <div
                    key={lead.id}
                    className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all max-w-4xl"
                  >
                    {/* Line 1: Matter Name (clickable) + Lead Type + Actions */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h3 
                          className="font-semibold text-slate-900 text-sm truncate cursor-pointer hover:text-[#2E7DA1] hover:underline"
                          onClick={() => handleRowClick(lead)}
                        >
                          {fields['Matter Name'] || fields['Client'] || 'Unnamed Lead'}
                        </h3>
                        <Badge className={`text-xs ${getLeadTypeColor(fields['Lead Type'])}`}>
                          {fields['Lead Type'] || 'Not Set'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Edit Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-500 hover:text-[#2E7DA1] hover:bg-[#2E7DA1]/10"
                          onClick={(e) => handleEdit(e, lead)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        {/* Archive Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                          onClick={(e) => handleArchive(e, lead)}
                          disabled={isArchiving}
                        >
                          {isArchiving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Archive className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Line 2: Email, Phone, Date of Consult (labeled), Last Contacted (labeled) */}
                    <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                      {fields['Email Address'] && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{fields['Email Address']}</span>
                        </div>
                      )}
                      {fields['Phone Number'] && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{fields['Phone Number']}</span>
                        </div>
                      )}
                      {fields['Date of Consult'] && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-500">Date of Consult:</span>
                          <span>{formatDateTime(fields['Date of Consult'])}</span>
                        </div>
                      )}
                      {fields['Last Contacted'] && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-500">Last Contacted:</span>
                          <span>{formatDateTime(fields['Last Contacted'])}</span>
                        </div>
                      )}
                      {!fields['Email Address'] && !fields['Phone Number'] && !fields['Date of Consult'] && !fields['Last Contacted'] && (
                        <span className="text-slate-400">No contact information</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
        onSuccess={handleAddLeadSuccess}
      />

      {/* Edit Lead Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[#2E7DA1]" />
              Edit Lead
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Matter Name */}
            <div className="space-y-2">
              <Label htmlFor="matterName">Matter Name</Label>
              <Input
                id="matterName"
                value={editFormData.matterName}
                onChange={(e) => setEditFormData({ ...editFormData, matterName: e.target.value })}
                placeholder="Enter matter name"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <Label htmlFor="emailAddress">Email Address</Label>
              <Input
                id="emailAddress"
                type="email"
                value={editFormData.emailAddress}
                onChange={(e) => setEditFormData({ ...editFormData, emailAddress: e.target.value })}
                placeholder="Enter email address"
              />
            </div>

            {/* Lead Type */}
            <div className="space-y-2">
              <Label>Lead Type</Label>
              <Select 
                value={editFormData.leadType} 
                onValueChange={(value) => setEditFormData({ ...editFormData, leadType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select lead type" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_TYPE_OPTIONS.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type of Case */}
            <div className="space-y-2">
              <Label>Type of Case</Label>
              <Select 
                value={editFormData.typeOfCase} 
                onValueChange={(value) => setEditFormData({ ...editFormData, typeOfCase: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type of case" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OF_CASE_OPTIONS.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount Paid */}
            <div className="space-y-2">
              <Label htmlFor="amountPaid">Amount Paid</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <Input
                  id="amountPaid"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.amountPaid}
                  onChange={(e) => setEditFormData({ ...editFormData, amountPaid: e.target.value })}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>

            {/* Date Paid */}
            <div className="space-y-2">
              <Label htmlFor="datePaid">Date Paid</Label>
              <Input
                id="datePaid"
                type="date"
                value={editFormData.datePaid}
                onChange={(e) => setEditFormData({ ...editFormData, datePaid: e.target.value })}
              />
            </div>

            {/* Paid? */}
            <div className="space-y-2">
              <Label>Paid?</Label>
              <Select 
                value={editFormData.paid} 
                onValueChange={(value) => setEditFormData({ ...editFormData, paid: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Consult Status */}
            <div className="space-y-2">
              <Label>Consult Status</Label>
              <Select 
                value={editFormData.consultStatus} 
                onValueChange={(value) => setEditFormData({ ...editFormData, consultStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select consult status" />
                </SelectTrigger>
                <SelectContent>
                  {CONSULT_STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Package Purchased */}
            <div className="space-y-2">
              <Label>Package Purchased</Label>
              <Select 
                value={editFormData.packagePurchased} 
                onValueChange={(value) => setEditFormData({ ...editFormData, packagePurchased: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGE_PURCHASED_OPTIONS.map(pkg => (
                    <SelectItem key={pkg} value={pkg}>{pkg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Case Notes */}
            <div className="space-y-2">
              <Label htmlFor="caseNotes">Case Notes</Label>
              <Textarea
                id="caseNotes"
                value={editFormData.caseNotes}
                onChange={(e) => setEditFormData({ ...editFormData, caseNotes: e.target.value })}
                placeholder="Enter case notes..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setEditModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={saving}
              className="bg-[#2E7DA1] hover:bg-[#256a8a]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadsPage;
