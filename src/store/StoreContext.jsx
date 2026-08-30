import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { EmployeeAPI, DocumentAPI } from '../services/api.js';

export const DEPARTMENTS = [
  'Engineering',
  'HR & Talent',
  'Finance',
  'Legal & Compliance',
  'Operations',
];
export const RECIPIENT_STATUSES = ['Approved', 'Pending', 'Rejected'];
export const EMPLOYEE_STATUSES = ['Active', 'Inactive'];

const UPLOAD_CATEGORIES = [
  'Reports',
  'Finance',
  'HR & Talent',
  'Legal & Compliance',
  'Engineering',
  'Operations',
];

const KEYS = {
  documents: 'noffice.documents',
  employees: 'noffice.employees',
  messages: 'noffice.messages',
  account: 'noffice.account',
  notifications: 'noffice.notifications',
  security: 'noffice.security',
  appearance: 'noffice.appearance',
  language: 'noffice.language',
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function uid() {
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [messages, setMessages] = useState(() => load(KEYS.messages, []));
  
  // Load data from backend on mount
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const docs = await DocumentAPI.getAll();
        const emps = await EmployeeAPI.getAll();
        setDocuments(docs || []);
        setEmployees(emps || []);
      } catch (err) {
        console.error("Failed to fetch data from backend", err);
      }
    }
    fetchInitialData();
  }, []);
  const [account, setAccount] = useState(() =>
    load(KEYS.account, {
      firstName: '',
      lastName: '',
      email: '',
      department: '',
    })
  );
  const [notifications, setNotifications] = useState(() =>
    load(KEYS.notifications, {
      emailNotif: true,
      docApprovals: true,
      newSubmissions: true,
      systemAlerts: true,
      weeklyDigest: false,
    })
  );
  const [appearance, setAppearance] = useState(() =>
    load(KEYS.appearance, { density: 'comfortable', reducedMotion: false, theme: null })
  );
  const [security, setSecurity] = useState(() =>
    load(KEYS.security, { twoFactor: true, keepSession: true, changedAt: null })
  );
  const [language, setLanguage] = useState(() => load(KEYS.language, 'en'));

  useEffect(() => localStorage.setItem(KEYS.messages, JSON.stringify(messages)), [messages]);
  useEffect(() => localStorage.setItem(KEYS.messages, JSON.stringify(messages)), [messages]);
  useEffect(() => localStorage.setItem(KEYS.account, JSON.stringify(account)), [account]);
  useEffect(
    () => localStorage.setItem(KEYS.notifications, JSON.stringify(notifications)),
    [notifications]
  );
  useEffect(() => localStorage.setItem(KEYS.appearance, JSON.stringify(appearance)), [appearance]);
  useEffect(() => localStorage.setItem(KEYS.security, JSON.stringify(security)), [security]);
  useEffect(() => localStorage.setItem(KEYS.language, JSON.stringify(language)), [language]);

  // Documents
  const addDocuments = useCallback(async (items) => {
    const now = Date.now();
    const created = [];
    
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const f = item.file;
      const name = (item.name && item.name.trim()) || f.name;
      
      const doc = {
        id: uid() + idx,
        title: name,
        description: item.description || '',
        category: item.category || '',
        author: account.firstName ? `${account.firstName} ${account.lastName}`.trim() : 'You',
        size: formatBytes(f.size),
        sizeBytes: f.size,
        date: new Date(now - idx * 1000).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        dateTs: now - idx * 1000,
        status: 'pending',
        type: extOf(f.name),
        dept: item.category || account.department || 'General',
      };
      
      try {
        await DocumentAPI.create(doc);
        created.push(doc);
      } catch (err) {
        console.error("Failed to create document", err);
      }
    }
    
    setDocuments((d) => [...created, ...d]);
    return created;
  }, [account]);

  const deleteDocument = useCallback((id) => {
    setDocuments((d) => d.filter((doc) => doc.id !== id));
  }, []);

  const updateDocument = useCallback((id, patch) => {
    setDocuments((d) => d.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc)));
  }, []);

  // Employees
  const addEmployee = useCallback(async (data) => {
    const emp = { id: uid(), ...data };
    try {
      await EmployeeAPI.create(emp);
      setEmployees((e) => [...e, emp]);
      return emp;
    } catch (err) {
      console.error("Failed to create employee", err);
      return null;
    }
  }, []);

  const updateEmployee = useCallback((id, data) => {
    setEmployees((e) => e.map((emp) => (emp.id === id ? { ...emp, ...data } : emp)));
  }, []);

  const deleteEmployee = useCallback((id) => {
    setEmployees((e) => e.filter((emp) => emp.id !== id));
  }, []);

  // Messages / Inbox
  const addMessage = useCallback((data) => {
    const msg = {
      id: uid(),
      sender: account.firstName ? `${account.firstName} ${account.lastName}`.trim() : 'You',
      cat: 'Message',
      subject: data.subject,
      preview: data.message.slice(0, 70),
      body: data.message,
      time: new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      dateTs: Date.now(),
      recipient: data.recipient,
    };
    setMessages((m) => [msg, ...m]);
    return msg;
  }, [account]);

  const deleteMessage = useCallback((id) => {
    setMessages((m) => m.filter((msg) => msg.id !== id));
  }, []);

  // Submissions derived from documents
  const submissions = useMemo(
    () =>
      documents.map((d, i) => ({
        id: `SUB-${(1082 - i + 10000) % 10000}`,
        empId: d.id,
        name: d.author,
        dept: d.dept,
        doc: d.title,
        subId: d.id,
        date: d.date,
        dateTs: d.dateTs,
        status: d.status,
        size: d.size,
      })),
    [documents]
  );

  const totals = useMemo(
    () => ({
      totalDocuments: documents.length,
      pendingApprovals: documents.filter((d) => d.status === 'pending').length,
      activeEmployees: employees.filter((e) => (e.status || '').toLowerCase() === 'active').length,
      storageBytes: documents.reduce((s, d) => s + (d.sizeBytes || 0), 0),
      reports: documents.length,
    }),
    [documents, employees]
  );

  const value = {
    documents,
    employees,
    messages,
    submissions,
    account,
    notifications,
    appearance,
    security,
    totals,
    language,
    addDocuments,
    deleteDocument,
    updateDocument,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addMessage,
    deleteMessage,
    setAccount,
    setNotifications,
    setAppearance,
    setSecurity,
    setLanguage,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n >= 100 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

export function extOf(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'xlsx';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  return 'docx';
}

export { UPLOAD_CATEGORIES };
