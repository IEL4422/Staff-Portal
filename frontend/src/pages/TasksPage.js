import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Loader2, CheckCircle2, Circle, Clock, AlertCircle, Calendar, ClipboardList, RefreshCw, CircleDot, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

const TasksPage = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingTask, setUpdatingTask] = useState(null);
  const [filter, setFilter] = useState('incomplete'); // incomplete, pending, completed

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    setLoading(true);
    try {
      const response = await tasksApi.getMyTasks();
      setTasks(response.data.records || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load your tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    setUpdatingTask(taskId);
    try {
      // Update task status via the tasks API
      const updateData = {
        Status: newStatus,
        'Completed?': newStatus === 'Done' ? 'Yes' : 'No'
      };
      
      if (newStatus === 'Done') {
        updateData['Date Completed'] = format(new Date(), 'MM/dd/yyyy');
      }
      
      await tasksApi.update(taskId, updateData);
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, fields: { ...task.fields, Status: newStatus, 'Completed?': newStatus === 'Done' ? 'Yes' : 'No' } }
          : task
      ));
      
      toast.success(`Task marked as ${newStatus}`);
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    } finally {
      setUpdatingTask(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'waiting':
        return <CircleDot className="w-4 h-4 text-yellow-500" />;
      case 'need information from client':
        return <HelpCircle className="w-4 h-4 text-purple-500" />;
      case 'blocked':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'done':
        return 'bg-green-100 text-green-700';
      case 'in progress':
        return 'bg-blue-100 text-blue-700';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-700';
      case 'need information from client':
        return 'bg-purple-100 text-purple-700';
      case 'blocked':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'normal':
        return 'bg-slate-100 text-slate-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = parseISO(dateStr);
      if (isToday(date)) return { text: 'Today', className: 'text-orange-600 font-medium' };
      if (isTomorrow(date)) return { text: 'Tomorrow', className: 'text-blue-600 font-medium' };
      if (isPast(date)) return { text: format(date, 'MMM d'), className: 'text-red-600 font-medium' };
      return { text: format(date, 'MMM d'), className: 'text-slate-600' };
    } catch {
      return { text: dateStr, className: 'text-slate-600' };
    }
  };

  const filteredTasks = tasks.filter(task => {
    const status = (task.fields?.Status || '').toLowerCase();
    if (filter === 'incomplete') return status !== 'done';
    if (filter === 'pending') return status === 'in progress' || status === 'waiting';
    if (filter === 'completed') return status === 'done';
    return true;
  });

  // Incomplete = all tasks that are not "Done"
  const incompleteCount = tasks.filter(t => (t.fields?.Status || '').toLowerCase() !== 'done').length;
  // Pending = only "In Progress" or "Waiting" status
  const pendingCount = tasks.filter(t => {
    const status = (t.fields?.Status || '').toLowerCase();
    return status === 'in progress' || status === 'waiting';
  }).length;
  const completedCount = tasks.filter(t => (t.fields?.Status || '').toLowerCase() === 'done').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
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
            My Tasks
          </h1>
          <p className="text-slate-500 mt-1">Tasks assigned to you</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchMyTasks} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('incomplete')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Incomplete</p>
                <p className="text-2xl font-bold text-slate-900">{incompleteCount}</p>
              </div>
              <div className={`p-3 rounded-xl ${filter === 'incomplete' ? 'bg-[#2E7DA1]' : 'bg-slate-100'}`}>
                <ClipboardList className={`w-5 h-5 ${filter === 'incomplete' ? 'text-white' : 'text-slate-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('pending')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-xs text-slate-400">(In Progress / Waiting)</p>
                <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
              </div>
              <div className={`p-3 rounded-xl ${filter === 'pending' ? 'bg-orange-500' : 'bg-orange-100'}`}>
                <Clock className={`w-5 h-5 ${filter === 'pending' ? 'text-white' : 'text-orange-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('completed')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              </div>
              <div className={`p-3 rounded-xl ${filter === 'completed' ? 'bg-green-500' : 'bg-green-100'}`}>
                <CheckCircle2 className={`w-5 h-5 ${filter === 'completed' ? 'text-white' : 'text-green-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {filter === 'incomplete' ? 'Incomplete Tasks' : filter === 'pending' ? 'Pending Tasks (In Progress / Waiting)' : 'Completed Tasks'}
            </CardTitle>
            <Badge variant="outline" className="font-normal">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No tasks found</p>
              {filter !== 'incomplete' && (
                <Button variant="link" onClick={() => setFilter('incomplete')} className="mt-2">
                  View incomplete tasks
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => {
                const fields = task.fields || {};
                const dueDate = formatDueDate(fields['Due Date']);
                const matterName = fields['Matter Name (from Link to Matter)']?.[0] || 'No Matter';
                const isUpdating = updatingTask === task.id;
                
                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                    {/* Line 1: Task Name + Priority + Status */}
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getStatusIcon(fields.Status)}
                        <h3 className={`font-medium text-slate-900 ${fields.Status?.toLowerCase() === 'done' ? 'line-through text-slate-500' : ''}`}>
                          {fields.Task || 'Unnamed Task'}
                        </h3>
                        {fields.Priority && fields.Priority !== 'Normal' && (
                          <Badge className={getPriorityColor(fields.Priority)}>
                            {fields.Priority}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={fields.Status || 'Not Started'}
                          onValueChange={(value) => handleStatusChange(task.id, value)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className={`w-44 h-8 text-xs ${getStatusColor(fields.Status)}`}>
                            {isUpdating ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Not Started">Not Started</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Waiting">Waiting</SelectItem>
                            <SelectItem value="Need Information from Client">Need Info from Client</SelectItem>
                            <SelectItem value="Blocked">Blocked</SelectItem>
                            <SelectItem value="Done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Line 2: Matter Name + Due Date */}
                    <div className="flex items-center justify-between text-sm pl-7">
                      <div className="flex items-center gap-4">
                        <span className="text-slate-600">{matterName}</span>
                        {fields['Assigned To'] && (
                          <span className="text-slate-400">• {fields['Assigned To']}</span>
                        )}
                      </div>
                      {dueDate && (
                        <div className={`flex items-center gap-1.5 ${dueDate.className}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{dueDate.text}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Notes if available */}
                    {fields.Notes && (
                      <p className="text-xs text-slate-500 mt-2 pl-7 line-clamp-2">
                        {fields.Notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TasksPage;
