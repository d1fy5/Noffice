import { useState, useMemo } from 'react';
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
  const { query } = useSearch();
  const { clients, cases, employees, general, addCase, updateCaseStatus, updateCaseDetails, toggleChecklistItem, generateAktaNumber } = useStore();
  const { notify } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterService, setFilterService] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [aiAuditResult, setAiAuditResult] = useState(null);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

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
    const res = await updateCaseDetails(selectedCase.id, billingForm);
    if (res) {
      notify('Rincian Biaya & Jadwal TTD berhasil diperbarui!', 'success');
      setSelectedCase({ ...selectedCase, ...billingForm });
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

  const handleStatusChange = async (caseId, newStatus) => {
    const res = await updateCaseStatus(caseId, newStatus);
    if (res) {
      notify(`Status permohonan diperbarui ke ${newStatus}`, 'info');
      if (selectedCase && selectedCase.id === caseId) {
        setSelectedCase({ ...selectedCase, status: newStatus });
      }
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
    const aktaNum = await generateAktaNumber(caseId);
    if (aktaNum) {
      notify(`Nomor Akta Resmi Terbentuk: ${aktaNum}`, 'success');
      if (selectedCase && selectedCase.id === caseId) {
        setSelectedCase({ ...selectedCase, aktaNumber: aktaNum, status: 'draft' });
      }
    }
  };

  const getClientName = (clientId) => {
    const c = clients.find((cl) => cl.id === clientId);
    return c ? c.name : 'Klien Tidak Ditemukan';
  };

  const getStatusBadge = (st) => {
    const s = CASE_STATUSES.find((item) => item.id === st) || CASE_STATUSES[0];
    return (
      <span className="badge" style={{ color: s.color, backgroundColor: s.bg, border: `1px solid ${s.color}33` }}>
        {s.label}
      </span>
    );
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
          <div className="table-responsive">
            <table className="table">
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
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{c.caseNumber}</div>
                        <div className="sub-meta">{c.serviceType} — {c.notes || 'Tanpa catatan'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{getClientName(c.clientId)}</div>
                        <div className="sub-meta">Petugas: {c.assignedTo}</div>
                      </td>
                      <td>
                        {c.aktaNumber ? (
                          <strong style={{ color: '#16a34a', fontFamily: 'monospace' }}>{c.aktaNumber}</strong>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.85rem' }}>Belum terbit</span>
                        )}
                      </td>
                      <td>
                        <div style={{ width: '120px' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>
                            {checkedCount}/{checklist.length} Dokumen ({pct}%)
                          </div>
                          <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: pct === 100 ? '#16a34a' : 'var(--primary)',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>{getStatusBadge(c.status)}</td>
                      <td>{c.createdAt}</td>
                      <td style={{ textAlign: 'right' }}>
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
        title="Buat Permohonan / Kasus Akta Baru"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleCreateCase}>
              Buat Kasus & Checklist
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
        <div className="mt-5 p-4" style={{ background: 'var(--neutral-50)', borderRadius: '8px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Checklist Persyaratan Dokumen ({currentServiceConfig.name})
          </h4>
          <div className="checklist-setup-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {customChecklist.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.85rem' }}>✓ {item}</span>
                <button
                  type="button"
                  style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
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
              style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
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
          footer={
            <Button variant="secondary" onClick={() => setSelectedCase(null)}>
              Tutup
            </Button>
          }
        >
          <div className="case-detail-header p-4 mb-4" style={{ background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{selectedCase.serviceType}</h3>
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                  Klien: <strong>{getClientName(selectedCase.clientId)}</strong> • Petugas: {selectedCase.assignedTo}
                </div>
                <div className="mt-1" style={{ fontSize: '0.85rem' }}>{selectedCase.notes}</div>
              </div>
              <div>{getStatusBadge(selectedCase.status)}</div>
            </div>

            {/* Nomor Akta Section & AI Draft */}
            <div className="mt-4 pt-3" style={{ borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Nomor Akta Resmi Notaris:</div>
                {selectedCase.aktaNumber ? (
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#16a34a', fontFamily: 'monospace' }}>
                    {selectedCase.aktaNumber}
                  </div>
                ) : (
                  <div className="text-muted" style={{ fontSize: '0.85rem', italic: 'true' }}>
                    Belum diterbitkan
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button variant="secondary" size="sm" icon="download" onClick={() => setReceiptModalOpen(true)}>
                  🖨️ Cetak Tanda Terima
                </Button>
                <Button variant="secondary" size="sm" icon="fileText" onClick={() => setDraftModalOpen(true)}>
                  ⚡ AI Draft Pasal
                </Button>
                {!selectedCase.aktaNumber && (
                  <Button variant="primary" size="sm" icon="check" onClick={() => handleGenerateAkta(selectedCase.id)}>
                    ⚡ Generate Akta
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Financial Billing & Appointment Section */}
          <div className="p-3 mb-4" style={{ background: '#fff8f0', borderRadius: '8px', border: '1px solid #fed7aa' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#c2410c', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💰 Biaya Transaksi & 📅 Jadwal TTD Klien</span>
              <span className={`badge ${billingForm.paymentStatus === 'paid' ? 'success' : billingForm.paymentStatus === 'partial' ? 'warning' : 'danger'}`}>
                {billingForm.paymentStatus === 'paid' ? 'LUNAS' : billingForm.paymentStatus === 'partial' ? 'DP (SEBAGIAN)' : 'BELUM LUNAS'}
              </span>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Honorarium Notaris (Rp):</label>
                <input
                  type="number"
                  value={billingForm.notaryFee}
                  onChange={(e) => setBillingForm({ ...billingForm, notaryFee: Number(e.target.value) })}
                  style={{ width: '100%', fontSize: '0.8rem', padding: '4px 8px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Pajak (BPHTB/PPH) (Rp):</label>
                <input
                  type="number"
                  value={billingForm.taxFee}
                  onChange={(e) => setBillingForm({ ...billingForm, taxFee: Number(e.target.value) })}
                  style={{ width: '100%', fontSize: '0.8rem', padding: '4px 8px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Status Pembayaran:</label>
                <select
                  value={billingForm.paymentStatus}
                  onChange={(e) => setBillingForm({ ...billingForm, paymentStatus: e.target.value })}
                  style={{ width: '100%', fontSize: '0.8rem', padding: '4px 8px' }}
                >
                  <option value="unpaid">Belum Lunas</option>
                  <option value="partial">DP (Sebagian)</option>
                  <option value="paid">Lunas</option>
                </select>
              </div>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Tanggal TTD Akta:</label>
                <input
                  type="date"
                  value={billingForm.appointmentDate}
                  onChange={(e) => setBillingForm({ ...billingForm, appointmentDate: e.target.value })}
                  style={{ width: '100%', fontSize: '0.8rem', padding: '4px 8px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Jam TTD:</label>
                <input
                  type="time"
                  value={billingForm.appointmentTime}
                  onChange={(e) => setBillingForm({ ...billingForm, appointmentTime: e.target.value })}
                  style={{ width: '100%', fontSize: '0.8rem', padding: '4px 8px' }}
                />
              </div>
              <Button variant="primary" size="sm" onClick={handleSaveBilling}>
                Simpan Biaya & Jadwal
              </Button>
            </div>
          </div>

          {/* AI Case Audit Widget */}
          {aiAuditResult && (
            <div className="mb-4 p-3" style={{ background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#0369a1', fontSize: '0.88rem' }}>
                🤖 AI Auditor & Analisis Risiko Notaris ({aiAuditResult.status})
              </div>
              {aiAuditResult.warnings && aiAuditResult.warnings.map((w, idx) => (
                <div key={idx} style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '4px' }}>
                  {w}
                </div>
              ))}
              {aiAuditResult.suggestions && aiAuditResult.suggestions.map((s, idx) => (
                <div key={idx} style={{ fontSize: '0.8rem', color: '#0369a1', marginTop: '4px' }}>
                  {s}
                </div>
              ))}
            </div>
          )}

          {/* Workflow Status Selector */}
          <div className="mb-4">
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Ubah Status Workflow Kasus:
            </label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {CASE_STATUSES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleStatusChange(selectedCase.id, st.id)}
                  style={{
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    border: selectedCase.status === st.id ? `2px solid ${st.color}` : '1px solid #cbd5e1',
                    background: selectedCase.status === st.id ? st.bg : '#fff',
                    color: selectedCase.status === st.id ? st.color : '#334155',
                    fontWeight: selectedCase.status === st.id ? 700 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Checklist Interaktif */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Checklist Kelengkapan Dokumen Persyaratan
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(selectedCase.checklist || []).length === 0 ? (
                <div className="text-muted">Tidak ada checklist berkas.</div>
              ) : (
                selectedCase.checklist.map((item) => (
                  <label
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.5rem 0.75rem',
                      background: item.isChecked ? '#f0fdf4' : '#fff',
                      border: item.isChecked ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!item.isChecked}
                      onChange={() => handleToggleCheck(selectedCase.id, item.id, !!item.isChecked)}
                    />
                    <span style={{ textDecoration: item.isChecked ? 'line-through' : 'none', color: item.isChecked ? '#166534' : '#1e293b' }}>
                      {item.itemName}
                    </span>
                  </label>
                ))
              )}
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
