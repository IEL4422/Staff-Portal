/**
 * AssetDebtModal - Modal for viewing and editing Asset/Debt records
 * Enhanced with Matter field support and file upload
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, Edit2, Trash2, Download, Eye, Search, ExternalLink, Upload } from 'lucide-react';

// Asset/Debt type options
const ASSET_TYPE_OPTIONS = [
  'Bank Account', 'Real Estate', 'Vehicle', 'Stocks/Bonds', 'Retirement Account',
  'Life Insurance', 'Unclaimed Property', 'Personal Property', 'Other'
];

const DEBT_TYPE_OPTIONS = ['Credit Card', 'Loan', 'Mortgage', 'Medical Debt', 'Other'];

const STATUS_OPTIONS = [
  'Found', 'Reported by Client', 'Transferred to Estate Bank Account', 'Claim Paid',
  'Contesting Claim', 'Abandoned', 'To Be Sold', 'Sold', 'Not Found'
];

/**
 * Format currency value for display
 */
const formatCurrency = (value) => {
  if (!value && value !== 0) return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
};

/**
 * AssetDebtModal Component
 * 
 * @param {Object} props
 * @param {Object} props.selectedItem - The selected asset/debt record
 * @param {boolean} props.isEditing - Whether in edit mode
 * @param {Object} props.formData - Form data when editing
 * @param {boolean} props.saving - Whether save is in progress
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onStartEdit - Start edit handler
 * @param {Function} props.onCancelEdit - Cancel edit handler
 * @param {Function} props.onSave - Save handler
 * @param {Function} props.onDelete - Delete handler
 * @param {Function} props.onFormChange - Form change handler
 * @param {Array} props.matters - Available matters for linking (optional)
 * @param {Object} props.matterNames - Map of matter IDs to names (optional)
 * @param {boolean} props.showMatterField - Whether to show the Matter field (default: true)
 * @param {Function} props.onNavigateToMatter - Navigate to matter handler (optional)
 */
