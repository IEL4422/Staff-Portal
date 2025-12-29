import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { masterListApi, dashboardApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  Search,
  Calendar,
  Clock,
  FileText,
  ArrowRight,
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalActiveCases, setTotalActiveCases] = useState(0);
  const [deadlines, setDeadlines] = useState([]);

  // Debounce timer ref
  const [debounceTimer, setDebounceTimer] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Live search with debounce
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

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

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const dashboardRes = await dashboardApi.getData();
      setTotalActiveCases(dashboardRes.data.total_active_cases || 0);
      setDeadlines(dashboardRes.data.deadlines || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
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
    const caseType = (record.fields?.['Case Type'] || '').toLowerCase();
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="dashboard-loading">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="dashboard">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
          Dashboard
        </h1>
        <p className="text-slate-500 mt-1">Welcome to the Illinois Estate Law Staff Portal</p>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm" data-testid="search-card">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by matter name, client name, email, or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-12 text-base"
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

          {/* Live Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 border rounded-xl overflow-hidden" data-testid="search-results">
              <div className="bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </div>
              <div className="divide-y max-h-80 overflow-y-auto">
                {searchResults.map((record) => (
                  <div
                    key={record.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    data-testid={`search-result-${record.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {record.fields?.Matter || record.fields?.Client || 'Unnamed'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-500 mt-0.5">
                        {record.fields?.Client && (
                          <span>{record.fields.Client}</span>
                        )}
                        {record.fields?.Email && (
                          <span>{record.fields.Email}</span>
                        )}
                        {record.fields?.['Phone Number'] && (
                          <span>{record.fields['Phone Number']}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <Badge className={getCaseTypeColor(record.fields?.['Case Type'])}>
                        {record.fields?.['Case Type'] || 'Unknown'}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => navigateToCase(record)}
                        className="rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
                        data-testid={`view-case-${record.id}`}
                      >
                        View Details
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <div className="mt-4 text-center py-6 text-slate-500">
              No results found for "{searchQuery}"
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Active Cases</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{totalActiveCases}</p>
                <p className="text-xs text-slate-400 mt-1">Excludes leads</p>
              </div>
              <div className="w-12 h-12 bg-[#2E7DA1]/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#2E7DA1]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Upcoming Deadlines</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{deadlines.length}</p>
                <p className="text-xs text-slate-400 mt-1">Next 30 days</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Deadlines Table */}
      <Card className="border-0 shadow-sm" data-testid="deadlines-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2" style={{ fontFamily: 'Manrope' }}>
            <Clock className="w-5 h-5 text-[#2E7DA1]" />
            Upcoming Deadlines (Next 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deadlines.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No upcoming deadlines</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deadlines.map((record) => {
                  const daysUntil = getDaysUntil(record.fields?.Date);
                  // Get client from linked record if available
                  const clientName = record.fields?.['Add Client'] 
                    ? (Array.isArray(record.fields['Add Client']) ? record.fields['Add Client'].join(', ') : record.fields['Add Client'])
                    : record.fields?.Client || '—';
                  
                  return (
                    <TableRow key={record.id} data-testid={`deadline-${record.id}`}>
                      <TableCell className="font-medium">
                        {record.fields?.Event || record.fields?.Name || record.fields?.Title || '—'}
                      </TableCell>
                      <TableCell>
                        {formatDate(record.fields?.Date)}
                      </TableCell>
                      <TableCell>
                        {clientName}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {record.fields?.Notes || '—'}
                      </TableCell>
                      <TableCell className="text-right">
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

export default Dashboard;
