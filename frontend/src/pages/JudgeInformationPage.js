import React, { useState, useEffect, useCallback } from 'react';
import { judgeApi, masterListApi } from '../services/api';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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
  Info,
  Plus,
  Link2
} from 'lucide-react';
import { toast } from 'sonner';

// County options for the dropdown
const COUNTY_OPTIONS = [
  'Cook',
  'DuPage',
  'Will',
  'Kane',
  'Lake',
  'McHenry',
  'Kendall',
  'DeKalb',
  'Grundy',
  'Other'
];

const JudgeInformationPage = () => {
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJudge, setSelectedJudge] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddJudgeModalOpen, setIsAddJudgeModalOpen] = useState(false);
  const [isLinkRecordModalOpen, setIsLinkRecordModalOpen] = useState(false);
  const [linkingJudge, setLinkingJudge] = useState(null);

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

  const handleAddJudgeSuccess = () => {
    setIsAddJudgeModalOpen(false);
    fetchJudges();
  };

  const handleLinkRecord = (judge, e) => {
    e.stopPropagation();
    setLinkingJudge(judge);
    setIsLinkRecordModalOpen(true);
  };

  const handleLinkRecordSuccess = () => {
    setIsLinkRecordModalOpen(false);
    setLinkingJudge(null);
    fetchJudges();
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
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsAddJudgeModalOpen(true)}
            className="bg-[#2E7DA1] hover:bg-[#256a8a] text-white rounded-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Judge
          </Button>
          <Badge className="bg-[#2E7DA1]/10 text-[#2E7DA1] font-medium text-sm px-3 py-1">
            <Gavel className="w-4 h-4 mr-1" />
            {judges.length} Judges
          </Badge>
        </div>
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
                onLinkRecord={(e) => handleLinkRecord(judge, e)}
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

      {/* Add Judge Modal */}
      <AddJudgeModal
        isOpen={isAddJudgeModalOpen}
        onClose={() => setIsAddJudgeModalOpen(false)}
        onSuccess={handleAddJudgeSuccess}
      />

      {/* Link Record Modal */}
      <LinkRecordModal
        isOpen={isLinkRecordModalOpen}
        onClose={() => {
          setIsLinkRecordModalOpen(false);
          setLinkingJudge(null);
        }}
        onSuccess={handleLinkRecordSuccess}
        judge={linkingJudge}
      />
    </div>
  );
};

