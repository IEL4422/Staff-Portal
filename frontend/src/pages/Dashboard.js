import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { masterListApi, dashboardApi, tasksApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  Search,
  Calendar,
  Clock,
  FileText,
  ArrowRight,
  Loader2,
  X,
  Phone,
  Mail,
  Eye,
  RefreshCw,
  Users,
  CheckCircle,
  Copy,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Circle,
  Edit2,
  Trash2,
  Upload,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isAfter } from 'date-fns';
import { CopyableEmail, CopyablePhone } from '../components/ui/copyable-text';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [totalActiveCases, setTotalActiveCases] = useState(0);
  const [consultations, setConsultations] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedDeadline, setSelectedDeadline] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskData, setEditingTaskData] = useState({});
  const [searchFilter, setSearchFilter] = useState('all'); // Quick filter state

  const [debounceTimer, setDebounceTimer] = useState(null);

  // Filter types for quick filtering
  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'probate', label: 'Probate' },
    { value: 'estate', label: 'Estate Planning' },
    { value: 'lead', label: 'Lead' },
    { value: 'deed', label: 'Deed' },
  ];

  // Filter search results based on selected filter
  const filteredResults = searchResults.filter((record) => {
    if (searchFilter === 'all') return true;
    const caseType = (record.fields?.['Type of Case'] || '').toLowerCase();
    if (searchFilter === 'probate') return caseType.includes('probate');
    if (searchFilter === 'estate') return caseType.includes('estate planning');
    if (searchFilter === 'lead') return caseType === 'lead';
    if (searchFilter === 'deed') return caseType.includes('deed');
    return true;
  });

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps

    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    if (searchQuery.trim().length < 2) {
      return;
    }

    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    setDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchQuery]);

  const fetchDashboardData = async (retryCount = 0) => {
    setLoading(true);
    setError(false);
    console.log('Fetching dashboard data, attempt:', retryCount + 1);
    
    try {
      // Fetch dashboard data - handle each request separately for better resilience
      let dashboardData = null;
      let tasksData = null;
      
      try {
        console.log('Calling dashboardApi.getData()...');
        const dashboardRes = await dashboardApi.getData();
        console.log('Dashboard response:', dashboardRes.data);
        dashboardData = dashboardRes.data;
      } catch (dashErr) {
        console.error('Failed to fetch dashboard data:', dashErr.message, dashErr.response?.status);
      }
      
      try {
        console.log('Calling dashboardApi.getUpcomingTasks()...');
        const tasksRes = await dashboardApi.getUpcomingTasks();
        console.log('Tasks response:', tasksRes.data);
        tasksData = tasksRes.data;
      } catch (taskErr) {
        console.error('Failed to fetch tasks:', taskErr.message, taskErr.response?.status);
      }
      
      // Set data even if partially loaded
      if (dashboardData) {
        setTotalActiveCases(dashboardData.total_active_cases || 0);
        setConsultations(dashboardData.consultations || []);
        setDeadlines(dashboardData.deadlines || []);
        console.log('Dashboard data set successfully');
      }
      
      if (tasksData) {
        setTasks(tasksData.tasks || []);
        console.log('Tasks data set successfully');
      }
      
      // Retry once if both failed and haven't retried yet
      if (!dashboardData && !tasksData && retryCount < 2) {
        console.log('Both requests failed, retrying in 2 seconds...');
        setTimeout(() => fetchDashboardData(retryCount + 1), 2000);
        return;
      }
      
      // Show error state if both failed after retries
      if (!dashboardData && !tasksData) {
        console.error('All dashboard fetch attempts failed');
        setError(true);
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      if (retryCount < 2) {
        setTimeout(() => fetchDashboardData(retryCount + 1), 2000);
        return;
      }
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async (query) => {
    if (!query.trim()) return;

    setSearching(true);
    try {
      const response = await masterListApi.search(query);
      const results = response.data.records || [];
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchFilter('all'); // Reset filter when clearing search
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard!`);
    } catch (err) {
      // Fallback for non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success(`${type} copied to clipboard!`);
      } catch (e) {
        toast.error(`Failed to copy ${type}`);
      }
      document.body.removeChild(textArea);
    }
  };

  const getCaseTypeColor = (caseType) => {
    const type = (caseType || '').toLowerCase();
    if (type.includes('probate')) return 'bg-purple-100 text-purple-700';
    if (type.includes('estate planning')) return 'bg-blue-100 text-blue-700';
    if (type.includes('deed')) return 'bg-green-100 text-green-700';
    if (type === 'lead') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-700';
  };

  const navigateToCase = (record) => {
    const caseType = (record.fields?.['Type of Case'] || '').toLowerCase();
    if (caseType.includes('probate')) {
      navigate(`/case/probate/${record.id}`);
    } else if (caseType.includes('estate planning')) {
      navigate(`/case/estate-planning/${record.id}`);
    } else if (caseType.includes('deed')) {
      navigate(`/case/deed/${record.id}`);
    } else if (caseType === 'lead') {
      navigate(`/case/lead/${record.id}`);
    } else {
      navigate(`/case/probate/${record.id}`);
    }
  };

  // Navigate to case by matter ID and type
  const navigateToCaseById = (matterId, caseType) => {
    if (!matterId) return;
    const type = (caseType || '').toLowerCase();
    if (type.includes('probate')) {
      navigate(`/case/probate/${matterId}`);
    } else if (type.includes('estate planning')) {
      navigate(`/case/estate-planning/${matterId}`);
    } else if (type.includes('deed')) {
      navigate(`/case/deed/${matterId}`);
    } else if (type === 'lead') {
      navigate(`/case/lead/${matterId}`);
    } else {
      // Default to probate for unknown types
      navigate(`/case/probate/${matterId}`);
    }
  };

  // Task handlers
  const handleMarkTaskComplete = async (taskId) => {
    try {
      await tasksApi.update(taskId, { Status: 'Done' });
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, fields: { ...t.fields, Status: 'Done' } } : t
      ));
      toast.success('Task marked as complete!');
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to mark task as complete');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await tasksApi.delete(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setExpandedTaskId(null);
      toast.success('Task deleted successfully!');
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditingTaskData({
      Task: task.fields?.Task || '',
      Notes: task.fields?.Notes || '',
      Status: task.fields?.Status || 'Not Started',
      Priority: task.fields?.Priority || 'Normal'
    });
  };

  const handleSaveTask = async () => {
    try {
      await tasksApi.update(editingTaskId, editingTaskData);
      setTasks(prev => prev.map(t => 
        t.id === editingTaskId ? { ...t, fields: { ...t.fields, ...editingTaskData } } : t
      ));
      setEditingTaskId(null);
      toast.success('Task updated successfully!');
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    }
  };

  const toggleTaskExpand = (taskId) => {
    setExpandedTaskId(prev => prev === taskId ? null : taskId);
    setEditingTaskId(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  const getDaysUntil = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = parseISO(dateStr);
      const diffTime = date.getTime() - new Date().getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  const isUpcoming = (dateStr) => {
    if (!dateStr) return false;
    try {
      return isAfter(parseISO(dateStr), new Date());
    } catch {
      return false;
    }
  };

  // Check if date is within last 30 days
  const isWithinLast30Days = (dateStr) => {
    if (!dateStr) return false;
    try {
      const date = parseISO(dateStr);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return isAfter(date, thirtyDaysAgo) && !isAfter(date, now);
    } catch {
      return false;
    }
  };

  // Upcoming consultations sorted by date ascending (soonest first)
  const upcomingConsultations = consultations
    .filter(c => isUpcoming(c.fields?.['Date of Consult']))
    .sort((a, b) => {
      const dateA = a.fields?.['Date of Consult'] || '';
      const dateB = b.fields?.['Date of Consult'] || '';
      return dateA.localeCompare(dateB); // Ascending for upcoming
    });

  // Past consultations within last 30 days, sorted by date descending (most recent first)
  const pastConsultations = consultations
    .filter(c => isWithinLast30Days(c.fields?.['Date of Consult']))
    .sort((a, b) => {
      const dateA = a.fields?.['Date of Consult'] || '';
      const dateB = b.fields?.['Date of Consult'] || '';
      return dateB.localeCompare(dateA); // Descending for past (most recent first)
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="dashboard-loading">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" data-testid="dashboard-error">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Unable to load dashboard data</h2>
          <p className="text-slate-500 mb-4">There was a problem connecting to the server. Please try again.</p>
          <Button
            onClick={() => fetchDashboardData(0)}
            className="bg-[#2E7DA1] hover:bg-[#246585]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 animate-fade-in pt-14 sm:pt-4" data-testid="dashboard">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
          Dashboard
        </h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">Welcome to the Illinois Estate Law Staff Portal</p>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm" data-testid="search-card">
        <CardContent className="p-4 sm:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by matter name, client, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-12 text-base rounded-xl"
              data-testid="search-input"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
                data-testid="clear-search"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
            {searching && (
              <div className="absolute right-12 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-[#2E7DA1]" />
              </div>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 border rounded-xl overflow-hidden" data-testid="search-results">
              {/* Quick Filters - Scrollable on mobile */}
              <div className="bg-slate-50 px-3 sm:px-4 py-2 sm:py-3 border-b flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0 -mb-1 sm:mb-0" data-testid="quick-filters">
                  {filterOptions.map((option) => {
                    const count = option.value === 'all' 
                      ? searchResults.length 
                      : searchResults.filter(r => {
                          const ct = (r.fields?.['Type of Case'] || '').toLowerCase();
                          if (option.value === 'probate') return ct.includes('probate');
                          if (option.value === 'estate') return ct.includes('estate planning');
                          if (option.value === 'lead') return ct === 'lead';
                          if (option.value === 'deed') return ct.includes('deed');
                          return false;
                        }).length;
                    
                    if (option.value !== 'all' && count === 0) return null;
                    
                    return (
                      <button
                        key={option.value}
                        onClick={() => setSearchFilter(option.value)}
                        data-testid={`filter-${option.value}`}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap flex-shrink-0 ${
                          searchFilter === option.value
                            ? 'bg-[#2E7DA1] text-white shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {option.label} ({count})
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs sm:text-sm text-slate-500 whitespace-nowrap hidden sm:block">
                  {filteredResults.length} of {searchResults.length} shown
                </span>
              </div>
              <div className="divide-y max-h-80 overflow-y-auto">
                {filteredResults.map((record) => {
                  const fields = record.fields || {};
                  const caseType = (fields['Type of Case'] || '').toLowerCase();
                  const isProbate = caseType.includes('probate');
                  
                  return (
                    <div
                      key={record.id}
                      className="px-3 sm:px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => navigateToCase(record)}
                      data-testid={`search-result-${record.id}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {fields['Matter Name'] || fields.Client || 'Unnamed'}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-slate-500 mt-0.5">
                            {isProbate && fields['Case Number'] && (
                              <span className="font-medium text-purple-600">Case #: {fields['Case Number']}</span>
                            )}
                            {fields['Email Address'] && (
                              <CopyableEmail value={fields['Email Address']} className="text-xs sm:text-sm" showIcon={false} />
                            )}
                            {fields['Phone Number'] && (
                              <CopyablePhone value={fields['Phone Number']} className="text-xs sm:text-sm" showIcon={false} />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0">
                          <Badge className={`${getCaseTypeColor(fields['Type of Case'])} text-xs`}>
                            {fields['Type of Case'] || 'Unknown'}
                          </Badge>
                          <Button
                            size="sm"
                            className="rounded-full bg-[#2E7DA1] hover:bg-[#246585] text-xs sm:text-sm hidden sm:flex"
                            data-testid={`view-case-${record.id}`}
                          >
                            View
                            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                          </Button>
                          <ArrowRight className="w-4 h-4 text-slate-400 sm:hidden" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredResults.length === 0 && searchResults.length > 0 && (
                  <div className="px-4 py-6 text-center text-slate-500">
                    No {filterOptions.find(o => o.value === searchFilter)?.label} results found. 
                    <button 
                      onClick={() => setSearchFilter('all')} 
                      className="ml-1 text-[#2E7DA1] hover:underline"
                    >
                      Show all results
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <div className="mt-4 text-center py-6 text-slate-500">
              No results found for &quot;{searchQuery}&quot;
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats - Side-scrollable on mobile */}
      <div className="flex sm:grid sm:grid-cols-2 gap-4 sm:gap-6 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        <Card 
          className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex-shrink-0 w-[280px] sm:w-auto"
          onClick={() => navigate('/clients')}
          data-testid="total-active-cases-card"
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500">Total Active Cases</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{totalActiveCases}</p>
                <p className="text-xs text-slate-400 mt-1">Tap to view all →</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#2E7DA1]/10 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#2E7DA1]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow flex-shrink-0 w-[280px] sm:w-auto">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500">Upcoming Events</p>
                <p className="text-2xl sm:text-3xl font-bold text-amber-600 mt-1">{deadlines.length}</p>
                <p className="text-xs text-slate-400 mt-1">Next 30 days</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consultations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Upcoming Consultations */}
        <Card className="border-0 shadow-sm" data-testid="upcoming-consultations-card">
          <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              Upcoming Consultations ({upcomingConsultations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {upcomingConsultations.length === 0 ? (
              <p className="text-slate-500 text-center py-6 text-sm">No upcoming consultations</p>
            ) : (
              <div className="space-y-3">
                {upcomingConsultations.slice(0, 5).map((record) => (
                  <div
                    key={record.id}
                    className="p-3 sm:p-4 bg-green-50 rounded-xl border border-green-100"
                    data-testid={`upcoming-consult-${record.id}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex-1">
                        <button
                          onClick={() => navigateToCase(record)}
                          className="font-medium text-slate-900 hover:text-[#2E7DA1] transition-colors text-left text-sm sm:text-base"
                        >
                          {record.fields?.['Matter Name'] || record.fields?.Client || 'Unnamed'}
                        </button>
                        <p className="text-xs sm:text-sm text-green-700 mt-1">
                          <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline mr-1" />
                          {formatDateTime(record.fields?.['Date of Consult'])}
                        </p>
                        <div className="flex flex-col gap-1 mt-2 text-xs sm:text-sm text-slate-600">
                          {record.fields?.['Phone Number'] && (
                            <button
                              onClick={() => copyToClipboard(record.fields['Phone Number'], 'Phone number')}
                              className="flex items-center gap-1 hover:text-[#2E7DA1] transition-colors text-left group"
                              title="Click to copy"
                            >
                              <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              {record.fields['Phone Number']}
                              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                          {record.fields?.['Email Address'] && (
                            <button
                              onClick={() => copyToClipboard(record.fields['Email Address'], 'Email')}
                              className="flex items-center gap-1 hover:text-[#2E7DA1] transition-colors text-left group truncate"
                              title="Click to copy"
                            >
                              <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                              <span className="truncate">{record.fields['Email Address']}</span>
                              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </button>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-700 text-xs self-start">Upcoming</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past Consultations */}
        <Card className="border-0 shadow-sm" data-testid="past-consultations-card">
          <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
              <span>Past Consultations ({pastConsultations.length})</span>
              <span className="text-xs sm:text-sm font-normal text-slate-400 ml-1">Last 30 days</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {pastConsultations.length === 0 ? (
              <p className="text-slate-500 text-center py-6 text-sm">No past consultations in last 30 days</p>
            ) : (
              <div className="space-y-3">
                {pastConsultations.slice(0, 5).map((record) => (
                  <div
                    key={record.id}
                    className="p-3 sm:p-4 bg-slate-50 rounded-xl"
                    data-testid={`past-consult-${record.id}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex-1">
                        <button
                          onClick={() => navigateToCase(record)}
                          className="font-medium text-slate-900 hover:text-[#2E7DA1] transition-colors text-left text-sm sm:text-base"
                        >
                          {record.fields?.['Matter Name'] || record.fields?.Client || 'Unnamed'}
                        </button>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                          <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline mr-1" />
                          {formatDateTime(record.fields?.['Date of Consult'])}
                        </p>
                        <div className="flex flex-col gap-1 mt-2 text-xs sm:text-sm text-slate-600">
                          {record.fields?.['Phone Number'] && (
                            <button
                              onClick={() => copyToClipboard(record.fields['Phone Number'], 'Phone number')}
                              className="flex items-center gap-1 hover:text-[#2E7DA1] transition-colors text-left group"
                              title="Click to copy"
                            >
                              <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              {record.fields['Phone Number']}
                              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                          {record.fields?.['Email Address'] && (
                            <button
                              onClick={() => copyToClipboard(record.fields['Email Address'], 'Email')}
                              className="flex items-center gap-1 hover:text-[#2E7DA1] transition-colors text-left group truncate"
                              title="Click to copy"
                            >
                              <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                              <span className="truncate">{record.fields['Email Address']}</span>
                              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </button>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-slate-200 text-slate-600 text-xs self-start">Past</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks Section */}
      <Card className="border-0 shadow-sm" data-testid="tasks-card">
        <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
            <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[#2E7DA1]" />
            My Tasks ({tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {tasks.length === 0 ? (
            <p className="text-slate-500 text-center py-8 text-sm">No pending tasks assigned to you</p>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 10).map((task) => {
                const dueDate = task.fields?.['Due Date'];
                const daysUntil = getDaysUntil(dueDate);
                const matterId = task.fields?.['_matter_id'];
                const matterName = task.fields?.['_resolved_matter_names']?.[0] || '—';
                const matterType = task.fields?.['_resolved_matter_types']?.[0] || '';
                const priority = task.fields?.Priority || 'Normal';
                const status = task.fields?.Status || 'Not Started';
                const isExpanded = expandedTaskId === task.id;
                const isEditing = editingTaskId === task.id;
                const isComplete = status?.toLowerCase() === 'done';

                const getPriorityColor = (p) => {
                  switch (p?.toLowerCase()) {
                    case 'urgent': return 'bg-red-100 text-red-700';
                    case 'high': 
                    case 'high priority': return 'bg-orange-100 text-orange-700';
                    case 'normal': return 'bg-blue-100 text-blue-700';
                    case 'low': return 'bg-slate-100 text-slate-600';
                    default: return 'bg-slate-100 text-slate-600';
                  }
                };

                const getStatusColor = (s) => {
                  switch (s?.toLowerCase()) {
                    case 'done': return 'bg-green-100 text-green-700';
                    case 'in progress': return 'bg-blue-100 text-blue-700';
                    case 'waiting': 
                    case 'need information from client': return 'bg-amber-100 text-amber-700';
                    default: return 'bg-slate-100 text-slate-600';
                  }
                };

                return (
                  <div key={task.id} className="border rounded-lg overflow-hidden" data-testid={`task-${task.id}`}>
                    {/* Task Row - Mobile optimized */}
                    <div 
                      className={`flex items-start sm:items-center gap-2 sm:gap-3 p-3 hover:bg-slate-50 active:bg-slate-100 cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`}
                      onClick={() => toggleTaskExpand(task.id)}
                    >
                      {/* Complete Circle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isComplete) handleMarkTaskComplete(task.id);
                        }}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 sm:mt-0 ${
                          isComplete 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : 'border-slate-300 hover:border-[#2E7DA1] hover:bg-[#2E7DA1]/10'
                        }`}
                        title={isComplete ? 'Completed' : 'Mark as complete'}
                      >
                        {isComplete && <Check className="w-4 h-4" />}
                      </button>

                      {/* Task Info */}
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm sm:text-base truncate ${isComplete ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {task.fields?.Task || task.fields?.Name || '—'}
                        </div>
                        {matterId ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToCaseById(matterId, matterType);
                            }}
                            className="text-xs sm:text-sm text-[#2E7DA1] hover:text-[#246585] hover:underline truncate text-left block"
                          >
                            {matterName}
                          </button>
                        ) : (
                          <div className="text-xs sm:text-sm text-slate-500 truncate">{matterName}</div>
                        )}
                        {/* Mobile: Show badges below text */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 sm:hidden">
                          {dueDate && (
                            <span className="text-xs text-slate-500">{formatDate(dueDate)}</span>
                          )}
                          {daysUntil !== null && daysUntil <= 3 && daysUntil >= 0 && (
                            <Badge className={`text-[10px] px-1.5 py-0 ${daysUntil === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                            </Badge>
                          )}
                          {daysUntil !== null && daysUntil < 0 && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700">Overdue</Badge>
                          )}
                          <Badge className={`text-[10px] px-1.5 py-0 ${getPriorityColor(priority)}`}>{priority}</Badge>
                          <Badge className={`text-[10px] px-1.5 py-0 ${getStatusColor(status)}`}>{status}</Badge>
                        </div>
                      </div>

                      {/* Desktop: Due Date */}
                      <div className="hidden sm:flex text-sm text-slate-500 items-center gap-2">
                        {dueDate && (
                          <>
                            <span>{formatDate(dueDate)}</span>
                            {daysUntil !== null && daysUntil <= 3 && daysUntil >= 0 && (
                              <Badge className={daysUntil === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                                {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                              </Badge>
                            )}
                            {daysUntil !== null && daysUntil < 0 && (
                              <Badge className="bg-red-100 text-red-700">Overdue</Badge>
                            )}
                          </>
                        )}
                      </div>

                      {/* Desktop: Priority & Status */}
                      <Badge className={`hidden sm:inline-flex ${getPriorityColor(priority)}`}>{priority}</Badge>
                      <Badge className={`hidden sm:inline-flex ${getStatusColor(status)}`}>{status}</Badge>

                      {/* Expand Icon */}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t bg-slate-50 p-3 sm:p-4">
                        {isEditing ? (
                          /* Edit Mode */
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm">Task Name</Label>
                              <Input
                                value={editingTaskData.Task}
                                onChange={(e) => setEditingTaskData(prev => ({ ...prev, Task: e.target.value }))}
                                className="mt-1 h-11 text-base"
                              />
                            </div>
                            <div>
                              <Label className="text-sm">Notes</Label>
                              <Textarea
                                value={editingTaskData.Notes}
                                onChange={(e) => setEditingTaskData(prev => ({ ...prev, Notes: e.target.value }))}
                                className="mt-1 text-base"
                                rows={3}
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm">Status</Label>
                                <select
                                  value={editingTaskData.Status}
                                  onChange={(e) => setEditingTaskData(prev => ({ ...prev, Status: e.target.value }))}
                                  className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-base"
                                >
                                  <option value="Not Started">Not Started</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Need Information from Client">Need Information from Client</option>
                                  <option value="Done">Done</option>
                                </select>
                              </div>
                              <div>
                                <Label className="text-sm">Priority</Label>
                                <select
                                  value={editingTaskData.Priority}
                                  onChange={(e) => setEditingTaskData(prev => ({ ...prev, Priority: e.target.value }))}
                                  className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-base"
                                >
                                  <option value="Normal">Normal</option>
                                  <option value="High Priority">High Priority</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                              <Button variant="outline" onClick={() => setEditingTaskId(null)} className="w-full sm:w-auto order-2 sm:order-1">Cancel</Button>
                              <Button onClick={handleSaveTask} className="bg-[#2E7DA1] w-full sm:w-auto order-1 sm:order-2">Save Changes</Button>
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div className="space-y-4">
                            {/* Notes */}
                            <div>
                              <h4 className="text-xs sm:text-sm font-medium text-slate-700 mb-1">Notes</h4>
                              <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-wrap">
                                {task.fields?.Notes || 'No notes added'}
                              </p>
                            </div>

                            {/* Attachments */}
                            <div>
                              <h4 className="text-xs sm:text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                                Attachments
                              </h4>
                              {task.fields?.Attachments && task.fields.Attachments.length > 0 ? (
                                <div className="space-y-1">
                                  {task.fields.Attachments.map((file, idx) => (
                                    <a
                                      key={idx}
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs sm:text-sm text-[#2E7DA1] hover:underline flex items-center gap-1"
                                    >
                                      <FileText className="w-3 h-3" />
                                      {file.filename}
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs sm:text-sm text-slate-400">No attachments</p>
                              )}
                            </div>

                            {/* Matter Link */}
                            {matterId && (
                              <div>
                                <h4 className="text-xs sm:text-sm font-medium text-slate-700 mb-1">Linked Matter</h4>
                                <button
                                  onClick={() => navigate(`/case/probate/${matterId}`)}
                                  className="text-xs sm:text-sm text-[#2E7DA1] hover:underline"
                                >
                                  {matterName} →
                                </button>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTask(task)}
                                className="flex items-center justify-center gap-1 w-full sm:w-auto"
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteTask(task.id)}
                                className="flex items-center justify-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Deadlines - Card view on mobile, Table on desktop */}
      <Card className="border-0 shadow-sm" data-testid="deadlines-card">
        <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#2E7DA1]" />
            Upcoming Events (Next 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {deadlines.length === 0 ? (
            <p className="text-slate-500 text-center py-8 text-sm">No upcoming events</p>
          ) : (
            <>
              {/* Mobile: Card View */}
              <div className="sm:hidden space-y-3">
                {deadlines.map((record) => {
                  const daysUntil = getDaysUntil(record.fields?.Date);
                  const resolvedNames = record.fields?.['_resolved_client_names'];
                  const resolvedTypes = record.fields?.['_resolved_client_types'];
                  const clientIds = record.fields?.['_client_ids'];
                  const clientDisplay = resolvedNames && resolvedNames.length > 0 
                    ? resolvedNames.join(', ') 
                    : '—';
                  const firstClientId = clientIds?.[0];
                  const firstClientType = resolvedTypes?.[0] || '';
                  
                  return (
                    <div 
                      key={record.id} 
                      className="p-3 bg-white rounded-xl border shadow-sm active:bg-slate-50"
                      onClick={() => setSelectedDeadline(record)}
                      data-testid={`deadline-${record.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm">
                            {record.fields?.Event || record.fields?.Name || record.fields?.Title || '—'}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{formatDate(record.fields?.Date)}</p>
                          {firstClientId ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToCaseById(firstClientId, firstClientType);
                              }}
                              className="text-xs text-[#2E7DA1] hover:underline mt-1 block truncate text-left"
                            >
                              {clientDisplay}
                            </button>
                          ) : (
                            <p className="text-xs text-slate-400 mt-1">{clientDisplay}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {daysUntil !== null && (
                            <Badge
                              className={`text-[10px] px-1.5 py-0 ${
                                daysUntil <= 3
                                  ? 'bg-red-100 text-red-700'
                                  : daysUntil <= 7
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                            </Badge>
                          )}
                          <Eye className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: Table View */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Linked Case</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deadlines.map((record) => {
                      const daysUntil = getDaysUntil(record.fields?.Date);
                      const resolvedNames = record.fields?.['_resolved_client_names'];
                      const resolvedTypes = record.fields?.['_resolved_client_types'];
                      const clientIds = record.fields?.['_client_ids'];
                      const clientDisplay = resolvedNames && resolvedNames.length > 0 
                        ? resolvedNames.join(', ') 
                        : '—';
                      const firstClientId = clientIds?.[0];
                      const firstClientType = resolvedTypes?.[0] || '';
                      
                      return (
                        <TableRow key={record.id} data-testid={`deadline-${record.id}`}>
                          <TableCell className="font-medium">
                            {record.fields?.Event || record.fields?.Name || record.fields?.Title || '—'}
                          </TableCell>
                          <TableCell>{formatDate(record.fields?.Date)}</TableCell>
                          <TableCell>
                            {firstClientId ? (
                              <button
                                onClick={() => navigateToCaseById(firstClientId, firstClientType)}
                                className="text-[#2E7DA1] hover:text-[#246585] hover:underline text-left"
                              >
                                {clientDisplay}
                              </button>
                            ) : (
                              clientDisplay
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {daysUntil !== null && (
                              <Badge
                                className={
                                  daysUntil <= 3
                                    ? 'bg-red-100 text-red-700'
                                    : daysUntil <= 7
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-green-100 text-green-700'
                                }
                              >
                                {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedDeadline(record)}
                              className="rounded-full"
                              data-testid={`view-deadline-${record.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View More
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Deadline Details Modal */}
      <Dialog open={!!selectedDeadline} onOpenChange={() => setSelectedDeadline(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope' }}>Deadline Details</DialogTitle>
          </DialogHeader>
          {selectedDeadline && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Event</p>
                  <p className="font-medium text-slate-900">
                    {selectedDeadline.fields?.Event || selectedDeadline.fields?.Name || selectedDeadline.fields?.Title || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedDeadline.fields?.Date)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500">Linked Case</p>
                <p className="font-medium text-slate-900">
                  {selectedDeadline.fields?.['_resolved_client_names']?.join(', ') || '—'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    All Day Event
                  </p>
                  <p className="font-medium text-slate-900">
                    {selectedDeadline.fields?.['All Day Event'] ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Invitees
                  </p>
                  <p className="font-medium text-slate-900">
                    {selectedDeadline.fields?.Invitees 
                      ? (Array.isArray(selectedDeadline.fields.Invitees) 
                          ? selectedDeadline.fields.Invitees.join(', ') 
                          : selectedDeadline.fields.Invitees)
                      : '—'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500">Notes</p>
                <p className="font-medium text-slate-900 whitespace-pre-wrap">
                  {selectedDeadline.fields?.Notes || '—'}
                </p>
              </div>
              <div className="pt-4 border-t">
                <Button
                  onClick={() => setSelectedDeadline(null)}
                  className="w-full rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
