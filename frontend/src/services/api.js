import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, name) => api.post('/auth/register', { email, password, name }),
  me: () => api.get('/auth/me'),
};

// Airtable - Master List
export const masterListApi = {
  getAll: (params) => api.get('/airtable/master-list', { params }),
  getOne: (id) => api.get(`/airtable/master-list/${id}`),
  create: (fields) => api.post('/airtable/master-list', { fields }),
  update: (id, fields) => api.patch(`/airtable/master-list/${id}`, { fields }),
  delete: (id) => api.delete(`/airtable/master-list/${id}`),
  search: (query) => api.get('/airtable/search', { params: { query } }),
};

// Dashboard
export const dashboardApi = {
  getData: () => api.get('/airtable/dashboard'),
};

// Dates & Deadlines
export const datesDeadlinesApi = {
  getAll: (filterBy) => api.get('/airtable/dates-deadlines', { params: { filter_by: filterBy } }),
  create: (data) => api.post('/airtable/dates-deadlines', data),
};

// Case Contacts
export const caseContactsApi = {
  getAll: (caseId) => api.get('/airtable/case-contacts', { params: { case_id: caseId } }),
  create: (data) => api.post('/airtable/case-contacts', data),
};

// Assets & Debts
export const assetsDebtsApi = {
  getAll: (caseId) => api.get('/airtable/assets-debts', { params: { case_id: caseId } }),
};

// Case Tasks
export const caseTasksApi = {
  getAll: (caseId) => api.get('/airtable/case-tasks', { params: { case_id: caseId } }),
  create: (data) => api.post('/airtable/case-tasks', data),
  update: (id, fields) => api.patch(`/airtable/case-tasks/${id}`, { fields }),
};

// Judge Information
export const judgeInfoApi = {
  getAll: () => api.get('/airtable/judge-information'),
};

// Mail
export const mailApi = {
  getAll: (caseId) => api.get('/airtable/mail', { params: { case_id: caseId } }),
  create: (data) => api.post('/airtable/mail', data),
};

// Documents
export const documentsApi = {
  getAll: (caseId) => api.get('/airtable/documents', { params: { case_id: caseId } }),
};

// Call Log
export const callLogApi = {
  getAll: (caseId) => api.get('/airtable/call-log', { params: { case_id: caseId } }),
};

// Invoices
export const invoicesApi = {
  getAll: (caseId) => api.get('/airtable/invoices', { params: { case_id: caseId } }),
  create: (data) => api.post('/airtable/invoices', data),
};

// Payments
export const paymentsApi = {
  getAll: () => api.get('/airtable/payments'),
};

// Leads & Clients
export const leadsApi = {
  create: (data) => api.post('/airtable/leads', data),
};

export const clientsApi = {
  create: (data) => api.post('/airtable/clients', data),
};

// Webhooks
export const webhooksApi = {
  sendCaseUpdate: (data) => api.post('/webhooks/send-case-update', { data }),
  uploadFile: (data) => api.post('/webhooks/upload-file', { data }),
};

export default api;
