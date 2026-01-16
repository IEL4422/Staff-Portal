import React from 'react';
import { useActionModals } from '../context/ActionModalsContext';
import ActionModal from './ActionModal';
import { MODAL_CONFIG } from './modals/modalUtils';

// Import form components
import { AddClientForm } from '../pages/actions/AddClientPage';
import { AddLeadForm } from '../pages/actions/AddLeadPage';

// Import extracted modal components
import AddAssetDebtModalContent from './modals/AddAssetDebtModal';
import AddContactModalContent from './modals/AddContactModal';
import AddTaskModalContent from './modals/AddTaskModal';

// Lazy load heavy components - import full pages and extract just the form portion
import AddDeadlinePage from '../pages/actions/AddDeadlinePage';
import PhoneIntakePage from '../pages/actions/PhoneIntakePage';
import CaseUpdatePage from '../pages/actions/CaseUpdatePage';
import SendInvoicePage from '../pages/actions/SendInvoicePage';
import SendMailPage from '../pages/actions/SendMailPage';
import UploadFilePage from '../pages/actions/UploadFilePage';

const ActionModals = () => {
  const { activeModal, closeModal } = useActionModals();

  const handleSuccess = () => {
    closeModal();
  };

  const handleClose = () => {
    closeModal();
  };

  // Get current modal config
  const config = activeModal ? MODAL_CONFIG[activeModal] : null;

  if (!activeModal || !config) return null;

  // Render the appropriate form based on activeModal
  const renderModalContent = () => {
    switch (activeModal) {
      case 'addClient':
        return <AddClientForm onSuccess={handleSuccess} onCancel={handleClose} isModal={true} />;
      case 'addLead':
        return <AddLeadForm onSuccess={handleSuccess} onCancel={handleClose} isModal={true} />;
      case 'addAssetDebt':
        return <AddAssetDebtModalContent onSuccess={handleSuccess} onCancel={handleClose} />;
      case 'addContact':
        return <AddContactModalContent onSuccess={handleSuccess} onCancel={handleClose} />;
      case 'addDeadline':
        return <AddDeadlineModalContentInline onSuccess={handleSuccess} onCancel={handleClose} />;
      case 'addTask':
        return <AddTaskModalContent onSuccess={handleSuccess} onCancel={handleClose} />;
      case 'phoneIntake':
        return <PhoneIntakeModalContentInline onClose={handleClose} />;
      case 'caseUpdate':
        return <CaseUpdateModalContentInline onSuccess={handleSuccess} onCancel={handleClose} />;
      case 'sendInvoice':
        return <SendInvoiceModalContentInline onSuccess={handleSuccess} onCancel={handleClose} />;
      case 'sendMail':
        return <SendMailModalContentInline onSuccess={handleSuccess} onCancel={handleClose} />;
      case 'uploadFile':
        return <UploadFileModalContentInline onSuccess={handleSuccess} onCancel={handleClose} />;
      default:
        return <div>Form not available</div>;
    }
  };

  return (
    <ActionModal
      isOpen={!!activeModal}
      onClose={handleClose}
      title={config.title}
      icon={config.icon}
      iconColor={config.iconColor}
      maxWidth={config.maxWidth}
    >
      {renderModalContent()}
    </ActionModal>
  );
};

// ==================== Modal Content Components ====================
// These are simplified inline versions of the form portions from each page
// NOTE: AddAssetDebtModalContent, AddContactModalContent, and AddTaskModalContent 
// have been extracted to /components/modals/ directory

import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Loader2, Check, Search, X, File, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { 
  ASSET_TYPE_OPTIONS, 
  DEBT_TYPE_OPTIONS, 
  ASSET_STATUS_OPTIONS,
  CONTACT_TYPE_OPTIONS,
  SERVICE_OPTIONS,
  MAILING_SPEED_OPTIONS,
  WHAT_IS_BEING_MAILED_OPTIONS,
  US_STATES,
  US_STATE_ABBREVIATIONS,
  getErrorMessage
} from './modals/modalUtils';

