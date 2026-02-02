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
import { DatePicker } from '../components/ui/date-picker';
import { Search, Loader2, Users, Phone, Mail, MapPin, ChevronRight, Filter, Plus, Calendar, X, ExternalLink, CheckCircle, Archive, ClipboardList, Check, Clock, Circle, ChevronDown, FileText, FolderOpen, AlertCircle } from 'lucide-react';
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

  // Helper to determine the "completed" status value for a task tracker field
  const getCompletedValueForField = (fieldKey) => {
    // Fields that use "Filed" as completed status
    const filedFields = ['Petition filed?'];
    // Fields that use "Dispatched & Complete"
    const dispatchedFields = ['Notice of Petition for Administration', 'Notice of Will Admitted'];
    // Fields that use "Yes"
    const yesFields = ['Questionnaire Completed?'];
    
    if (filedFields.includes(fieldKey)) return 'Filed';
    if (dispatchedFields.includes(fieldKey)) return 'Dispatched & Complete';
    if (yesFields.includes(fieldKey)) return 'Yes';
    return 'Done'; // Default for most fields
  };

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
  const handleUpdateTask = async (fieldKey, newValue, taskLabel = '') => {
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
      
        // Auto-create a task in Tasks table when marked as "Needed"
      if (newValue === 'Needed') {
        try {
          // Calculate due date as 3 days from today
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 3);
          const dueDateStr = dueDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          
          const matterName = selectedClient.fields?.['Matter Name'] || 'Unknown Matter';
          const taskName = taskLabel || fieldKey;
          
          // Include metadata to sync back when task is completed
          // Format: TRACKER_SYNC|matterId|fieldKey|completedValue
          const completedValue = getCompletedValueForField(fieldKey);
          const syncMetadata = `TRACKER_SYNC|${selectedClient.id}|${fieldKey}|${completedValue}`;
          
          await tasksApi.create({
            task: `${taskName} - ${matterName}`,
            status: 'Not Started',
            priority: 'Normal',
            due_date: dueDateStr,
            link_to_matter: selectedClient.id,
            notes: syncMetadata,
            // No assigned_to - leave it blank as requested
          });
          toast.success(`Task "${taskName}" created with due date ${format(dueDate, 'MMM d, yyyy')}`);
        } catch (taskError) {
          console.error('Failed to auto-create task:', taskError);
          // Don't show error toast - the main task update succeeded
        }
      }
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
            <div className="flex-1 overflow-y-auto">
              <ProbateTaskTrackerPreview 
                fields={selectedClient.fields || {}}
                onUpdateTask={handleUpdateTask}
                savingTask={savingTask}
                onStageChange={handleStageChange}
                savingStage={savingStage}
                isVisible={(selectedClient.fields?.['Type of Case'] || '').toLowerCase().includes('probate')}
              />
              <EstatePlanningTaskTrackerPreview
                fields={selectedClient.fields || {}}
                onUpdateTask={handleUpdateTask}
                savingTask={savingTask}
                onStageChange={handleStageChange}
                savingStage={savingStage}
                isVisible={(selectedClient.fields?.['Type of Case'] || '').toLowerCase().includes('estate planning')}
              />
              {!((selectedClient.fields?.['Type of Case'] || '').toLowerCase().includes('probate')) && 
               !((selectedClient.fields?.['Type of Case'] || '').toLowerCase().includes('estate planning')) && (
                <div className="text-center py-6 text-slate-500 p-4">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Task tracking not available for this case type</p>
                </div>
              )}
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
              <DatePicker
                value={taskForm.dueDate}
                onChange={(date) => setTaskForm(prev => ({ ...prev, dueDate: date }))}
                placeholder="Select due date..."
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

// Helper function to get task status color classes
const getTaskStatusColor = (status) => {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'done':
    case 'yes':
    case 'filed':
    case 'complete & sent to heirs':
    case 'dispatched & complete':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'in progress':
    case 'application submitted':
    case 'scheduled':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'waiting':
    case 'waiting on client confirmation':
    case 'client signature needed':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'reminder sent to client':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'needed':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'not applicable':
    case 'n/a':
      return 'bg-slate-100 text-slate-500 border-slate-200';
    case 'not started':
    case 'no':
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

// Get status icon based on status value
const getStatusIcon = (status) => {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'done':
    case 'yes':
    case 'filed':
    case 'dispatched & complete':
      return <Check className="w-4 h-4 text-green-600" />;
    case 'in progress':
    case 'application submitted':
      return <Clock className="w-4 h-4 text-blue-600" />;
    case 'waiting':
    case 'waiting on client confirmation':
    case 'client signature needed':
      return <Clock className="w-4 h-4 text-amber-600" />;
    case 'needed':
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    default:
      return <Circle className="w-4 h-4 text-slate-400" />;
  }
};

