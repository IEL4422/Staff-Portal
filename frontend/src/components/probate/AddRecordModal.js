/**
 * AddRecordModal - A generic modal for adding records with dynamic fields
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2 } from 'lucide-react';

/**
 * AddRecordModal Component
 * 
 * A flexible modal component that renders a form based on field configuration
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Modal title
 * @param {boolean} props.loading - Whether form is submitting
 * @param {Function} props.onSubmit - Form submission handler
 * @param {Array} props.fields - Field configuration array
 * 
 * Field config shape:
 * {
 *   name: string,
 *   label: string,
 *   type: 'text' | 'select' | 'date' | 'textarea' | 'number' | 'file',
 *   required?: boolean,
 *   options?: string[],
 *   defaultValue?: any,
 *   placeholder?: string
 * }
 */
const AddRecordModal = ({ 
  open, 
  onClose, 
  title, 
  loading, 
  onSubmit, 
  fields = [] 
}) => {
  // Initialize form data with default values
  const getInitialFormData = () => {
    const data = {};
    fields.forEach(field => {
      data[field.name] = field.defaultValue || '';
    });
    return data;
  };

  const [formData, setFormData] = useState(getInitialFormData);
  const [fileData, setFileData] = useState({});

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setFormData(getInitialFormData());
      setFileData({});
    }
  }, [open]);

  const handleFieldChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (name, file) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileData(prev => ({
          ...prev,
          [name]: {
            file,
            data: reader.result.split(',')[1], // Base64 without prefix
            name: file.name
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    // Combine form data with file data
    const submitData = { ...formData };
    Object.keys(fileData).forEach(key => {
      submitData[key] = fileData[key];
    });
    
    await onSubmit(submitData);
    setFormData(getInitialFormData());
    setFileData({});
  };

  const renderField = (field) => {
    const { name, label, type, required, options, placeholder } = field;

    switch (type) {
      case 'select':
        return (
          <div key={name} className="space-y-2">
            <Label htmlFor={name}>
              {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <Select 
              value={formData[name] || ''} 
              onValueChange={(v) => handleFieldChange(name, v)}
            >
              <SelectTrigger id={name} data-testid={`${name}-select`}>
                <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {options?.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'textarea':
        return (
          <div key={name} className="space-y-2">
            <Label htmlFor={name}>
              {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={name}
              value={formData[name] || ''}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              placeholder={placeholder}
              rows={3}
              data-testid={`${name}-textarea`}
            />
          </div>
        );

      case 'date':
        return (
          <div key={name} className="space-y-2">
            <Label htmlFor={name}>
              {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={name}
              type="date"
              value={formData[name] || ''}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              data-testid={`${name}-date`}
            />
          </div>
        );

      case 'number':
        return (
          <div key={name} className="space-y-2">
            <Label htmlFor={name}>
              {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={name}
              type="number"
              value={formData[name] || ''}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              placeholder={placeholder}
              step="0.01"
              data-testid={`${name}-number`}
            />
          </div>
        );

      case 'file':
        return (
          <div key={name} className="space-y-2">
            <Label htmlFor={name}>
              {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={name}
              type="file"
              onChange={(e) => handleFileChange(name, e.target.files?.[0])}
              data-testid={`${name}-file`}
            />
            {fileData[name] && (
              <p className="text-sm text-slate-500">{fileData[name].name}</p>
            )}
          </div>
        );

      default: // text
        return (
          <div key={name} className="space-y-2">
            <Label htmlFor={name}>
              {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={name}
              type="text"
              value={formData[name] || ''}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              placeholder={placeholder}
              data-testid={`${name}-input`}
            />
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" data-testid="add-record-modal">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {fields.map(field => renderField(field))}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="bg-[#2E7DA1] hover:bg-[#246585]"
            data-testid="add-record-submit-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddRecordModal;
