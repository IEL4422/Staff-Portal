import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api/documents`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
  };
};

// Templates
export const templatesApi = {
  upload: async (file, name, type, county, caseType, category = 'Other') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('template_type', type);
    formData.append('county', county);
    formData.append('case_type', caseType);
    formData.append('category', category);
    return axios.post(`${API}/templates/upload`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getAll: (filters = {}) => axios.get(`${API}/templates`, {
    headers: getAuthHeaders(),
    params: filters,
  }),
  getByCaseType: (caseType) => axios.get(`${API}/templates/by-case-type/${caseType}`, {
    headers: getAuthHeaders(),
  }),
  getOne: (id) => axios.get(`${API}/templates/${id}`, { headers: getAuthHeaders() }),
  delete: (id) => axios.delete(`${API}/templates/${id}`, { headers: getAuthHeaders() }),
  getConstants: () => axios.get(`${API}/constants`, { headers: getAuthHeaders() }),
  detectDocxVariables: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API}/docx/detect-variables`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  detectPdfFields: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API}/pdf/detect-fields`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  // Direct template mapping APIs
  getMapping: (templateId) => axios.get(`${API}/templates/${templateId}/mapping`, { headers: getAuthHeaders() }),
  saveMapping: (templateId, mappingJson) => axios.post(`${API}/templates/${templateId}/mapping`, { mapping_json: mappingJson }, { headers: getAuthHeaders() }),
};

// Mapping Profiles
export const mappingProfilesApi = {
  create: (data) => axios.post(`${API}/mapping-profiles`, data, { headers: getAuthHeaders() }),
  getAll: (templateId) => axios.get(`${API}/mapping-profiles`, {
    headers: getAuthHeaders(),
    params: templateId ? { template_id: templateId } : {},
  }),
  getOne: (id) => axios.get(`${API}/mapping-profiles/${id}`, { headers: getAuthHeaders() }),
  update: (id, data) => axios.put(`${API}/mapping-profiles/${id}`, data, { headers: getAuthHeaders() }),
  delete: (id) => axios.delete(`${API}/mapping-profiles/${id}`, { headers: getAuthHeaders() }),
};

// Document Generation
export const documentGenerationApi = {
  generateDocx: (data) => axios.post(`${API}/generate-docx`, data, { headers: getAuthHeaders() }),
  fillPdf: (data) => axios.post(`${API}/fill-pdf`, data, { headers: getAuthHeaders() }),
  generateWithInputs: (data) => axios.post(`${API}/generate-with-inputs`, data, { headers: getAuthHeaders() }),
  generateBatch: (data) => axios.post(`${API}/generate-batch`, data, { headers: getAuthHeaders() }),
  getBatchVariables: (data) => axios.post(`${API}/get-batch-variables`, data, { headers: getAuthHeaders() }),
  getGenerated: (clientId) => axios.get(`${API}/generated`, {
    headers: getAuthHeaders(),
    params: clientId ? { client_id: clientId } : {},
  }),
  getDownloadUrl: (docId, fileType = 'docx') => 
    `${API}/generated/${docId}/download?file_type=${fileType}`,
  getClientBundle: (clientId) => axios.get(`${API}/client-bundle/${clientId}`, { headers: getAuthHeaders() }),
  getAirtableFields: () => axios.get(`${API}/airtable-fields`, { headers: getAuthHeaders() }),
  getStaffInputs: (clientId) => axios.get(`${API}/staff-inputs/${clientId}`, { headers: getAuthHeaders() }),
  saveStaffInputs: (clientId, inputs) => axios.post(`${API}/staff-inputs/${clientId}`, { inputs }, { headers: getAuthHeaders() }),
};

// Dropbox
export const dropboxApi = {
  listFolders: (path = '') => axios.get(`${API}/dropbox/folders`, { 
    headers: getAuthHeaders(),
    params: { path }
  }),
  searchFolders: (query) => axios.get(`${API}/dropbox/search`, { 
    headers: getAuthHeaders(),
    params: { query }
  }),
  saveToFolder: (data) => axios.post(`${API}/dropbox/save`, data, { headers: getAuthHeaders() }),
};

// Approvals
export const approvalsApi = {
  sendForApproval: (data) => axios.post(`${API}/send-for-approval`, data, { headers: getAuthHeaders() }),
  getAllApprovals: () => axios.get(`${API}/approvals`, { headers: getAuthHeaders() }),
  getApprovalDetails: (approvalId) => axios.get(`${API}/approval/${approvalId}`, { headers: getAuthHeaders() }),
  approveDocument: (approvalId) => axios.post(`${API}/approval/${approvalId}/approve`, {}, { headers: getAuthHeaders() }),
  denyDocument: (approvalId, comments) => axios.post(`${API}/approval/${approvalId}/deny`, { comments }, { headers: getAuthHeaders() }),
  getDocumentPreview: (approvalId) => axios.get(`${API}/preview/${approvalId}`, { headers: getAuthHeaders() }),
  getNotifications: () => axios.get(`${API}/notifications`, { headers: getAuthHeaders() }),
  markNotificationRead: (notificationId) => axios.post(`${API}/notifications/${notificationId}/read`, {}, { headers: getAuthHeaders() }),
};

// External Generation Services
export const externalGenerationApi = {
  generateViaPdfCo: (data) => axios.post(`${API}/generate-pdfco`, data, { headers: getAuthHeaders() }),
  generateViaDocumentero: (data) => axios.post(`${API}/generate-documentero`, data, { headers: getAuthHeaders() }),
};

// Staff Inputs with Labels
export const staffInputsApi = {
  getWithLabels: (clientId) => axios.get(`${API}/staff-inputs/${clientId}/with-labels`, { headers: getAuthHeaders() }),
  confirm: (clientId, data) => axios.post(`${API}/staff-inputs/${clientId}/confirm`, data, { headers: getAuthHeaders() }),
  saveWithLabels: (clientId, data) => axios.post(`${API}/staff-inputs/${clientId}/save-with-labels`, data, { headers: getAuthHeaders() }),
};

export default {
  templates: templatesApi,
  mappingProfiles: mappingProfilesApi,
  generation: documentGenerationApi,
  dropbox: dropboxApi,
  approvals: approvalsApi,
  staffInputs: staffInputsApi,
  external: externalGenerationApi,
};
