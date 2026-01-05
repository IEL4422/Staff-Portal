import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Search, Loader2, Users, Phone, Mail, MapPin, ChevronRight, Filter } from 'lucide-react';
import { toast } from 'sonner';

const ClientsPage = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, probate, estate-planning, deed

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await dashboardApi.getActiveCases();
      setClients(response.data.records || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  // Calculate probate task progress percentage
  const calculateProbateProgress = (fields) => {
    const preOpeningTasks = [
      { key: 'Questionnaire Completed?', completedValues: ['yes'] },
      { key: 'Petition filed?', completedValues: ['filed'] },
      { key: 'Initial Orders', completedValues: ['done'] },
      { key: 'Oath and Bond', completedValues: ['done'] },
      { key: 'Waivers of Notice', completedValues: ['done'] },
      { key: 'Affidavit of Heirship', completedValues: ['done'] },
      { key: 'Notice of Petition for Administration', completedValues: ['dispatched & complete'] },
      { key: 'Copy of Will Filed', completedValues: ['done'] },
      { key: 'Courtesy Copies to Judge', completedValues: ['done'] }
    ];

    const postOpeningTasks = [
      { key: 'Asset Search Started', completedValues: ['done'] },
      { key: 'Unclaimed Property Report', completedValues: ['done'] },
      { key: 'Creditor Notification Published', completedValues: ['done'] },
      { key: 'EIN Number', completedValues: ['done'] },
      { key: 'Estate Bank Account Opened', completedValues: ['done'] },
      { key: 'Notice of Will Admitted', completedValues: ['dispatched & complete'] },
      { key: 'Letters of Office Uploaded', completedValues: ['done'] },
      { key: 'Real Estate Bond', completedValues: ['done'] },
      { key: 'Tax Return Information Sent', completedValues: ['done'] }
    ];

    const administrationTasks = [
      { key: 'Estate Accounting', completedValues: ['done'] },
      { key: 'Tax Return Filed', completedValues: ['done'] },
      { key: 'Receipts of Distribution', completedValues: ['done'] },
      { key: 'Final Report Filed', completedValues: ['done'] },
      { key: 'Notice of Estate Closing', completedValues: ['done'] },
      { key: 'Order of Discharge', completedValues: ['done'] },
      { key: 'Estate Closed', completedValues: ['done'] }
    ];

    const allTasks = [...preOpeningTasks, ...postOpeningTasks, ...administrationTasks];
    
    let completed = 0;
    let total = 0;
    
    allTasks.forEach(task => {
      const value = (fields[task.key] || '').toString().toLowerCase();
      // Skip "not applicable" tasks from the count
      if (value === 'not applicable') return;
      total++;
      if (task.completedValues.includes(value) || value === 'yes' || value === 'filed' || value === 'dispatched & complete') {
        completed++;
      }
    });
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getCaseTypeColor = (caseType) => {
    const type = (caseType || '').toLowerCase();
    if (type.includes('probate')) return 'bg-purple-100 text-purple-700';
    if (type.includes('estate planning')) return 'bg-blue-100 text-blue-700';
    if (type.includes('deed')) return 'bg-green-100 text-green-700';
    return 'bg-slate-100 text-slate-700';
  };

  const getCaseDetailPath = (caseType, recordId) => {
    const type = (caseType || '').toLowerCase();
    if (type.includes('probate')) return `/case/probate/${recordId}`;
    if (type.includes('estate planning')) return `/case/estate-planning/${recordId}`;
    if (type.includes('deed')) return `/case/deed/${recordId}`;
    return `/case/probate/${recordId}`;
  };

  const handleRowClick = (client) => {
    const caseType = client.fields?.['Type of Case'] || '';
    const path = getCaseDetailPath(caseType, client.id);
    navigate(path);
  };

  const filteredClients = clients.filter((client) => {
    const fields = client.fields || {};
    const searchLower = searchQuery.toLowerCase();
    const caseType = (fields['Type of Case'] || '').toLowerCase();
    
    // Apply type filter
    if (typeFilter !== 'all') {
      if (typeFilter === 'probate' && !caseType.includes('probate')) return false;
      if (typeFilter === 'estate-planning' && !caseType.includes('estate planning')) return false;
      if (typeFilter === 'deed' && !caseType.includes('deed')) return false;
    }
    
    // Apply search filter
    return (
      (fields['Matter Name'] || '').toLowerCase().includes(searchLower) ||
      (fields['Client'] || '').toLowerCase().includes(searchLower) ||
      (fields['Email Address'] || '').toLowerCase().includes(searchLower) ||
      (fields['Phone Number'] || '').toLowerCase().includes(searchLower) ||
      (fields['Type of Case'] || '').toLowerCase().includes(searchLower)
    );
  });

  // Count by type for filter badges
  const probateCount = clients.filter(c => (c.fields?.['Type of Case'] || '').toLowerCase().includes('probate')).length;
  const estatePlanningCount = clients.filter(c => (c.fields?.['Type of Case'] || '').toLowerCase().includes('estate planning')).length;
  const deedCount = clients.filter(c => (c.fields?.['Type of Case'] || '').toLowerCase().includes('deed')).length;

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
            Clients
          </h1>
          <p className="text-slate-500 mt-1">All active cases and clients</p>
        </div>
        <Badge className="bg-[#2E7DA1]/10 text-[#2E7DA1] font-medium text-sm px-3 py-1">
          <Users className="w-4 h-4 mr-1" />
          {clients.length} Active Clients
        </Badge>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by matter name, client, email, phone, or case type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">All Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {searchQuery ? 'No clients match your search' : 'No active clients found'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClients.map((client) => {
                const fields = client.fields || {};
                const caseType = fields['Type of Case'] || '';
                const isEstatePlanning = caseType.toLowerCase().includes('estate planning');
                const isProbate = caseType.toLowerCase().includes('probate');
                const status = isEstatePlanning 
                  ? fields['Status (EP)'] || fields['Stage (EP)']
                  : isProbate 
                    ? fields['Status (Probate)'] || fields['Stage (Probate)']
                    : null;
                
                return (
                  <div
                    key={client.id}
                    className="p-4 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all"
                    onClick={() => handleRowClick(client)}
                  >
                    {/* Line 1: Matter Name + Type of Case + Status */}
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
                        <h3 className="font-semibold text-slate-900 text-base truncate">
                          {fields['Matter Name'] || 'Unnamed Matter'}
                        </h3>
                        <Badge className={getCaseTypeColor(caseType)}>
                          {caseType || 'Unknown'}
                        </Badge>
                        {status && (
                          <Badge variant="outline" className="border-slate-300 text-slate-600 font-normal">
                            {status}
                          </Badge>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </div>
                    
                    {/* Line 2: Email, Phone, Address */}
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
                      {fields['Address'] && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-xs">{fields['Address']}</span>
                        </div>
                      )}
                      {!fields['Email Address'] && !fields['Phone Number'] && !fields['Address'] && (
                        <span className="text-slate-400">No contact information</span>
                      )}
                    </div>
                    
                    {/* Line 3: Probate Task Progress (only for Probate cases) */}
                    {isProbate && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 w-24">Task Progress</span>
                          <div className="flex-1">
                            <Progress value={calculateProbateProgress(fields)} className="h-2" />
                          </div>
                          <span className="text-xs font-medium text-[#2E7DA1] w-10 text-right">
                            {calculateProbateProgress(fields)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientsPage;
