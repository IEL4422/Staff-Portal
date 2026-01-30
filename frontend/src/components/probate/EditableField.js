/**
 * EditableField - A reusable inline editable field component
 * Used in case detail pages to allow editing of single fields
 */

import React from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DatePicker } from '../ui/date-picker';

// Boolean fields that should show Yes/No options
const BOOLEAN_FIELDS = ['Is there a will?', 'Portal Invite Sent', 'Portal Notifications', 'Paid?'];

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
 * Format date for display
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return dateStr;
  }
};

/**
 * EditableField Component
 * 
 * @param {Object} props
 * @param {string} props.label - Field label
 * @param {string} props.field - Field name for data mapping
 * @param {any} props.value - Current field value
 * @param {React.ComponentType} props.icon - Icon component to display
 * @param {string} props.type - Field type: 'text', 'date', 'currency', 'select', 'boolean'
 * @param {string[]} props.options - Options for select type
 * @param {boolean} props.isEditing - Whether this field is being edited
 * @param {string} props.editValue - Current edit value
 * @param {Function} props.onStartEdit - Called when edit starts
 * @param {Function} props.onSaveEdit - Called to save the edit
 * @param {Function} props.onCancelEdit - Called to cancel the edit
 * @param {Function} props.onEditValueChange - Called when edit value changes
 * @param {boolean} props.saving - Whether a save is in progress
 */
const EditableField = ({
  label,
  field,
  value,
  icon: Icon,
  type = 'text',
  options,
  isEditing,
  editValue,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  saving = false
}) => {
  // Determine display value based on type
  const getDisplayValue = () => {
    if (type === 'currency') return formatCurrency(value);
    if (type === 'date') return formatDate(value);
    if (BOOLEAN_FIELDS.includes(field)) {
      if (value === true || value === 'Yes') return 'Yes';
      if (value === false || value === 'No') return 'No';
      return value || '—';
    }
    return value || '—';
  };

  // Determine the input type for editing
  const getInputType = () => {
    if (options) return 'select';
    if (BOOLEAN_FIELDS.includes(field)) return 'boolean';
    if (type === 'date') return 'date';
    if (type === 'currency') return 'number';
    return 'text';
  };

  const inputType = getInputType();

  // Handle edit start with proper value conversion
  const handleStartEdit = () => {
    let initialValue = value;
    if (BOOLEAN_FIELDS.includes(field)) {
      initialValue = value === true ? 'Yes' : value === false ? 'No' : (value || 'No');
    } else if (type === 'date' && value) {
      // Convert date to YYYY-MM-DD format for date input
      try {
        const date = new Date(value);
        initialValue = date.toISOString().split('T')[0];
      } catch {
        initialValue = value;
      }
    }
    onStartEdit(field, initialValue);
  };

  // Render the edit input based on type
  const renderEditInput = () => {
    if (inputType === 'select') {
      return (
        <Select value={editValue} onValueChange={onEditValueChange}>
          <SelectTrigger className="h-9 flex-1">
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    if (inputType === 'boolean') {
      return (
        <Select value={editValue} onValueChange={onEditValueChange}>
          <SelectTrigger className="h-9 flex-1">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Yes">Yes</SelectItem>
            <SelectItem value="No">No</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    
    if (inputType === 'date') {
      return (
        <Input
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          className="h-9 flex-1"
          autoFocus
          type="date"
        />
      );
    }

    if (inputType === 'number') {
      return (
        <Input
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          className="h-9 flex-1"
          autoFocus
          type="number"
          step="0.01"
        />
      );
    }
    
    return (
      <Input
        value={editValue}
        onChange={(e) => onEditValueChange(e.target.value)}
        className="h-9 flex-1"
        autoFocus
        type="text"
      />
    );
  };

  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          {Icon && <Icon className="w-4 h-4" />}
          {label}
        </div>
        {!isEditing && (
          <button
            onClick={handleStartEdit}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
            data-testid={`edit-${field.toLowerCase().replace(/\s+/g, '-')}-btn`}
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="flex items-center gap-2 mt-1">
          {renderEditInput()}
          <Button 
            size="sm" 
            onClick={onSaveEdit} 
            disabled={saving} 
            className="h-9 w-9 p-0 bg-[#2E7DA1]"
            data-testid={`save-${field.toLowerCase().replace(/\s+/g, '-')}-btn`}
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onCancelEdit} 
            className="h-9 w-9 p-0"
            data-testid={`cancel-${field.toLowerCase().replace(/\s+/g, '-')}-btn`}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <p className="font-medium text-slate-900 mt-1">{getDisplayValue()}</p>
      )}
    </div>
  );
};

/**
 * ReadOnlyField - A simpler read-only display component
 */
export const ReadOnlyField = ({ label, value, icon: Icon, type = 'text' }) => {
  const displayValue = type === 'currency' 
    ? formatCurrency(value) 
    : (type === 'date' ? formatDate(value) : value);
    
  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </div>
      <p className="font-medium text-slate-900 mt-1">{displayValue || '—'}</p>
    </div>
  );
};

export default EditableField;
