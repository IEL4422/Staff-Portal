import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Loader2, User } from 'lucide-react';
import { datesDeadlinesApi, masterListApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

const CalendarPage = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matterNames, setMatterNames] = useState({});

  // Get calendar data
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay, year, month };
  };

  const { daysInMonth, startingDay, year, month } = getDaysInMonth(currentDate);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all dates & deadlines
      const response = await datesDeadlinesApi.getAll();
      const records = response.data.records || [];
      
      // Collect all unique matter IDs
      const matterIds = new Set();
      records.forEach(record => {
        const addClient = record.fields?.['Add Client'] || [];
        addClient.forEach(id => matterIds.add(id));
      });

      // Fetch matter names
      const names = {};
      for (const matterId of matterIds) {
        try {
          const matterResponse = await masterListApi.getOne(matterId);
          names[matterId] = matterResponse.data.fields?.['Matter Name'] || 
                           matterResponse.data.fields?.['Client'] || 'Unknown';
        } catch {
          names[matterId] = 'Unknown';
        }
      }
      setMatterNames(names);
      setEvents(records);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get events for a specific day
  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => {
      const eventDate = event.fields?.Date;
      return eventDate && eventDate.startsWith(dateStr);
    });
  };

  // Format time from date string
  const formatTime = (dateStr) => {
    if (!dateStr || dateStr.length <= 10) return 'All Day';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return 'All Day';
    }
  };

  // Get matter name for event
  const getMatterName = (event) => {
    const addClient = event.fields?.['Add Client'] || [];
    if (addClient.length === 0) return null;
    return matterNames[addClient[0]] || 'Loading...';
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  };

  // Generate calendar days
  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="min-h-[120px] bg-slate-50 border border-slate-100" />
      );
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day);
      const todayClass = isToday(day) ? 'bg-[#2E7DA1] text-white' : 'bg-slate-100 text-slate-700';
      
      days.push(
        <div 
          key={day} 
          className="min-h-[120px] bg-white border border-slate-100 p-1 hover:bg-slate-50 transition-colors"
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full ${todayClass}`}>
              {day}
            </span>
            {dayEvents.length > 0 && (
              <Badge variant="secondary" className="text-xs bg-[#2E7DA1]/10 text-[#2E7DA1]">
                {dayEvents.length}
              </Badge>
            )}
          </div>
          <div className="space-y-1 overflow-y-auto max-h-[80px]">
            {dayEvents.slice(0, 3).map((event, idx) => {
              const matterName = getMatterName(event);
              return (
                <div 
                  key={idx}
                  className="text-xs p-1.5 bg-[#2E7DA1]/10 rounded border-l-2 border-[#2E7DA1] cursor-pointer hover:bg-[#2E7DA1]/20 transition-colors"
                  title={`${event.fields?.Event || 'Event'}${matterName ? ` - ${matterName}` : ''}`}
                >
                  <div className="flex items-center gap-1 text-slate-500 mb-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(event.fields?.Date)}</span>
                  </div>
                  <div className="font-medium text-slate-700 truncate">
                    {event.fields?.Event || 'Untitled'}
                  </div>
                  {matterName && (
                    <div className="flex items-center gap-1 text-slate-500 truncate mt-0.5">
                      <User className="w-3 h-3" />
                      <span className="truncate">{matterName}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {dayEvents.length > 3 && (
              <div className="text-xs text-slate-500 text-center">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <CalendarIcon className="w-7 h-7 inline-block mr-2 text-[#2E7DA1]" />
            Calendar
          </h1>
          <p className="text-slate-500 mt-1">View dates and deadlines</p>
        </div>
        <Button 
          onClick={() => navigate('/actions/add-deadline')}
          className="bg-[#2E7DA1] hover:bg-[#246585] rounded-full"
        >
          Add Date/Deadline
        </Button>
      </div>

      {/* Calendar Card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              {monthNames[month]} {year}
            </h2>
            <div className="w-32" /> {/* Spacer for alignment */}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
            </div>
          ) : (
            <>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-0 mb-1">
                {dayNames.map(day => (
                  <div 
                    key={day} 
                    className="text-center text-sm font-medium text-slate-500 py-2 bg-slate-50 border border-slate-100"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-0">
                {renderCalendarDays()}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Events This Month</h3>
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-6 h-6 animate-spin text-[#2E7DA1]" />
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events
                .filter(event => {
                  const eventDate = event.fields?.Date;
                  if (!eventDate) return false;
                  const eventMonth = new Date(eventDate).getMonth();
                  const eventYear = new Date(eventDate).getFullYear();
                  return eventMonth === month && eventYear === year;
                })
                .sort((a, b) => new Date(a.fields?.Date) - new Date(b.fields?.Date))
                .map((event, idx) => {
                  const matterName = getMatterName(event);
                  return (
                    <div 
                      key={idx}
                      className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-[#2E7DA1]/10 rounded-lg flex flex-col items-center justify-center">
                        <span className="text-xs text-[#2E7DA1] font-medium">
                          {new Date(event.fields?.Date).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-[#2E7DA1]">
                          {new Date(event.fields?.Date).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900">{event.fields?.Event || 'Untitled'}</div>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(event.fields?.Date)}
                          </span>
                          {matterName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {matterName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {events.filter(event => {
                const eventDate = event.fields?.Date;
                if (!eventDate) return false;
                const eventMonth = new Date(eventDate).getMonth();
                const eventYear = new Date(eventDate).getFullYear();
                return eventMonth === month && eventYear === year;
              }).length === 0 && (
                <p className="text-center text-slate-500 py-4">No events this month</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarPage;
