import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Search, Loader2, UserPlus, Phone, Mail, Calendar, ChevronRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AddLeadModal } from './actions/AddLeadPage';

const LeadsPage = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);

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
    fetchLeads(); // Refresh the leads list
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
                return (
                  <div
                    key={lead.id}
                    className="p-4 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all"
                    onClick={() => handleRowClick(lead)}
                  >
                    {/* Line 1: Matter Name + Lead Type */}
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 text-base truncate">
                          {fields['Matter Name'] || fields['Client'] || 'Unnamed Lead'}
                        </h3>
                        <Badge className={getLeadTypeColor(fields['Lead Type'])}>
                          {fields['Lead Type'] || 'Not Set'}
                        </Badge>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </div>
                    
                    {/* Line 2: Email, Phone, Date of Consultation */}
                    <div className="flex items-center gap-6 text-sm text-slate-600 flex-wrap">
                      {fields['Email Address'] && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{fields['Email Address']}</span>
                        </div>
                      )}
                      {fields['Phone Number'] && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{fields['Phone Number']}</span>
                        </div>
                      )}
                      {fields['Date of Consult'] && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateTime(fields['Date of Consult'])}</span>
                        </div>
                      )}
                      {!fields['Email Address'] && !fields['Phone Number'] && !fields['Date of Consult'] && (
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
    </div>
  );
};

export default LeadsPage;