import { 
  masterListApi, 
  assetsDebtsApi, 
  caseContactsApi, 
  datesDeadlinesApi,
  tasksApi,
  caseUpdatesApi,
  invoicesApi,
  mailApi,
  documentsApi,
  filesApi
} from '../services/api';
import { useDataCache } from '../context/DataCacheContext';

// REMOVED: AddAssetDebtModalContent - now in /modals/AddAssetDebtModal.js
// REMOVED: AddContactModalContent - now in /modals/AddContactModal.js  
// REMOVED: AddTaskModalContent - now in /modals/AddTaskModal.js

/* EXTRACTED TO SEPARATE FILE - /modals/AddAssetDebtModal.js
const AddAssetDebtModalContent = ({ onSuccess, onCancel }) => {
  const { matters, fetchMatters, loadingMatters } = useDataCache();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', assetOrDebt: '', typeOfAsset: '', typeOfDebt: '', value: '', status: '', notes: ''
  });
  const [matterSearchQuery, setMatterSearchQuery] = useState('');
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState(null);

  useEffect(() => { fetchMatters(); }, [fetchMatters]);

  const filteredMatters = matters.filter(m => {
    if (!matterSearchQuery) return true;
    const query = matterSearchQuery.toLowerCase();
    return m.name?.toLowerCase().includes(query) || m.client?.toLowerCase().includes(query);
  }).slice(0, 50);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Name is required'); return; }
    if (!formData.assetOrDebt) { toast.error('Please select Asset or Debt'); return; }

    setLoading(true);
    try {
      const data = {
        'Name of Asset/Debt': formData.name.trim(),
        'Asset or Debt?': formData.assetOrDebt
      };
      if (formData.assetOrDebt === 'Asset' && formData.typeOfAsset) data['Type of Asset'] = formData.typeOfAsset;
      if (formData.assetOrDebt === 'Debt' && formData.typeOfDebt) data['Type of Debt'] = formData.typeOfDebt;
      if (formData.value) data['Value'] = parseFloat(formData.value);
      if (formData.status) data['Status'] = formData.status;
      if (formData.notes) data['Notes'] = formData.notes;
      if (selectedMatter) data['Link to Master List'] = [selectedMatter.id];

      await assetsDebtsApi.create(data);
      toast.success('Asset/Debt added successfully!');
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add asset/debt'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Name of Asset/Debt <span className="text-red-500">*</span></Label>
        <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Enter name" />
      </div>
      <div className="space-y-2">
        <Label>Asset or Debt? <span className="text-red-500">*</span></Label>
        <Select value={formData.assetOrDebt} onValueChange={(v) => setFormData({...formData, assetOrDebt: v, typeOfAsset: '', typeOfDebt: ''})}>
          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Asset">Asset</SelectItem>
            <SelectItem value="Debt">Debt</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {formData.assetOrDebt === 'Asset' && (
        <div className="space-y-2">
          <Label>Type of Asset</Label>
          <Select value={formData.typeOfAsset} onValueChange={(v) => setFormData({...formData, typeOfAsset: v})}>
            <SelectTrigger><SelectValue placeholder="Select asset type" /></SelectTrigger>
            <SelectContent>{ASSET_TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {formData.assetOrDebt === 'Debt' && (
        <div className="space-y-2">
          <Label>Type of Debt</Label>
          <Select value={formData.typeOfDebt} onValueChange={(v) => setFormData({...formData, typeOfDebt: v})}>
            <SelectTrigger><SelectValue placeholder="Select debt type" /></SelectTrigger>
            <SelectContent>{DEBT_TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Value ($)</Label>
          <Input type="number" value={formData.value} onChange={(e) => setFormData({...formData, value: e.target.value})} placeholder="0.00" />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>{ASSET_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2 relative">
        <Label>Link to Matter</Label>
        {selectedMatter ? (
          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
            <span className="flex-1 text-sm">{selectedMatter.name}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedMatter(null); setMatterSearchQuery(''); }}><X className="w-4 h-4" /></Button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={matterSearchQuery}
                onChange={(e) => { setMatterSearchQuery(e.target.value); setShowMatterDropdown(true); }}
                onFocus={() => setShowMatterDropdown(true)}
                placeholder="Search matters..."
                className="pl-9"
              />
            </div>
            {showMatterDropdown && filteredMatters.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredMatters.map(m => (
                  <button key={m.id} type="button" onClick={() => { setSelectedMatter(m); setShowMatterDropdown(false); setMatterSearchQuery(''); }}
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
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Adding...</> : <><Check className="w-4 h-4 mr-2" />Add Asset/Debt</>}
        </Button>
      </div>
    </form>
  );
};
END EXTRACTED TO SEPARATE FILE */

