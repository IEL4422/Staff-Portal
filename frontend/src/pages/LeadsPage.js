import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Search, Loader2, UserPlus, Phone, Mail, Calendar, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const LeadsPage = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      (fields['Phone Number'] || '').toLowerCase().includes(searchLower)
    );
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
        <Badge className="bg-[#2E7DA1]/10 text-[#2E7DA1] font-medium text-sm px-3 py-1">
          <UserPlus className="w-4 h-4 mr-1" />
          {leads.length} Active Leads
        </Badge>
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

      {/* Leads Table */}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matter Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type of Lead</TableHead>
                  <TableHead>Date of Consultation</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const fields = lead.fields || {};
                  return (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => handleRowClick(lead)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">
                            {fields['Matter Name'] || fields['Client'] || 'Unnamed Lead'}
                          </p>
                          {fields['Client'] && fields['Matter Name'] && fields['Client'] !== fields['Matter Name'] && (
                            <p className="text-sm text-slate-500">{fields['Client']}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {fields['Email Address'] ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {fields['Email Address']}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {fields['Phone Number'] ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {fields['Phone Number']}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {fields['Type of Lead'] ? (
                          <Badge className={getLeadTypeColor(fields['Type of Lead'])}>
                            {fields['Type of Lead']}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {fields['Date of Consult'] ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {formatDateTime(fields['Date of Consult'])}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsPage;
