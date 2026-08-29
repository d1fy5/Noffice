import { useCallback, useEffect, useMemo, useState } from 'react';
import { StoreContext } from './contexts.js';
import { STORAGE_KEYS } from './constants.js';
import { load, uid, formatBytes, extOf } from './utils.js';
import { buildInitialNotifications } from './seed.js';

export function StoreProvider({ children }) {
  const [documents, setDocuments] = useState(() => load(STORAGE_KEYS.documents, []));
  const [employees, setEmployees] = useState(() => load(STORAGE_KEYS.employees, []));
  const [messages, setMessages] = useState(() => load(STORAGE_KEYS.messages, []));
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

  useEffect(() => localStorage.setItem(STORAGE_KEYS.documents, JSON.stringify(documents)), [documents]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.employees, JSON.stringify(employees)), [employees]);
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
  const addDocuments = useCallback((items) => {
    const now = Date.now();
    const created = items.map((item, idx) => {
      const f = item.file;
      const name = (item.name && item.name.trim()) || f.name;
      return {
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
    });
    setDocuments((d) => [...created, ...d]);
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
    return created;
  }, [account]);

  const deleteDocument = useCallback((id) => {
    setDocuments((d) => d.filter((doc) => doc.id !== id));
  }, []);

  const updateDocument = useCallback((id, patch) => {
    setDocuments((d) => d.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc)));
  }, []);

  // Employees
  const addEmployee = useCallback((data) => {
    const emp = {
      id: uid(),
      dateJoined: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      dateJoinedTs: Date.now(),
      ...data,
    };
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
    notificationItems: notificationItems || [],
    general,
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