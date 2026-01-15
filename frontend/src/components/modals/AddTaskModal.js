/**
 * AddTaskModal - Modal content for adding new tasks
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, Check, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { tasksApi } from '../../services/api';
import { useDataCache } from '../../context/DataCacheContext';
import { getErrorMessage } from './modalUtils';

const TASK_STATUS_OPTIONS = ['Not Started', 'In Progress', 'Need Information from Client', 'Done'];
const TASK_PRIORITY_OPTIONS = ['Normal', 'High Priority'];

const AddTaskModalContent = ({ onSuccess, onCancel }) => {
  const { matters, assignees: assigneeOptions, fetchMatters, fetchAssignees } = useDataCache();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ task: '', status: 'Not Started', priority: 'Normal', due_date: '', link_to_matter: '', assigned_to: '', notes: '' });
  const [matterSearch, setMatterSearch] = useState('');
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState(null);

  useEffect(() => { fetchMatters(); fetchAssignees(); }, [fetchMatters, fetchAssignees]);

  const filteredMatters = matters.filter(m => {
    if (!matterSearch.trim()) return true;
    const search = matterSearch.toLowerCase();
    return m.name.toLowerCase().includes(search) || m.client.toLowerCase().includes(search);
  }).slice(0, 50);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.task.trim()) { toast.error('Task is required'); return; }

    setLoading(true);
    try {
      // Use camelCase keys to match backend TaskCreateNew model
      const data = { 
        task: formData.task.trim(), 
        status: formData.status, 
        priority: formData.priority 
      };
      if (formData.due_date) data.due_date = formData.due_date;
      if (selectedMatter) data.link_to_matter = selectedMatter.id;
      if (formData.assigned_to) data.assigned_to = formData.assigned_to;
      if (formData.notes) data.notes = formData.notes;

      await tasksApi.create(data);
      toast.success('Task added successfully!');
      onSuccess();
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Failed to add task');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Task <span className="text-red-500">*</span></Label>
        <Input value={formData.task} onChange={(e) => setFormData({...formData, task: e.target.value})} placeholder="Task description" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TASK_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TASK_PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Assigned To</Label>
          <Select value={formData.assigned_to} onValueChange={(v) => setFormData({...formData, assigned_to: v})}>
            <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
            <SelectContent>{assigneeOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2 relative">
        <Label>Link to Matter</Label>
        {selectedMatter ? (
          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
            <span className="flex-1 text-sm">{selectedMatter.name}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedMatter(null); setMatterSearch(''); }}><X className="w-4 h-4" /></Button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={matterSearch} onChange={(e) => { setMatterSearch(e.target.value); setShowMatterDropdown(true); }} onFocus={() => setShowMatterDropdown(true)} placeholder="Search matters..." className="pl-9" />
            </div>
            {showMatterDropdown && filteredMatters.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredMatters.map(m => (
                  <button key={m.id} type="button" onClick={() => { setSelectedMatter(m); setShowMatterDropdown(false); setMatterSearch(''); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm">{m.name} <span className="text-slate-500">({m.client})</span></button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Additional notes..." rows={3} />
      </div>
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-full" disabled={loading}>Cancel</Button>
        <Button type="submit" className="flex-1 rounded-full bg-[#2E7DA1] hover:bg-[#246585]" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Adding...</> : <><Check className="w-4 h-4 mr-2" />Add Task</>}
        </Button>
      </div>
    </form>
  );
};

export default AddTaskModalContent;
