import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore, useSearch, useToast } from '../store/hooks.js';
import { useTranslation } from '../store/useTranslation.js';
import { AiAPI } from '../services/api.js';
import Avatar from '../components/Avatar.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FormField from '../components/FormField.jsx';
import PageHeader from '../components/PageHeader.jsx';
import KtpScanner from '../components/KtpScanner.jsx';

const EMPTY_FORM = {
  nik: '',
  name: '',
  birthdate: '',
  phone: '',
  email: '',
  job: '',
  address: '',
  ktpImage: null,
  isNewKtpScan: false,
};

const shortLocation = (addr) => {
  if (!addr) return null;
  const first = String(addr).split(/\r?\n/)[0].replace(/Pekerjaan:|No\.?\s?Telp:|Telp\.?|WhatsApp:|WA:|Email:/gi, '').trim();
  if (!first) return null;
  const kec = first.match(/Kec[.\s][^,\n]*/);
  const kel = first.match(/Kel[.\s][^,\n]*/);
  if (kec) return kec[0].replace(/^Kec[.\s]*/i, '').trim();
  if (kel) return kel[0].replace(/^Kel[.\s]*/i, '').trim();
  const segs = first.split(',').map((s) => s.trim()).filter(Boolean);
  if (segs.length > 1) return segs[segs.length - 1];
  return first.length > 36 ? first.slice(0, 33) + '…' : first;
};

const maskPhone = (p) => {
  const digits = String(p || '').replace(/\D/g, '');
  if (digits.length < 8) return p || '-';
  return digits.slice(0, 4) + '••••' + digits.slice(-4);
};

