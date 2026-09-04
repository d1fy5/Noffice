import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore, useSearch, useToast } from '../store/hooks.js';
import { useTranslation } from '../store/useTranslation.js';
import { useAuth } from '../store/AuthContext.jsx';
import { NOTARY_SERVICES, CASE_STATUSES } from '../store/constants.js';
import { AiAPI } from '../services/api.js';
import AiDraftGeneratorModal from '../components/AiDraftGeneratorModal.jsx';
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
  const { clients, cases, employees, general, addCase, updateCaseStatus, updateCaseDetails, toggleChecklistItem, generateAktaNumber } = useStore();
  const { notify } = useToast();
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterService, setFilterService] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [aiAuditResult, setAiAuditResult] = useState(null);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  useEffect(() => {
    if (location.state?.createNew) {
      if (clients.length === 0) {
        notify('Silakan tambahkan data Klien terlebih dahulu di menu Klien!', 'warning');
        return;
      }
      setForm({
        clientId: clients[0]?.id || '',
        serviceType: 'AJB',
        assignedTo: user?.name || 'Super Admin / Notaris',
        estimatedAt: '',
        notes: '',
      });
      setCustomChecklist(NOTARY_SERVICES[0].defaultChecklist);
      setErrors({});
      setModalOpen(true);
      return;
    }
    if (location.state?.createForClient) {
      const targetClientId = location.state.createForClient;
      setForm((prev) => ({ ...prev, clientId: targetClientId }));
      setModalOpen(true);
    }
  }, [location.state]);

  // Billing & Appointment local edit state
  const [billingForm, setBillingForm] = useState({
    notaryFee: 0,
    taxFee: 0,
    pnbpFee: 0,
    paymentStatus: 'unpaid',
    appointmentDate: '',
    appointmentTime: '',
    notes: '',
  });

  const handleOpenCaseDetail = (c) => {
    setSelectedCase(c);
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
    const client = clients.find((cl) => cl.id === c.clientId);
    AiAPI.auditCase(c, client)
      .then((res) => setAiAuditResult(res))
      .catch(() => {});
  };

  const handleSaveBilling = async () => {
    if (!selectedCase) return;
    const payload = isAdmin
      ? { ...billingForm, userRole: user?.role }
      : {
          ...billingForm,
          notaryFee: selectedCase.notaryFee || 0,
          taxFee: selectedCase.taxFee || 0,
          pnbpFee: selectedCase.pnbpFee || 0,
          paymentStatus: selectedCase.paymentStatus || 'unpaid',
          userRole: user?.role,
        };

    const res = await updateCaseDetails(selectedCase.id, payload);
    if (res) {
      notify(
        isAdmin
          ? 'Rincian Biaya & Jadwal TTD berhasil diperbarui!'
          : 'Jadwal Agenda TTD berhasil diperbarui (Biaya honorarium & status bayar dikunci untuk Notaris)',
        'success'
      );
      setSelectedCase({ ...selectedCase, ...payload });
    }
  };

  // New Case Form state
  const [form, setForm] = useState({
    clientId: '',
    serviceType: 'AJB',
    assignedTo: user?.name || 'Super Admin / Notaris',
    estimatedAt: '',
    notes: '',
  });
  const [customChecklist, setCustomChecklist] = useState([]);
  const [newItemText, setNewItemText] = useState('');
  const [errors, setErrors] = useState({});

  const q = query.trim().toLowerCase();

  // Selected Service Default Checklist
  const currentServiceConfig = useMemo(() => {
    return NOTARY_SERVICES.find((s) => s.id === form.serviceType) || NOTARY_SERVICES[0];
  }, [form.serviceType]);

  const filteredCases = useMemo(() => {
    let rows = cases;
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
      serviceType: 'AJB',
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
    setForm({ ...form, serviceType: st });
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

  // Status yang boleh diubah karyawan (hanya kelengkapan berkas)
  const EMPLOYEE_ALLOWED_STATUSES = ['kurang', 'lengkap'];
  const FINISHED_STATUSES = ['selesai', 'salinan_selesai', 'arsip'];

  const handleStatusChange = async (caseId, newStatus) => {
    const targetCase = cases.find((c) => c.id === caseId) || selectedCase;
    if (!isAdmin && targetCase && FINISHED_STATUSES.includes(targetCase.status)) {
      notify('Permohonan ini telah selesai / diarsip. Hanya Notaris / Admin yang dapat mengubah status kembali.', 'warning');
      return;
    }
    if (!isAdmin && !EMPLOYEE_ALLOWED_STATUSES.includes(newStatus)) {
      notify('Karyawan hanya berwenang mengubah status Kelengkapan Berkas. Perubahan status lainnya harus dilakukan oleh Notaris / Admin.', 'warning');
      return;
    }
    const res = await updateCaseStatus(caseId, newStatus, user?.role);
    if (res) {
      notify(`Status permohonan diperbarui ke "${newStatus}"`, 'info');
      if (selectedCase && selectedCase.id === caseId) {
        setSelectedCase({ ...selectedCase, status: newStatus });
      }
    } else {
      notify('Gagal memperbarui status. Anda tidak memiliki akses untuk melakukan perubahan ini.', 'error');
    }
  };

  const handleToggleCheck = async (caseId, itemId, currentVal) => {
    const newVal = !currentVal;
    await toggleChecklistItem(caseId, itemId, newVal);
    if (selectedCase && selectedCase.id === caseId) {
      const updatedList = (selectedCase.checklist || []).map((i) =>
        i.id === itemId ? { ...i, isChecked: newVal ? 1 : 0 } : i
      );
      setSelectedCase({ ...selectedCase, checklist: updatedList });
    }
  };

  const handleGenerateAkta = async (caseId) => {
    if (!isAdmin) {
      notify('Hanya Notaris Utama / Super Admin yang berwenang menerbitkan Nomor Akta Resmi.', 'warning');
      return;
    }
    const aktaNum = await generateAktaNumber(caseId, user?.role);
    if (aktaNum) {
      notify(`Nomor Akta Resmi Terbentuk: ${aktaNum}`, 'success');
      if (selectedCase && selectedCase.id === caseId) {
        setSelectedCase({ ...selectedCase, aktaNumber: aktaNum, status: 'draft' });
      }
    } else {
      notify('Gagal menerbitkan Nomor Akta. Membutuhkan wewenang Notaris / Admin.', 'error');
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
          <div className="stat-value">{cases.length}</div>
          <div className="stat-sub">seluruh kasus di sistem</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Kasus Sedang Diproses</div>
          <div className="stat-value">
            {cases.filter((c) => c.status !== 'selesai' && c.status !== 'arsip' && c.status !== 'rejected').length}
          </div>
          <div className="stat-sub">aktif berjalan</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Akta Resmi Diterbitkan</div>
          <div className="stat-value">
            {cases.filter((c) => c.aktaNumber).length}
          </div>
          <div className="stat-sub">memiliki nomor akta</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="card-filters mb-4">
        <div className="filter-group">
          <label>Filter Status Workflow:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">Semua Status</option>
            {CASE_STATUSES.map((st) => (
              <option key={st.id} value={st.id}>
                {st.label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Jenis Layanan:</label>
          <select value={filterService} onChange={(e) => setFilterService(e.target.value)}>
            <option value="all">Semua Layanan</option>
            {NOTARY_SERVICES.map((ns) => (
              <option key={ns.id} value={ns.id}>
                {ns.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cases List */}
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
                  <th>No. Kasus & Layanan</th>
                  <th>Klien</th>
                  <th>Nomor Akta Resmi</th>
                  <th>Kemajuan Berkas</th>
                  <th>Status Workflow</th>
                  <th>Tgl Masuk</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => {
                  const checklist = c.checklist || [];
                  const checkedCount = checklist.filter((i) => i.isChecked).length;
                  const pct = checklist.length > 0 ? Math.round((checkedCount / checklist.length) * 100) : 0;

                  return (
                    <tr key={c.id}>
                      <td data-label="No. Kasus & Layanan">
                        <div className="case-name" style={{ fontWeight: 600, color: 'var(--text)', overflowWrap: 'anywhere' }}>{c.caseNumber}</div>
                        <div className="sub-meta">{c.serviceType} — {c.notes || 'Tanpa catatan'}</div>
                      </td>
                      <td data-label="Klien">
                        <div style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{getClientName(c.clientId)}</div>
                        <div className="sub-meta">Petugas: {c.assignedTo}</div>
                      </td>
                      <td data-label="Nomor Akta Resmi">
                        {c.aktaNumber ? (
                          <strong style={{ color: 'var(--green)', fontFamily: 'monospace', overflowWrap: 'anywhere' }}>{c.aktaNumber}</strong>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.85rem', overflowWrap: 'anywhere' }}>Belum terbit</span>
                        )}
                      </td>
                      <td className="cell-progress" data-label="Kemajuan Berkas">
                        <div style={{ width: '120px', minWidth: '120px', maxWidth: '100%' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>
                            {checkedCount}/{checklist.length} Dokumen ({pct}%)
                          </div>
                          <div style={{ height: '6px', background: 'var(--surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: pct === 100 ? 'var(--green)' : 'var(--primary)',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td data-label="Status Workflow">{getStatusBadge(c.status)}</td>
                      <td className="cell-date" data-label="Tgl Masuk">{c.createdAt}</td>
                      <td className="cell-actions" data-label="Aksi" style={{ textAlign: 'right' }}>
                        <Button variant="secondary" size="sm" icon="eye" onClick={() => setSelectedCase(c)}>
                          Detail & Checklist
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

      {/* Modal Permohonan Baru */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Buat Permohonan Kasus Baru"
        wide={true}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleCreateCase}>
              Buat Permohonan Kasus
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <FormField label="Pilih Klien" error={errors.clientId} required>
            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              {clients.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.name} (NIK: {cl.nik})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Jenis Layanan Notaris" required>
            <select value={form.serviceType} onChange={(e) => handleServiceChange(e.target.value)}>
              {NOTARY_SERVICES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Petugas Penanggungjawab">
            <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="Super Admin / Notaris">Super Admin / Notaris</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.name}>
                  {emp.name} ({emp.role})
                </option>
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
              placeholder="Contoh: Jual beli tanah SHM No. 123/Kel. Merdeka..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormField>
        </div>

        {/* Checklist Setup */}
        <div className="mt-5 p-4" style={{ background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Checklist Persyaratan Dokumen ({currentServiceConfig.name})
          </h4>
          <div className="checklist-setup-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {customChecklist.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '0.45rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>✓ {item}</span>
                <button
                  type="button"
                  style={{ border: 'none', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: '2px 6px', borderRadius: '6px', flexShrink: 0 }}
                  onClick={() => removeChecklistItem(idx)}
                >
                  ✕ Hapus
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
            <Button variant="ghost" size="sm" onClick={addCustomChecklistItem}>
              + Tambah
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Detail Kasus, Checklist Interaktif & Akta Generator */}
      {selectedCase && (
        <Modal
          open={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          title={`Detail Kasus: ${selectedCase.caseNumber}`}
          wide={true}
          footer={
            <Button variant="secondary" onClick={() => setSelectedCase(null)}>
              Tutup
            </Button>
          }
        >
          {/* Header Banner Kasus */}
          <div 
            style={{ 
              background: 'var(--surface-2)', 
              padding: '20px', 
              borderRadius: 'var(--radius-sm)', 
              border: '1px solid var(--border)',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text)' }}>{selectedCase.serviceType}</h3>
                  {getStatusBadge(selectedCase.status)}
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-2)', marginTop: '4px' }}>
                  Klien: <strong style={{ color: 'var(--text)' }}>{getClientName(selectedCase.clientId)}</strong> • Petugas: <span>{selectedCase.assignedTo}</span>
                </div>
                {selectedCase.notes && (
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-3)', marginTop: '4px', fontStyle: 'italic' }}>
                    "{selectedCase.notes}"
                  </div>
                )}
              </div>

              {/* Action Buttons Toolbar */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Button variant="secondary" size="sm" icon="download" onClick={() => setReceiptModalOpen(true)}>
                  Cetak Tanda Terima
                </Button>
                <Button variant="secondary" size="sm" icon="activity" onClick={() => setDraftModalOpen(true)}>
                  AI Draft Pasal
                </Button>
                {!selectedCase.aktaNumber && (
                  <Button variant="primary" size="sm" icon="fileText" onClick={() => handleGenerateAkta(selectedCase.id)}>
                    Generate Akta
                  </Button>
                )}
              </div>
            </div>

            {/* Nomor Akta Status Strip */}
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.83rem', color: 'var(--text-2)', fontWeight: 600 }}>Nomor Akta Resmi Notaris:</span>
              {selectedCase.aktaNumber ? (
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--green)', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                  {selectedCase.aktaNumber}
                </span>
              ) : (
                <span style={{ fontSize: '0.83rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
                  (Belum Diterbitkan — Klik tombol 'Generate Akta' di atas saat TTD)
                </span>
              )}
            </div>
          </div>

          {/* Selector Status Workflow Kasus */}
          <div 
            style={{ 
              background: 'var(--surface)', 
              padding: '14px 18px', 
              borderRadius: '12px', 
              border: '1px solid var(--border-strong)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>Status Workflow Kasus:</span>
              <span>{getStatusBadge(selectedCase.status)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '380px' }}>
              {!isAdmin && (
                <span style={{ fontSize: '0.75rem', color: 'var(--orange, #f59e0b)', fontWeight: 600, background: 'rgba(245,158,11,0.1)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.3)' }}>
                  {FINISHED_STATUSES.includes(selectedCase.status) ? '🔒 Dikunci (Selesai/Arsip)' : '🔒 Terbatas: Hanya Kelengkapan Berkas'}
                </span>
              )}
              <select
                value={selectedCase.status}
                onChange={(e) => handleStatusChange(selectedCase.id, e.target.value)}
                disabled={!isAdmin && FINISHED_STATUSES.includes(selectedCase.status)}
                style={{ fontWeight: 600, fontSize: '0.85rem', opacity: (!isAdmin && FINISHED_STATUSES.includes(selectedCase.status)) ? 0.6 : 1 }}
              >
                {CASE_STATUSES
                  .filter((st) => isAdmin || EMPLOYEE_ALLOWED_STATUSES.includes(st.id) || st.id === selectedCase.status)
                  .map((st) => {
                    const isOptionDisabled = !isAdmin && (!EMPLOYEE_ALLOWED_STATUSES.includes(st.id) || FINISHED_STATUSES.includes(selectedCase.status));
                    return (
                      <option
                        key={st.id}
                        value={st.id}
                        disabled={isOptionDisabled}
                        style={{ color: isOptionDisabled ? 'var(--text-3, #9ca3af)' : 'inherit' }}
                      >
                        {st.label}{isOptionDisabled ? ' 🔒' : ''}
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>

          {/* 2-Column Main Dashboard Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* Left Column: Checklist Berkas & AI Auditor */}
            <div>
              {/* Checklist Berkas */}
              <div style={{ background: 'var(--surface)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                    Checklist Dokumen Persyaratan
                  </h4>
                  {selectedCase.checklist && (
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-soft)', padding: '3px 8px', borderRadius: '99px' }}>
                      {selectedCase.checklist.filter(i => i.isChecked).length} / {selectedCase.checklist.length} Terpenuhi
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(selectedCase.checklist || []).length === 0 ? (
                    <div style={{ fontSize: '0.83rem', color: 'var(--text-3)' }}>Tidak ada checklist berkas.</div>
                  ) : (
                    selectedCase.checklist.map((item) => (
                      <label
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          background: item.isChecked ? 'var(--green-soft)' : 'var(--surface-2)',
                          border: item.isChecked ? '1px solid var(--green-border)' : '1px solid var(--border)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          transition: 'background 0.15s ease, border-color 0.15s ease'
                        }}
                      >
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
                  )}
                </div>
              </div>

              {/* AI Case Audit Widget */}
              {aiAuditResult && (
                <div style={{ background: 'var(--info-soft)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--info-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--info)', fontSize: '0.88rem', marginBottom: '8px' }}>
                    <Icon name="activity" size={15} />
                    <span>AI Auditor & Analisis Risiko Notaris ({aiAuditResult.status})</span>
                  </div>
                  {aiAuditResult.warnings && aiAuditResult.warnings.map((w, idx) => (
                    <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--red)', marginTop: '4px', display: 'flex', gap: '6px' }}>
                      <Icon name="alert" size={14} /> <span>{w}</span>
                    </div>
                  ))}
                  {aiAuditResult.suggestions && aiAuditResult.suggestions.map((s, idx) => (
                    <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--info)', marginTop: '4px', display: 'flex', gap: '6px' }}>
                      <Icon name="check" size={14} /> <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Financial Billing & Appointment */}
            <div>
              <div style={{ background: 'var(--surface)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                    Biaya Honorarium & Agenda TTD
                  </h4>
                  <span className={`badge ${billingForm.paymentStatus === 'paid' ? 'success' : billingForm.paymentStatus === 'partial' ? 'warning' : 'danger'}`}>
                    {billingForm.paymentStatus === 'paid' ? 'LUNAS' : billingForm.paymentStatus === 'partial' ? 'DP (SEBAGIAN)' : 'BELUM LUNAS'}
                  </span>
                </div>

                {/* Banner peringatan untuk karyawan */}
                {!isAdmin && (
                  <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '0.8rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1rem' }}>🔒</span>
                    <span>Honorarium, Pajak, dan Status Pembayaran hanya dapat diubah oleh <strong>Notaris / Admin</strong>. Anda hanya dapat mengatur Jadwal TTD.</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" style={{ opacity: isAdmin ? 1 : 0.5 }}>Honorarium Notaris (Rp): {!isAdmin && <span style={{ color: '#f59e0b', fontWeight: 700 }}>🔒</span>}</label>
                  <input
                    type="number"
                    value={billingForm.notaryFee}
                    onChange={(e) => isAdmin && setBillingForm({ ...billingForm, notaryFee: Number(e.target.value) })}
                    placeholder="0"
                    disabled={!isAdmin}
                    style={{ opacity: isAdmin ? 1 : 0.55, cursor: isAdmin ? 'auto' : 'not-allowed', background: isAdmin ? '' : 'var(--surface-2)' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ opacity: isAdmin ? 1 : 0.5 }}>Pajak Transaksi (BPHTB/PPH) (Rp): {!isAdmin && <span style={{ color: '#f59e0b', fontWeight: 700 }}>🔒</span>}</label>
                  <input
                    type="number"
                    value={billingForm.taxFee}
                    onChange={(e) => isAdmin && setBillingForm({ ...billingForm, taxFee: Number(e.target.value) })}
                    placeholder="0"
                    disabled={!isAdmin}
                    style={{ opacity: isAdmin ? 1 : 0.55, cursor: isAdmin ? 'auto' : 'not-allowed', background: isAdmin ? '' : 'var(--surface-2)' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ opacity: isAdmin ? 1 : 0.5 }}>Status Pembayaran: {!isAdmin && <span style={{ color: '#f59e0b', fontWeight: 700 }}>🔒</span>}</label>
                  <select
                    value={billingForm.paymentStatus}
                    onChange={(e) => isAdmin && setBillingForm({ ...billingForm, paymentStatus: e.target.value })}
                    disabled={!isAdmin}
                    style={{ opacity: isAdmin ? 1 : 0.55, cursor: isAdmin ? 'auto' : 'not-allowed', background: isAdmin ? '' : 'var(--surface-2)' }}
                  >
                    <option value="unpaid">Belum Lunas</option>
                    <option value="partial">DP (Sebagian)</option>
                    <option value="paid">Lunas</option>
                  </select>
                </div>

                <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '14px', marginTop: '14px' }}>
                  <div className="form-grid" style={{ marginBottom: '14px' }}>
                    <div className="form-group">
                      <label className="form-label">Tanggal TTD Akta:</label>
                      <input
                        type="date"
                        value={billingForm.appointmentDate}
                        onChange={(e) => setBillingForm({ ...billingForm, appointmentDate: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Jam TTD:</label>
                      <input
                        type="time"
                        value={billingForm.appointmentTime}
                        onChange={(e) => setBillingForm({ ...billingForm, appointmentTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button variant="primary" style={{ width: '100%' }} onClick={handleSaveBilling}>
                    {isAdmin ? 'Simpan Rincian Biaya & Jadwal' : '💾 Simpan Jadwal TTD'}
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </Modal>
      )}

      {/* Modal Generator Draft Akta AI */}
      <AiDraftGeneratorModal
        open={draftModalOpen}
        onClose={() => setDraftModalOpen(false)}
        initialService={selectedCase ? selectedCase.serviceType : 'AJB'}
      />

      {/* Modal Cetak Tanda Terima Berkas Klien */}
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
