/**
 * Shared utilities and constants for modal components
 */

import { Wallet, UserPlus, Users, Calendar, CheckSquare, Phone, Send, FileText, Mail, Upload } from 'lucide-react';

// Modal configuration with icons and titles
export const MODAL_CONFIG = {
  addAssetDebt: {
    title: 'Add Asset/Debt',
    icon: Wallet,
    iconColor: 'bg-emerald-600',
    maxWidth: 'max-w-2xl'
  },
  addContact: {
    title: 'Add Case Contact',
    icon: UserPlus,
    iconColor: 'bg-blue-600',
    maxWidth: 'max-w-2xl'
  },
  addClient: {
    title: 'Add Client',
    icon: Users,
    iconColor: 'bg-[#2E7DA1]',
    maxWidth: 'max-w-lg'
  },
  addDeadline: {
    title: 'Add Date/Deadline',
    icon: Calendar,
    iconColor: 'bg-orange-600',
    maxWidth: 'max-w-2xl'
  },
  addLead: {
    title: 'Add Lead',
    icon: Users,
    iconColor: 'bg-purple-600',
    maxWidth: 'max-w-lg'
  },
  addTask: {
    title: 'Add Task',
    icon: CheckSquare,
    iconColor: 'bg-indigo-600',
    maxWidth: 'max-w-2xl'
  },
  phoneIntake: {
    title: 'Phone Call Intake',
    icon: Phone,
    iconColor: 'bg-green-600',
    maxWidth: 'max-w-4xl'
  },
  caseUpdate: {
    title: 'Send Case Update',
    icon: Send,
    iconColor: 'bg-sky-600',
    maxWidth: 'max-w-2xl'
  },
  sendInvoice: {
    title: 'Send Invoice',
    icon: FileText,
    iconColor: 'bg-amber-600',
    maxWidth: 'max-w-2xl'
  },
  sendMail: {
    title: 'Send Mail',
    icon: Mail,
    iconColor: 'bg-rose-600',
    maxWidth: 'max-w-2xl'
  },
  uploadFile: {
    title: 'Upload File',
    icon: Upload,
    iconColor: 'bg-teal-600',
    maxWidth: 'max-w-2xl'
  }
};

// Asset/Debt form options
export const ASSET_TYPE_OPTIONS = [
  'Bank Account', 'Real Estate', 'Vehicle', 'Stocks/Bonds', 'Retirement Account',
  'Life Insurance', 'Unclaimed Property', 'Personal Property', 'Other'
];

export const DEBT_TYPE_OPTIONS = ['Credit Card', 'Loan', 'Mortgage', 'Medical Debt', 'Other'];

export const ASSET_STATUS_OPTIONS = [
  'Found', 'Reported by Client', 'Transferred to Estate Bank Account', 'Claim Paid',
  'Contesting Claim', 'Abandoned', 'To Be Sold', 'Sold', 'Not Found'
];

// Contact type options
export const CONTACT_TYPE_OPTIONS = [
  'Heir', 'Beneficiary', 'Creditor', 'Financial Institution', 'Insurance Company',
  'Attorney', 'Accountant', 'Real Estate Agent', 'Other'
];

// Task status and priority options
export const TASK_STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed', 'On Hold'];
export const TASK_PRIORITY_OPTIONS = ['Low', 'Normal', 'High'];

// Invoice service options
export const SERVICE_OPTIONS = [
  'Estate Planning Consultation', 'Will Preparation', 'Trust Preparation', 
  'Power of Attorney', 'Healthcare Directive', 'Probate Filing Fee',
  'Court Appearance', 'Document Review', 'Real Estate Transfer', 'Other Legal Services'
];

// Mail options
export const MAILING_SPEED_OPTIONS = ['Standard', 'Priority', 'Express', 'Certified'];
export const WHAT_IS_BEING_MAILED_OPTIONS = [
  'Letters Testamentary', 'Death Certificate', 'Court Order', 'Invoice',
  'Legal Documents', 'Correspondence', 'Other'
];

// State abbreviations (simple array)
export const US_STATE_ABBREVIATIONS = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
];

// State abbreviations with labels
export const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' }, { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' }, { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' }, { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' }, { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' }
];

/**
 * Extract error message from API response
 * @param {Error} error - The error object from API call
 * @param {string} fallback - Fallback message if no specific error found
 * @returns {string} The extracted error message
 */
export const getErrorMessage = (error, fallback = 'An error occurred') => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) return detail[0]?.msg || fallback;
  if (typeof detail === 'object' && detail?.msg) return detail.msg;
  return error?.message || fallback;
};

/**
 * Format currency value
 * @param {number|string} value - The value to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value) => {
  if (!value && value !== 0) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
};

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};
