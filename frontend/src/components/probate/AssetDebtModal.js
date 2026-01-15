/**
 * AssetDebtModal - Modal for viewing and editing Asset/Debt records
 * Enhanced with Matter field support and file upload
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, Edit2, Trash2, Download, Eye, Search, ExternalLink, Upload, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { assetsDebtsApi } from '../../services/api';

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
 * Convert file to base64
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * AssetDebtModal Component
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
  onNavigateToMatter,
  onAttachmentUploaded
}) => {
  const [matterSearch, setMatterSearch] = useState('');
  const [showMatterDropdown, setShowMatterDropdown] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);

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

  // Get existing attachments
  const existingAttachments = fields.Attachments || fields['Upload File'] || fields.Files || [];

  // Handle file selection
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPendingFiles = [];
    for (const file of files) {
      try {
        const base64 = await fileToBase64(file);
        newPendingFiles.push({
          file,
          name: file.name,
          size: file.size,
          base64,
          status: 'pending'
        });
      } catch (error) {
        console.error('Failed to read file:', error);
        toast.error(`Failed to read file: ${file.name}`);
      }
    }
    setPendingFiles(prev => [...prev, ...newPendingFiles]);
    
    // Clear the input
    e.target.value = '';
  };

  // Remove pending file
  const removePendingFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload a single file
  const uploadFile = async (fileData) => {
    try {
      await assetsDebtsApi.uploadAttachment(
        selectedItem.id,
        fileData.name,
        fileData.base64,
        'Attachments'
      );
      return true;
    } catch (error) {
      console.error('Failed to upload file:', error);
      return false;
    }
  };

  // Upload all pending files
  const handleUploadFiles = async () => {
    if (pendingFiles.length === 0) return;
    
    setUploadingFile(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pendingFiles.length; i++) {
      const fileData = pendingFiles[i];
      setPendingFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'uploading' } : f
      ));

      const success = await uploadFile(fileData);
      
      if (success) {
        successCount++;
        setPendingFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'uploaded' } : f
        ));
      } else {
        failCount++;
        setPendingFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'failed' } : f
        ));
      }
    }

    setUploadingFile(false);

    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded successfully`);
      // Clear uploaded files from pending
      setPendingFiles(prev => prev.filter(f => f.status !== 'uploaded'));
      // Notify parent to refresh data
      if (onAttachmentUploaded) {
        onAttachmentUploaded(selectedItem.id);
      }
    }
    if (failCount > 0) {
      toast.error(`${failCount} file(s) failed to upload`);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={!!selectedItem} onOpenChange={(open) => {
      if (!open) {
        setPendingFiles([]);
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
            {existingAttachments.length > 0 && (
              <div>
                <Label className="text-slate-500 text-xs">Attachments ({existingAttachments.length})</Label>
                <div className="mt-2 space-y-2">
                  {existingAttachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm truncate">{file.filename || 'Attachment'}</span>
                      </div>
                      <div className="flex gap-1">
                        {file.url && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => window.open(file.url, '_blank')}
                              title="View"
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
                              title="Download"
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

            {/* File Upload Section */}
            <div className="space-y-2">
              <Label>Attachments</Label>
              
              {/* Existing Attachments */}
              {existingAttachments.length > 0 && (
                <div className="space-y-1 mb-2">
                  <p className="text-xs text-slate-500">Existing files ({existingAttachments.length})</p>
                  {existingAttachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="truncate flex-1">{file.filename || 'Attachment'}</span>
                      {file.url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* File Input */}
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:border-[#2E7DA1] transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  data-testid="file-upload-input"
                />
                <label 
                  htmlFor="file-upload" 
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    Click to upload files
                  </span>
                  <span className="text-xs text-slate-400">
                    PDF, Images, Documents
                  </span>
                </label>
              </div>

              {/* Pending Files */}
              {pendingFiles.length > 0 && (
                <div className="space-y-2 mt-2">
                  <p className="text-xs text-slate-500">Files to upload ({pendingFiles.length})</p>
                  {pendingFiles.map((file, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center gap-2 p-2 rounded text-sm ${
                        file.status === 'uploaded' ? 'bg-green-50' :
                        file.status === 'failed' ? 'bg-red-50' :
                        file.status === 'uploading' ? 'bg-blue-50' :
                        'bg-slate-50'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{file.name}</p>
                        <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                      </div>
                      {file.status === 'uploading' && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      )}
                      {file.status === 'uploaded' && (
                        <span className="text-xs text-green-600">Uploaded</span>
                      )}
                      {file.status === 'failed' && (
                        <span className="text-xs text-red-600">Failed</span>
                      )}
                      {file.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => removePendingFile(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    size="sm"
                    onClick={handleUploadFiles}
                    disabled={uploadingFile || pendingFiles.every(f => f.status !== 'pending')}
                    className="w-full bg-[#2E7DA1] hover:bg-[#246585]"
                    data-testid="upload-files-btn"
                  >
                    {uploadingFile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload {pendingFiles.filter(f => f.status === 'pending').length} File(s)
                      </>
                    )}
                  </Button>
                </div>
              )}
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
