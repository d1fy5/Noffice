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
  }
};
