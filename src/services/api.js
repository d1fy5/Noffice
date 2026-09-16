/**
 * Layer API Service
 * 
 * File ini bertindak sebagai jembatan antara Frontend dan Backend Node.js (SQLite).
 */

const API_URL = typeof window !== 'undefined' && window.location && window.location.hostname
  ? `http://${window.location.hostname}:3001/api`
  : 'http://localhost:3001/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('noffice_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper terpusat untuk memproses respon API dan menangani 401 Unauthorized secara aman
const handleJsonResponse = async (res) => {
  if (res.status === 401) {
    localStorage.removeItem('noffice_auth_token');
    localStorage.removeItem('noffice.auth');
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    return { success: false, message: 'Sesi berakhir' };
  }
  try {
    return await res.json();
  } catch {
    return { success: false };
  }
};

// -- AUTH API --
export const AuthAPI = {
  login: async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success && data.token) {
      localStorage.setItem('noffice_auth_token', data.token);
    }
    return data;
  }
};

// -- EMPLOYEES API --
export const EmployeeAPI = {
  getAll: async () => {
    const res = await fetch(`${API_URL}/employees`, { headers: getAuthHeaders() });
    const data = await handleJsonResponse(res);
    return Array.isArray(data) ? data : [];
  },
  create: async (employeeData) => {
    const res = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(employeeData)
    });
    return handleJsonResponse(res);
  }
};

// -- DOCUMENTS API --
export const DocumentAPI = {
  getAll: async () => {
    const res = await fetch(`${API_URL}/documents`, { headers: getAuthHeaders() });
    const data = await handleJsonResponse(res);
    return Array.isArray(data) ? data : [];
  },
  create: async (docData) => {
    const res = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(docData)
    });
    return handleJsonResponse(res);
  },
  getDownloadUrl: (id) => {
    const token = localStorage.getItem('noffice_auth_token');
    return `${API_URL}/documents/${id}/download${token ? `?token=${token}` : ''}`;
  },
  updateStatus: async (documentId, status, userId) => {
    const res = await fetch(`${API_URL}/documents/${documentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ status, userId })
    });
    return handleJsonResponse(res);
  },
  softDelete: async (id, trashedBy) => {
    const res = await fetch(`${API_URL}/documents/${id}/trash`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ trashedBy })
    });
    return handleJsonResponse(res);
  },
  restore: async (id) => {
    const res = await fetch(`${API_URL}/documents/${id}/restore`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    });
    return handleJsonResponse(res);
  },
  deletePermanently: async (id, userRole) => {
    const res = await fetch(`${API_URL}/documents/${id}/permanent`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ userRole })
    });
    return handleJsonResponse(res);
  },
  emptyTrash: async (userRole) => {
    const res = await fetch(`${API_URL}/documents/trash/empty`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ userRole })
    });
    return handleJsonResponse(res);
  }
};

// -- CLIENTS API (Klien Notaris) --
export const ClientAPI = {
  getAll: async () => {
    const res = await fetch(`${API_URL}/clients`, { headers: getAuthHeaders() });
    const data = await handleJsonResponse(res);
    return Array.isArray(data) ? data : [];
  },
  create: async (clientData) => {
    const res = await fetch(`${API_URL}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(clientData)
    });
    return handleJsonResponse(res);
  },
  update: async (id, clientData) => {
    const res = await fetch(`${API_URL}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(clientData)
    });
    return handleJsonResponse(res);
  },
  delete: async (id) => {
    const res = await fetch(`${API_URL}/clients/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    return handleJsonResponse(res);
  }
};

// -- CASES API (Permohonan / Kasus Notaris) --
export const CaseAPI = {
  getAll: async () => {
    const res = await fetch(`${API_URL}/cases`, { headers: getAuthHeaders() });
    const data = await handleJsonResponse(res);
    return Array.isArray(data) ? data : [];
  },
  create: async (caseData) => {
    const res = await fetch(`${API_URL}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(caseData)
    });
    return handleJsonResponse(res);
  },
  updateStatus: async (id, status, changedBy) => {
    const res = await fetch(`${API_URL}/cases/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ status, changedBy })
    });
    return handleJsonResponse(res);
  },
  updateDetails: async (id, caseDetails) => {
    const res = await fetch(`${API_URL}/cases/${id}/details`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(caseDetails)
    });
    return handleJsonResponse(res);
  },
  toggleChecklist: async (id, itemId, isChecked) => {
    const res = await fetch(`${API_URL}/cases/${id}/checklist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ itemId, isChecked })
    });
    return handleJsonResponse(res);
  },
  generateAktaNumber: async (id, userRole, aktaFormat, serviceType) => {
    const res = await fetch(`${API_URL}/cases/${id}/generate-akta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ userRole, aktaFormat, serviceType })
    });
    return handleJsonResponse(res);
  },
  getLogs: async (id) => {
    const res = await fetch(`${API_URL}/cases/${id}/logs`, { headers: getAuthHeaders() });
    const data = await handleJsonResponse(res);
    return Array.isArray(data) ? data : [];
  }
};

// -- LOCAL AI NOTARY ENGINE API --
export const AiAPI = {
  getStatus: async () => {
    const res = await fetch(`${API_URL}/ai/status`, { headers: getAuthHeaders() });
    return handleJsonResponse(res);
  },
  extractData: async (text) => {
    const res = await fetch(`${API_URL}/ai/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ text })
    });
    return handleJsonResponse(res);
  },
  generateDraft: async (serviceType, parameters) => {
    const res = await fetch(`${API_URL}/ai/draft-clause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ serviceType, parameters })
    });
    return handleJsonResponse(res);
  },
  auditCase: async (caseData, clientData) => {
    const res = await fetch(`${API_URL}/ai/audit-case`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ caseData, clientData })
    });
    return handleJsonResponse(res);
  },
  chat: async (message, contextData) => {
    const res = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ message, contextData })
    });
    return handleJsonResponse(res);
  }
};