// ==================== Add Contact Modal - EXTRACTED TO /modals/AddContactModal.js ====================
/* EXTRACTED TO SEPARATE FILE
const US_STATE_ABBREVIATIONS = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
const CONTACT_TYPES = ['Heir', 'Legatee', 'Creditor', 'Attorney'];

const AddContactModalContent = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', type: '', streetAddress: '', city: '', state: '', zipCode: '', relationshipToDecedent: '', disabledMinor: false, matterId: '', matterName: ''
  });
  const [matterSearch, setMatterSearch] = useState('');
  const [matterResults, setMatterResults] = useState([]);
  const [searchingMatters, setSearchingMatters] = useState(false);
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (matterSearch.length >= 2) searchMatters(matterSearch);
      else setMatterResults([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [matterSearch]);

  const searchMatters = async (query) => {
    setSearchingMatters(true);
    try {
      const response = await masterListApi.search(query);
      setMatterResults(response.data.records || []);
      setShowMatterDropdown(true);
    } catch (error) {
      console.error('Failed to search matters:', error);
    } finally {
      setSearchingMatters(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Name is required'); return; }
    if (!formData.type) { toast.error('Type is required'); return; }

    setLoading(true);
    try {
      const data = { 'Name': formData.name.trim(), 'Type': formData.type };
      if (formData.streetAddress) data['Street Address'] = formData.streetAddress;
      if (formData.city) data['City'] = formData.city;
      if (formData.state) data['State'] = formData.state;
      if (formData.zipCode) data['Zip Code'] = formData.zipCode;
      if (formData.type === 'Heir' && formData.relationshipToDecedent) data['Relationship to Decedent'] = formData.relationshipToDecedent;
      if (formData.disabledMinor) data['Disabled/Minor?'] = true;
      if (formData.matterId) data['Link to Master List'] = [formData.matterId];

      await caseContactsApi.create(data);
      toast.success('Contact added successfully!');
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add contact'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name <span className="text-red-500">*</span></Label>
          <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Contact name" />
        </div>
        <div className="space-y-2">
          <Label>Type <span className="text-red-500">*</span></Label>
          <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>{CONTACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      {formData.type === 'Heir' && (
        <div className="space-y-2">
          <Label>Relationship to Decedent</Label>
          <Input value={formData.relationshipToDecedent} onChange={(e) => setFormData({...formData, relationshipToDecedent: e.target.value})} placeholder="e.g., Son, Daughter, Spouse" />
        </div>
      )}
      <div className="space-y-2">
        <Label>Street Address</Label>
        <Input value={formData.streetAddress} onChange={(e) => setFormData({...formData, streetAddress: e.target.value})} placeholder="Street address" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>City</Label>
          <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} placeholder="City" />
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Select value={formData.state} onValueChange={(v) => setFormData({...formData, state: v})}>
            <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent>{US_STATE_ABBREVIATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Zip Code</Label>
          <Input value={formData.zipCode} onChange={(e) => setFormData({...formData, zipCode: e.target.value})} placeholder="Zip" />
        </div>
      </div>
      <div className="space-y-2 relative">
        <Label>Link to Matter</Label>
        {formData.matterId ? (
          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
            <span className="flex-1 text-sm">{formData.matterName}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setFormData({...formData, matterId: '', matterName: ''}); setMatterSearch(''); }}><X className="w-4 h-4" /></Button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={matterSearch} onChange={(e) => setMatterSearch(e.target.value)} onFocus={() => setShowMatterDropdown(true)} placeholder="Search matters..." className="pl-9" />
            </div>
            {showMatterDropdown && matterResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {matterResults.map(m => (
                  <button key={m.id} type="button" onClick={() => { setFormData({...formData, matterId: m.id, matterName: m.fields?.['Matter Name'] || m.fields?.Client || 'Unknown'}); setMatterSearch(''); setShowMatterDropdown(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm">{m.fields?.['Matter Name'] || m.fields?.Client || 'Unknown'}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox checked={formData.disabledMinor} onCheckedChange={(v) => setFormData({...formData, disabledMinor: v})} />
        <Label>Disabled/Minor?</Label>
      </div>
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-full" disabled={loading}>Cancel</Button>
        <Button type="submit" className="flex-1 rounded-full bg-[#2E7DA1] hover:bg-[#246585]" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Adding...</> : <><Check className="w-4 h-4 mr-2" />Add Contact</>}
        </Button>
      </div>
    </form>
  );
};
END EXTRACTED TO SEPARATE FILE */