// Probate Task Tracker Preview Component - Matches ProbateCaseDetail.js
const ProbateTaskTrackerPreview = ({ fields, onUpdateTask, savingTask, onStageChange, savingStage, isVisible }) => {
  const [openSections, setOpenSections] = useState({
    preOpening: true,
    postOpening: false,
    administration: false
  });
  const [completingSection, setCompletingSection] = useState(null); // Track which section is being completed

  if (!isVisible) return null;
  
  // Helper to get the "completed" status value for a task based on its options
  const getCompletedValue = (task) => {
    const options = task.options || [];
    // Priority: Filed > Dispatched & Complete > Done > Yes
    if (options.includes('Filed')) return 'Filed';
    if (options.includes('Dispatched & Complete')) return 'Dispatched & Complete';
    if (options.includes('Done')) return 'Done';
    if (options.includes('Yes')) return 'Yes';
    return 'Done'; // fallback
  };
  
  // Handle completing all tasks in a section
  const handleCompleteSection = async (sectionKey, tasks) => {
    setCompletingSection(sectionKey);
    try {
      // Filter to only incomplete tasks (not already done/completed/not applicable)
      const incompleteTasks = tasks.filter(task => {
        const status = (fields[task.key] || '').toLowerCase();
        return !['done', 'yes', 'filed', 'dispatched & complete', 'not applicable'].includes(status);
      });
      
      // Update each task sequentially to avoid race conditions
      for (const task of incompleteTasks) {
        const completedValue = getCompletedValue(task);
        await onUpdateTask(task.key, completedValue, task.label);
      }
      
      toast.success(`Completed ${incompleteTasks.length} tasks in section`);
    } catch (error) {
      console.error('Failed to complete section:', error);
      toast.error('Failed to complete some tasks');
    } finally {
      setCompletingSection(null);
    }
  };

  // Default status options for most fields
  const defaultStatusOptions = ['Not Started', 'Done', 'In Progress', 'Waiting', 'Not Applicable', 'Needed'];
  const yesNoOptions = ['No', 'Yes', 'Not Applicable'];
  const filedOptions = ['Not Started', 'Filed', 'In Progress', 'Waiting', 'Not Applicable', 'Needed'];
  const noticeOptions = ['Not Started', 'Dispatched & Complete', 'In Progress', 'Waiting', 'Not Applicable', 'Needed'];
  const oathBondOptions = ['Not Started', 'Done', 'Application Submitted', 'In Progress', 'Waiting', 'Not Applicable', 'Needed'];
  const affidavitOptions = ['Not Started', 'Done', 'Client Signature Needed', 'In Progress', 'Waiting', 'Not Applicable', 'Needed'];
  const bankAccountOptions = ['Not Started', 'Done', 'Waiting on Client Confirmation', 'Reminder Sent to Client', 'In Progress', 'Waiting', 'Not Applicable', 'Needed'];
  const accountingOptions = ['Not Started', 'Complete & Sent to Heirs', 'Done', 'In Progress', 'Waiting', 'Not Applicable', 'Needed'];
  const closedOptions = ['Not Started', 'Done', 'Scheduled', 'In Progress', 'Waiting', 'Not Applicable', 'Needed'];

  const preOpeningTasks = [
    { key: 'Questionnaire Completed?', label: 'Questionnaire Completed', options: yesNoOptions },
    { key: 'Petition filed?', label: 'Petition Filed', options: filedOptions },
    { key: 'Initial Orders', label: 'Initial Orders', options: defaultStatusOptions },
    { key: 'Oath and Bond', label: 'Oath and Bond', options: oathBondOptions },
    { key: 'Waivers of Notice', label: 'Waivers of Notice', options: defaultStatusOptions },
    { key: 'Affidavit of Heirship', label: 'Affidavit of Heirship', options: affidavitOptions },
    { key: 'Notice of Petition for Administration', label: 'Notice of Petition Filed', options: noticeOptions },
    { key: 'Copy of Will Filed', label: 'Copy of Will Filed', options: defaultStatusOptions },
    { key: 'Courtesy Copies to Judge', label: 'Courtesy Copies to Judge', options: defaultStatusOptions }
  ];

  const postOpeningTasks = [
    { key: 'Asset Search Started', label: 'Asset Search Started', options: defaultStatusOptions },
    { key: 'Unclaimed Property Report', label: 'Unclaimed Property Report', options: defaultStatusOptions },
    { key: 'Creditor Notification Published', label: 'Creditor Notification Published', options: defaultStatusOptions },
    { key: 'EIN Number', label: 'EIN Number', options: defaultStatusOptions },
    { key: 'Estate Bank Account Opened', label: 'Estate Bank Account', options: bankAccountOptions },
    { key: 'Notice of Will Admitted', label: 'Notice of Will Admitted', options: noticeOptions },
    { key: 'Letters of Office Uploaded', label: 'Letters of Office Uploaded', options: defaultStatusOptions },
    { key: 'Real Estate Bond', label: 'Real Estate Bond', options: defaultStatusOptions },
    { key: 'Tax Return Information Sent', label: 'Tax Return Information Sent', options: defaultStatusOptions }
  ];

  const administrationTasks = [
    // NOTE: These fields do not exist in Airtable yet
    // They need to be created in the Master List table before they can be tracked
    // { key: 'Estate Accounting', label: 'Estate Accounting', options: accountingOptions },
    // { key: 'Tax Return Filed', label: 'Estate Tax Return', options: defaultStatusOptions },
    // { key: 'Receipts of Distribution', label: 'Receipts of Distribution', options: defaultStatusOptions },
    // { key: 'Final Report Filed', label: 'Final Report Filed', options: defaultStatusOptions },
    // { key: 'Notice of Estate Closing', label: 'Notice of Estate Closing', options: defaultStatusOptions },
    // { key: 'Order of Discharge', label: 'Order of Discharge', options: defaultStatusOptions },
    // { key: 'Estate Closed', label: 'Estate Closed', options: closedOptions }
  ];

  const probateStages = ['Intake Questionnaire', 'Pre-Opening', 'Estate Opened', 'Creditor Notification Period', 'Administration', 'Estate Closed'];

  const calculateProgress = (tasks) => {
    const completed = tasks.filter(task => {
      const status = (fields[task.key] || '').toLowerCase();
      return status === 'done' || status === 'yes' || status === 'filed' || status === 'dispatched & complete' || status === 'not applicable';
    }).length;
    return Math.round((completed / tasks.length) * 100);
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const renderTaskSection = (sectionKey, title, tasks, accentColor, iconColor) => {
    const progress = calculateProgress(tasks);
    const isOpen = openSections[sectionKey];
    const completedCount = tasks.filter(task => {
      const status = (fields[task.key] || '').toLowerCase();
      return status === 'done' || status === 'yes' || status === 'filed' || status === 'dispatched & complete';
    }).length;
    const isCompleting = completingSection === sectionKey;
    const allCompleted = completedCount === tasks.length;

    return (
      <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${isOpen ? 'shadow-sm' : ''}`}>
        <button
          onClick={() => toggleSection(sectionKey)}
          className={`w-full flex items-center justify-between p-3 ${accentColor} hover:brightness-95 transition-all`}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/50">
              {sectionKey === 'preOpening' && <FileText className={`w-4 h-4 ${iconColor}`} />}
              {sectionKey === 'postOpening' && <FolderOpen className={`w-4 h-4 ${iconColor}`} />}
              {sectionKey === 'administration' && <ClipboardList className={`w-4 h-4 ${iconColor}`} />}
            </div>
            <div className="text-left">
              <h4 className="font-medium text-sm text-slate-800">{title}</h4>
              <p className="text-xs text-slate-600">{completedCount}/{tasks.length} completed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 transform -rotate-90">
                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="none" className="text-white/50" />
                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray={`${progress * 1.005} 100.5`} className={iconColor} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">{progress}%</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
          {/* Complete All Button */}
          <div className="px-2 pt-2 bg-white">
            <Button
              size="sm"
              variant={allCompleted ? "outline" : "default"}
              className={`w-full h-8 text-xs ${allCompleted ? 'bg-green-50 text-green-700 border-green-200' : 'bg-[#2E7DA1] hover:bg-[#256a8a] text-white'}`}
              onClick={(e) => {
                e.stopPropagation();
                handleCompleteSection(sectionKey, tasks);
              }}
              disabled={isCompleting || allCompleted || savingTask}
              data-testid={`complete-all-${sectionKey}`}
            >
              {isCompleting ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Completing...
                </>
              ) : allCompleted ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  All Tasks Complete
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Complete All Tasks
                </>
              )}
            </Button>
          </div>
          <div className="p-2 bg-white space-y-1">
            {tasks.map((task) => {
              const rawValue = fields[task.key] || '';
              // Use the raw value if it exists and is in the options, otherwise use empty string
              const value = rawValue && task.options.includes(rawValue) ? rawValue : '';
              const isDone = ['done', 'yes', 'filed', 'dispatched & complete'].includes(rawValue.toLowerCase());
              const isSaving = savingTask === task.key;
              
              const handleValueChange = (newValue) => {
                if (newValue === '__CLEAR__') {
                  onUpdateTask(task.key, '', task.label);
                } else {
                  onUpdateTask(task.key, newValue, task.label);
                }
              };
              
              return (
                <div key={task.key} className={`flex items-center justify-between px-2 py-2 rounded-lg transition-all hover:bg-slate-50 ${isDone ? 'bg-green-50/50' : ''}`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(rawValue)}
                    <span className="text-xs text-slate-700 truncate">{task.label}</span>
                  </div>
                  <Select value={value} onValueChange={handleValueChange} disabled={isSaving}>
                    <SelectTrigger className={`w-28 h-7 text-[10px] font-medium ${getTaskStatusColor(rawValue)}`}>
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <SelectValue placeholder="Select..." />}
                    </SelectTrigger>
                    <SelectContent>
                      {rawValue && (
                        <SelectItem value="__CLEAR__" className="text-xs text-red-600 italic">— Clear —</SelectItem>
                      )}
                      {task.options.map((option) => (
                        <SelectItem key={option} value={option} className="text-xs">{option}</SelectItem>
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
  };

  // Only include tasks that exist in Airtable for progress calculation
  const allTasks = [...preOpeningTasks, ...postOpeningTasks];
  const overallProgress = calculateProgress(allTasks);

  return (
    <div className="p-3 space-y-3">
      {/* Header with Overall Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[#2E7DA1]" />
          <span className="text-sm font-semibold text-slate-700">Probate Task Tracker</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{overallProgress}% Complete</span>
        </div>
      </div>

      {/* Stage Selector */}
      <div className="bg-purple-50 rounded-lg p-3">
        <p className="text-xs font-medium text-slate-600 mb-2">Current Stage</p>
        <Select value={fields['Stage (Probate)'] || ''} onValueChange={(value) => onStageChange('Stage (Probate)', value)} disabled={savingStage}>
          <SelectTrigger className="h-8 bg-white text-sm" data-testid="stage-select">
            {savingStage ? <Loader2 className="w-4 h-4 animate-spin" /> : <SelectValue placeholder="Select stage..." />}
          </SelectTrigger>
          <SelectContent>
            {probateStages.map((stage) => (
              <SelectItem key={stage} value={stage}>{stage}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task Sections */}
      <div className="space-y-2">
        {renderTaskSection('preOpening', 'Pre-Opening', preOpeningTasks, 'bg-purple-50', 'text-purple-600')}
        {renderTaskSection('postOpening', 'Post-Opening', postOpeningTasks, 'bg-blue-50', 'text-blue-600')}
        {/* Administration section - fields not yet in Airtable */}
        <div className="border rounded-lg overflow-hidden opacity-60">
          <div className="flex items-center justify-between p-3 bg-green-50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-white/50">
                <ClipboardList className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-left">
                <h4 className="font-medium text-sm text-slate-800">Administration</h4>
                <p className="text-xs text-slate-500 italic">Fields not yet configured in Airtable</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Estate Planning Task Tracker Preview Component - Matches EstatePlanningDetail.js
const EstatePlanningTaskTrackerPreview = ({ fields, onUpdateTask, savingTask, onStageChange, savingStage, isVisible, onCompleteAll, completingAll }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!isVisible) return null;

  const yesNoOptions = ['No', 'Yes'];
  
  const estatePlanningTasks = [
    { key: 'Questionnaire Completed?', label: 'Questionnaire Completed', options: yesNoOptions, completedValue: 'Yes' },
    { key: 'Planning Session 2', label: 'Planning Session', options: ['Done', 'Needed'], completedValue: 'Done' },
    { key: 'Drafting', label: 'Drafting', options: ['Done', 'In Progress', 'Needed'], completedValue: 'Done' },
    { key: 'Client Review', label: 'Client Review', options: ['Done', 'In Progress', 'Needed'], completedValue: 'Done' },
    { key: 'Notarization Session', label: 'Notarization Session', options: ['Done', 'Needed'], completedValue: 'Done' },
    { key: 'Physical Portfolio', label: 'Physical Portfolio', options: ['Done', 'In Progress', 'Needed'], completedValue: 'Done' },
    { key: 'Trust Funding', label: 'Trust Funding', options: ['Done', 'Needed', 'Not Applicable'], completedValue: 'Done' }
  ];

  const epStages = ['Questionnaire', 'Planning Session', 'Drafting', 'Review', 'Notary Session', 'Digital & Physical Portfolio', 'Trust Funding', 'Completed'];

  const calculateProgress = () => {
    const completed = estatePlanningTasks.filter(task => {
      const status = (fields[task.key] || '').toLowerCase();
      return status === 'done' || status === 'yes' || status === 'not applicable' || status === 'n/a';
    }).length;
    return Math.round((completed / estatePlanningTasks.length) * 100);
  };

  const completedCount = estatePlanningTasks.filter(task => {
    const status = (fields[task.key] || '').toLowerCase();
    return status === 'done' || status === 'yes' || status === 'not applicable' || status === 'n/a';
  }).length;

  const progress = calculateProgress();
  
  // Check if all tasks are already complete
  const allComplete = completedCount === estatePlanningTasks.length;
  
  // Get incomplete tasks for the complete all function
  const incompleteTasks = estatePlanningTasks.filter(task => {
    const status = (fields[task.key] || '').toLowerCase();
    return status !== 'done' && status !== 'yes' && status !== 'not applicable' && status !== 'n/a';
  });

  return (
    <div className="p-3 space-y-3">
      {/* Stage Selector */}
      <div className="bg-blue-50 rounded-lg p-3">
        <p className="text-xs font-medium text-slate-600 mb-2">Current Stage</p>
        <Select value={fields['Stage (EP)'] || ''} onValueChange={(value) => onStageChange('Stage (EP)', value)} disabled={savingStage}>
          <SelectTrigger className="h-8 bg-white text-sm" data-testid="stage-select">
            {savingStage ? <Loader2 className="w-4 h-4 animate-spin" /> : <SelectValue placeholder="Select stage..." />}
          </SelectTrigger>
          <SelectContent>
            {epStages.map((stage) => (
              <SelectItem key={stage} value={stage}>{stage}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task Tracker Card */}
      <div className="border rounded-lg overflow-hidden">
        <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition-all">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/50">
              <ClipboardList className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-left">
              <h4 className="font-medium text-sm text-slate-800">Estate Planning Tasks</h4>
              <p className="text-xs text-slate-600">{completedCount}/{estatePlanningTasks.length} completed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Complete All Button */}
            {!allComplete && onCompleteAll && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 bg-white hover:bg-green-50 text-green-700 border-green-300 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onCompleteAll(incompleteTasks);
                }}
                disabled={completingAll || allComplete}
              >
                {completingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    All
                  </>
                )}
              </Button>
            )}
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 rotate-[-90deg]">
                <circle cx="20" cy="20" r="16" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle cx="20" cy="20" r="16" fill="none" stroke="#2E7DA1" strokeWidth="3" strokeDasharray={`${progress * 1.005} 100.5`} strokeLinecap="round" className="transition-all duration-500" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-slate-700">{progress}%</span>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isOpen && (
          <div className="divide-y divide-slate-100">
            {estatePlanningTasks.map((task) => {
              const rawValue = fields[task.key] || '';
              // Use the raw value if it exists and is in the options, otherwise show placeholder
              const currentStatus = rawValue && task.options.includes(rawValue) ? rawValue : '';
              const isSaving = savingTask === task.key;

              const handleValueChange = (newValue) => {
                if (newValue === '__CLEAR__') {
                  onUpdateTask(task.key, '', task.label);
                } else {
                  onUpdateTask(task.key, newValue, task.label);
                }
              };

              return (
                <div key={task.key} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(rawValue)}
                    <span className="text-xs font-medium text-slate-700">{task.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isSaving && <Loader2 className="w-3 h-3 animate-spin text-[#2E7DA1]" />}
                    <Select value={currentStatus} onValueChange={handleValueChange} disabled={isSaving}>
                      <SelectTrigger className={`w-28 h-7 text-[10px] rounded-full border ${getTaskStatusColor(rawValue)}`}>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {rawValue && (
                          <SelectItem value="__CLEAR__" className="text-xs text-red-600 italic">— Clear —</SelectItem>
                        )}
                        {task.options.map((option) => (
                          <SelectItem key={option} value={option} className="text-xs">{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsPage;
