import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  ArrowLeft,
  Search,
  FileText,
  Loader2,
  ArrowRight,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { CopyableEmail, CopyablePhone } from '../components/ui/copyable-text';

const ActiveCasesPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchActiveCases();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCases(cases);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = cases.filter((c) => {
        const fields = c.fields || {};
        return (
          (fields['Matter Name'] || '').toLowerCase().includes(query) ||
          (fields['Client'] || '').toLowerCase().includes(query) ||
          (fields['Email Address'] || '').toLowerCase().includes(query) ||
          (fields['Phone Number'] || '').toLowerCase().includes(query) ||
          (fields['Type of Case'] || '').toLowerCase().includes(query)
        );
      });
      setFilteredCases(filtered);
    }
  }, [searchQuery, cases]);

  const fetchActiveCases = async () => {
    setLoading(true);
    try {
      const response = await dashboardApi.getActiveCases();
      const records = response.data.records || [];
      setCases(records);
      setFilteredCases(records);
    } catch (error) {
      console.error('Failed to fetch active cases:', error);
      toast.error('Failed to load active cases');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="active-cases-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="p-2" data-testid="back-btn">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <FileText className="w-7 h-7 inline-block mr-3 text-[#2E7DA1]" />
            Active Cases
          </h1>
          <p className="text-slate-500 mt-1">{filteredCases.length} active cases (excludes leads)</p>
        </div>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Filter cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-11"
              data-testid="filter-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {filteredCases.length === 0 ? (
            <p className="text-slate-500 text-center py-12">No active cases found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matter Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((record) => (
                  <TableRow key={record.id} className="hover:bg-slate-50" data-testid={`case-row-${record.id}`}>
                    <TableCell className="font-medium">
                      {record.fields?.['Matter Name'] || '—'}
                    </TableCell>
                    <TableCell>
                      {record.fields?.Client || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getCaseTypeColor(record.fields?.['Type of Case'])}>
                        {record.fields?.['Type of Case'] || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      <CopyableEmail value={record.fields?.['Email Address']} showIcon={false} />
                    </TableCell>
                    <TableCell className="text-slate-600">
                      <CopyablePhone value={record.fields?.['Phone Number']} showIcon={false} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => navigateToCase(record)}
                        className="rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
                        data-testid={`view-case-${record.id}`}
                      >
                        View
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActiveCasesPage;