// ==================== Add Deadline Modal (Inline - TODO: Extract) ====================
const AddDeadlineModalContentInline = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ event: '', date: '', matterId: '', matterName: '', notes: '', allDayEvent: false, invitee: '', location: '' });
  const [matterSearch, setMatterSearch] = useState('');
  const [matterResults, setMatterResults] = useState([]);
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (matterSearch.length >= 2) searchMatters(matterSearch);
      else setMatterResults([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [matterSearch]);

  const searchMatters = async (query) => {
    try {
      const response = await masterListApi.search(query);
      setMatterResults(response.data.records || []);
      setShowMatterDropdown(true);
    } catch (error) {
      console.error('Failed to search matters:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.event) { toast.error('Event is required'); return; }
    if (!formData.date) { toast.error('Date is required'); return; }

    setLoading(true);
    try {
      const data = { 'Event': formData.event, 'Date': formData.date };
      if (formData.matterId) data['Link to Master List'] = [formData.matterId];
      if (formData.notes) data['Notes'] = formData.notes;
      if (formData.allDayEvent) data['All-Day Event?'] = true;
      if (formData.invitee) data['Invitee'] = formData.invitee;
      if (formData.location) data['Location'] = formData.location;

      await datesDeadlinesApi.create(data);
      toast.success('Deadline added successfully!');
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add deadline'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Event <span className="text-red-500">*</span></Label>
        <Input value={formData.event} onChange={(e) => setFormData({...formData, event: e.target.value})} placeholder="Event name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date <span className="text-red-500">*</span></Label>
          <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Location" />
        </div>
      </div>
      <div className="space-y-2 relative">
        <Label>Link to Matter</Label>
        {formData.matterId ? (
          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
            <span className="flex-1 text-sm">{formData.matterName}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setFormData({...formData, matterId: '', matterName: ''}); setMatterSearch(''); }}><X className="w-4 h-4" /></Button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={matterSearch} onChange={(e) => setMatterSearch(e.target.value)} onFocus={() => setShowMatterDropdown(true)} placeholder="Search matters..." className="pl-9" />
            </div>
            {showMatterDropdown && matterResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {matterResults.map(m => (
                  <button key={m.id} type="button" onClick={() => { setFormData({...formData, matterId: m.id, matterName: m.fields?.['Matter Name'] || m.fields?.Client || 'Unknown'}); setMatterSearch(''); setShowMatterDropdown(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm">{m.fields?.['Matter Name'] || m.fields?.Client || 'Unknown'}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>Invitee</Label>
        <Input value={formData.invitee} onChange={(e) => setFormData({...formData, invitee: e.target.value})} placeholder="Invitee name" />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox checked={formData.allDayEvent} onCheckedChange={(v) => setFormData({...formData, allDayEvent: v})} />
        <Label>All-Day Event</Label>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Additional notes..." rows={3} />
      </div>
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-full" disabled={loading}>Cancel</Button>
        <Button type="submit" className="flex-1 rounded-full bg-[#2E7DA1] hover:bg-[#246585]" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Adding...</> : <><Check className="w-4 h-4 mr-2" />Add Deadline</>}
        </Button>
      </div>
    </form>
  );
};

// ==================== Add Task Modal - EXTRACTED TO /modals/AddTaskModal.js ====================
/* EXTRACTED TO SEPARATE FILE
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
END EXTRACTED TO SEPARATE FILE */

// ==================== Phone Intake Modal (Tally Embed) ====================
const PhoneIntakeModalContentInline = ({ onClose }) => {
  useEffect(() => {
    const loadTallyScript = () => {
      if (typeof window.Tally !== 'undefined') {
        window.Tally.loadEmbeds();
      } else {
        const existingScript = document.querySelector('script[src="https://tally.so/widgets/embed.js"]');
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = 'https://tally.so/widgets/embed.js';
          script.onload = () => { if (typeof window.Tally !== 'undefined') window.Tally.loadEmbeds(); };
          script.onerror = () => {
            const iframes = document.querySelectorAll('iframe[data-tally-src]:not([src])');
            iframes.forEach((iframe) => { iframe.src = iframe.dataset.tallySrc; });
          };
          document.body.appendChild(script);
        }
      }
    };
    loadTallyScript();
  }, []);

  return (
    <div className="min-h-[600px]">
      <iframe
        data-tally-src="https://tally.so/embed/wM90gA?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
        loading="lazy"
        width="100%"
        height="700"
        frameBorder="0"
        marginHeight="0"
        marginWidth="0"
        title="Call Intake"
        className="w-full"
      />
    </div>
  );
};

// ==================== Case Update Modal (Inline - TODO: Extract) ====================
const METHOD_OPTIONS = ['Email', 'Phone', 'Text Message', 'Portal', 'Mail', 'In Person', 'Other'];

const CaseUpdateModalContentInline = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ message: '', method: '' });
  const [matterSearchQuery, setMatterSearchQuery] = useState('');
  const [matterSearchResults, setMatterSearchResults] = useState([]);
  const [searchingMatters, setSearchingMatters] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const searchMatters = async (query) => {
    if (!query || query.length < 2) { setMatterSearchResults([]); return; }
    setSearchingMatters(true);
    try {
      const response = await masterListApi.search(query);
      setMatterSearchResults(response.data.records || []);
    } catch (error) {
      console.error('Failed to search matters:', error);
    } finally {
      setSearchingMatters(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const response = await filesApi.upload(file);
      // Construct full public URL for Airtable
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const fullUrl = backendUrl + response.data.url;
      setUploadedFiles(prev => [...prev, { name: file.name, url: fullUrl }]);
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('File upload error:', error);
      toast.error(getErrorMessage(error, 'Failed to upload file'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMatter) { toast.error('Please select a matter'); return; }
    if (!formData.message.trim()) { toast.error('Message is required'); return; }
    if (!formData.method) { toast.error('Method is required'); return; }

    setLoading(true);
    try {
      const data = {
        matter: [selectedMatter.id],
        message: formData.message.trim(),
        method: formData.method
      };
      
      // Add files if any uploaded
      if (uploadedFiles.length > 0) {
        data.files = uploadedFiles.map(f => ({ url: f.url, filename: f.name }));
      }

      await caseUpdatesApi.create(data);
      toast.success('Case update sent successfully!');
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to send case update'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2 relative">
        <Label>Select Matter <span className="text-red-500">*</span></Label>
        {selectedMatter ? (
          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
            <span className="flex-1 text-sm">{selectedMatter.fields?.['Matter Name'] || selectedMatter.fields?.Client || 'Unknown'}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedMatter(null); setMatterSearchQuery(''); }}><X className="w-4 h-4" /></Button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={matterSearchQuery} onChange={(e) => { setMatterSearchQuery(e.target.value); searchMatters(e.target.value); }} placeholder="Search matters..." className="pl-9" />
            </div>
            {matterSearchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {matterSearchResults.map(m => (
                  <button key={m.id} type="button" onClick={() => { setSelectedMatter(m); setMatterSearchQuery(''); setMatterSearchResults([]); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm">{m.fields?.['Matter Name'] || m.fields?.Client || 'Unknown'}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>Method <span className="text-red-500">*</span></Label>
        <Select value={formData.method} onValueChange={(v) => setFormData({...formData, method: v})}>
          <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
          <SelectContent>{METHOD_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Message <span className="text-red-500">*</span></Label>
        <Textarea value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} placeholder="Enter case update message..." rows={4} />
      </div>
      <div className="space-y-2">
        <Label>Files</Label>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        {uploadedFiles.length > 0 && (
          <div className="space-y-2 mb-2">
            {uploadedFiles.map((f, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
                <File className="w-4 h-4 text-slate-600" />
                <span className="flex-1 text-sm truncate">{f.name}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}><X className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
        )}
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full">
          {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading...</> : <><Upload className="w-4 h-4 mr-2" />Add File</>}
        </Button>
      </div>
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-full" disabled={loading}>Cancel</Button>
        <Button type="submit" className="flex-1 rounded-full bg-[#2E7DA1] hover:bg-[#246585]" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</> : <><Check className="w-4 h-4 mr-2" />Send Update</>}
        </Button>
      </div>
    </form>
  );
};

// ==================== Send Invoice Modal (Inline - TODO: Extract) ====================
const SendInvoiceModalContentInline = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ service: '', amount: '', notes: '' });
  const [matterSearchQuery, setMatterSearchQuery] = useState('');
  const [matterSearchResults, setMatterSearchResults] = useState([]);
  const [selectedMatters, setSelectedMatters] = useState([]);

  const searchMatters = async (query) => {
    if (!query || query.length < 2) { setMatterSearchResults([]); return; }
    try {
      const response = await masterListApi.search(query);
      const selectedIds = selectedMatters.map(m => m.id);
      const filtered = (response.data.records || []).filter(r => !selectedIds.includes(r.id));
      setMatterSearchResults(filtered);
    } catch (error) {
      console.error('Failed to search matters:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.service.trim()) { toast.error('Service is required'); return; }
    if (!formData.amount) { toast.error('Amount is required'); return; }
    if (selectedMatters.length === 0) { toast.error('Please select at least one matter'); return; }

    setLoading(true);
    try {
      // Use camelCase keys to match backend InvoiceCreate model
      const data = {
        service: formData.service.trim(),
        amount: parseFloat(formData.amount),
        master_list: selectedMatters.map(m => m.id)
      };
      if (formData.notes) data.notes = formData.notes;

      await invoicesApi.create(data);
      toast.success('Invoice sent successfully!');
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to send invoice'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2 relative">
        <Label>Select Matters <span className="text-red-500">*</span></Label>
        {selectedMatters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedMatters.map(m => (
              <Badge key={m.id} variant="secondary" className="flex items-center gap-1">
                {m.fields?.['Matter Name'] || m.fields?.Client || 'Unknown'}
                <button type="button" onClick={() => setSelectedMatters(selectedMatters.filter(sm => sm.id !== m.id))}><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={matterSearchQuery} onChange={(e) => { setMatterSearchQuery(e.target.value); searchMatters(e.target.value); }} placeholder="Search and add matters..." className="pl-9" />
        </div>
        {matterSearchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {matterSearchResults.map(m => (
              <button key={m.id} type="button" onClick={() => { setSelectedMatters([...selectedMatters, m]); setMatterSearchQuery(''); setMatterSearchResults([]); }}
                className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm">{m.fields?.['Matter Name'] || m.fields?.Client || 'Unknown'}</button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>Service <span className="text-red-500">*</span></Label>
        <Input value={formData.service} onChange={(e) => setFormData({...formData, service: e.target.value})} placeholder="Service description" />
      </div>
      <div className="space-y-2">
        <Label>Amount <span className="text-red-500">*</span></Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
          <Input type="text" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value.replace(/[^0-9.]/g, '')})} placeholder="0.00" className="pl-7" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Additional notes..." rows={3} />
      </div>
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-full" disabled={loading}>Cancel</Button>
        <Button type="submit" className="flex-1 rounded-full bg-[#2E7DA1] hover:bg-[#246585]" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</> : <><Check className="w-4 h-4 mr-2" />Send Invoice</>}
        </Button>
      </div>
    </form>
  );
};

// ==================== Send Mail Modal (Inline - TODO: Extract) ====================
const MAILING_SPEEDS = [
  { value: 'first_class', label: 'First Class' },
  { value: 'priority', label: 'Priority Mail' },
  { value: 'express', label: 'Express Mail' },
  { value: 'certified', label: 'Certified Mail' },
  { value: 'registered', label: 'Registered Mail' },
  { value: 'standard_class', label: 'Standard' },
  { value: 'overnight', label: 'Overnight' }
];

const SendMailModalContentInline = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({ recipientName: '', whatIsBeingMailed: '', matterId: '', matterName: '', streetAddress: '', city: '', state: '', zipCode: '', mailingSpeed: '' });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [matterSearch, setMatterSearch] = useState('');
  const [matterResults, setMatterResults] = useState([]);
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (matterSearch.length >= 2) searchMatters(matterSearch);
      else setMatterResults([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [matterSearch]);

  const searchMatters = async (query) => {
    try {
      const response = await masterListApi.search(query);
      setMatterResults(response.data.records || []);
      setShowMatterDropdown(true);
    } catch (error) {
      console.error('Failed to search matters:', error);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const response = await filesApi.upload(file);
      // Construct full public URL for Airtable - it needs to fetch the file
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const fullUrl = backendUrl + response.data.url;
      setUploadedFile({ name: file.name, url: fullUrl });
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('File upload error:', error);
      toast.error(getErrorMessage(error, 'Failed to upload file'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.recipientName.trim()) { toast.error('Recipient name is required'); return; }
    if (!formData.whatIsBeingMailed.trim()) { toast.error('What is being mailed is required'); return; }

    setLoading(true);
    try {
      // Use camelCase field names to match backend MailCreate model
      const data = {
        recipientName: formData.recipientName.trim(),
        whatIsBeingMailed: formData.whatIsBeingMailed.trim()
      };
      if (formData.matterId) data.matterId = formData.matterId;
      if (formData.streetAddress) data.streetAddress = formData.streetAddress;
      if (formData.city) data.city = formData.city;
      if (formData.state) data.state = formData.state;
      if (formData.zipCode) data.zipCode = formData.zipCode;
      if (formData.mailingSpeed) data.mailingSpeed = formData.mailingSpeed;
      if (uploadedFile) {
        data.fileUrl = uploadedFile.url;
        data.fileName = uploadedFile.name;
      }

      await mailApi.create(data);
      toast.success('Mail request submitted successfully!');
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to submit mail request'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Recipient Name <span className="text-red-500">*</span></Label>
        <Input value={formData.recipientName} onChange={(e) => setFormData({...formData, recipientName: e.target.value})} placeholder="Recipient's full name" />
      </div>
      <div className="space-y-2 relative">
        <Label>Link to Matter</Label>
        {formData.matterId ? (
          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
            <span className="flex-1 text-sm">{formData.matterName}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setFormData({...formData, matterId: '', matterName: ''}); setMatterSearch(''); }}><X className="w-4 h-4" /></Button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={matterSearch} onChange={(e) => setMatterSearch(e.target.value)} onFocus={() => setShowMatterDropdown(true)} placeholder="Search matters..." className="pl-9" />
            </div>
            {showMatterDropdown && matterResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {matterResults.map(m => (
                  <button key={m.id} type="button" onClick={() => { setFormData({...formData, matterId: m.id, matterName: m.fields?.['Matter Name'] || m.fields?.Client || 'Unknown'}); setMatterSearch(''); setShowMatterDropdown(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm">{m.fields?.['Matter Name'] || m.fields?.Client || 'Unknown'}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>Street Address</Label>
        <Input value={formData.streetAddress} onChange={(e) => setFormData({...formData, streetAddress: e.target.value})} placeholder="Street address" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>City</Label>
          <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} placeholder="City" />
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Select value={formData.state} onValueChange={(v) => setFormData({...formData, state: v})}>
            <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent className="max-h-48">{US_STATE_ABBREVIATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Zip Code</Label>
          <Input value={formData.zipCode} onChange={(e) => setFormData({...formData, zipCode: e.target.value})} placeholder="Zip" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Mailing Speed</Label>
        <Select value={formData.mailingSpeed} onValueChange={(v) => setFormData({...formData, mailingSpeed: v})}>
          <SelectTrigger><SelectValue placeholder="Select speed" /></SelectTrigger>
          <SelectContent>{MAILING_SPEEDS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>What is being mailed? <span className="text-red-500">*</span></Label>
        <Textarea value={formData.whatIsBeingMailed} onChange={(e) => setFormData({...formData, whatIsBeingMailed: e.target.value})} placeholder="Describe what is being mailed..." rows={3} />
      </div>
      <div className="space-y-2">
        <Label>Attachment</Label>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        {uploadedFile ? (
          <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg">
            <File className="w-5 h-5 text-slate-600" />
            <span className="flex-1 text-sm truncate">{uploadedFile.name}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setUploadedFile(null)}><X className="w-4 h-4" /></Button>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading...</> : <><Upload className="w-4 h-4 mr-2" />Upload File</>}
          </Button>
        )}
      </div>
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-full" disabled={loading}>Cancel</Button>
        <Button type="submit" className="flex-1 rounded-full bg-[#2E7DA1] hover:bg-[#246585]" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting...</> : <><Check className="w-4 h-4 mr-2" />Send Mail</>}
        </Button>
      </div>
    </form>
  );
};

// ==================== Upload File Modal (Inline - TODO: Extract) ====================
const UploadFileModalContentInline = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ documentName: '' });
  const [matterSearchQuery, setMatterSearchQuery] = useState('');
  const [matterSearchResults, setMatterSearchResults] = useState([]);
  const [selectedMatter, setSelectedMatter] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  const searchMatters = async (query) => {
    if (!query || query.length < 2) { setMatterSearchResults([]); return; }
    try {
      const response = await masterListApi.search(query);
      setMatterSearchResults(response.data.records || []);
    } catch (error) {
      console.error('Failed to search matters:', error);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const response = await filesApi.upload(file);
      // Construct full public URL for Airtable
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const fullUrl = backendUrl + response.data.url;
      setUploadedFile({ name: file.name, url: fullUrl });
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('File upload error:', error);
      toast.error(getErrorMessage(error, 'Failed to upload file'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.documentName.trim()) { toast.error('Document Name is required'); return; }

    setLoading(true);
    try {
      const data = { 
        name: formData.documentName.trim()
      };
      if (selectedMatter) {
        data.master_list_id = selectedMatter.id;
      }
      if (uploadedFile) {
        data.document_url = uploadedFile.url;
        data.document_filename = uploadedFile.name;
      }

      await documentsApi.create(data);
      toast.success('Document uploaded successfully!');
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to upload document'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Document Name <span className="text-red-500">*</span></Label>
        <Input value={formData.documentName} onChange={(e) => setFormData({...formData, documentName: e.target.value})} placeholder="Enter document name" />
      </div>
      <div className="space-y-2 relative">
        <Label>Matter</Label>
        {selectedMatter ? (
          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
            <span className="flex-1 text-sm">{selectedMatter.fields?.['Matter Name'] || selectedMatter.fields?.Client || 'Unknown'}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedMatter(null); setMatterSearchQuery(''); }}><X className="w-4 h-4" /></Button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={matterSearchQuery} onChange={(e) => { setMatterSearchQuery(e.target.value); searchMatters(e.target.value); }} placeholder="Search matters..." className="pl-9" />
            </div>
            {matterSearchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {matterSearchResults.map(m => (
                  <button key={m.id} type="button" onClick={() => { setSelectedMatter(m); setMatterSearchQuery(''); setMatterSearchResults([]); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm">{m.fields?.['Matter Name'] || m.fields?.Client || 'Unknown'}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>Document</Label>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        {uploadedFile ? (
          <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg">
            <File className="w-5 h-5 text-slate-600" />
            <span className="flex-1 text-sm truncate">{uploadedFile.name}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setUploadedFile(null)}><X className="w-4 h-4" /></Button>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading...</> : <><Upload className="w-4 h-4 mr-2" />Upload File</>}
          </Button>
        )}
      </div>
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-full" disabled={loading}>Cancel</Button>
        <Button type="submit" className="flex-1 rounded-full bg-[#2E7DA1] hover:bg-[#246585]" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading...</> : <><Check className="w-4 h-4 mr-2" />Upload Document</>}
        </Button>
      </div>
    </form>
  );
};

export default ActionModals;
