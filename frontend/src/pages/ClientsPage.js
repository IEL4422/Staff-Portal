import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, masterListApi, tasksApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Search, Loader2, Users, Phone, Mail, MapPin, ChevronRight, Filter, Plus, Calendar, X, ExternalLink, CheckCircle, Archive, ClipboardList, Check, Clock, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { AddClientModal } from './actions/AddClientPage';
import { format } from 'date-fns';
import { CopyableEmail, CopyablePhone } from '../components/ui/copyable-text';

// Progress Circle Component
const ProgressCircle = ({ progress, size = 40 }) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2E7DA1"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-[#2E7DA1]">{progress}%</span>
      </div>
    </div>
  );
};

const ClientsPage = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, probate, estate-planning, deed
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  
  // Preview panel state
  const [selectedClient, setSelectedClient] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [closingCase, setClosingCase] = useState(false);
  const [archivingCase, setArchivingCase] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ taskName: '', dueDate: '', notes: '' });
  const [savingTask, setSavingTask] = useState(null); // Track which task is being saved
  const [savingStage, setSavingStage] = useState(false);

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

  const handleAddClientSuccess = () => {
    setIsAddClientModalOpen(false);
    fetchClients(); // Refresh the clients list
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

  // Calculate estate planning task progress percentage
  const calculateEstatePlanningProgress = (fields) => {
    const estatePlanningTasks = [
      { key: 'Questionnaire Completed?', completedValues: ['yes'] },
      { key: 'Planning Session 2', completedValues: ['done', 'completed'] },
      { key: 'Drafting', completedValues: ['done', 'completed'] },
      { key: 'Client Review', completedValues: ['done', 'completed'] },
      { key: 'Notarization Session', completedValues: ['done', 'completed'] },
      { key: 'Physical Portfolio', completedValues: ['done', 'completed'] },
      { key: 'Trust Funding', completedValues: ['done', 'completed', 'not applicable'] }
    ];

    let completed = 0;
    let total = 0;
    
    estatePlanningTasks.forEach(task => {
      const value = (fields[task.key] || '').toString().toLowerCase();
      // Skip "not applicable" tasks from the count for Trust Funding
      if (task.key === 'Trust Funding' && value === 'not applicable') return;
      total++;
      if (task.completedValues.includes(value)) {
        completed++;
      }
    });
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
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

  const handleRowClick = (client, e) => {
    // Prevent navigation on copy button clicks
    if (e?.target?.closest('button')) return;
    setSelectedClient(client);
  };

  const handleOpenCase = () => {
    if (!selectedClient) return;
    const caseType = selectedClient.fields?.['Type of Case'] || '';
    const path = getCaseDetailPath(caseType, selectedClient.id);
    navigate(path);
  };

  const handleCloseCase = async () => {
    if (!selectedClient) return;
    setClosingCase(true);
    try {
      await masterListApi.update(selectedClient.id, { 'Active/Inactive': 'Completed' });
      toast.success('Case marked as completed');
      setSelectedClient(null);
      fetchClients();
    } catch (error) {
      console.error('Failed to close case:', error);
      toast.error('Failed to close case');
    } finally {
      setClosingCase(false);
    }
  };

  const handleArchiveCase = async () => {
    if (!selectedClient) return;
    setArchivingCase(true);
    try {
      await masterListApi.update(selectedClient.id, { 'Active/Inactive': 'Archived' });
      toast.success('Case archived successfully');
      setSelectedClient(null);
      fetchClients();
    } catch (error) {
      console.error('Failed to archive case:', error);
      toast.error('Failed to archive case');
    } finally {
      setArchivingCase(false);
    }
  };

  const handleStatusChange = async (field, value) => {
    if (!selectedClient) return;
    setUpdatingStatus(true);
    try {
      await masterListApi.update(selectedClient.id, { [field]: value });
      // Update local state
      setSelectedClient(prev => ({
        ...prev,
        fields: { ...prev.fields, [field]: value }
      }));
      // Also update in the clients list
      setClients(prev => prev.map(c => 
        c.id === selectedClient.id 
          ? { ...c, fields: { ...c.fields, [field]: value } }
          : c
      ));
      toast.success('Status updated');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddTask = async () => {
    if (!taskForm.taskName.trim()) {
      toast.error('Task name is required');
      return;
    }
    setAddingTask(true);
    try {
      await tasksApi.create({
        taskName: taskForm.taskName,
        dueDate: taskForm.dueDate || undefined,
        notes: taskForm.notes || undefined,
        matterId: selectedClient.id
      });
      toast.success('Task added successfully');
      setShowAddTaskModal(false);
      setTaskForm({ taskName: '', dueDate: '', notes: '' });
    } catch (error) {
      console.error('Failed to add task:', error);
      toast.error('Failed to add task');
    } finally {
      setAddingTask(false);
    }
  };

  // Handle task tracker update
  const handleUpdateTask = async (fieldKey, newValue) => {
    if (!selectedClient) return;
    setSavingTask(fieldKey);
    try {
      await masterListApi.update(selectedClient.id, { [fieldKey]: newValue });
      // Update local state for selectedClient
      setSelectedClient(prev => ({
        ...prev,
        fields: { ...prev.fields, [fieldKey]: newValue }
      }));
      // Also update in the clients list
      setClients(prev => prev.map(c => 
        c.id === selectedClient.id 
          ? { ...c, fields: { ...c.fields, [fieldKey]: newValue } }
          : c
      ));
      toast.success('Task updated');
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    } finally {
      setSavingTask(null);
    }
  };

  // Handle stage change
  const handleStageChange = async (stageField, newStage) => {
    if (!selectedClient) return;
    setSavingStage(true);
    try {
      await masterListApi.update(selectedClient.id, { [stageField]: newStage });
      // Update local state
      setSelectedClient(prev => ({
        ...prev,
        fields: { ...prev.fields, [stageField]: newStage }
      }));
      // Also update in the clients list
      setClients(prev => prev.map(c => 
        c.id === selectedClient.id 
          ? { ...c, fields: { ...c.fields, [stageField]: newStage } }
          : c
      ));
      toast.success(`Stage updated to "${newStage}"`);
    } catch (error) {
      console.error('Failed to update stage:', error);
      toast.error('Failed to update stage');
    } finally {
      setSavingStage(false);
    }
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
  }).sort((a, b) => {
    // Sort by Date Paid (most recent first)
    const dateA = a.fields?.['Date Paid'] ? new Date(a.fields['Date Paid']) : new Date(0);
    const dateB = b.fields?.['Date Paid'] ? new Date(b.fields['Date Paid']) : new Date(0);
    return dateB - dateA;
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
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsAddClientModalOpen(true)}
            className="bg-[#2E7DA1] hover:bg-[#256a8a] text-white rounded-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
          <Badge className="bg-[#2E7DA1]/10 text-[#2E7DA1] font-medium text-sm px-3 py-1">
            <Users className="w-4 h-4 mr-1" />
            {clients.length} Active Clients
          </Badge>
        </div>
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

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-500 flex items-center gap-1.5">
          <Filter className="w-4 h-4" />
          Filter by:
        </span>
        <Button
          variant={typeFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTypeFilter('all')}
          className={`rounded-full ${typeFilter === 'all' ? 'bg-[#2E7DA1] hover:bg-[#256a8a]' : ''}`}
        >
          All ({clients.length})
        </Button>
        <Button
          variant={typeFilter === 'probate' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTypeFilter('probate')}
          className={`rounded-full ${typeFilter === 'probate' ? 'bg-purple-600 hover:bg-purple-700' : 'text-purple-700 border-purple-200 hover:bg-purple-50'}`}
        >
          Probate ({probateCount})
        </Button>
        <Button
          variant={typeFilter === 'estate-planning' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTypeFilter('estate-planning')}
          className={`rounded-full ${typeFilter === 'estate-planning' ? 'bg-blue-600 hover:bg-blue-700' : 'text-blue-700 border-blue-200 hover:bg-blue-50'}`}
        >
          Estate Planning ({estatePlanningCount})
        </Button>
        <Button
          variant={typeFilter === 'deed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTypeFilter('deed')}
          className={`rounded-full ${typeFilter === 'deed' ? 'bg-green-600 hover:bg-green-700' : 'text-green-700 border-green-200 hover:bg-green-50'}`}
        >
          Deed ({deedCount})
        </Button>
      </div>

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
                const isSelected = selectedClient?.id === client.id;
                
                return (
                  <div
                    key={client.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-all max-w-4xl ${isSelected ? 'border-[#2E7DA1] bg-[#2E7DA1]/5 ring-1 ring-[#2E7DA1]' : 'border-slate-200 hover:border-slate-300'}`}
                    onClick={(e) => handleRowClick(client, e)}
                  >
                    {/* Line 1: Matter Name + Type of Case + Package + Status */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                        <h3 className="font-semibold text-slate-900 text-sm truncate">
                          {fields['Matter Name'] || 'Unnamed Matter'}
                        </h3>
                        <Badge className={`text-xs ${getCaseTypeColor(caseType)}`}>
                          {caseType || 'Unknown'}
                        </Badge>
                        {fields['Package Purchased'] && (
                          <Badge variant="outline" className="border-[#2E7DA1] text-[#2E7DA1] font-normal text-xs">
                            {fields['Package Purchased']}
                          </Badge>
                        )}
                        {status && (
                          <Badge variant="outline" className="border-slate-300 text-slate-600 font-normal text-xs">
                            {status}
                          </Badge>
                        )}
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${isSelected ? 'text-[#2E7DA1] rotate-90' : 'text-slate-400'}`} />
                    </div>
                    
                    {/* Line 2: Email, Phone, Sign Up Date */}
                    <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                      {fields['Email Address'] && (
                        <CopyableEmail value={fields['Email Address']} className="text-xs" showIcon={false} />
                      )}
                      {fields['Phone Number'] && (
                        <CopyablePhone value={fields['Phone Number']} className="text-xs" showIcon={false} />
                      )}
                      {fields['Date Paid'] && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Sign Up: {formatDate(fields['Date Paid'])}</span>
                        </div>
                      )}
                      {!fields['Email Address'] && !fields['Phone Number'] && !fields['Date Paid'] && (
                        <span className="text-slate-400">No contact information</span>
                      )}
                    </div>
                    
                    {/* Line 3: Task Progress (for Probate and Estate Planning cases) */}
                    {(isProbate || isEstatePlanning) && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Task Progress</span>
                          <ProgressCircle 
                            progress={isProbate ? calculateProbateProgress(fields) : calculateEstatePlanningProgress(fields)} 
                            size={36} 
                          />
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

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onSuccess={handleAddClientSuccess}
      />

      {/* Client Preview Panel */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex justify-end" data-testid="client-preview-panel">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setSelectedClient(null)}
          />
          
          {/* Panel */}
          <div className="relative w-full max-w-xl bg-white shadow-2xl animate-slide-in-right overflow-y-auto">
            {/* Panel Header */}
            <div className="sticky top-0 bg-white z-10 p-4 border-b flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-900 truncate" style={{ fontFamily: 'Manrope' }}>
                  {selectedClient.fields?.['Matter Name'] || 'Case Preview'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getCaseTypeColor(selectedClient.fields?.['Type of Case'])}>
                    {selectedClient.fields?.['Type of Case'] || 'Unknown'}
                  </Badge>
                  {selectedClient.fields?.['Active/Inactive'] && (
                    <Badge variant="outline" className={`text-xs ${
                      selectedClient.fields['Active/Inactive'] === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                      selectedClient.fields['Active/Inactive'] === 'Archived' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {selectedClient.fields['Active/Inactive']}
                    </Badge>
                  )}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-2"
                onClick={() => setSelectedClient(null)}
                data-testid="close-preview-btn"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Action Buttons */}
            <div className="p-4 bg-slate-50 border-b">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleOpenCase}
                  className="bg-[#2E7DA1] hover:bg-[#256a8a] text-white"
                  data-testid="open-case-btn"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Case
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddTaskModal(true)}
                  data-testid="add-task-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCloseCase}
                  disabled={closingCase || selectedClient.fields?.['Active/Inactive'] === 'Completed'}
                  className="border-green-300 text-green-700 hover:bg-green-50"
                  data-testid="close-case-btn"
                >
                  {closingCase ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  {selectedClient.fields?.['Active/Inactive'] === 'Completed' ? 'Closed' : 'Close Case'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleArchiveCase}
                  disabled={archivingCase || selectedClient.fields?.['Active/Inactive'] === 'Archived'}
                  className="border-slate-300 text-slate-600 hover:bg-slate-100"
                  data-testid="archive-case-btn"
                >
                  {archivingCase ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Archive className="w-4 h-4 mr-2" />
                  )}
                  {selectedClient.fields?.['Active/Inactive'] === 'Archived' ? 'Archived' : 'Archive Case'}
                </Button>
              </div>
            </div>
            
            {/* Client Info Quick View */}
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2E7DA1]" />
                Client Information
              </h3>
              <div className="space-y-2 text-sm">
                {selectedClient.fields?.['Client'] && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Client Name</span>
                    <span className="font-medium text-slate-900">{selectedClient.fields['Client']}</span>
                  </div>
                )}
                {selectedClient.fields?.['Email Address'] && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Email</span>
                    <CopyableEmail value={selectedClient.fields['Email Address']} className="text-sm" />
                  </div>
                )}
                {selectedClient.fields?.['Phone Number'] && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Phone</span>
                    <CopyablePhone value={selectedClient.fields['Phone Number']} className="text-sm" />
                  </div>
                )}
                {selectedClient.fields?.['Date Paid'] && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Sign Up Date</span>
                    <span className="font-medium text-slate-900">{formatDate(selectedClient.fields['Date Paid'])}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Task Tracker */}
            <div className="p-4 overflow-y-auto flex-1">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#2E7DA1]" />
                Task Tracker
              </h3>
              
              {(() => {
                const caseType = (selectedClient.fields?.['Type of Case'] || '').toLowerCase();
                const isProbate = caseType.includes('probate');
                const isEstatePlanning = caseType.includes('estate planning');
                
                if (isProbate) {
                  const progress = calculateProbateProgress(selectedClient.fields || {});
                  
                  // Probate stage options
                  const probateStages = ['Pre-Opening', 'Estate Opened', 'Creditor Notification Period', 'Administration', 'Estate Closed'];
                  
                  // Probate task definitions with options
                  const probateTasks = [
                    { key: 'Questionnaire Completed?', label: 'Questionnaire Completed', options: ['Yes', 'No', 'Not Applicable'] },
                    { key: 'Petition filed?', label: 'Petition Filed', options: ['Filed', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'] },
                    { key: 'Initial Orders', label: 'Initial Orders', options: ['Done', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'] },
                    { key: 'Oath and Bond', label: 'Oath and Bond', options: ['Done', 'Application Submitted', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'] },
                    { key: 'Letters of Office Uploaded', label: 'Letters of Office', options: ['Done', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'] },
                    { key: 'EIN Number', label: 'EIN Number', options: ['Done', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'] },
                    { key: 'Estate Bank Account Opened', label: 'Estate Bank Account', options: ['Done', 'Waiting on Client Confirmation', 'Reminder Sent to Client', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'] },
                    { key: 'Asset Search Started', label: 'Asset Search', options: ['Done', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'] },
                    { key: 'Creditor Notification Published', label: 'Creditor Notification', options: ['Done', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'] },
                    { key: 'Estate Accounting', label: 'Estate Accounting', options: ['Complete & Sent to Heirs', 'Done', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'] },
                    { key: 'Final Report Filed', label: 'Final Report Filed', options: ['Done', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'] },
                    { key: 'Estate Closed', label: 'Estate Closed', options: ['Done', 'Scheduled', 'In Progress', 'Waiting', 'Not Started', 'Not Applicable', 'Needed'] },
                  ];
                  
                  return (
                    <div className="space-y-4">
                      {/* Progress */}
                      <div className="flex items-center gap-3">
                        <ProgressCircle progress={progress} size={50} />
                        <div>
                          <p className="font-semibold text-slate-900">{progress}% Complete</p>
                          <p className="text-xs text-slate-500">Probate Case Tasks</p>
                        </div>
                      </div>
                      
                      {/* Editable Stage */}
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-600 mb-2">Current Stage</p>
                        <Select
                          value={selectedClient.fields?.['Stage (Probate)'] || ''}
                          onValueChange={(value) => handleStageChange('Stage (Probate)', value)}
                          disabled={savingStage}
                        >
                          <SelectTrigger className="h-9 bg-white" data-testid="stage-select">
                            {savingStage ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <SelectValue placeholder="Select stage..." />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {probateStages.map((stage) => (
                              <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Editable Tasks */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-600">Tasks</p>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {probateTasks.map((task) => {
                            const currentValue = selectedClient.fields?.[task.key] || '';
                            const isSaving = savingTask === task.key;
                            
                            return (
                              <div key={task.key} className="flex items-center justify-between gap-2 py-1">
                                <span className="text-xs text-slate-700 flex-shrink-0">{task.label}</span>
                                <Select
                                  value={currentValue}
                                  onValueChange={(value) => handleUpdateTask(task.key, value)}
                                  disabled={isSaving}
                                >
                                  <SelectTrigger className={`h-7 text-xs w-[140px] ${getTaskStatusColor(currentValue)}`}>
                                    {isSaving ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <SelectValue placeholder="Select..." />
                                    )}
                                  </SelectTrigger>
                                  <SelectContent>
                                    {task.options.map((opt) => (
                                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                } else if (isEstatePlanning) {
                  const progress = calculateEstatePlanningProgress(selectedClient.fields || {});
                  
                  // Estate Planning stage options
                  const epStages = ['Questionnaire', 'Planning Session', 'Drafting', 'Review', 'Notary Session', 'Digital & Physical Portfolio', 'Trust Funding', 'Completed'];
                  
                  // Estate Planning task definitions with options
                  const epTasks = [
                    { key: 'Questionnaire Completed?', label: 'Questionnaire Completed', options: ['Yes', 'No'] },
                    { key: 'Planning Session 2', label: 'Planning Session', options: ['Done', 'In Progress', 'Needed', 'N/A'] },
                    { key: 'Drafting', label: 'Drafting', options: ['Done', 'In Progress', 'Needed'] },
                    { key: 'Client Review', label: 'Client Review', options: ['Done', 'In Progress', 'Needed'] },
                    { key: 'Notarization Session', label: 'Notarization Session', options: ['Done', 'Needed'] },
                    { key: 'Physical Portfolio', label: 'Physical Portfolio', options: ['Done', 'In Progress', 'Needed'] },
                    { key: 'Trust Funding', label: 'Trust Funding', options: ['Done', 'Needed', 'N/A'] },
                  ];
                  
                  return (
                    <div className="space-y-4">
                      {/* Progress */}
                      <div className="flex items-center gap-3">
                        <ProgressCircle progress={progress} size={50} />
                        <div>
                          <p className="font-semibold text-slate-900">{progress}% Complete</p>
                          <p className="text-xs text-slate-500">Estate Planning Tasks</p>
                        </div>
                      </div>
                      
                      {/* Editable Stage */}
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-600 mb-2">Current Stage</p>
                        <Select
                          value={selectedClient.fields?.['Stage (EP)'] || ''}
                          onValueChange={(value) => handleStageChange('Stage (EP)', value)}
                          disabled={savingStage}
                        >
                          <SelectTrigger className="h-9 bg-white" data-testid="stage-select">
                            {savingStage ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <SelectValue placeholder="Select stage..." />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {epStages.map((stage) => (
                              <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Editable Tasks */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-600">Tasks</p>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {epTasks.map((task) => {
                            const currentValue = selectedClient.fields?.[task.key] || '';
                            const isSaving = savingTask === task.key;
                            
                            return (
                              <div key={task.key} className="flex items-center justify-between gap-2 py-1">
                                <span className="text-xs text-slate-700 flex-shrink-0">{task.label}</span>
                                <Select
                                  value={currentValue}
                                  onValueChange={(value) => handleUpdateTask(task.key, value)}
                                  disabled={isSaving}
                                >
                                  <SelectTrigger className={`h-7 text-xs w-[140px] ${getTaskStatusColor(currentValue)}`}>
                                    {isSaving ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <SelectValue placeholder="Select..." />
                                    )}
                                  </SelectTrigger>
                                  <SelectContent>
                                    {task.options.map((opt) => (
                                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="text-center py-6 text-slate-500">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Task tracking not available for this case type</p>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      <Dialog open={showAddTaskModal} onOpenChange={setShowAddTaskModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="taskName">Task Name *</Label>
              <Input
                id="taskName"
                placeholder="Enter task name..."
                value={taskForm.taskName}
                onChange={(e) => setTaskForm(prev => ({ ...prev, taskName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskDueDate">Due Date</Label>
              <Input
                id="taskDueDate"
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskNotes">Notes</Label>
              <Textarea
                id="taskNotes"
                placeholder="Add notes..."
                value={taskForm.notes}
                onChange={(e) => setTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddTaskModal(false);
                setTaskForm({ taskName: '', dueDate: '', notes: '' });
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddTask}
              disabled={addingTask || !taskForm.taskName.trim()}
              className="bg-[#2E7DA1] hover:bg-[#256a8a]"
              data-testid="submit-add-task-btn"
            >
              {addingTask ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper function to render Probate Task Preview
const renderProbateTaskPreview = (fields) => {
  const keyTasks = [
    { key: 'Questionnaire Completed?', label: 'Questionnaire', completedValues: ['yes'] },
    { key: 'Petition filed?', label: 'Petition Filed', completedValues: ['filed'] },
    { key: 'Letters of Office Uploaded', label: 'Letters of Office', completedValues: ['done'] },
    { key: 'EIN Number', label: 'EIN Number', completedValues: ['done'] },
    { key: 'Estate Bank Account Opened', label: 'Bank Account', completedValues: ['done'] },
    { key: 'Estate Closed', label: 'Estate Closed', completedValues: ['done'] },
  ];
  
  return (
    <div className="space-y-1.5">
      {keyTasks.map((task) => {
        const value = (fields[task.key] || '').toString().toLowerCase();
        const isComplete = task.completedValues.includes(value) || value === 'yes' || value === 'done' || value === 'filed';
        const isNA = value === 'not applicable';
        
        return (
          <div key={task.key} className="flex items-center gap-2 text-xs">
            {isComplete ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : isNA ? (
              <Circle className="w-3.5 h-3.5 text-slate-300" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span className={isComplete ? 'text-slate-600' : isNA ? 'text-slate-400' : 'text-slate-800'}>
              {task.label}
            </span>
            {isNA && <span className="text-slate-400 text-[10px]">(N/A)</span>}
          </div>
        );
      })}
    </div>
  );
};

// Helper function to render Estate Planning Task Preview
const renderEstatePlanningTaskPreview = (fields) => {
  const keyTasks = [
    { key: 'Questionnaire Completed?', label: 'Questionnaire', completedValues: ['yes'] },
    { key: 'Planning Session 2', label: 'Planning Session', completedValues: ['done', 'completed', 'n/a'] },
    { key: 'Drafting', label: 'Drafting', completedValues: ['done', 'completed'] },
    { key: 'Client Review', label: 'Client Review', completedValues: ['done', 'completed'] },
    { key: 'Notarization Session', label: 'Notarization', completedValues: ['done', 'completed'] },
    { key: 'Physical Portfolio', label: 'Portfolio', completedValues: ['done', 'completed'] },
    { key: 'Trust Funding', label: 'Trust Funding', completedValues: ['done', 'completed', 'not applicable'] },
  ];
  
  return (
    <div className="space-y-1.5">
      {keyTasks.map((task) => {
        const value = (fields[task.key] || '').toString().toLowerCase();
        const isComplete = task.completedValues.includes(value);
        const isNA = value === 'not applicable' || value === 'n/a';
        
        return (
          <div key={task.key} className="flex items-center gap-2 text-xs">
            {isComplete ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : isNA ? (
              <Circle className="w-3.5 h-3.5 text-slate-300" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span className={isComplete ? 'text-slate-600' : isNA ? 'text-slate-400' : 'text-slate-800'}>
              {task.label}
            </span>
            {isNA && <span className="text-slate-400 text-[10px]">(N/A)</span>}
          </div>
        );
      })}
    </div>
  );
};

export default ClientsPage;
