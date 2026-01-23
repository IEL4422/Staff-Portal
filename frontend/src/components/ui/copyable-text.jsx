import React, { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Check, Mail, Phone } from 'lucide-react';

/**
 * CopyableText - A component that copies text to clipboard when clicked
 * 
 * @param {string} value - The text to copy
 * @param {string} type - 'email' | 'phone' | 'text'
 * @param {string} className - Additional CSS classes
 * @param {boolean} showIcon - Whether to show the copy icon
 */
const CopyableText = ({ value, type = 'text', className = '', showIcon = true }) => {
  const [copied, setCopied] = useState(false);

  if (!value) return <span className="text-slate-400">—</span>;

  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success(`${type === 'email' ? 'Email' : type === 'phone' ? 'Phone number' : 'Text'} copied to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const getIcon = () => {
    if (copied) return <Check className="w-3 h-3 text-green-500" />;
    if (type === 'email') return <Mail className="w-3 h-3 text-slate-400 group-hover:text-[#2E7DA1]" />;
    if (type === 'phone') return <Phone className="w-3 h-3 text-slate-400 group-hover:text-[#2E7DA1]" />;
    return <Copy className="w-3 h-3 text-slate-400 group-hover:text-[#2E7DA1]" />;
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`group inline-flex items-center gap-1.5 text-left hover:text-[#2E7DA1] transition-colors cursor-pointer ${className}`}
      title={`Click to copy ${type === 'email' ? 'email' : type === 'phone' ? 'phone number' : ''}`}
    >
      <span className={copied ? 'text-green-600' : ''}>{value}</span>
      {showIcon && getIcon()}
    </button>
  );
};

/**
 * CopyableEmail - Convenience wrapper for email addresses
 */
const CopyableEmail = ({ value, className = '', showIcon = true }) => (
  <CopyableText value={value} type="email" className={className} showIcon={showIcon} />
);

/**
 * CopyablePhone - Convenience wrapper for phone numbers
 */
const CopyablePhone = ({ value, className = '', showIcon = true }) => (
  <CopyableText value={value} type="phone" className={className} showIcon={showIcon} />
);

export { CopyableText, CopyableEmail, CopyablePhone };
