import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { masterListApi, dashboardApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Search,
  Calendar,
  Clock,
  Users,
  FileText,
  TrendingUp,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [stats, setStats] = useState({
    totalCases: 0,
    activeProbate: 0,
    activeEstatePlanning: 0,
    pendingLeads: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch master list for stats
      const masterListRes = await masterListApi.getAll({ max_records: 500 });
      const records = masterListRes.data.records || [];

      // Calculate stats
      const now = new Date();
      const sevenDaysAgo = addDays(now, -7);
      const thirtyDaysLater = addDays(now, 30);

      let activeProbate = 0;
      let activeEstatePlanning = 0;
      let pendingLeads = 0;
      const upcomingConsults = [];
      const recentConsults = [];

      records.forEach((record) => {
        const fields = record.fields || {};
        const caseType = fields['Case Type'] || '';
        const consultDate = fields['Date of Consult'];

        if (caseType.toLowerCase().includes('probate')) activeProbate++;
        if (caseType.toLowerCase().includes('estate planning')) activeEstatePlanning++;
        if (caseType.toLowerCase() === 'lead') pendingLeads++;

        if (consultDate) {
          try {
            const date = parseISO(consultDate);
            if (isAfter(date, sevenDaysAgo) && isBefore(date, thirtyDaysLater)) {
              if (isAfter(date, now)) {
                upcomingConsults.push({ ...record, consultDate: date });
              } else {
                recentConsults.push({ ...record, consultDate: date });
              }
            }
          } catch (e) {
            // Invalid date format
          }
        }
      });

      setStats({
        totalCases: records.length,
        activeProbate,
        activeEstatePlanning,
        pendingLeads
      });

      // Sort consultations by date
      const allConsults = [...upcomingConsults, ...recentConsults]
        .sort((a, b) => a.consultDate - b.consultDate)
        .slice(0, 10);
      setConsultations(allConsults);

      // Fetch deadlines
      try {
        const dashboardRes = await dashboardApi.getData();
        setDeadlines(dashboardRes.data.deadlines || []);
      } catch (e) {
        console.log('Dashboard data fetch failed, using empty deadlines');
        setDeadlines([]);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await masterListApi.search(searchQuery, 'Master List');
      const results = response.data.results?.['Master List'] || [];
      setSearchResults(results);
      if (results.length === 0) {
        toast.info('No results found');
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
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
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search clients, cases, emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 h-12 text-base"
                data-testid="search-input"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={searching}
              className="h-12 px-6 rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
              data-testid="search-btn"
            >
              {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 border rounded-xl overflow-hidden" data-testid="search-results">
              <div className="bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </div>
              <div className="divide-y max-h-80 overflow-y-auto">
                {searchResults.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => navigateToCase(record)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                    data-testid={`search-result-${record.id}`}
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {record.fields?.Matter || record.fields?.Client || 'Unnamed'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {record.fields?.Email || record.fields?.['Phone Number'] || 'No contact info'}
                      </p>
                    </div>
                    <Badge className={getCaseTypeColor(record.fields?.['Case Type'])}>
                      {record.fields?.['Case Type'] || 'Unknown'}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="stats-grid">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Cases</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalCases}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Probate</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.activeProbate}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Estate Planning</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.activeEstatePlanning}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Leads</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pendingLeads}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consultations */}
        <Card className="border-0 shadow-sm" data-testid="consultations-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg" style={{ fontFamily: 'Manrope' }}>
                <Calendar className="w-5 h-5 inline-block mr-2 text-[#2E7DA1]" />
                Recent & Upcoming Consultations
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {consultations.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No consultations scheduled</p>
            ) : (
              <div className="space-y-3">
                {consultations.map((record) => {
                  const isUpcoming = isAfter(record.consultDate, new Date());
                  return (
                    <button
                      key={record.id}
                      onClick={() => navigateToCase(record)}
                      className="w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left flex items-center justify-between group"
                      data-testid={`consultation-${record.id}`}
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {record.fields?.Matter || record.fields?.Client || 'Unnamed'}
                        </p>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {format(record.consultDate, 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={isUpcoming ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
                          {isUpcoming ? 'Upcoming' : 'Past'}
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#2E7DA1] transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deadlines */}
        <Card className="border-0 shadow-sm" data-testid="deadlines-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg" style={{ fontFamily: 'Manrope' }}>
                <Clock className="w-5 h-5 inline-block mr-2 text-[#2E7DA1]" />
                Upcoming Deadlines (30 Days)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {deadlines.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No upcoming deadlines</p>
            ) : (
              <div className="space-y-3">
                {deadlines.slice(0, 8).map((record) => {
                  const dateStr = record.fields?.Date;
                  let dateDisplay = 'No date';
                  let daysUntil = null;

                  if (dateStr) {
                    try {
                      const date = parseISO(dateStr);
                      dateDisplay = format(date, 'MMM d, yyyy');
                      const diffTime = date.getTime() - new Date().getTime();
                      daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    } catch (e) {
                      dateDisplay = dateStr;
                    }
                  }

                  return (
                    <div
                      key={record.id}
                      className="p-4 bg-slate-50 rounded-xl flex items-center justify-between"
                      data-testid={`deadline-${record.id}`}
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {record.fields?.Title || record.fields?.Name || 'Unnamed'}
                        </p>
                        <p className="text-sm text-slate-500 mt-0.5">{dateDisplay}</p>
                      </div>
                      {daysUntil !== null && (
                        <Badge
                          className={
                            daysUntil <= 7
                              ? 'bg-red-100 text-red-700'
                              : daysUntil <= 14
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }
                        >
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
