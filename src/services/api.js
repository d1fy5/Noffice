/**
 * Layer API Service
 * 
 * File ini bertindak sebagai jembatan antara Frontend dan Backend Node.js (SQLite).
 */

const API_URL = 'http://localhost:3001/api';

// -- AUTH API --
export const AuthAPI = {
  login: async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  }
};

// -- EMPLOYEES API --
export const EmployeeAPI = {
  getAll: async () => {
    const res = await fetch(`${API_URL}/employees`);
    return res.json();
  },
  create: async (employeeData) => {
    const res = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeData)
    });
    return res.json();
  }
};

// -- DOCUMENTS API --
export const DocumentAPI = {
  getAll: async () => {
    const res = await fetch(`${API_URL}/documents`);
    return res.json();
  },
  create: async (docData) => {
    const res = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docData)
    });
    return res.json();
  },
  updateStatus: async (documentId, status, userId) => {
    const res = await fetch(`${API_URL}/documents/${documentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, userId })
    });
    return res.json();
  },
  softDelete: async (id, trashedBy) => {
    const res = await fetch(`${API_URL}/documents/${id}/trash`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashedBy })
    });
    return res.json();
  },
  restore: async (id) => {
    const res = await fetch(`${API_URL}/documents/${id}/restore`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },
  deletePermanently: async (id) => {
    const res = await fetch(`${API_URL}/documents/${id}/permanent`, { method: 'DELETE' });
    return res.json();
  },
  emptyTrash: async () => {
    const res = await fetch(`${API_URL}/documents/trash/empty`, { method: 'DELETE' });
    return res.json();
  }
};

// -- CLIENTS API (Klien Notaris) --
export const ClientAPI = {
  getAll: async () => {
    const res = await fetch(`${API_URL}/clients`);
    return res.json();
  },
  create: async (clientData) => {
    const res = await fetch(`${API_URL}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientData)
    });
    return res.json();
  },
  update: async (id, clientData) => {
    const res = await fetch(`${API_URL}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientData)
    });
    return res.json();
  },
  delete: async (id) => {
    const res = await fetch(`${API_URL}/clients/${id}`, { method: 'DELETE' });
    return res.json();
  }
};

// -- CASES API (Permohonan / Kasus Notaris) --
export const CaseAPI = {
  getAll: async () => {
    const res = await fetch(`${API_URL}/cases`);
    return res.json();
  },
  create: async (caseData) => {
    const res = await fetch(`${API_URL}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(caseData)
    });
    return res.json();
  },
  updateStatus: async (id, status) => {
    const res = await fetch(`${API_URL}/cases/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },
  updateDetails: async (id, caseDetails) => {
    const res = await fetch(`${API_URL}/cases/${id}/details`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(caseDetails)
    });
    return res.json();
  },
  toggleChecklist: async (id, itemId, isChecked) => {
    const res = await fetch(`${API_URL}/cases/${id}/checklist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, isChecked })
    });
    return res.json();
  },
  generateAktaNumber: async (id) => {
    const res = await fetch(`${API_URL}/cases/${id}/generate-akta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  }
};

// -- LOCAL AI NOTARY ENGINE API --
export const AiAPI = {
  getStatus: async () => {
    const res = await fetch(`${API_URL}/ai/status`);
    return res.json();
  },
  extractData: async (text) => {
    const res = await fetch(`${API_URL}/ai/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    return res.json();
  },
  generateDraft: async (serviceType, parameters) => {
    const res = await fetch(`${API_URL}/ai/draft-clause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceType, parameters })
    });
    return res.json();
  },
  auditCase: async (caseData, clientData) => {
    const res = await fetch(`${API_URL}/ai/audit-case`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseData, clientData })
    });
    return res.json();
  },
  chat: async (message, contextData) => {
    const res = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, contextData })
    });
    return res.json();
  }
};
