import React, { useState, useEffect, useCallback } from 'react';
import { judgeApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { 
  Search, 
  Loader2, 
  Gavel, 
  Mail, 
  Video, 
  FileText, 
  ExternalLink,
  MapPin,
  Calendar,
  Building,
  Check,
  X,
  Users,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

const JudgeInformationPage = () => {
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJudge, setSelectedJudge] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchJudges = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchJudges();
  }, [fetchJudges]);

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
      (judge.calendar || '').toString().toLowerCase().includes(searchLower) ||
      (judge.email || '').toLowerCase().includes(searchLower)
    );
  });

  const handleJudgeClick = (judge) => {
    setSelectedJudge(judge);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedJudge(null);
  };

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
              placeholder="Search by name, county, courtroom, calendar, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* Judges Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">All Judges</h2>
          <span className="text-sm text-slate-500">{filteredJudges.length} results</span>
        </div>

        {filteredJudges.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-slate-500">
              {searchQuery ? 'No judges match your search' : 'No judge information found'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJudges.map((judge) => (
              <JudgeCard 
                key={judge.id} 
                judge={judge} 
                onClick={() => handleJudgeClick(judge)}
                getCountyColor={getCountyColor}
              />
            ))}
          </div>
        )}
      </div>

      {/* Judge Detail Modal */}
      <JudgeDetailModal 
        judge={selectedJudge}
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        getCountyColor={getCountyColor}
      />
    </div>
  );
};

// Judge Card Component - Two Row Layout
const JudgeCard = ({ judge, onClick, getCountyColor }) => {
  return (
    <Card 
      className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Row 1: Name, County, Courtroom, Calendar */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 group-hover:text-[#2E7DA1] transition-colors">
                {judge.name || 'Unnamed Judge'}
              </h3>
              <Info className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {judge.county && (
              <Badge className={`${getCountyColor(judge.county)} text-xs`}>
                <MapPin className="w-3 h-3 mr-1" />
                {judge.county}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 mb-4">
          {judge.courtroom && (
            <div className="flex items-center gap-1.5 text-sm text-slate-600">
              <Building className="w-4 h-4 text-slate-400" />
              <span>Courtroom {judge.courtroom}</span>
            </div>
          )}
          {judge.calendar && (
            <div className="flex items-center gap-1.5 text-sm text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Calendar {judge.calendar}</span>
            </div>
          )}
        </div>

        {/* Row 2: Email, Zoom Information */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          {judge.email ? (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <a 
                href={`mailto:${judge.email}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sm text-[#2E7DA1] hover:underline truncate"
              >
                {judge.email}
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Mail className="w-4 h-4" />
              <span>No email on file</span>
            </div>
          )}
          
          {judge.zoom_information ? (
            <div className="flex items-start gap-2">
              <Video className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-slate-600 line-clamp-2">{judge.zoom_information}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Video className="w-4 h-4" />
              <span>No Zoom information</span>
            </div>
          )}
        </div>

        {/* Quick indicators */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          {judge.standing_orders_url && (
            <Badge variant="outline" className="text-xs border-green-200 bg-green-50 text-green-700">
              <FileText className="w-3 h-3 mr-1" />
              Standing Orders
            </Badge>
          )}
          {judge.master_list_count > 0 && (
            <Badge variant="outline" className="text-xs border-slate-200 bg-slate-50 text-slate-600">
              <Users className="w-3 h-3 mr-1" />
              {judge.master_list_count} cases
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Judge Detail Modal Component
const JudgeDetailModal = ({ judge, isOpen, onClose, getCountyColor }) => {
  if (!judge) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-[#2E7DA1]" />
            {judge.name || 'Judge Details'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-2">
          {/* Basic Info Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-500">County</span>
                <div>
                  {judge.county ? (
                    <Badge className={getCountyColor(judge.county)}>{judge.county}</Badge>
                  ) : (
                    <span className="text-sm text-slate-400">Not specified</span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500">Courtroom</span>
                <p className="text-sm text-slate-700">{judge.courtroom || '—'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500">Calendar</span>
                <p className="text-sm text-slate-700">{judge.calendar || '—'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500">Area of Law</span>
                <p className="text-sm text-slate-700">{judge.area_of_law || '—'}</p>
              </div>
            </div>
          </div>

          {/* Contact Info Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Contact Information</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                {judge.email ? (
                  <a href={`mailto:${judge.email}`} className="text-sm text-[#2E7DA1] hover:underline">
                    {judge.email}
                  </a>
                ) : (
                  <span className="text-sm text-slate-400">No email on file</span>
                )}
              </div>
              <div className="flex items-start gap-2">
                <Video className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-600">
                  {judge.zoom_information || 'No Zoom information available'}
                </span>
              </div>
            </div>
          </div>

          {/* Standing Orders Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Standing Orders</h4>
            {judge.standing_orders_url ? (
              <a
                href={judge.standing_orders_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2E7DA1]/10 text-[#2E7DA1] rounded-lg hover:bg-[#2E7DA1]/20 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {judge.standing_orders_filename || 'View Standing Orders'}
                </span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <p className="text-sm text-slate-400">No standing orders on file</p>
            )}
          </div>

          {/* Additional Details Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Additional Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-500">Open/Close on Zoom?</span>
                <div className="flex items-center gap-1.5">
                  {judge.open_close_on_zoom ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-700">Yes</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-500">No</span>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500">Courtesy Copies Needed?</span>
                <div className="flex items-center gap-1.5">
                  {judge.courtesy_copies_needed ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-700">Yes</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-500">No</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Linked Cases */}
          {judge.master_list_count > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Linked Cases</h4>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">{judge.master_list_count} cases assigned to this judge</span>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="pt-2">
            <Button 
              onClick={onClose} 
              className="w-full bg-[#2E7DA1] hover:bg-[#256a8a] text-white rounded-full"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JudgeInformationPage;
