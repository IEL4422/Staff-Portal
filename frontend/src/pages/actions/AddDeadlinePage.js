import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { datesDeadlinesApi, masterListApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Loader2, ArrowLeft, Search, X } from 'lucide-react';
import { toast } from 'sonner';

const AddDeadlinePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    event: '',
    date: '',
    matterId: '',
    matterName: '',
    notes: '',
    allDayEvent: false,
    invitee: '',
    location: ''
  });

  const [matterSearch, setMatterSearch] = useState('');
  const [matterResults, setMatterResults] = useState([]);
  const [searchingMatters, setSearchingMatters] = useState(false);
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);

  // Debounced matter search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (matterSearch.length >= 2) {
        searchMatters(matterSearch);
      } else {
        setMatterResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [matterSearch]);

  const searchMatters = async (query) => {
    setSearchingMatters(true);
    try {
      const response = await masterListApi.search(query);
      setMatterResults(response.data.results || []);
      setShowMatterDropdown(true);
    } catch (error) {
      console.error('Failed to search matters:', error);
    } finally {
      setSearchingMatters(false);
    }
  };

  const selectMatter = (matter) => {
    setFormData({
      ...formData,
      matterId: matter.id,
      matterName: matter.fields?.['Matter Name'] || matter.fields?.Client || 'Unknown'
    });
    setMatterSearch(matter.fields?.['Matter Name'] || matter.fields?.Client || '');
    setShowMatterDropdown(false);
  };

  const clearMatter = () => {
    setFormData({ ...formData, matterId: '', matterName: '' });
    setMatterSearch('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.event) {
      toast.error('Event is required');
      return;
    }
    if (!formData.date) {
      toast.error('Date is required');
      return;
    }
    if (!formData.matterId) {
      toast.error('Matter is required');
      return;
    }

    setLoading(true);
    try {
      const deadlineData = {
        event: formData.event,
        date: formData.date,
        matterId: formData.matterId,
        notes: formData.notes || null,
        allDayEvent: formData.allDayEvent,
        invitee: formData.invitee || null,
        location: formData.location || null
      };

      await datesDeadlinesApi.create(deadlineData);
      toast.success('Date/Deadline created successfully');
      
      // Reset form
      setFormData({
        event: '',
        date: '',
        matterId: '',
        matterName: '',
        notes: '',
        allDayEvent: false,
        invitee: '',
        location: ''
      });
      setMatterSearch('');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to create date/deadline');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="add-deadline-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <Calendar className="w-7 h-7 inline-block mr-3 text-[#2E7DA1]" />
            Add Date / Deadline
          </h1>
          <p className="text-slate-500 mt-1">Create a new date or deadline in Airtable</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope' }}>Date/Deadline Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Event */}
            <div className="space-y-2">
              <Label htmlFor="event">Event <span className="text-red-500">*</span></Label>
              <Input
                id="event"
                value={formData.event}
                onChange={(e) => setFormData({ ...formData, event: e.target.value })}
                placeholder="Enter event name (e.g., Court Hearing, Filing Deadline)"
                required
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date <span className="text-red-500">*</span></Label>
              <Input
                id="date"
                type="datetime-local"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            {/* Matter (Searchable) */}
            <div className="space-y-2">
              <Label>Matter <span className="text-red-500">*</span></Label>
              <div className="relative">
                {formData.matterId ? (
                  <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
                    <span className="flex-1 text-sm">{formData.matterName}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={clearMatter} className="h-6 w-6 p-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={matterSearch}
                        onChange={(e) => setMatterSearch(e.target.value)}
                        onFocus={() => matterSearch.length >= 2 && setShowMatterDropdown(true)}
                        placeholder="Search for a matter..."
                        className="pl-9"
                      />
                      {searchingMatters && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                      )}
                    </div>
                    {showMatterDropdown && matterResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {matterResults.map((matter) => (
                          <button
                            key={matter.id}
                            type="button"
                            onClick={() => selectMatter(matter)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 border-b border-slate-100 last:border-0"
                          >
                            <div className="font-medium">{matter.fields?.['Matter Name'] || matter.fields?.Client}</div>
                            <div className="text-xs text-slate-500">{matter.fields?.['Type of Case']}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            {/* All Day Event */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allDayEvent"
                checked={formData.allDayEvent}
                onCheckedChange={(checked) => setFormData({ ...formData, allDayEvent: checked })}
              />
              <Label htmlFor="allDayEvent" className="font-normal cursor-pointer">
                All Day Event?
              </Label>
            </div>

            {/* Invitee */}
            <div className="space-y-2">
              <Label htmlFor="invitee">Invitee</Label>
              <Input
                id="invitee"
                value={formData.invitee}
                onChange={(e) => setFormData({ ...formData, invitee: e.target.value })}
                placeholder="Enter invitee name or email"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter location"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Calendar className="w-5 h-5 mr-2" />}
              Create Date/Deadline
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddDeadlinePage;