const AssetDebtModal = ({
  selectedItem,
  isEditing,
  formData,
  saving,
  onClose,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onFormChange,
  matters = [],
  matterNames = {},
  showMatterField = true,
  onNavigateToMatter
}) => {
  const [matterSearch, setMatterSearch] = useState('');
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);

  if (!selectedItem) return null;
  
  const fields = selectedItem.fields || {};
  
  // Get linked matter info
  const linkedMatterIds = fields.Matters || [];
  const linkedMatterName = linkedMatterIds.length > 0 
    ? (matterNames[linkedMatterIds[0]] || 'Unknown Matter')
    : '—';

  // Filter matters for search
  const filteredMatters = matters.filter(m => {
    const name = m.fields?.['Matter Name'] || m.fields?.Client || '';
    return name.toLowerCase().includes(matterSearch.toLowerCase());
  }).slice(0, 10);

  return (
    <Dialog open={!!selectedItem} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="asset-debt-modal">
        <DialogHeader>
          <DialogTitle data-testid="asset-debt-modal-title">
            {isEditing ? 'Edit Asset/Debt' : 'Asset/Debt Details'}
          </DialogTitle>
        </DialogHeader>
        
        {/* View Mode */}
        {!isEditing && (
          <div className="space-y-4" data-testid="asset-debt-view-mode">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-500 text-xs">Name</Label>
                <p className="font-medium" data-testid="asset-debt-name">
                  {fields['Name of Asset/Debt'] || fields['Name of Asset'] || fields.Name || '—'}
                </p>
              </div>
              <div>
                <Label className="text-slate-500 text-xs">Type</Label>
                <Badge 
                  variant="outline" 
                  className={(fields['Asset or Debt?'] || fields['Asset or Debt']) === 'Asset' 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-700'}
                  data-testid="asset-debt-type"
                >
                  {fields['Asset or Debt?'] || fields['Asset or Debt'] || '—'}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-500 text-xs">Status</Label>
                <Badge 
                  variant="outline" 
                  className={fields.Status === 'Found' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                  data-testid="asset-debt-status"
                >
                  {fields.Status || '—'}
                </Badge>
              </div>
              <div>
                <Label className="text-slate-500 text-xs">Value</Label>
                <p className="font-medium text-lg" data-testid="asset-debt-value">
                  {formatCurrency(fields.Value)}
                </p>
              </div>
            </div>
            {(fields['Asset or Debt?'] === 'Asset' || fields['Asset or Debt'] === 'Asset') && (
              <div>
                <Label className="text-slate-500 text-xs">Type of Asset</Label>
                <p className="font-medium">{fields['Type of Asset'] || '—'}</p>
              </div>
            )}
            {(fields['Asset or Debt?'] === 'Debt' || fields['Asset or Debt'] === 'Debt') && (
              <div>
                <Label className="text-slate-500 text-xs">Type of Debt</Label>
                <p className="font-medium">{fields['Type of Debt'] || '—'}</p>
              </div>
            )}
            {showMatterField && (
              <div>
                <Label className="text-slate-500 text-xs">Matter</Label>
                {linkedMatterIds.length > 0 && onNavigateToMatter ? (
                  <button 
                    onClick={() => onNavigateToMatter(linkedMatterIds[0])}
                    className="font-medium text-[#2E7DA1] hover:underline flex items-center gap-1"
                  >
                    {linkedMatterName}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                ) : (
                  <p className="font-medium">{linkedMatterName}</p>
                )}
              </div>
            )}
            <div>
              <Label className="text-slate-500 text-xs">Notes</Label>
              <p className="font-medium">{fields.Notes || '—'}</p>
            </div>
            {/* Attachments */}
            {(fields.Attachments || fields['Upload File'] || fields.Files) && (
              <div>
                <Label className="text-slate-500 text-xs">Attachments</Label>
                <div className="mt-2 space-y-2">
                  {(fields.Attachments || fields['Upload File'] || fields.Files || []).map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm truncate flex-1">{file.filename || 'Attachment'}</span>
                      <div className="flex gap-1">
                        {file.url && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => window.open(file.url, '_blank')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = file.url;
                                link.download = file.filename || 'download';
                                link.click();
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Edit Mode */}
        {isEditing && (
          <div className="space-y-4" data-testid="asset-debt-edit-mode">
            <div className="space-y-2">
              <Label>Name of Asset/Debt</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => onFormChange({...formData, name: e.target.value})}
                placeholder="Name of asset or debt"
                data-testid="asset-debt-name-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Asset or Debt</Label>
                <Select 
                  value={formData.assetOrDebt || ''} 
                  onValueChange={(v) => onFormChange({...formData, assetOrDebt: v})}
                >
                  <SelectTrigger data-testid="asset-debt-type-select">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asset">Asset</SelectItem>
                    <SelectItem value="Debt">Debt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status || ''} 
                  onValueChange={(v) => onFormChange({...formData, status: v})}
                >
                  <SelectTrigger data-testid="asset-debt-status-select">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  value={formData.value || ''}
                  onChange={(e) => onFormChange({...formData, value: e.target.value})}
                  placeholder="0.00"
                  data-testid="asset-debt-value-input"
                />
              </div>
              {(formData.assetOrDebt === 'Asset' || !formData.assetOrDebt) ? (
                <div className="space-y-2">
                  <Label>Type of Asset</Label>
                  <Select 
                    value={formData.typeOfAsset || ''} 
                    onValueChange={(v) => onFormChange({...formData, typeOfAsset: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPE_OPTIONS.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Type of Debt</Label>
                  <Select 
                    value={formData.typeOfDebt || ''} 
                    onValueChange={(v) => onFormChange({...formData, typeOfDebt: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEBT_TYPE_OPTIONS.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {/* Matter Field (Linked Field) */}
            {showMatterField && matters.length > 0 && (
              <div className="space-y-2">
                <Label>Matter</Label>
                <div className="relative">
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
                      className="pl-9"
                    />
                  </div>
                  {showMatterDropdown && filteredMatters.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredMatters.map(m => (
                        <button
                          key={m.id}
                          className="w-full px-3 py-2 text-left hover:bg-slate-100 text-sm"
                          onClick={() => {
                            onFormChange({...formData, matterId: m.id});
                            setMatterSearch(m.fields?.['Matter Name'] || m.fields?.Client || 'Selected');
                            setShowMatterDropdown(false);
                          }}
                        >
                          {m.fields?.['Matter Name'] || m.fields?.Client || 'Unknown'}
                          <span className="text-xs text-slate-400 ml-2">
                            {m.fields?.['Type of Case']}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {formData.matterId && (
                  <p className="text-xs text-slate-500">
                    Selected: {matterNames[formData.matterId] || 'Matter selected'}
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => onFormChange({...formData, notes: e.target.value})}
                placeholder="Enter notes..."
                rows={3}
                data-testid="asset-debt-notes-input"
              />
            </div>
          </div>
        )}
        
        <DialogFooter className="flex justify-between">
          {!isEditing ? (
            <>
              <div className="flex gap-2">
                {onDelete && (
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={() => {
                      onDelete(selectedItem.id);
                      onClose();
                    }}
                    data-testid="asset-debt-delete-btn"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={onStartEdit}
                  data-testid="asset-debt-edit-btn"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" onClick={onClose}>Close</Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onCancelEdit}>Cancel</Button>
              <Button 
                onClick={onSave} 
                disabled={saving}
                className="bg-[#2E7DA1] hover:bg-[#246585]"
                data-testid="asset-debt-save-btn"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssetDebtModal;
