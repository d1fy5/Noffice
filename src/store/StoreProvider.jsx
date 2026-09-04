import { useCallback, useEffect, useMemo, useState } from 'react';
import { StoreContext } from './contexts.js';
import { STORAGE_KEYS } from './constants.js';
import { load, uid, formatBytes, extOf } from './utils.js';
import { buildInitialNotifications } from './seed.js';
import { EmployeeAPI, DocumentAPI, ClientAPI, CaseAPI } from '../services/api.js';

export function StoreProvider({ children }) {
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [messages, setMessages] = useState(() => load(STORAGE_KEYS.messages, []));
  
  // Load data from backend on mount
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const docs = await DocumentAPI.getAll();
        const emps = await EmployeeAPI.getAll();
        const cls = await ClientAPI.getAll();
        const cs = await CaseAPI.getAll();
        setDocuments(docs || []);
        setEmployees(emps || []);
        setClients(cls || []);
        setCases(cs || []);
      } catch (err) {
        console.error("Failed to fetch data from backend", err);
      }
    }
    fetchInitialData();
  }, []);
  const [account, setAccount] = useState(() =>
    load(STORAGE_KEYS.account, {
      firstName: '',
      lastName: '',
      email: '',
      department: '',
    })
  );
  const [notifications, setNotifications] = useState(() =>
    load(STORAGE_KEYS.notifications, {
      emailNotif: true,
      docApprovals: true,
      newSubmissions: true,
      systemAlerts: true,
      weeklyDigest: false,
    })
  );
  const [appearance, setAppearance] = useState(() =>
    load(STORAGE_KEYS.appearance, { density: 'comfortable', reducedMotion: false, theme: null })
  );
  const [security, setSecurity] = useState(() =>
    load(STORAGE_KEYS.security, { twoFactor: true, keepSession: true, changedAt: null })
  );
  const [language, setLanguage] = useState(() => load(STORAGE_KEYS.language, 'en'));

  // Real notification feed
  const [notificationItems, setNotificationItems] = useState(() =>
    load(STORAGE_KEYS.notificationItems, null)
  );
  // General org/settings
  const [general, setGeneral] = useState(() =>
    load(STORAGE_KEYS.general, {
      companyName: 'Noffice',
      companyLogo: null,
      defaultLanguage: 'en',
      timezone: 'Asia/Jakarta',
      dateFormat: 'DD/MM/YYYY',
      storageLimitGB: 50,
    })
  );

  useEffect(() => localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages)), [messages]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages)), [messages]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.account, JSON.stringify(account)), [account]);
  useEffect(
    () => localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notifications)),
    [notifications]
  );
  useEffect(() => localStorage.setItem(STORAGE_KEYS.appearance, JSON.stringify(appearance)), [appearance]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.security, JSON.stringify(security)), [security]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.language, JSON.stringify(language)), [language]);
  useEffect(
    () => localStorage.setItem(STORAGE_KEYS.notificationItems, JSON.stringify(notificationItems)),
    [notificationItems]
  );
  useEffect(() => localStorage.setItem(STORAGE_KEYS.general, JSON.stringify(general)), [general]);

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
        isTrashed: false,
        trashedAt: null,
        trashedBy: null,
      };
      
      try {
        await DocumentAPI.create(doc);
        created.push(doc);
      } catch (err) {
        console.error("Failed to create document", err);
      }
    }
    
    setDocuments((d) => [...created, ...d]);
    if (created.length > 0) {
      setNotificationItems((items) => [
        {
          id: 'notif-' + uid(),
          type: 'submission',
          title: 'New Document Submission',
          message: `${created[0].author || 'You'} submitted "${created[0].title}" and it is awaiting review.`,
          dateTs: now,
          read: false,
          approval: true,
          route: '/data-tables',
        },
        ...(items || []),
      ]);
    }
    return created;
  }, [account]);

  // Soft delete: moves a document to the Trash in DB.
  const deleteDocument = useCallback(async (id) => {
    const who = account.firstName ? `${account.firstName} ${account.lastName}`.trim() : 'You';
    setDocuments((d) =>
      d.map((doc) =>
        doc.id === id ? { ...doc, isTrashed: true, trashedAt: new Date().toISOString(), trashedBy: who } : doc
      )
    );
    try {
      await DocumentAPI.softDelete(id, who);
    } catch (err) {
      console.error('Failed to soft delete document', err);
    }
  }, [account]);

  // Restore: brings a trashed document back to its previous category.
  const restoreDocument = useCallback(async (id) => {
    setDocuments((d) =>
      d.map((doc) =>
        doc.id === id ? { ...doc, isTrashed: false, trashedAt: null, trashedBy: null } : doc
      )
    );
    try {
      await DocumentAPI.restore(id);
    } catch (err) {
      console.error('Failed to restore document', err);
    }
  }, []);

  // Permanent delete: really removes the document data from DB.
  const deleteDocumentPermanently = useCallback(async (id) => {
    setDocuments((d) => d.filter((doc) => doc.id !== id));
    try {
      await DocumentAPI.deletePermanently(id);
    } catch (err) {
      console.error('Failed to permanently delete document', err);
    }
  }, []);

  // Empty the Trash: only removes documents that are currently in the Trash in DB.
  const emptyTrash = useCallback(async () => {
    setDocuments((d) => d.filter((doc) => !doc.isTrashed));
    try {
      await DocumentAPI.emptyTrash();
    } catch (err) {
      console.error('Failed to empty trash', err);
    }
  }, []);

  const updateDocument = useCallback((id, patch) => {
    setDocuments((d) => d.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc)));
  }, []);

  // Update status dokumen (approve/decline) dan persist ke backend.
  // Local state di-update optimistically; jika backend gagal, dikembalikan ke
  // status sebelumnya agar UI tetap sinkron dengan penyimpanan.
  const updateDocumentStatus = useCallback(async (id, status, userId) => {
    let prevStatus = null;
    setDocuments((d) =>
      d.map((doc) => (doc.id === id ? ((prevStatus = doc.status), { ...doc, status }) : doc))
    );
    try {
      const result = await DocumentAPI.updateStatus(id, status, userId);
      if (!result.success) {
        throw new Error(result.message || 'Failed to update status');
      }
      return true;
    } catch (err) {
      console.error('Failed to persist document status', err);
      setDocuments((d) =>
        d.map((doc) => (doc.id === id ? { ...doc, status: prevStatus } : doc))
      );
      return false;
    }
  }, []);

  // Employees
  const addEmployee = useCallback(async (data) => {
    const emp = {
      id: uid(),
      dateJoined: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      dateJoinedTs: Date.now(),
      ...data,
    };
    
    try {
      await EmployeeAPI.create(emp);
      setEmployees((e) => [...e, emp]);
      setNotificationItems((items) => [
        {
          id: 'notif-' + uid(),
          type: 'employee',
          title: 'New Employee Onboarded',
          message: `${data.firstName || ''} ${data.lastName || ''} joined as ${data.role || 'a team member'}.`,
          dateTs: Date.now(),
          read: false,
          route: '/employees',
        },
        ...(items || []),
      ]);
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
    setNotificationItems((items) => [
      {
        id: 'notif-' + uid(),
        type: 'message',
        title: 'Unread Message in Inbox',
        message: `${msg.sender} sent "${msg.subject}".`,
        dateTs: Date.now(),
        read: false,
        route: '/inbox',
      },
      ...(items || []),
    ]);
    return msg;
  }, [account]);

  const deleteMessage = useCallback((id) => {
    setMessages((m) => m.filter((msg) => msg.id !== id));
  }, []);

  // Notifications
  const markNotificationRead = useCallback((id) => {
    setNotificationItems((items) =>
      (items || []).map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotificationItems((items) => (items || []).map((n) => ({ ...n, read: true })));
  }, []);

  const addNotification = useCallback((n) => {
    setNotificationItems((items) => [
      { id: 'notif-' + uid(), dateTs: Date.now(), read: false, approval: false, ...n },
      ...(items || []),
    ]);
  }, []);

  // Seed the notification feed from real data on first run if not yet stored.
  useEffect(() => {
    if (notificationItems === null) {
      setNotificationItems(buildInitialNotifications({ documents, messages, employees }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Submissions derived from documents (trashed documents are excluded).
  const submissions = useMemo(
    () =>
      documents
        .filter((d) => !d.isTrashed)
        .map((d, i) => ({
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

  // Clients Handlers
  const addClient = useCallback(async (data) => {
    const newClient = {
      id: 'c-' + uid(),
      createdAt: new Date().toISOString().split('T')[0],
      ...data
    };
    try {
      await ClientAPI.create(newClient);
      setClients((prev) => [newClient, ...prev]);
      return newClient;
    } catch (err) {
      console.error('Failed to create client', err);
      return null;
    }
  }, []);

  const updateClient = useCallback(async (id, data) => {
    try {
      await ClientAPI.update(id, data);
      setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
      return true;
    } catch (err) {
      console.error('Failed to update client', err);
      return false;
    }
  }, []);

  const deleteClient = useCallback(async (id) => {
    try {
      await ClientAPI.delete(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch (err) {
      console.error('Failed to delete client', err);
      return false;
    }
  }, []);

  // Cases Handlers
  const addCase = useCallback(async (data, checklistItems = []) => {
    const newCase = {
      id: 'kasus-' + Date.now(),
      caseNumber: `KASUS/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${(cases.length + 1).toString().padStart(3, '0')}`,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
      aktaNumber: '',
      ...data,
      checklist: checklistItems.map((item, idx) => ({
        id: 'chk-' + uid() + idx,
        itemName: typeof item === 'string' ? item : item.itemName,
        isChecked: 0
      }))
    };
    try {
      await CaseAPI.create(newCase);
      setCases((prev) => [newCase, ...prev]);
      return newCase;
    } catch (err) {
      console.error('Failed to create case', err);
      return null;
    }
  }, [cases.length]);

  const updateCaseStatus = useCallback(async (id, status, userRole) => {
    try {
      const res = await CaseAPI.updateStatus(id, status, userRole);
      if (res && res.success) {
        setCases((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update case status', err);
      return false;
    }
  }, []);

  const updateCaseDetails = useCallback(async (id, details) => {
    try {
      await CaseAPI.updateDetails(id, details);
      setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...details } : c)));
      return true;
    } catch (err) {
      console.error('Failed to update case details', err);
      return false;
    }
  }, []);

  const toggleChecklistItem = useCallback(async (caseId, itemId, isChecked) => {
    try {
      await CaseAPI.toggleChecklist(caseId, itemId, isChecked);
      setCases((prev) =>
        prev.map((c) => {
          if (c.id !== caseId) return c;
          const updatedChecklist = (c.checklist || []).map((i) =>
            i.id === itemId ? { ...i, isChecked: isChecked ? 1 : 0 } : i
          );
          return { ...c, checklist: updatedChecklist };
        })
      );
      return true;
    } catch (err) {
      console.error('Failed to toggle checklist item', err);
      return false;
    }
  }, []);

  const generateAktaNumber = useCallback(async (caseId) => {
    try {
      const res = await CaseAPI.generateAktaNumber(caseId);
      if (res.success && res.aktaNumber) {
        setCases((prev) =>
          prev.map((c) => (c.id === caseId ? { ...c, aktaNumber: res.aktaNumber, status: 'draft' } : c))
        );
        return res.aktaNumber;
      }
      return null;
    } catch (err) {
      console.error('Failed to generate akta number', err);
      return null;
    }
  }, []);

  const totals = useMemo(() => {
    const active = documents.filter((d) => !d.isTrashed);
    return {
      totalDocuments: active.length,
      pendingApprovals: active.filter((d) => d.status === 'pending').length,
      activeEmployees: employees.filter((e) => (e.status || '').toLowerCase() === 'active').length,
      storageBytes: active.reduce((s, d) => s + (d.sizeBytes || 0), 0),
      reports: active.length,
      totalClients: clients.length,
      totalCases: cases.length,
      activeCases: cases.filter((c) => c.status !== 'selesai' && c.status !== 'arsip' && c.status !== 'rejected').length,
    };
  }, [documents, employees, clients, cases]);

  const value = {
    documents,
    employees,
    clients,
    cases,
    messages,
    submissions,
    account,
    notifications,
    notificationItems: notificationItems || [],
    general,
    appearance,
    security,
    totals,
    language,
    addDocuments,
    deleteDocument,
    updateDocument,
    updateDocumentStatus,
    restoreDocument,
    deleteDocumentPermanently,
    emptyTrash,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addClient,
    updateClient,
    deleteClient,
    addCase,
    updateCaseStatus,
    updateCaseDetails,
    toggleChecklistItem,
    generateAktaNumber,
    addMessage,
    deleteMessage,
    markNotificationRead,
    markAllNotificationsRead,
    addNotification,
    setAccount,
    setNotifications,
    setAppearance,
    setSecurity,
    setLanguage,
    setGeneral,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}