import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi, filesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useDataCache } from '../context/DataCacheContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Loader2, CheckCircle2, Circle, Clock, AlertCircle, Calendar, ClipboardList, RefreshCw, CircleDot, HelpCircle, Plus, Edit2, X, Upload, File, Search, Users, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

const TasksPage = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingTask, setUpdatingTask] = useState(null);
  const [filter, setFilter] = useState('notStarted'); // notStarted, pending, completed
  
  // Admin: All Tasks view
  const [viewMode, setViewMode] = useState('myTasks'); // 'myTasks' or 'allTasks' (admin only)
  const [allTasks, setAllTasks] = useState([]);
  const [allTasksFilter, setAllTasksFilter] = useState('Not Started'); // For admin all tasks view
  const [loadingAllTasks, setLoadingAllTasks] = useState(false);
  
  // Task Detail Modal
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Add Task Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [matterSearch, setMatterSearch] = useState('');
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState(null);
  const matterSearchRef = useRef(null);
  const [addTaskForm, setAddTaskForm] = useState({
    task: '',
    status: 'Not Started',
    priority: 'Normal',
    due_date: '',
    link_to_matter: '',
    assigned_to: '',
    notes: ''
  });
  const [addingTask, setAddingTask] = useState(false);
  
  // File upload
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);
  
  // Unassigned tasks (for admin)
  const [unassignedTasks, setUnassignedTasks] = useState([]);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  
  // Get current user from AuthContext
  const { user } = useAuth();
  
  // Use cached data from DataCacheContext
  const { 
    matters, 
    assignees: assigneeOptions, 
    loadingMatters, 
    loadingAssignees,
    fetchMatters,
    fetchAssignees 
  } = useDataCache();
  
  // Check if current user is admin (case-insensitive)
  const isAdmin = user?.email?.toLowerCase() === 'contact@illinoisestatelaw.com';

  useEffect(() => {
    fetchMyTasks();
    // Fetch cached data (will use cache if available)
    fetchAssignees();
    fetchMatters();
    if (isAdmin) {
      fetchUnassignedTasks();
    }
  }, [isAdmin, fetchAssignees, fetchMatters]);

  // Fetch all tasks when admin switches to all tasks view
  useEffect(() => {
    if (isAdmin && viewMode === 'allTasks') {
      fetchAllTasks();
    }
  }, [isAdmin, viewMode, allTasksFilter]);

  const fetchAllTasks = async () => {
    if (!isAdmin) return;
    setLoadingAllTasks(true);
    try {
      const response = await tasksApi.getAllTasks(allTasksFilter);
      setAllTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch all tasks:', error);
      toast.error('Failed to load all tasks');
    } finally {
      setLoadingAllTasks(false);
    }
  };

  const fetchMyTasks = async () => {
    setLoading(true);
    try {
      const response = await tasksApi.getMyTasks();
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load your tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnassignedTasks = async () => {
    setLoadingUnassigned(true);
    try {
      const response = await tasksApi.getUnassigned();
      setUnassignedTasks(response.data.records || []);
    } catch (error) {
      console.error('Failed to fetch unassigned tasks:', error);
    } finally {
      setLoadingUnassigned(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    setUpdatingTask(taskId);
    try {
      const updateData = {
        Status: newStatus
      };
      
      if (newStatus === 'Done') {
        updateData['Completed?'] = 'Yes';
      } else {
        updateData['Completed?'] = 'No';
      }
      
      await tasksApi.update(taskId, updateData);
      
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

  const openTaskDetail = (task) => {
    setSelectedTask(task);
    setEditForm({
      'Assigned To': task.fields?.['Assigned To'] || '',
      'Notes': task.fields?.['Notes'] || '',
      'Due Date': task.fields?.['Due Date'] ? task.fields['Due Date'].split('T')[0] : '',
      'Priority': task.fields?.['Priority'] || 'Normal'
    });
    setIsEditing(false);
    setUploadedFile(null);
    setShowDetailModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTask) return;
    setSavingEdit(true);
    try {
      const updateData = { ...editForm };
      
      // Add file URL if uploaded
      if (uploadedFile) {
        updateData['File'] = [{ url: uploadedFile.url }];
      }
      
      await tasksApi.update(selectedTask.id, updateData);
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === selectedTask.id 
          ? { ...task, fields: { ...task.fields, ...updateData } }
          : task
      ));
      
      setSelectedTask(prev => ({
        ...prev,
        fields: { ...prev.fields, ...updateData }
      }));
      
      toast.success('Task updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete task handler
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }
    
    try {
      await tasksApi.delete(taskId);
      // Update both task states to handle both views
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setAllTasks(prev => prev.filter(t => t.id !== taskId));
      setShowDetailModal(false);
      setSelectedTask(null);
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    }
  };

  // Add Task handlers
  const openAddModal = () => {
    setAddTaskForm({
      task: '',
      status: 'Not Started',
      priority: 'Normal',
      due_date: '',
      link_to_matter: '',
      assigned_to: '',
      notes: ''
    });
    setSelectedMatter(null);
    setMatterSearch('');
    setUploadedFile(null);
    fetchMatters();
    setShowAddModal(true);
  };

  const handleAddTask = async () => {
    if (!addTaskForm.task.trim()) {
      toast.error('Task name is required');
      return;
    }
    
    setAddingTask(true);
    try {
      // Backend expects lowercase field names matching TaskCreateNew model
      const taskData = {
        task: addTaskForm.task,
        status: addTaskForm.status,
        priority: addTaskForm.priority,
        assigned_to: addTaskForm.assigned_to || null,
        notes: addTaskForm.notes || null
      };
      
      if (addTaskForm.due_date) {
        taskData.due_date = addTaskForm.due_date;
      }
      
      if (addTaskForm.link_to_matter) {
        taskData.link_to_matter = addTaskForm.link_to_matter;
      }
      
      if (uploadedFile) {
        taskData.file_url = uploadedFile.url;
      }
      
      await tasksApi.create(taskData);
      toast.success('Task created successfully');
      setShowAddModal(false);
      fetchMyTasks();
      if (isAdmin) fetchUnassignedTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
    } finally {
      setAddingTask(false);
    }
  };

  // File upload handlers
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const maxSize = 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadingFile(true);
    try {
      const uploadRes = await filesApi.upload(file);
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const fileUrl = backendUrl + uploadRes.data.url;
      
      setUploadedFile({
        name: file.name,
        url: fileUrl
      });
      
      toast.success(`File "${file.name}" uploaded!`);
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  // Assignment handler for unassigned tasks - updated to accept object
  const handleAssignTask = async (taskId, data) => {
    try {
      const updateData = {
        'Assigned To': data.assignee
      };
      if (data.dueDate) updateData['Due Date'] = data.dueDate;
      if (data.notes) updateData['Notes'] = data.notes;
      if (data.priority) updateData['Priority'] = data.priority;
      if (data.matterId) updateData['Link to Matter'] = [data.matterId];
      if (data.fileUrl) updateData['File'] = [{ url: data.fileUrl }];
      
      await tasksApi.update(taskId, updateData);
      toast.success('Task assigned successfully');
      fetchUnassignedTasks();
      fetchMyTasks();
    } catch (error) {
      console.error('Failed to assign task:', error);
      toast.error('Failed to assign task');
    }
  };

  // Delete handler for unassigned tasks
  const handleDeleteUnassignedTask = async (taskId) => {
    try {
      await tasksApi.delete(taskId);
      toast.success('Task deleted successfully');
      fetchUnassignedTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to delete task';
      toast.error(errorMsg);
    }
  };

  // File upload handler for unassigned task rows
  const handleUnassignedFileUpload = async (file) => {
    const uploadRes = await filesApi.upload(file);
    const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
    const fileUrl = backendUrl + uploadRes.data.url;
    return {
      name: file.name,
      url: fileUrl
    };
  };

  // Filter matters for search
  const filteredMatters = matters.filter(matter => {
    if (!matterSearch.trim()) return true;
    const search = matterSearch.toLowerCase();
    return (
      matter.name.toLowerCase().includes(search) ||
      matter.client.toLowerCase().includes(search)
    );
  }).slice(0, 100); // Show up to 100 results

  const getStatusIcon = (status, isClickable = false, onClick = null) => {
    switch (status?.toLowerCase()) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'need information from client':
        return <HelpCircle className="w-4 h-4 text-purple-500" />;
      default:
        if (isClickable && onClick) {
          return (
            <div className="group relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                className="p-0.5 rounded-full hover:bg-green-100 transition-colors"
                title="Mark as Done"
              >
                <Circle className="w-4 h-4 text-slate-400 group-hover:text-green-500 transition-colors" />
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                Mark as Done
              </div>
            </div>
          );
        }
        return <Circle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'done':
        return 'bg-green-100 text-green-700';
      case 'in progress':
        return 'bg-blue-100 text-blue-700';
      case 'need information from client':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-600';
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const filteredTasks = tasks.filter(task => {
    const status = (task.fields?.Status || '').toLowerCase();
    if (filter === 'notStarted') return status === 'not started';
    if (filter === 'pending') return status === 'in progress' || status === 'need information from client';
    if (filter === 'completed') return status === 'done';
    return true;
  });

  const notStartedCount = tasks.filter(t => (t.fields?.Status || '').toLowerCase() === 'not started').length;
  const pendingCount = tasks.filter(t => {
    const status = (t.fields?.Status || '').toLowerCase();
    return status === 'in progress' || status === 'need information from client';
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
            {viewMode === 'myTasks' ? 'My Tasks' : 'All Tasks'}
          </h1>
          <p className="text-slate-500 mt-1">
            {viewMode === 'myTasks' ? 'Tasks assigned to you' : 'All tasks assigned to anyone'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <Button 
                variant={viewMode === 'myTasks' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('myTasks')}
                className={viewMode === 'myTasks' ? 'bg-[#2E7DA1] hover:bg-[#256a8a]' : ''}
              >
                My Tasks
              </Button>
              <Button 
                variant={viewMode === 'allTasks' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('allTasks')}
                className={viewMode === 'allTasks' ? 'bg-[#2E7DA1] hover:bg-[#256a8a]' : ''}
              >
                <Users className="w-4 h-4 mr-1" />
                All Tasks
              </Button>
            </div>
          )}
          <Button onClick={openAddModal} className="gap-2 bg-[#2E7DA1] hover:bg-[#256a8a]">
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
          <Button variant="outline" size="sm" onClick={viewMode === 'myTasks' ? fetchMyTasks : fetchAllTasks} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Admin All Tasks View */}
      {isAdmin && viewMode === 'allTasks' && (
        <>
          {/* Filter for All Tasks */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-slate-500">Filter by Status:</Label>
            <Select value={allTasksFilter} onValueChange={setAllTasksFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Not Started">Not Started</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Need Information from Client">Need Info from Client</SelectItem>
                <SelectItem value="Done">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Badge className="bg-slate-100 text-slate-600">{allTasks.length} tasks</Badge>
          </div>

          {/* All Tasks List */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2E7DA1]" />
                All Tasks {allTasksFilter !== 'all' && `(${allTasksFilter})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAllTasks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2E7DA1]" />
                </div>
              ) : allTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p>No tasks found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allTasks.map(task => {
                    const fields = task.fields || {};
                    const dueInfo = formatDueDate(fields['Due Date']);
                    return (
                      <div
                        key={task.id}
                        className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => openTaskDetail(task)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            {getStatusIcon(fields.Status)}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-slate-900">{fields.Task || 'Unnamed Task'}</h4>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-xs text-slate-500">
                                  {fields['Matter Name (from Link to Matter)']?.[0] || 'No matter linked'}
                                </span>
                                {fields['Assigned To'] && (
                                  <Badge variant="outline" className="text-xs">
                                    {fields['Assigned To']}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={getStatusColor(fields.Status)}>
                              {fields.Status || 'Not Started'}
                            </Badge>
                            {dueInfo && (
                              <span className={`text-xs ${dueInfo.className}`}>
                                <Calendar className="w-3 h-3 inline mr-1" />
                                {dueInfo.text}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* My Tasks View (existing view) */}
      {viewMode === 'myTasks' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={`border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${filter === 'notStarted' ? 'ring-2 ring-[#2E7DA1]' : ''}`} onClick={() => setFilter('notStarted')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Not Started</p>
                    <p className="text-2xl font-bold text-slate-900">{notStartedCount}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${filter === 'notStarted' ? 'bg-[#2E7DA1]' : 'bg-slate-100'}`}>
                    <Circle className={`w-5 h-5 ${filter === 'notStarted' ? 'text-white' : 'text-slate-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className={`border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${filter === 'pending' ? 'ring-2 ring-orange-500' : ''}`} onClick={() => setFilter('pending')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Pending</p>
                    <p className="text-xs text-slate-400">(In Progress / Need Info)</p>
                    <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${filter === 'pending' ? 'bg-orange-500' : 'bg-orange-100'}`}>
                    <Clock className={`w-5 h-5 ${filter === 'pending' ? 'text-white' : 'text-orange-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className={`border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${filter === 'completed' ? 'ring-2 ring-green-500' : ''}`} onClick={() => setFilter('completed')}>
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
              {filter === 'notStarted' ? 'Not Started Tasks' : filter === 'pending' ? 'Pending Tasks' : 'Completed Tasks'}
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
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => {
                const fields = task.fields || {};
                const dueDate = formatDueDate(fields['Due Date']);
                const matterName = fields['Matter Name (from Link to Matter)']?.[0] || 'No Matter';
                const matterId = fields['Link to Matter']?.[0] || null;
                const matterType = fields['Type of Case (from Link to Matter)']?.[0] || '';
                const isUpdating = updatingTask === task.id;
                const isNotStarted = (fields.Status || '').toLowerCase() === 'not started';
                
                // Determine the correct route based on matter type
                const getMatterRoute = () => {
                  if (!matterId) return null;
                  const type = matterType.toLowerCase();
                  if (type === 'probate') return `/case/probate/${matterId}`;
                  if (type === 'estate planning') return `/case/estate-planning/${matterId}`;
                  if (type === 'deed/llc' || type === 'deed') return `/case/deed/${matterId}`;
                  if (type === 'lead') return `/case/lead/${matterId}`;
                  return `/case/probate/${matterId}`; // Default fallback
                };
                
                const handleMatterClick = (e) => {
                  e.stopPropagation();
                  const route = getMatterRoute();
                  if (route) {
                    navigate(route);
                  }
                };
                
                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
                    onClick={() => openTaskDetail(task)}
                  >
                    {/* Line 1: Task Name + Priority + Status */}
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getStatusIcon(
                          fields.Status, 
                          isNotStarted, 
                          isNotStarted ? () => handleStatusChange(task.id, 'Done') : null
                        )}
                        <h3 className={`font-medium text-slate-900 ${fields.Status?.toLowerCase() === 'done' ? 'line-through text-slate-500' : ''}`}>
                          {fields.Task || 'Unnamed Task'}
                        </h3>
                        <Badge className={getPriorityColor(fields.Priority)}>
                          {fields.Priority || 'Normal'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={fields.Status || 'Not Started'}
                          onValueChange={(value) => handleStatusChange(task.id, value)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className={`w-48 h-8 text-xs ${getStatusColor(fields.Status)}`}>
                            {isUpdating ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Not Started">Not Started</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Need Information from Client">Need Info from Client</SelectItem>
                            <SelectItem value="Done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Line 2: Matter Name (clickable) + Due Date */}
                    <div className="flex items-center justify-between text-sm pl-7">
                      <div className="flex items-center gap-4">
                        {matterId ? (
                          <span 
                            className="text-[#2E7DA1] hover:underline cursor-pointer font-medium"
                            onClick={handleMatterClick}
                          >
                            {matterName}
                          </span>
                        ) : (
                          <span className="text-slate-600">{matterName}</span>
                        )}
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
                    
                    {/* Line 3: Notes (if present) */}
                    {fields.Notes && (
                      <div className="mt-2 pl-7 text-sm text-slate-500 bg-slate-50 rounded-md p-2 border-l-2 border-slate-200">
                        <span className="line-clamp-2">{fields.Notes}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}

      {/* Task Assignment Module - Admin Only */}
      {isAdmin && viewMode === 'myTasks' && (
        <Card className="border-0 shadow-sm border-l-4 border-l-[#2E7DA1]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2E7DA1]" />
                Task Assignment (Admin)
              </CardTitle>
              <Badge variant="outline" className="font-normal">
                {unassignedTasks.length} unassigned
              </Badge>
            </div>
            <p className="text-sm text-slate-500">Assign tasks that don&apos;t have an assigned person</p>
          </CardHeader>
          <CardContent>
            {loadingUnassigned ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#2E7DA1]" />
              </div>
            ) : unassignedTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <p>All tasks have been assigned!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unassignedTasks.slice(0, 10).map((task) => (
                  <UnassignedTaskRow 
                    key={task.id} 
                    task={task} 
                    assigneeOptions={assigneeOptions}
                    matters={matters}
                    onAssign={handleAssignTask}
                    onUploadFile={handleUnassignedFileUpload}
                    onDelete={handleDeleteUnassignedTask}
                  />
                ))}
                {unassignedTasks.length > 10 && (
                  <p className="text-sm text-slate-500 text-center">
                    And {unassignedTasks.length - 10} more unassigned tasks...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Task Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getStatusIcon(selectedTask?.fields?.Status)}
              {selectedTask?.fields?.Task || 'Task Details'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              {!isEditing ? (
                <>
                  {/* View Mode */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Status</span>
                      <Badge className={getStatusColor(selectedTask.fields?.Status)}>
                        {selectedTask.fields?.Status || 'Not Started'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Priority</span>
                      <Badge className={getPriorityColor(selectedTask.fields?.Priority)}>
                        {selectedTask.fields?.Priority || 'Normal'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Assigned To</span>
                      <span className="text-sm font-medium">{selectedTask.fields?.['Assigned To'] || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Due Date</span>
                      <span className="text-sm font-medium">{formatDate(selectedTask.fields?.['Due Date'])}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Date Created</span>
                      <span className="text-sm font-medium">{formatDate(selectedTask.fields?.Created)}</span>
                    </div>
                    {selectedTask.fields?.Status?.toLowerCase() === 'done' && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Date Completed</span>
                        <span className="text-sm font-medium text-green-600">{selectedTask.fields?.['Date Completed'] || '—'}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Matter</span>
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {selectedTask.fields?.['Matter Name (from Link to Matter)']?.[0] || '—'}
                      </span>
                    </div>
                    {selectedTask.fields?.Notes && (
                      <div className="pt-2 border-t">
                        <span className="text-sm text-slate-500 block mb-1">Notes</span>
                        <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                          {selectedTask.fields.Notes}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <DialogFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => handleDeleteTask(selectedTask.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                        Close
                      </Button>
                      <Button onClick={() => setIsEditing(true)} className="bg-[#2E7DA1] hover:bg-[#256a8a]">
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </DialogFooter>
                </>
              ) : (
                <>
                  {/* Edit Mode */}
                  <div className="space-y-4">
                    <div>
                      <Label>Assigned To</Label>
                      <Select value={editForm['Assigned To']} onValueChange={(v) => setEditForm({...editForm, 'Assigned To': v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select person" />
                        </SelectTrigger>
                        <SelectContent>
                          {assigneeOptions.map(a => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Priority</Label>
                      <Select value={editForm['Priority']} onValueChange={(v) => setEditForm({...editForm, 'Priority': v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="High Priority">High Priority</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Due Date</Label>
                      <Input 
                        type="date" 
                        value={editForm['Due Date']} 
                        onChange={(e) => setEditForm({...editForm, 'Due Date': e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label>Notes</Label>
                      <Textarea 
                        value={editForm['Notes']} 
                        onChange={(e) => setEditForm({...editForm, 'Notes': e.target.value})}
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label>Files</Label>
                      <div className="mt-1">
                        {uploadedFile ? (
                          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                            <File className="w-4 h-4 text-[#2E7DA1]" />
                            <span className="text-sm flex-1 truncate">{uploadedFile.name}</span>
                            <Button variant="ghost" size="sm" onClick={() => setUploadedFile(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed rounded-lg p-4 text-center">
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={(e) => handleFileUpload(e.target.files)}
                              className="hidden"
                            />
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadingFile}
                            >
                              {uploadingFile ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4 mr-2" />
                              )}
                              Upload File
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEdit} disabled={savingEdit} className="bg-[#2E7DA1] hover:bg-[#256a8a]">
                      {savingEdit ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Task Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#2E7DA1]" />
              Add New Task
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Task Name *</Label>
              <Input 
                value={addTaskForm.task}
                onChange={(e) => setAddTaskForm({...addTaskForm, task: e.target.value})}
                placeholder="Enter task name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={addTaskForm.status} onValueChange={(v) => setAddTaskForm({...addTaskForm, status: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Need Information from Client">Need Info from Client</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Priority</Label>
                <Select value={addTaskForm.priority} onValueChange={(v) => setAddTaskForm({...addTaskForm, priority: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High Priority">High Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Due Date</Label>
              <Input 
                type="date" 
                value={addTaskForm.due_date}
                onChange={(e) => setAddTaskForm({...addTaskForm, due_date: e.target.value})}
              />
            </div>
            
            <div ref={matterSearchRef} className="relative">
              <Label>Link to Matter</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={matterSearch}
                  onChange={(e) => {
                    setMatterSearch(e.target.value);
                    setShowMatterDropdown(true);
                  }}
                  onFocus={() => setShowMatterDropdown(true)}
                  placeholder="Search matters..."
                  className="pl-10"
                />
                {selectedMatter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => {
                      setSelectedMatter(null);
                      setAddTaskForm({...addTaskForm, link_to_matter: ''});
                      setMatterSearch('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {showMatterDropdown && filteredMatters.length > 0 && !selectedMatter && (
                <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                  {loadingMatters ? (
                    <div className="p-3 text-center">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    </div>
                  ) : (
                    filteredMatters.map(matter => (
                      <div
                        key={matter.id}
                        className="p-2 hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          setSelectedMatter(matter);
                          setAddTaskForm({...addTaskForm, link_to_matter: matter.id});
                          setMatterSearch(matter.name);
                          setShowMatterDropdown(false);
                        }}
                      >
                        <div className="font-medium text-sm">{matter.name}</div>
                        <div className="text-xs text-slate-500">{matter.type}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            <div>
              <Label>Assigned To</Label>
              <Select value={addTaskForm.assigned_to} onValueChange={(v) => setAddTaskForm({...addTaskForm, assigned_to: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {assigneeOptions.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Notes</Label>
              <Textarea 
                value={addTaskForm.notes}
                onChange={(e) => setAddTaskForm({...addTaskForm, notes: e.target.value})}
                rows={3}
                placeholder="Add any notes..."
              />
            </div>
            
            {/* Upload File */}
            <div>
              <Label>Upload File</Label>
              {uploadedFile ? (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <File className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">{uploadedFile.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedFile(null)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative border-2 border-dashed rounded-lg p-4 text-center border-slate-200 hover:border-slate-300 bg-slate-50">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileUpload(Array.from(e.target.files || []))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {uploadingFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#2E7DA1]" />
                      <p className="text-sm text-slate-600">Uploading...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-6 h-6 text-slate-400" />
                      <p className="text-sm text-slate-600">Click or drag file to upload</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={addingTask} className="bg-[#2E7DA1] hover:bg-[#256a8a]">
              {addingTask ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Unassigned Task Row Component with expanded fields
const UnassignedTaskRow = ({ task, assigneeOptions, matters, onAssign, onUploadFile, onDelete }) => {
  const fields = task.fields || {};
  
  // Initialize state with existing task data
  const [assignee, setAssignee] = useState(fields['Assigned To'] || '');
  const [dueDate, setDueDate] = useState(fields['Due Date'] || '');
  const [notes, setNotes] = useState(fields['Notes'] || '');
  const [priority, setPriority] = useState(fields['Priority'] || 'Normal');
  
  // Initialize matter from existing linked matter
  const existingMatterId = fields['Link to Matter']?.[0] || null;
  const existingMatterName = fields['Matter Name (from Link to Matter)']?.[0] || '';
  
  // Find the existing matter in the matters list to get full details
  const existingMatterFromList = existingMatterId 
    ? matters.find(m => m.id === existingMatterId) 
    : null;
  
  const [selectedMatter, setSelectedMatter] = useState(
    existingMatterId 
      ? { 
          id: existingMatterId, 
          name: existingMatterFromList?.name || existingMatterName || 'Linked Matter',
          type: existingMatterFromList?.type || ''
        } 
      : null
  );
  const [matterSearch, setMatterSearch] = useState(
    existingMatterId 
      ? (existingMatterFromList?.name || existingMatterName || 'Linked Matter')
      : ''
  );
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef(null);
  
  // Filter matters for search - show all if no search, otherwise filter
  const filteredMatters = matters.filter(matter => {
    if (!matterSearch.trim()) return true;
    const search = matterSearch.toLowerCase();
    return (
      matter.name.toLowerCase().includes(search) ||
      matter.client.toLowerCase().includes(search)
    );
  }).slice(0, 100); // Show up to 100 results

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const maxSize = 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadingFile(true);
    try {
      const result = await onUploadFile(file);
      setUploadedFile(result);
      toast.success(`File "${file.name}" uploaded!`);
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };
  
  const handleAssign = async () => {
    if (!assignee) {
      toast.error('Please select an assignee');
      return;
    }
    setAssigning(true);
    await onAssign(task.id, {
      assignee,
      dueDate,
      notes,
      priority,
      matterId: selectedMatter?.id,
      fileUrl: uploadedFile?.url
    });
    setAssigning(false);
    // Reset form
    setAssignee('');
    setDueDate('');
    setNotes('');
    setPriority('Normal');
    setSelectedMatter(null);
    setMatterSearch('');
    setUploadedFile(null);
    setExpanded(false);
  };

  const handleDelete = async (e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    setDeleting(true);
    try {
      await onDelete(task.id);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeleting(false);
    }
  };
  
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
      {/* Header - Always visible */}
      <div 
        className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h4 className="font-medium text-slate-900">{fields.Task || 'Unnamed Task'}</h4>
            <p className="text-xs text-slate-500">
              {fields['Matter Name (from Link to Matter)']?.[0] || 'No matter linked'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-slate-100 text-slate-600">{fields.Priority || 'Normal'}</Badge>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="Delete task"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>
      
      {/* Expanded Form */}
      {expanded && (
        <div className="p-3 pt-0 border-t border-slate-200 bg-white space-y-3">
          {/* Row 1: Assignee + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Assigned To *</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {assigneeOptions.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="High Priority">High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Row 2: Due Date + Matter */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Due Date</Label>
              <Input 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="relative">
              <Label className="text-xs text-slate-500">Matter</Label>
              {selectedMatter ? (
                <div className="flex items-center justify-between p-2 bg-[#2E7DA1]/5 border border-[#2E7DA1]/20 rounded-lg h-9">
                  <span className="text-sm font-medium text-slate-900 truncate">{selectedMatter.name}</span>
                  <button
                    className="ml-2 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMatter(null);
                      setMatterSearch('');
                    }}
                  >
                    <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    value={matterSearch}
                    onChange={(e) => {
                      setMatterSearch(e.target.value);
                      setShowMatterDropdown(true);
                    }}
                    onFocus={() => setShowMatterDropdown(true)}
                    onBlur={() => setTimeout(() => setShowMatterDropdown(false), 200)}
                    placeholder="Search matters..."
                    className="h-9 text-sm pl-8"
                  />
                </div>
              )}
              {showMatterDropdown && !selectedMatter && filteredMatters.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-auto">
                  {filteredMatters.map(matter => (
                    <div
                      key={matter.id}
                      className="p-2 hover:bg-slate-50 cursor-pointer"
                      onMouseDown={() => {
                        setSelectedMatter(matter);
                        setMatterSearch(matter.name);
                        setShowMatterDropdown(false);
                      }}
                    >
                      <div className="font-medium text-sm">{matter.name}</div>
                      <div className="text-xs text-slate-500">{matter.type}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Row 3: Notes */}
          <div>
            <Label className="text-xs text-slate-500">Notes</Label>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              className="text-sm min-h-[60px]"
            />
          </div>
          
          {/* Row 4: File Upload */}
          <div>
            <Label className="text-xs text-slate-500">Files</Label>
            {uploadedFile ? (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                <File className="w-4 h-4 text-[#2E7DA1]" />
                <span className="text-sm flex-1 truncate">{uploadedFile.name}</span>
                <button onClick={() => setUploadedFile(null)}>
                  <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-3 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="h-8"
                >
                  {uploadingFile ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload File
                </Button>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-between pt-2">
            <Button 
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Task
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={assigning || !assignee}
              className="bg-[#2E7DA1] hover:bg-[#256a8a]"
            >
              {assigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Assign Task
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