export default function Clients() {
  const navigate = useNavigate();
  const location = useLocation();
  const { query } = useSearch();
  const { clients, cases, documents, addClient, updateClient, deleteClient } = useStore();
  const { notify } = useToast();
  const { t } = useTranslation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [confirmId, setConfirmId] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [rawText, setRawText] = useState('');
  const [extracting, setExtracting] = useState(false);

  const handleKtpExtracted = (data, imageBase64) => {
    if (!data) return;
    setForm((prev) => ({
      ...prev,
      nik: data.nik || prev.nik,
      name: data.name || prev.name,
      phone: data.phone || prev.phone,
      address: data.address || prev.address,
      job: data.job || prev.job,
      birthdate: data.birthdate || prev.birthdate,
      ktpImage: imageBase64 || prev.ktpImage,
      isNewKtpScan: Boolean(imageBase64),
    }));
    setErrors((prev) => {
      const up = { ...prev };
      if (data.nik) delete up.nik;
      if (data.name) delete up.name;
      return up;
    });
  };

  const handleAiExtract = async () => {
    if (!rawText.trim()) {
      notify('Paste/masukkan teks KTP/berkas terlebih dahulu!', 'warning');
      return;
    }
    setExtracting(true);
    try {
      const res = await AiAPI.extractData(rawText);
      if (res.success && res.data) {
        setForm((prev) => ({
          ...prev,
          nik: res.data.nik || prev.nik,
          name: res.data.name || prev.name,
          phone: res.data.phone || prev.phone,
          address: res.data.address || prev.address,
          job: res.data.job || prev.job,
          birthdate: res.data.birthdate || prev.birthdate,
        }));
        notify(`Data berhasil diekstrak oleh ${res.engine}!`, 'success');
        setRawText('');
      }
    } catch {
      notify('Gagal mengekstrak data dari teks', 'danger');
    } finally {
      setExtracting(false);
    }
  };

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let rows = clients;
    if (q) {
      rows = rows.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.nik || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [clients, q]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  useEffect(() => {
    if (location.state?.createNew) {
      setEditing(null);
      setForm(EMPTY_FORM);
      setErrors({});
      setModalOpen(true);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const openEdit = (client) => {
    setEditing(client);
    setForm({
      nik: client.nik || '',
      name: client.name || '',
      birthdate: client.birthdate || '',
      phone: client.phone || '',
      email: client.email || '',
      job: client.job || '',
      address: client.address || '',
      ktpImage: client.ktpImage || null,
      isNewKtpScan: false,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.nik.trim()) errs.nik = 'NIK wajib diisi';
    else if (form.nik.trim().length !== 16) errs.nik = 'NIK harus 16 digit';
    if (!form.name.trim()) errs.name = 'Nama lengkap wajib diisi';
    if (!form.phone.trim()) errs.phone = 'No. Telepon wajib diisi';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (editing) {
      const res = await updateClient(editing.id, form);
      if (res) notify('Data klien berhasil diperbarui' + (form.ktpImage ? ' & Foto KTP tersimpan' : ''), 'success');
    } else {
      const res = await addClient(form);
      if (res) notify('Klien berhasil ditambahkan & Foto KTP otomatis diarsipkan ke Dokumen Klien!', 'success');
    }
    setModalOpen(false);
  };

  const handleDelete = async (id) => {
    const res = await deleteClient(id);
    if (res) notify('Klien berhasil dihapus', 'info');
    setConfirmId(null);
  };

  // Get cases count for a client
  const clientCasesCount = (clientId) => {
    return cases.filter((c) => c.clientId === clientId).length;
  };

  return (
    <>
      <PageHeader
        title="Daftar Klien Notaris"
        subtitle="Kelola database klien, identitas (NIK), dan riwayat permohonan akta"
        actions={
          <Button variant="primary" icon="userPlus" onClick={openAdd}>
            {t('action.addClient')}
          </Button>
        }
      />

      <div className="stat-grid mb-6">
        <div className="stat-card stat-card-h">
          <div className="stat-value stat-card-h-value">{clients.length}</div>
          <div className="stat-card-h-text">
            <div className="stat-label">Total Klien Terdaftar</div>
            <div className="stat-sub">klien di database</div>
          </div>
        </div>
        <div className="stat-card stat-card-h">
          <div className="stat-value stat-card-h-value">
            {new Set(cases.map((c) => c.clientId)).size}
          </div>
          <div className="stat-card-h-text">
            <div className="stat-label">Klien Aktif Memiliki Kasus</div>
            <div className="stat-sub">klien berjalan</div>
          </div>
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState
            icon="users"
            title="Belum ada data klien"
            description="Tambahkan klien pertama Anda untuk mulai memproses permohonan akta notaris."
            action={
              <Button variant="primary" icon="userPlus" onClick={openAdd}>
                {t('action.addClient')}
              </Button>
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Klien</th>
                  <th>NIK</th>
                  <th>Kontak</th>
                  <th>Pekerjaan</th>
                  <th>Tgl Daftar</th>
                  <th>Total Kasus</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Klien">
                      <div className="user-cell" onClick={() => setSelectedClient(c)} style={{ cursor: 'pointer' }}>
                        <Avatar name={c.name} />
                        <div>
                          <div className="user-name">{c.name}</div>
                          <div className="user-sub">
                            📍 {shortLocation(c.address) ?? 'Alamat belum diisi'}
                            {c.ktpImage && (
                              <span
                                style={{
                                  marginLeft: '6px',
                                  fontSize: '0.68rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(34, 197, 94, 0.12)',
                                  color: '#16a34a',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title="Foto KTP tersimpan di sistem"
                              >
                                🪪 KTP Ada
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td data-label="NIK">
                      <code style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.nik}</code>
                    </td>
                    <td data-label="Kontak">
                      <div className="cell-trunc">{maskPhone(c.phone)}</div>
                      <div className="sub-meta">{c.email || '-'}</div>
                    </td>
                    <td data-label="Pekerjaan">
                      <span className="cell-trunc">{c.job || '-'}</span>
                    </td>
                    <td className="cell-date" data-label="Tgl Daftar">{c.createdAt || '-'}</td>
                    <td data-label="Total Kasus">
                      <span className="badge info">{clientCasesCount(c.id)} Kasus</span>
                    </td>
                    <td className="cell-actions" data-label="Aksi" style={{ textAlign: 'right' }}>
                      <div className="btn-group-sm" style={{ justifyContent: 'flex-end' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon="plus"
                          onClick={() => navigate('/cases', { state: { createForClient: c.id } })}
                        >
                          Buat Akta
                        </Button>
                        <button className="action-btn" onClick={() => setSelectedClient(c)} aria-label="Lihat detail klien" title="Lihat detail">
                          <Icon name="eye" size={16} />
                        </button>
                        <button className="action-btn" onClick={() => openEdit(c)} aria-label="Edit klien" title="Edit">
                          <Icon name="edit" size={16} />
                        </button>
                        <button className="action-btn danger" onClick={() => setConfirmId(c.id)} aria-label="Hapus klien" title="Hapus">
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Add/Edit Client */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Data Klien' : 'Tambah Klien Baru'}
        wide={true}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Simpan Data Klien
            </Button>
          </>
        }
      >
        {/* AI Extract KTP / Teks Box */}
        <KtpScanner onExtracted={handleKtpExtracted} notify={notify} />

        {/* Banner Lampiran Foto KTP yang Siap Disimpan */}
        {form.ktpImage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              borderRadius: '10px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '42px',
                borderRadius: '6px',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                flexShrink: 0,
                background: '#090d16',
              }}
            >
              <img
                src={form.ktpImage}
                alt="Preview KTP Terlampir"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>
                🪪 Berkas Foto KTP Terlampir
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-3)' }}>
                Foto KTP otomatis diarsipkan ke <strong>Dokumen Klien</strong> & profil saat disimpan.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, ktpImage: null, isNewKtpScan: false })}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                fontSize: '0.74rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Hapus Lampiran
            </button>
          </div>
        )}

        <div className="form-grid">
          <FormField label="NIK (Nomor Induk Kependudukan)" error={errors.nik} required>
            <input
              type="text"
              maxLength={16}
              placeholder="Contoh: 3171012304850001"
              value={form.nik}
              onChange={(e) => setForm({ ...form, nik: e.target.value })}
            />
          </FormField>
          <FormField label="Nama Lengkap (Sesuai KTP)" error={errors.name} required>
            <input
              type="text"
              placeholder="Nama lengkap klien"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormField>
          <FormField label="Tanggal Lahir">
            <input
              type="date"
              value={form.birthdate}
              onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
            />
          </FormField>
          <FormField label="No. Telepon / WhatsApp" error={errors.phone} required>
            <input
              type="text"
              placeholder="Contoh: 081298765432"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </FormField>
          <FormField label="Alamat Email">
            <input
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </FormField>
          <FormField label="Pekerjaan / Jabatan">
            <input
              type="text"
              placeholder="Wiraswasta / PNS / Karyawan"
              value={form.job}
              onChange={(e) => setForm({ ...form, job: e.target.value })}
            />
          </FormField>
        </div>
        <div style={{ marginTop: '14px' }}>
          <FormField label="Alamat Lengkap (KTP)">
            <textarea
              rows={3}
              placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </FormField>
        </div>
      </Modal>

      {/* Modal Detail Klien & Riwayat Kasus */}
      {selectedClient && (
        <Modal
          open={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          title={`Profil Klien: ${selectedClient.name}`}
          footer={
            <Button variant="secondary" onClick={() => setSelectedClient(null)}>
              Tutup
            </Button>
          }
        >
          <div className="client-detail-box">
            <div className="detail-row">
              <strong>NIK:</strong> <code>{selectedClient.nik}</code>
            </div>
            <div className="detail-row">
              <strong>No. HP:</strong> {selectedClient.phone}
            </div>
            <div className="detail-row">
              <strong>Email:</strong> {selectedClient.email || '-'}
            </div>
            <div className="detail-row">
              <strong>Pekerjaan:</strong> {selectedClient.job || '-'}
            </div>
            <div className="detail-row">
              <strong>Alamat:</strong> {selectedClient.address || '-'}
            </div>
          </div>

          {/* Pratinjau Foto KTP Klien yang Tersimpan */}
          {(selectedClient.ktpImage || documents.some((d) => d.clientId === selectedClient.id && (d.title.toLowerCase().includes('ktp') || d.category === 'Dokumen Klien'))) && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="camera" size={15} /> Berkas Foto / Scan KTP Tersimpan:
                </span>
                {selectedClient.ktpImage && (
                  <button
                    type="button"
                    onClick={() => {
                      const w = window.open('');
                      w.document.write(`<title>Foto KTP - ${selectedClient.name}</title><body style="margin:0; background:#000; display:flex; justify-content:center; align-items:center; min-height:100vh;"><img src="${selectedClient.ktpImage}" style="max-width:96vw; max-height:96vh; object-fit:contain; border-radius:8px;" /></body>`);
                    }}
                    style={{ fontSize: '0.73rem', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Buka Ukuran Penuh ↗
                  </button>
                )}
              </div>
              <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: '#090d16', maxHeight: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {selectedClient.ktpImage ? (
                  <img src={selectedClient.ktpImage} alt={`KTP ${selectedClient.name}`} style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} />
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.78rem' }}>
                    🪪 Berkas KTP resmi tersimpan di daftar <a href="/documents" style={{ color: 'var(--primary)' }}>Dokumen Klien</a>
                  </div>
                )}
              </div>
            </div>
          )}

          <h3 className="mt-6 mb-3 font-semibold" style={{ fontSize: '1rem' }}>
            Riwayat Permohonan Akta Klien Ini ({clientCasesCount(selectedClient.id)})
          </h3>

          {cases.filter((c) => c.clientId === selectedClient.id).length === 0 ? (
            <div className="p-4 text-center text-muted" style={{ background: 'var(--surface-2)', borderRadius: '8px' }}>
              Klien ini belum memiliki permohonan akta.
            </div>
          ) : (
            <div className="cases-list-mini">
              {cases
                .filter((c) => c.clientId === selectedClient.id)
                .map((c) => (
                  <div key={c.id} className="submission-row" style={{ padding: '0.75rem 0' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.serviceType} — {c.caseNumber}</div>
                      <div className="sub-meta">{c.notes} • Tgl: {c.createdAt}</div>
                    </div>
                    <div>
                      {c.aktaNumber ? (
                        <span className="badge success">{c.aktaNumber}</span>
                      ) : (
                        <span className="badge warning">Status: {c.status}</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Modal>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => handleDelete(confirmId)}
        title="Hapus Data Klien?"
        description="Data klien akan dihapus secara permanen dari sistem."
      />
    </>
  );
}