// Judge Card Component - Two Row Layout
const JudgeCard = ({ judge, onClick, onLinkRecord, getCountyColor }) => {
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
          {/* Link Record Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onLinkRecord}
            className="text-slate-400 hover:text-[#2E7DA1] hover:bg-[#2E7DA1]/10 rounded-full h-8 w-8 p-0"
            title="Link Matter"
          >
            <Link2 className="w-4 h-4" />
          </Button>
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

// Judge Detail Modal Component with Edit Mode and Linked Cases
const JudgeDetailModal = ({ judge, isOpen, onClose, getCountyColor, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showLinkedCases, setShowLinkedCases] = useState(false);
  const [linkedCases, setLinkedCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);

  // Reset state when modal opens/closes or judge changes
  useEffect(() => {
    if (judge && isOpen) {
      setEditData({
        name: judge.name || '',
        county: judge.county || '',
        courtroom: judge.courtroom || '',
        calendar: judge.calendar || '',
        email: judge.email || '',
        zoom_information: judge.zoom_information || ''
      });
      setIsEditing(false);
      setShowLinkedCases(false);
      setLinkedCases([]);
    }
  }, [judge, isOpen]);

  const handleSave = async () => {
    if (!editData.name || !editData.county || !editData.courtroom) {
      toast.error('Name, County, and Courtroom are required');
      return;
    }

    setSaving(true);
    try {
      await judgeApi.update(judge.id, editData);
      toast.success('Judge updated successfully');
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to update judge:', error);
      toast.error(error.response?.data?.detail || 'Failed to update judge');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      name: judge.name || '',
      county: judge.county || '',
      courtroom: judge.courtroom || '',
      calendar: judge.calendar || '',
      email: judge.email || '',
      zoom_information: judge.zoom_information || ''
    });
    setIsEditing(false);
  };

  const fetchLinkedCases = async () => {
    if (!judge?.master_list_ids || judge.master_list_ids.length === 0) return;
    
    setLoadingCases(true);
    try {
      // Fetch each linked case
      const casePromises = judge.master_list_ids.map(id => 
        masterListApi.getOne(id).catch(() => null)
      );
      const results = await Promise.all(casePromises);
      const validCases = results
        .filter(r => r && r.data)
        .map(r => ({
          id: r.data.id,
          ...r.data.fields
        }));
      setLinkedCases(validCases);
    } catch (error) {
      console.error('Failed to fetch linked cases:', error);
      toast.error('Failed to load linked cases');
    } finally {
      setLoadingCases(false);
    }
  };

  const handleShowLinkedCases = () => {
    if (!showLinkedCases && linkedCases.length === 0) {
      fetchLinkedCases();
    }
    setShowLinkedCases(!showLinkedCases);
  };

  if (!judge) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-[#2E7DA1]" />
              {isEditing ? 'Edit Judge' : (judge.name || 'Judge Details')}
            </DialogTitle>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="rounded-full text-[#2E7DA1] border-[#2E7DA1] hover:bg-[#2E7DA1]/10"
              >
                <Pencil className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="space-y-6 pt-2">
          {isEditing ? (
            /* Edit Mode */
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    placeholder="Enter judge's name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>County <span className="text-red-500">*</span></Label>
                  <Select
                    value={editData.county}
                    onValueChange={(value) => setEditData({ ...editData, county: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select county" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTY_OPTIONS.map((county) => (
                        <SelectItem key={county} value={county}>{county}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Courtroom <span className="text-red-500">*</span></Label>
                  <Input
                    value={editData.courtroom}
                    onChange={(e) => setEditData({ ...editData, courtroom: e.target.value })}
                    placeholder="Enter courtroom number"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Calendar</Label>
                  <Input
                    value={editData.calendar}
                    onChange={(e) => setEditData({ ...editData, calendar: e.target.value })}
                    placeholder="Enter calendar number"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Zoom Information</Label>
                  <Textarea
                    value={editData.zoom_information}
                    onChange={(e) => setEditData({ ...editData, zoom_information: e.target.value })}
                    placeholder="Enter Zoom meeting details"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 rounded-full"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-[#2E7DA1] hover:bg-[#256a8a] text-white rounded-full"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            /* View Mode */
            <>
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

              {/* Linked Cases - Clickable */}
              {judge.master_list_count > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Linked Cases</h4>
                  <button
                    onClick={handleShowLinkedCases}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors w-full text-left"
                  >
                    <Users className="w-4 h-4 text-[#2E7DA1]" />
                    <span className="text-sm text-[#2E7DA1] font-medium">
                      {judge.master_list_count} case{judge.master_list_count > 1 ? 's' : ''} assigned to this judge
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${showLinkedCases ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showLinkedCases && (
                    <div className="border rounded-lg overflow-hidden">
                      {loadingCases ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-[#2E7DA1]" />
                          <span className="ml-2 text-sm text-slate-500">Loading cases...</span>
                        </div>
                      ) : linkedCases.length > 0 ? (
                        <div className="divide-y">
                          {linkedCases.map((caseItem) => (
                            <div key={caseItem.id} className="px-3 py-2 hover:bg-slate-50">
                              <div className="font-medium text-sm text-slate-800">
                                {caseItem['Matter Name'] || caseItem['Name'] || 'Unnamed Case'}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {caseItem['Type of Case'] && (
                                  <Badge variant="outline" className="text-xs">
                                    {caseItem['Type of Case']}
                                  </Badge>
                                )}
                                {caseItem['Client'] && (
                                  <span className="text-xs text-slate-500">
                                    Client: {caseItem['Client']}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 text-center text-sm text-slate-500">
                          No case details available
                        </div>
                      )}
                    </div>
                  )}
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Add Judge Modal Component
const AddJudgeModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    county: '',
    courtroom: '',
    calendar: '',
    email: '',
    zoom_information: '',
    standing_orders: '',
    master_list: []
  });
  const [saving, setSaving] = useState(false);
  const [matterSearchQuery, setMatterSearchQuery] = useState('');
  const [matterSearchResults, setMatterSearchResults] = useState([]);
  const [searchingMatters, setSearchingMatters] = useState(false);
  const [selectedMatters, setSelectedMatters] = useState([]);

  const resetForm = () => {
    setFormData({
      name: '',
      county: '',
      courtroom: '',
      calendar: '',
      email: '',
      zoom_information: '',
      standing_orders: '',
      master_list: []
    });
    setMatterSearchQuery('');
    setMatterSearchResults([]);
    setSelectedMatters([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const searchMatters = async (query) => {
    if (!query || query.length < 2) {
      setMatterSearchResults([]);
      return;
    }
    
    setSearchingMatters(true);
    try {
      const response = await masterListApi.search(query);
      setMatterSearchResults(response.data.records || []);
    } catch (error) {
      console.error('Failed to search matters:', error);
      toast.error('Failed to search matters');
    } finally {
      setSearchingMatters(false);
    }
  };

  const handleMatterSearch = (e) => {
    const query = e.target.value;
    setMatterSearchQuery(query);
    searchMatters(query);
  };

  const addMatter = (matter) => {
    if (!selectedMatters.find(m => m.id === matter.id)) {
      setSelectedMatters([...selectedMatters, matter]);
    }
    setMatterSearchQuery('');
    setMatterSearchResults([]);
  };

  const removeMatter = (matterId) => {
    setSelectedMatters(selectedMatters.filter(m => m.id !== matterId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.county || !formData.courtroom) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...formData,
        master_list: selectedMatters.map(m => m.id)
      };
      
      await judgeApi.create(data);
      toast.success('Judge added successfully');
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Failed to create judge:', error);
      toast.error(error.response?.data?.detail || 'Failed to add judge');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#2E7DA1]" />
            Add New Judge
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Name - Required */}
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter judge's name"
              required
            />
          </div>

          {/* County - Required */}
          <div className="space-y-2">
            <Label htmlFor="county">County <span className="text-red-500">*</span></Label>
            <Select
              value={formData.county}
              onValueChange={(value) => setFormData({ ...formData, county: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select county" />
              </SelectTrigger>
              <SelectContent>
                {COUNTY_OPTIONS.map((county) => (
                  <SelectItem key={county} value={county}>{county}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Courtroom - Required */}
          <div className="space-y-2">
            <Label htmlFor="courtroom">Courtroom <span className="text-red-500">*</span></Label>
            <Input
              id="courtroom"
              value={formData.courtroom}
              onChange={(e) => setFormData({ ...formData, courtroom: e.target.value })}
              placeholder="Enter courtroom number"
              required
            />
          </div>

          {/* Calendar */}
          <div className="space-y-2">
            <Label htmlFor="calendar">Calendar</Label>
            <Input
              id="calendar"
              value={formData.calendar}
              onChange={(e) => setFormData({ ...formData, calendar: e.target.value })}
              placeholder="Enter calendar number"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
            />
          </div>

          {/* Zoom Information */}
          <div className="space-y-2">
            <Label htmlFor="zoom_information">Zoom Information</Label>
            <Textarea
              id="zoom_information"
              value={formData.zoom_information}
              onChange={(e) => setFormData({ ...formData, zoom_information: e.target.value })}
              placeholder="Enter Zoom meeting details"
              rows={3}
            />
          </div>

          {/* Standing Orders */}
          <div className="space-y-2">
            <Label htmlFor="standing_orders">Standing Orders (URL)</Label>
            <Input
              id="standing_orders"
              value={formData.standing_orders}
              onChange={(e) => setFormData({ ...formData, standing_orders: e.target.value })}
              placeholder="Enter URL to standing orders document"
            />
          </div>

          {/* Matter Search */}
          <div className="space-y-2">
            <Label>Matter</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={matterSearchQuery}
                onChange={handleMatterSearch}
                placeholder="Search matters to link..."
                className="pl-9"
              />
              {searchingMatters && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
              )}
            </div>
            
            {/* Search Results */}
            {matterSearchResults.length > 0 && (
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {matterSearchResults.map((matter) => (
                  <button
                    key={matter.id}
                    type="button"
                    onClick={() => addMatter(matter)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b last:border-b-0 flex items-center justify-between"
                  >
                    <span>{matter.fields?.['Matter Name'] || matter.fields?.Name || 'Unnamed'}</span>
                    <Plus className="w-4 h-4 text-[#2E7DA1]" />
                  </button>
                ))}
              </div>
            )}

            {/* Selected Matters */}
            {selectedMatters.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedMatters.map((matter) => (
                  <Badge 
                    key={matter.id} 
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {matter.fields?.['Matter Name'] || matter.fields?.Name || 'Unnamed'}
                    <button
                      type="button"
                      onClick={() => removeMatter(matter.id)}
                      className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#2E7DA1] hover:bg-[#256a8a] text-white rounded-full"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Judge
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Link Record Modal Component
const LinkRecordModal = ({ isOpen, onClose, onSuccess, judge }) => {
  const [matterSearchQuery, setMatterSearchQuery] = useState('');
  const [matterSearchResults, setMatterSearchResults] = useState([]);
  const [searchingMatters, setSearchingMatters] = useState(false);
  const [selectedMatters, setSelectedMatters] = useState([]);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setMatterSearchQuery('');
    setMatterSearchResults([]);
    setSelectedMatters([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const searchMatters = async (query) => {
    if (!query || query.length < 2) {
      setMatterSearchResults([]);
      return;
    }
    
    setSearchingMatters(true);
    try {
      const response = await masterListApi.search(query);
      // Filter out matters that are already linked to this judge
      const existingIds = judge?.master_list_ids || [];
      const filtered = (response.data.records || []).filter(
        r => !existingIds.includes(r.id)
      );
      setMatterSearchResults(filtered);
    } catch (error) {
      console.error('Failed to search matters:', error);
      toast.error('Failed to search matters');
    } finally {
      setSearchingMatters(false);
    }
  };

  const handleMatterSearch = (e) => {
    const query = e.target.value;
    setMatterSearchQuery(query);
    searchMatters(query);
  };

  const addMatter = (matter) => {
    if (!selectedMatters.find(m => m.id === matter.id)) {
      setSelectedMatters([...selectedMatters, matter]);
    }
    setMatterSearchQuery('');
    setMatterSearchResults([]);
  };

  const removeMatter = (matterId) => {
    setSelectedMatters(selectedMatters.filter(m => m.id !== matterId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedMatters.length === 0) {
      toast.error('Please select at least one matter to link');
      return;
    }

    setSaving(true);
    try {
      await judgeApi.update(judge.id, {
        master_list: selectedMatters.map(m => m.id)
      });
      toast.success('Matter(s) linked successfully');
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Failed to link matter:', error);
      toast.error(error.response?.data?.detail || 'Failed to link matter');
    } finally {
      setSaving(false);
    }
  };

  if (!judge) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-[#2E7DA1]" />
            Link Matter to {judge.name}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Current linked count */}
          {judge.master_list_count > 0 && (
            <p className="text-sm text-slate-500">
              Currently linked to {judge.master_list_count} matter(s)
            </p>
          )}

          {/* Matter Search */}
          <div className="space-y-2">
            <Label>Matter <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={matterSearchQuery}
                onChange={handleMatterSearch}
                placeholder="Search matters to link..."
                className="pl-9"
                autoFocus
              />
              {searchingMatters && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
              )}
            </div>
            
            {/* Search Results */}
            {matterSearchResults.length > 0 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {matterSearchResults.map((matter) => (
                  <button
                    key={matter.id}
                    type="button"
                    onClick={() => addMatter(matter)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b last:border-b-0 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{matter.fields?.['Matter Name'] || matter.fields?.Name || 'Unnamed'}</div>
                      {matter.fields?.['Type of Case'] && (
                        <div className="text-xs text-slate-500">{matter.fields['Type of Case']}</div>
                      )}
                    </div>
                    <Plus className="w-4 h-4 text-[#2E7DA1]" />
                  </button>
                ))}
              </div>
            )}

            {matterSearchQuery.length >= 2 && matterSearchResults.length === 0 && !searchingMatters && (
              <p className="text-sm text-slate-500 text-center py-2">No matters found</p>
            )}

            {/* Selected Matters */}
            {selectedMatters.length > 0 && (
              <div className="space-y-2 mt-3">
                <Label className="text-xs text-slate-500">Selected Matters</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedMatters.map((matter) => (
                    <Badge 
                      key={matter.id} 
                      variant="secondary"
                      className="flex items-center gap-1 pr-1 bg-[#2E7DA1]/10 text-[#2E7DA1]"
                    >
                      {matter.fields?.['Matter Name'] || matter.fields?.Name || 'Unnamed'}
                      <button
                        type="button"
                        onClick={() => removeMatter(matter.id)}
                        className="ml-1 hover:bg-[#2E7DA1]/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || selectedMatters.length === 0}
              className="flex-1 bg-[#2E7DA1] hover:bg-[#256a8a] text-white rounded-full"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Link Matter{selectedMatters.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JudgeInformationPage;
