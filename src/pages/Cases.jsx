import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore, useSearch, useToast } from '../store/hooks.js';
import { useTranslation } from '../store/useTranslation.js';
import { useAuth } from '../store/AuthContext.jsx';
import { NOTARY_SERVICES, CASE_STATUSES } from '../store/constants.js';
import { AiAPI } from '../services/api.js';

import PrintReceiptModal from '../components/PrintReceiptModal.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import FormField from '../components/FormField.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function Cases() {
  const location = useLocation();
  const { query } = useSearch();
  const { clients, cases, employees, general, addCase, updateCaseStatus, updateCaseDetails, toggleChecklistItem, generateAktaNumber, fetchCaseLogs } = useStore();
  const { notify } = useToast();
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterService, setFilterService] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [aiAuditResult, setAiAuditResult] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [caseLogs, setCaseLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [form, setForm] = useState({
    clientId: '',
    serviceType: 'PT',
    caseNumber: '',
    aktaNumber: '',
    assignedTo: '',
    estimatedAt: '',
    notes: '',
  });
  const [customChecklist, setCustomChecklist] = useState([]);
  const [newItemText, setNewItemText] = useState('');
  const [errors, setErrors] = useState({});

  const [billingForm, setBillingForm] = useState({
    notaryFee: 0,
    taxFee: 0,
    pnbpFee: 0,
    paymentStatus: 'unpaid',
    appointmentDate: '',
    appointmentTime: '',
    notes: '',
  });

  useEffect(() => {
    if (location.state?.createNew) {
      if (clients.length === 0) {
        notify('Silakan tambahkan data Klien terlebih dahulu di menu Klien!', 'warning');
        return;
      }
      openNewCase();
      return;
    }
    if (location.state?.createForClient) {
      const targetClientId = location.state.createForClient;
      setForm((prev) => ({ ...prev, clientId: targetClientId }));
      setModalOpen(true);
    }
  }, [location.state]);

  const handleOpenCaseDetail = (c) => {
    setSelectedCase(c);
    setCaseLogs([]);
    setBillingForm({
      notaryFee: c.notaryFee || 0,
      taxFee: c.taxFee || 0,
      pnbpFee: c.pnbpFee || 0,
      paymentStatus: c.paymentStatus || 'unpaid',
      appointmentDate: c.appointmentDate || '',
      appointmentTime: c.appointmentTime || '',
      notes: c.notes || '',
    });
    setAiAuditResult(null);
    // Load logs
    setLogsLoading(true);
    fetchCaseLogs(c.id).then((logs) => {
      setCaseLogs(logs);
      setLogsLoading(false);
    });
    const client = clients.find((cl) => cl.id === c.clientId);
    AiAPI.auditCase(c, client)
      .then((res) => setAiAuditResult(res))
      .catch(() => {});
  };

  const handleSaveBilling = async () => {
    if (!selectedCase) return;
    const payload = { ...billingForm };
    const res = await updateCaseDetails(selectedCase.id, payload);
    if (res) {
      notify('Rincian Biaya & Jadwal TTD berhasil diperbarui!', 'success');
      setSelectedCase({ ...selectedCase, ...payload });
    }
  };

  const q = query.trim().toLowerCase();

  const currentServiceConfig = useMemo(() => {
    return NOTARY_SERVICES.find((s) => s.id === form.serviceType) || NOTARY_SERVICES[0];
  }, [form.serviceType]);

  const myCases = useMemo(() => cases.filter(c => NOTARY_SERVICES.some(s => s.id === c.serviceType)), [cases]);

  const filteredCases = useMemo(() => {
    let rows = myCases;
    if (filterStatus !== 'all') rows = rows.filter((c) => c.status === filterStatus);
    if (filterService !== 'all') rows = rows.filter((c) => c.serviceType === filterService);
    if (q) {
      rows = rows.filter(
        (c) =>
          (c.caseNumber || '').toLowerCase().includes(q) ||
          (c.aktaNumber || '').toLowerCase().includes(q) ||
          (c.notes || '').toLowerCase().includes(q) ||
          (c.serviceType || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [cases, filterStatus, filterService, q]);

  const openNewCase = () => {
    if (clients.length === 0) {
      notify('Silakan tambahkan data Klien terlebih dahulu di menu Klien!', 'warning');
      return;
    }
    setForm({
      clientId: clients[0]?.id || '',
      serviceType: 'PT',
      caseNumber: '',
      aktaNumber: '',
      assignedTo: user?.name || 'Super Admin / Notaris',
      estimatedAt: '',
      notes: '',
    });
    setCustomChecklist(NOTARY_SERVICES[0].defaultChecklist);
    setErrors({});
    setModalOpen(true);
  };

  const handleServiceChange = (st) => {
    const s = NOTARY_SERVICES.find((serv) => serv.id === st);
    setForm((prev) => ({ ...prev, serviceType: st }));
    if (s) setCustomChecklist(s.defaultChecklist);
  };

  const addCustomChecklistItem = () => {
    if (!newItemText.trim()) return;
    setCustomChecklist([...customChecklist, newItemText.trim()]);
    setNewItemText('');
  };

  const removeChecklistItem = (idx) => {
    setCustomChecklist(customChecklist.filter((_, i) => i !== idx));
  };

  const handleCreateCase = async () => {
    if (!form.clientId) {
      setErrors({ clientId: 'Pilih Klien terlebih dahulu' });
      return;
    }
    const res = await addCase(form, customChecklist);
    if (res) {
      notify(`Permohonan baru ${res.caseNumber} berhasil dibuat`, 'success');
      setModalOpen(false);
    }
  };

  // Semua user berwenang mengubah status apapun
  const handleStatusChange = async (caseId, newStatus) => {
    const res = await updateCaseStatus(caseId, newStatus, user?.name || 'Pengguna');
    if (res) {
      notify(`Status permohonan diperbarui ke "${newStatus}"`, 'info');
      if (selectedCase && selectedCase.id === caseId) {
        setSelectedCase((prev) => ({ ...prev, status: newStatus }));
      }
      // Refresh logs setelah ubah status
      fetchCaseLogs(caseId).then(setCaseLogs);
    } else {
      notify('Gagal memperbarui status. Coba lagi.', 'error');
    }
  };

  const handleToggleCheck = async (caseId, itemId, currentVal) => {
    const newVal = !currentVal;
    await toggleChecklistItem(caseId, itemId, newVal);
    if (selectedCase && selectedCase.id === caseId) {
      const updatedList = (selectedCase.checklist || []).map((i) =>
        i.id === itemId ? { ...i, isChecked: newVal ? 1 : 0 } : i
      );
      setSelectedCase((prev) => ({ ...prev, checklist: updatedList }));
    }
  };

  const handleGenerateAkta = async (caseId) => {
    const aktaNum = await generateAktaNumber(caseId, user?.role);
    if (aktaNum) {
      notify(`Nomor Akta Resmi Terbentuk: ${aktaNum}`, 'success');
      if (selectedCase && selectedCase.id === caseId) {
        setSelectedCase((prev) => ({ ...prev, aktaNumber: aktaNum, status: 'draf_akta' }));
      }
    } else {
      notify('Gagal menerbitkan Nomor Akta. Coba lagi.', 'error');
    }
  };

  const getClientName = (clientId) => {
    const c = clients.find((cl) => cl.id === clientId);
    return c ? c.name : 'Klien Tidak Ditemukan';
  };

  const getStatusBadge = (st) => {
    const s = CASE_STATUSES.find((item) => item.id === st) || CASE_STATUSES[0];
    return <span className={`badge status-badge ${s.variant}`}>{s.label}</span>;
  };

  const statusGrouped = useMemo(() => {
    return Object.entries(
      CASE_STATUSES
        .filter(st => st.group !== 'Legacy')
        .reduce((acc, st) => {
          const g = st.group || 'Lainnya';
          if (!acc[g]) acc[g] = [];
          acc[g].push(st);
          return acc;
        }, {})
    );
  }, []);

  return (
    <>
      <PageHeader
        title="Permohonan / Kasus Notaris"
        subtitle="Kelola seluruh siklus permohonan akta, kelengkapan berkas, hingga penomoran akta resmi"
        actions={
          <Button variant="primary" icon="plus" onClick={openNewCase}>
            {t('action.newCase')}
          </Button>
        }
      />

      <div className="stat-grid mb-6">
        <div className="stat-card">
          <div className="stat-label">Total Permohonan</div>
          <div className="stat-value">{myCases.length}</div>
          <div className="stat-sub">seluruh kasus di sistem</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Kasus Sedang Diproses</div>
          <div className="stat-value">
            {myCases.filter((c) => !['diambil', 'belum_diambil', 'arsip', 'rejected'].includes(c.status)).length}
          </div>
          <div className="stat-sub">aktif berjalan</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Akta Resmi Diterbitkan</div>
          <div className="stat-value">{myCases.filter((c) => c.aktaNumber).length}</div>
          <div className="stat-sub">memiliki nomor akta</div>
        </div>
      </div>

      <div className="card-filters mb-4">
        <div className="filter-group">
          <label>Filter Status Workflow:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">Semua Status</option>
            {CASE_STATUSES.filter(st => st.group !== 'Legacy').map((st) => (
              <option key={st.id} value={st.id}>{st.label}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Jenis Layanan:</label>
          <select value={filterService} onChange={(e) => setFilterService(e.target.value)}>
            <option value="all">Semua Layanan</option>
            {NOTARY_SERVICES.map((ns) => (
              <option key={ns.id} value={ns.id}>{ns.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        {filteredCases.length === 0 ? (
          <EmptyState
            icon="documents"
            title="Tidak ada permohonan / kasus"
            description="Buat permohonan baru untuk memulai alur berkas dan penerbitan akta notaris."
            action={
              <Button variant="primary" icon="plus" onClick={openNewCase}>
                {t('action.newCase')}
              </Button>
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. Kasus &amp; Layanan</th>
                  <th>Klien</th>
                  <th>Nomor Akta</th>
                  <th>Kemajuan Berkas</th>
                  <th>Status</th>
                  <th>Tgl Masuk</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => {
                  const checklist = c.checklist || [];
                  const checkedCount = checklist.filter((i) => i.isChecked).length;
                  const pct = checklist.length > 0 ? Math.round((checkedCount / checklist.length) * 100) : 0;
                  return (
                    <tr key={c.id}>
                      <td data-label="No. Kasus">
                        <div style={{ fontWeight: 600 }}>{c.caseNumber}</div>
                        <div className="sub-meta">{c.serviceType}</div>
                      </td>
                      <td data-label="Klien">
                        <div style={{ fontWeight: 500 }}>{getClientName(c.clientId)}</div>
                        <div className="sub-meta">Petugas: {c.assignedTo}</div>
                      </td>
                      <td data-label="Nomor Akta">
                        {c.aktaNumber
                          ? <strong style={{ color: 'var(--green)', fontFamily: 'monospace', fontSize: '0.88rem' }}>{c.aktaNumber}</strong>
                          : <span style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>Belum terbit</span>
                        }
                      </td>
                      <td className="cell-progress" data-label="Kemajuan">
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>{checkedCount}/{checklist.length} ({pct}%)</div>
                          <div style={{ height: '6px', background: 'var(--surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--green)' : 'var(--primary)' }} />
                          </div>
                        </div>
                      </td>
                      <td data-label="Status">{getStatusBadge(c.status)}</td>
                      <td className="cell-date" data-label="Tgl Masuk">{c.createdAt}</td>
                      <td className="cell-actions" style={{ textAlign: 'right' }}>
                        <Button variant="secondary" size="sm" icon="eye" onClick={() => handleOpenCaseDetail(c)}>
                          Detail &amp; Checklist
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Buat Kasus Baru */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Buat Permohonan Kasus Baru"
        wide={true}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button variant="primary" onClick={handleCreateCase}>Buat Permohonan Kasus</Button>
          </>
        }
      >
        <div className="form-grid">
          <FormField label="Pilih Klien" error={errors.clientId} required>
            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              {clients.map((cl) => (
                <option key={cl.id} value={cl.id}>{cl.name} (NIK: {cl.nik})</option>
              ))}
            </select>
          </FormField>
          <FormField label="Jenis Layanan Notaris" required>
            <select value={form.serviceType} onChange={(e) => handleServiceChange(e.target.value)}>
              {NOTARY_SERVICES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="No. Kasus" hint="Kosongkan untuk auto-generate otomatis">
            <input
              type="text"
              placeholder={`Contoh: KASUS/${new Date().getFullYear()}/01/001`}
              value={form.caseNumber}
              onChange={(e) => setForm({ ...form, caseNumber: e.target.value })}
            />
          </FormField>
          <FormField label="No. Akta (Opsional)" hint="Bisa diisi sekarang atau generate dari detail kasus">
            <input
              type="text"
              placeholder={`Contoh: No. 14/VIII/${new Date().getFullYear()}`}
              value={form.aktaNumber}
              onChange={(e) => setForm({ ...form, aktaNumber: e.target.value })}
            />
          </FormField>
          <FormField label="Petugas Penanggungjawab">
            <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="Super Admin / Notaris">Super Admin / Notaris</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.name}>{emp.name} ({emp.role})</option>
              ))}
            </select>
          </FormField>
          <FormField label="Estimasi Selesai">
            <input
              type="date"
              value={form.estimatedAt}
              onChange={(e) => setForm({ ...form, estimatedAt: e.target.value })}
            />
          </FormField>
        </div>
        <div className="mt-3">
          <FormField label="Catatan / Deskripsi Permohonan">
            <textarea
              rows={2}
              placeholder="Contoh: Pendirian PT Maju Bersama, modal Rp 500jt..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
        </div>
        <div className="mt-5 p-4" style={{ background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Checklist Persyaratan Dokumen ({currentServiceConfig.name})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {customChecklist.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '0.45rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.85rem' }}>{'\u2713'} {item}</span>
                <button type="button" style={{ border: 'none', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: '2px 6px', borderRadius: '6px' }} onClick={() => removeChecklistItem(idx)}>
                  {'\u2715'} Hapus
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <input
              type="text"
              placeholder="Tambah item dokumen persyaratan lain..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomChecklistItem())}
              style={{ flex: 1, padding: '0.45rem 0.8rem', fontSize: '0.85rem', height: 'auto', minHeight: '38px' }}
            />
            <Button variant="ghost" size="sm" onClick={addCustomChecklistItem}>+ Tambah</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Detail Kasus */}
      {selectedCase && (
        <Modal
          open={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          title={`Detail Kasus: ${selectedCase.caseNumber}`}
          wide={true}
          footer={<Button variant="secondary" onClick={() => setSelectedCase(null)}>Tutup</Button>}
        >
          <div style={{ background: 'var(--surface-2)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{selectedCase.serviceType}</h3>
                  {getStatusBadge(selectedCase.status)}
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-2)', marginTop: '4px' }}>
                  Klien: <strong>{getClientName(selectedCase.clientId)}</strong> &bull; Petugas: {selectedCase.assignedTo}
                </div>
                {selectedCase.notes && (
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-3)', marginTop: '4px', fontStyle: 'italic' }}>
                    &ldquo;{selectedCase.notes}&rdquo;
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button variant="secondary" size="sm" icon="download" onClick={() => setReceiptModalOpen(true)}>Cetak Tanda Terima</Button>
                {!selectedCase.aktaNumber && (
                  <Button variant="primary" size="sm" icon="fileText" onClick={() => handleGenerateAkta(selectedCase.id)}>Generate No. Akta</Button>
                )}
              </div>
            </div>
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.83rem', color: 'var(--text-2)', fontWeight: 600 }}>Nomor Akta Resmi:</span>
              {selectedCase.aktaNumber
                ? <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--green)', fontFamily: 'monospace' }}>{selectedCase.aktaNumber}</span>
                : <span style={{ fontSize: '0.83rem', color: 'var(--text-3)', fontStyle: 'italic' }}>Belum diterbitkan</span>
              }
            </div>
          </div>

          <div style={{ background: 'var(--surface)', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border-strong)', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Status Workflow:</span>
              <span>{getStatusBadge(selectedCase.status)}</span>
            </div>
            <select
              value={selectedCase.status}
              onChange={(e) => handleStatusChange(selectedCase.id, e.target.value)}
              style={{ fontWeight: 600, fontSize: '0.85rem', minWidth: '220px' }}
            >
              {statusGrouped.map(([groupName, statuses]) => (
                <optgroup key={groupName} label={groupName}>
                  {statuses.map(st => (
                    <option key={st.id} value={st.id}>{st.label}</option>
                  ))}
                </optgroup>
              ))}
              {CASE_STATUSES.filter(st => st.group === 'Legacy' && st.id === selectedCase.status).map(st => (
                <option key={st.id} value={st.id}>{st.label} (Data Lama)</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div>
              <div style={{ background: 'var(--surface)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Checklist Dokumen</h4>
                  {selectedCase.checklist && (
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-soft)', padding: '3px 8px', borderRadius: '99px' }}>
                      {selectedCase.checklist.filter(i => i.isChecked).length} / {selectedCase.checklist.length} Terpenuhi
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(selectedCase.checklist || []).length === 0
                    ? <div style={{ fontSize: '0.83rem', color: 'var(--text-3)' }}>Tidak ada checklist berkas.</div>
                    : selectedCase.checklist.map((item) => (
                      <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: item.isChecked ? 'var(--green-soft)' : 'var(--surface-2)', border: item.isChecked ? '1px solid var(--green-border)' : '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={!!item.isChecked}
                          onChange={() => handleToggleCheck(selectedCase.id, item.id, !!item.isChecked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--green)' }}
                        />
                        <span style={{ textDecoration: item.isChecked ? 'line-through' : 'none', color: item.isChecked ? 'var(--green)' : 'var(--text)', fontWeight: item.isChecked ? 600 : 400 }}>
                          {item.itemName}
                        </span>
                      </label>
                    ))
                  }
                </div>
              </div>
              {aiAuditResult && (
                <div style={{ background: 'var(--surface)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 600 }}>{'\u{1F916}'} AI Audit Kasus</h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                    {typeof aiAuditResult === 'string' ? aiAuditResult : JSON.stringify(aiAuditResult)}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div style={{ background: 'var(--surface)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>Biaya &amp; Agenda TTD</h4>
                {isAdmin && (
                  <div className="form-grid" style={{ marginBottom: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Honorarium Notaris (Rp):</label>
                      <input type="number" value={billingForm.notaryFee} onChange={(e) => setBillingForm({ ...billingForm, notaryFee: Number(e.target.value) })} style={{ fontFamily: 'monospace' }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Biaya Pajak (Rp):</label>
                      <input type="number" value={billingForm.taxFee} onChange={(e) => setBillingForm({ ...billingForm, taxFee: Number(e.target.value) })} style={{ fontFamily: 'monospace' }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">PNBP (Rp):</label>
                      <input type="number" value={billingForm.pnbpFee} onChange={(e) => setBillingForm({ ...billingForm, pnbpFee: Number(e.target.value) })} style={{ fontFamily: 'monospace' }} />
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Status Pembayaran:</label>
                  <select value={billingForm.paymentStatus} onChange={(e) => setBillingForm({ ...billingForm, paymentStatus: e.target.value })}>
                    <option value="unpaid">Belum Lunas</option>
                    <option value="partial">DP (Sebagian)</option>
                    <option value="paid">Lunas</option>
                  </select>
                </div>
                <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '14px', marginTop: '14px' }}>
                  <div className="form-grid" style={{ marginBottom: '14px' }}>
                    <div className="form-group">
                      <label className="form-label">Tanggal TTD Akta:</label>
                      <input type="date" value={billingForm.appointmentDate} onChange={(e) => setBillingForm({ ...billingForm, appointmentDate: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Jam TTD:</label>
                      <input type="time" value={billingForm.appointmentTime} onChange={(e) => setBillingForm({ ...billingForm, appointmentTime: e.target.value })} />
                    </div>
                  </div>
                  <Button variant="primary" style={{ width: '100%' }} onClick={handleSaveBilling}>
                    {'\u{1F4BE}'} Simpan Biaya &amp; Jadwal
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Riwayat Aktivitas / Log Status */}
          <div style={{ marginTop: '20px', background: 'var(--surface)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              📋 Riwayat Aktivitas Kasus
            </h4>
            {logsLoading ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', fontStyle: 'italic' }}>Memuat riwayat...</div>
            ) : caseLogs.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', fontStyle: 'italic' }}>Belum ada riwayat perubahan status.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {caseLogs.map((log, idx) => {
                  const ts = new Date(log.timestamp);
                  const dateStr = ts.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                  const timeStr = ts.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                  const isLast = idx === caseLogs.length - 1;
                  return (
                    <div key={log.id} style={{ display: 'flex', gap: '12px', paddingBottom: isLast ? 0 : '12px' }}>
                      {/* Timeline dot & line */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: idx === 0 ? 'var(--primary)' : 'var(--border-strong)', flexShrink: 0, marginTop: '4px' }} />
                        {!isLast && <div style={{ width: '2px', flex: 1, background: 'var(--border)', minHeight: '20px', marginTop: '4px' }} />}
                      </div>
                      {/* Log content */}
                      <div style={{ flex: 1, paddingBottom: isLast ? 0 : '4px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500, lineHeight: 1.4 }}>
                          {log.action}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '3px' }}>
                          {dateStr} pukul {timeStr} • oleh <strong style={{ color: 'var(--text-2)' }}>{log.changedBy}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}

      {selectedCase && (
        <PrintReceiptModal
          open={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          caseData={selectedCase}
          clientData={clients.find((cl) => cl.id === selectedCase.clientId)}
          generalInfo={general}
        />
      )}
    </>
  );
}
