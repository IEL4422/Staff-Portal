import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi, masterListApi, filesApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare, Loader2, ArrowLeft, Upload, File, X, Search } from 'lucide-react';
import { toast } from 'sonner';

const AddTaskPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [matters, setMatters] = useState([]);
  const [loadingMatters, setLoadingMatters] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  
  // Matter search state
  const [matterSearch, setMatterSearch] = useState('');
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState(null);
  const matterSearchRef = useRef(null);
  
  const [formData, setFormData] = useState({
    task: '',
    status: 'Not Started',
    priority: 'Normal',
    due_date: '',
    link_to_matter: '',
    assigned_to: '',
    completed: '',
    notes: ''
  });

  useEffect(() => {
    fetchMatters();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (matterSearchRef.current && !matterSearchRef.current.contains(event.target)) {
        setShowMatterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchMatters = async () => {
    setLoadingMatters(true);
    try {
      const response = await masterListApi.getAll({ max_records: 500 });
      const records = response.data.records || [];
      // Sort by Matter Name
      const sortedMatters = records
        .map(r => ({
          id: r.id,
          name: r.fields?.['Matter Name'] || r.fields?.Client || 'Unknown',
          type: r.fields?.['Type of Case'] || '',
          client: r.fields?.Client || ''
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setMatters(sortedMatters);
    } catch (error) {
      console.error('Failed to fetch matters:', error);
      toast.error('Failed to load matters list');
    } finally {
      setLoadingMatters(false);
    }
  };

  // Filter matters based on search
  const filteredMatters = matters.filter(matter => {
    if (!matterSearch.trim()) return true;
    const search = matterSearch.toLowerCase();
    return (
      matter.name.toLowerCase().includes(search) ||
      matter.client.toLowerCase().includes(search) ||
      matter.type.toLowerCase().includes(search)
    );
  }).slice(0, 10); // Limit to 10 results

  const handleMatterSelect = (matter) => {
    setSelectedMatter(matter);
    setFormData({ ...formData, link_to_matter: matter.id });
    setMatterSearch(matter.name);
    setShowMatterDropdown(false);
  };

  const clearMatterSelection = () => {
    setSelectedMatter(null);
    setFormData({ ...formData, link_to_matter: '' });
    setMatterSearch('');
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(Array.from(files));
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(Array.from(files));
    }
  }, []);

  const removeUploadedFile = () => {
    setUploadedFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.task.trim()) {
      toast.error('Task name is required');
      return;
    }

    setLoading(true);

    try {
      const taskData = {
        task: formData.task,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
        link_to_matter: formData.link_to_matter || null,
        assigned_to: formData.assigned_to || null,
        completed: formData.completed || null,
        notes: formData.notes || null,
        file_url: uploadedFile?.url || null
      };

      await tasksApi.create(taskData);
      toast.success('Task created successfully!');
      
      // Reset form
      setFormData({
        task: '',
        status: 'Not Started',
        priority: 'Normal',
        due_date: '',
        link_to_matter: '',
        assigned_to: '',
        completed: '',
        notes: ''
      });
      setUploadedFile(null);
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="add-task-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            <CheckSquare className="w-8 h-8 inline-block mr-3 text-[#2E7DA1]" />
            Add Task
          </h1>
          <p className="text-slate-500 mt-1">Create a new task in the Tasks table</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope' }}>Task Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Task Name */}
            <div className="space-y-2">
              <Label htmlFor="task">Task <span className="text-red-500">*</span></Label>
              <Input
                id="task"
                value={formData.task}
                onChange={(e) => setFormData({ ...formData, task: e.target.value })}
                placeholder="Enter task name"
                required
                data-testid="task-input"
              />
            </div>

            {/* Status and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger data-testid="status-select">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Waiting">Waiting</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger data-testid="priority-select">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date and Assigned To */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  data-testid="due-date-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Select
                  value={formData.assigned_to || 'not-assigned'}
                  onValueChange={(value) => setFormData({ ...formData, assigned_to: value === 'not-assigned' ? '' : value })}
                >
                  <SelectTrigger data-testid="assigned-to-select">
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not-assigned">Not Assigned</SelectItem>
                    <SelectItem value="Brittany Hardy">Brittany Hardy</SelectItem>
                    <SelectItem value="Mary Liberty">Mary Liberty</SelectItem>
                    <SelectItem value="Jessica Sallows">Jessica Sallows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Link to Matter - Searchable */}
            <div className="space-y-2">
              <Label htmlFor="linkToMatter">Link to Matter</Label>
              {loadingMatters ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading matters...
                </div>
              ) : (
                <div className="relative" ref={matterSearchRef}>
                  {selectedMatter ? (
                    <div className="flex items-center justify-between p-3 bg-[#2E7DA1]/5 border border-[#2E7DA1]/20 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{selectedMatter.name}</p>
                        {selectedMatter.type && (
                          <p className="text-xs text-slate-500">{selectedMatter.type}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearMatterSelection}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="linkToMatter"
                          value={matterSearch}
                          onChange={(e) => {
                            setMatterSearch(e.target.value);
                            setShowMatterDropdown(true);
                          }}
                          onFocus={() => setShowMatterDropdown(true)}
                          placeholder="Search for a matter..."
                          className="pl-10"
                          data-testid="matter-search-input"
                        />
                      </div>
                      {showMatterDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredMatters.length === 0 ? (
                            <div className="p-3 text-sm text-slate-500 text-center">
                              {matterSearch ? 'No matters found' : 'Type to search matters'}
                            </div>
                          ) : (
                            filteredMatters.map((matter) => (
                              <button
                                key={matter.id}
                                type="button"
                                onClick={() => handleMatterSelect(matter)}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                              >
                                <p className="text-sm font-medium text-slate-900">{matter.name}</p>
                                {matter.type && (
                                  <p className="text-xs text-slate-500">{matter.type}</p>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Completed */}
            <div className="space-y-2">
              <Label htmlFor="completed">Completed?</Label>
              <Select
                value={formData.completed || 'not-set'}
                onValueChange={(value) => setFormData({ ...formData, completed: value === 'not-set' ? '' : value })}
              >
                <SelectTrigger data-testid="completed-select">
                  <SelectValue placeholder="Select completion status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-set">Not Set</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this task..."
                rows={4}
                data-testid="notes-input"
              />
            </div>

            {/* Upload File */}
            <div className="space-y-2">
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
                    onClick={removeUploadedFile}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    isDragging 
                      ? 'border-[#2E7DA1] bg-[#2E7DA1]/5' 
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    data-testid="file-input"
                  />
                  {uploadingFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-[#2E7DA1]" />
                      <p className="text-sm text-slate-600">Uploading...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className={`w-8 h-8 ${isDragging ? 'text-[#2E7DA1]' : 'text-slate-400'}`} />
                      <p className="text-sm text-slate-600">
                        {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
                      </p>
                      <p className="text-xs text-slate-400">Max 10MB</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full rounded-full bg-[#2E7DA1] hover:bg-[#246585]"
              disabled={loading || uploadingFile}
              data-testid="submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating Task...
                </>
              ) : (
                <>
                  <CheckSquare className="w-5 h-5 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddTaskPage;
