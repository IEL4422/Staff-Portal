import React, { useState, useEffect } from 'react';
import { judgeApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Search, Loader2, Gavel, Mail, Video, FileText, Users, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const JudgeInformationPage = () => {
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchJudges();
  }, []);

  const fetchJudges = async () => {
    setLoading(true);
    try {
      const response = await judgeApi.getAll();
      setJudges(response.data.judges || []);
    } catch (error) {
      console.error('Failed to fetch judges:', error);
      toast.error('Failed to load judge information');
    } finally {
      setLoading(false);
    }
  };

  const getCountyColor = (county) => {
    const c = (county || '').toLowerCase();
    if (c.includes('cook')) return 'bg-purple-100 text-purple-700';
    if (c.includes('dupage')) return 'bg-blue-100 text-blue-700';
    if (c.includes('will')) return 'bg-green-100 text-green-700';
    if (c.includes('kane')) return 'bg-orange-100 text-orange-700';
    if (c.includes('lake')) return 'bg-teal-100 text-teal-700';
    return 'bg-slate-100 text-slate-600';
  };

  const filteredJudges = judges.filter((judge) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (judge.name || '').toLowerCase().includes(searchLower) ||
      (judge.county || '').toLowerCase().includes(searchLower) ||
      (judge.courtroom || '').toLowerCase().includes(searchLower) ||
      (judge.calendar || '').toString().toLowerCase().includes(searchLower)
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
            Judge Information
          </h1>
          <p className="text-slate-500 mt-1">Contact information and standing orders for judges</p>
        </div>
        <Badge className="bg-[#2E7DA1]/10 text-[#2E7DA1] font-medium text-sm px-3 py-1">
          <Gavel className="w-4 h-4 mr-1" />
          {judges.length} Judges
        </Badge>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by name, county, courtroom, or calendar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* Judges Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">All Judges</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredJudges.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {searchQuery ? 'No judges match your search' : 'No judge information found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>County</TableHead>
                    <TableHead>Courtroom</TableHead>
                    <TableHead>Calendar</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Zoom Information</TableHead>
                    <TableHead>Standing Orders</TableHead>
                    <TableHead>Master List</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJudges.map((judge) => (
                    <TableRow key={judge.id}>
                      <TableCell>
                        <div className="font-medium text-slate-900">{judge.name || '—'}</div>
                        {judge.area_of_law && (
                          <div className="text-xs text-slate-500">{judge.area_of_law}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {judge.county ? (
                          <Badge className={getCountyColor(judge.county)}>
                            {judge.county}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-700">{judge.courtroom || '—'}</span>
                      </TableCell>
                      <TableCell>
                        {judge.calendar ? (
                          <Badge variant="outline" className="border-slate-300">
                            Cal {judge.calendar}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {judge.email ? (
                          <div className="flex items-start gap-1.5 max-w-xs">
                            <Mail className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-slate-600 break-all">{judge.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {judge.zoom_information ? (
                          <div className="flex items-start gap-1.5 max-w-xs">
                            <Video className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-slate-600 whitespace-pre-line">{judge.zoom_information}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {judge.standing_orders_url ? (
                          <a
                            href={judge.standing_orders_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-[#2E7DA1] hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="max-w-[120px] truncate">
                              {judge.standing_orders_filename || 'View PDF'}
                            </span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {judge.master_list_count > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm text-slate-600">{judge.master_list_count} cases</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JudgeInformationPage;
