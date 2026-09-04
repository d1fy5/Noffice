import { useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function PrintReceiptModal({ open, onClose, caseData, clientData, generalInfo }) {
  const [receiptType, setReceiptType] = useState('penerimaan'); // 'penerimaan' or 'salinan'
  if (!caseData || !clientData) return null;

  const companyName = generalInfo?.companyName || 'KANTOR NOTARIS & PPAT';

  const handlePrint = () => {
    window.print();
  };

  const checklist = caseData.checklist || [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cetak Surat Tanda Terima Resmi"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" icon="download" onClick={handlePrint}>
            Cetak / Simpan ke PDF          </Button>
        </>
      }
    >
      {/* Receipt Type Toggle Switch */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'var(--surface-2)', padding: '6px', borderRadius: '10px' }}>
        <button
          type="button"
          onClick={() => setReceiptType('penerimaan')}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '0.82rem',
            fontWeight: 700,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: receiptType === 'penerimaan' ? 'var(--primary)' : 'transparent',
            color: receiptType === 'penerimaan' ? '#fff' : 'var(--text-2)',
            transition: 'all 0.2s ease',
          }}
        >
          📥 Tanda Terima Penerimaan Berkas
        </button>
        <button
          type="button"
          onClick={() => setReceiptType('salinan')}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '0.82rem',
            fontWeight: 700,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: receiptType === 'salinan' ? 'var(--primary)' : 'transparent',
            color: receiptType === 'salinan' ? '#fff' : 'var(--text-2)',
            transition: 'all 0.2s ease',
          }}
        >
          📤 Tanda Terima Penyerahan Salinan Akta
        </button>
      </div>
      <div id="printable-receipt" className="receipt-print-area p-6" style={{ background: '#fff', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
        {/* Kop Surat Notaris */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {companyName}
          </h2>
          <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>
            Pejabat Pembuat Akta Tanah (PPAT) & Notaris Resmi
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Alamat: Jln. Utama Perkantoran No. 88 | Telp/WA: (021) 555-8899 | Email: info@noffice-notary.id
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', textDecoration: 'underline', fontWeight: 700, textTransform: 'uppercase' }}>
            {receiptType === 'penerimaan' ? 'SURAT TANDA TERIMA BERKAS / DOKUMEN KLIEN' : 'SURAT TANDA TERIMA PENYERAHAN SALINAN AKTA RESMI'}
          </h3>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
            No. Registrasi: {caseData.caseNumber} {caseData.aktaNumber ? `| No. Akta Resmi: ${caseData.aktaNumber}` : ''}
          </div>
        </div>

        {/* Identitas Klien & Kasus */}
        <table style={{ width: '100%', fontSize: '0.85rem', marginBottom: '16px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 0', width: '160px', fontWeight: 600 }}>
                {receiptType === 'penerimaan' ? 'Telah Diterima Dari' : 'Diserahkan Kepada Klien'}
              </td>
              <td style={{ padding: '4px 0', width: '10px' }}>:</td>
              <td style={{ padding: '4px 0', fontWeight: 700 }}>{clientData.name}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0', fontWeight: 600 }}>NIK / Identitas</td>
              <td style={{ padding: '4px 0' }}>:</td>
              <td style={{ padding: '4px 0' }}>{clientData.nik}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0', fontWeight: 600 }}>No. HP / WA</td>
              <td style={{ padding: '4px 0' }}>:</td>
              <td style={{ padding: '4px 0' }}>{clientData.phone}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0', fontWeight: 600 }}>Jenis Permohonan Akta</td>
              <td style={{ padding: '4px 0' }}>:</td>
              <td style={{ padding: '4px 0', fontWeight: 700 }}>{caseData.serviceType}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0', fontWeight: 600 }}>Tanggal Tanda Terima</td>
              <td style={{ padding: '4px 0' }}>:</td>
              <td style={{ padding: '4px 0' }}>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
          </tbody>
        </table>

        {/* List Berkas / Salinan */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
            {receiptType === 'penerimaan'
              ? 'Rincian Berkas / Dokumen Fisik yang Diserahkan Klien:'
              : 'Rincian Salinan Akta & Dokumen Resmi yang Diserahkan ke Klien:'}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', width: '30px' }}>No</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'left' }}>Nama Dokumen / Item Berkas</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', width: '110px' }}>Status Penyerahan</th>
              </tr>
            </thead>
            <tbody>
              {receiptType === 'salinan' ? (
                <>
                  <tr>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>1</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px', fontWeight: 600 }}>
                      Salinan Akta Resmi ({caseData.serviceType}) — No. Akta: {caseData.aktaNumber || 'Dalam Proses'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>
                      DISERAHKAN
                    </td>
                  </tr>
                  {checklist.filter((i) => i.isChecked).map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>{idx + 2}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>{item.itemName} (Dokumen Asli Dikembalikan)</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
                        DIKEMBALIKAN
                      </td>
                    </tr>
                  ))}
                </>
              ) : (
                checklist.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>{item.itemName}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', color: item.isChecked ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {item.isChecked ? 'Diterima' : 'Belum Ada'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Tanda Tangan */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '36px', fontSize: '0.85rem', pageBreakInside: 'avoid' }}>
          <div style={{ textAlign: 'center', width: '220px' }}>
            <div>{receiptType === 'penerimaan' ? 'Yang Menyerahkan (Klien),' : 'Penerima Salinan (Klien),'}</div>
            <div style={{ height: '54px' }} />
            <div style={{ fontWeight: 700, textDecoration: 'underline' }}>({clientData.name})</div>
          </div>
          <div style={{ textAlign: 'center', width: '220px' }}>
            <div>{receiptType === 'penerimaan' ? 'Penerima Berkas (Staff Notaris),' : 'Yang Menyerahkan (Notaris / Staff),'}</div>
            <div style={{ height: '54px' }} />
            <div style={{ fontWeight: 700, textDecoration: 'underline' }}>({caseData.assignedTo || 'Staff Notaris'})</div>
          </div>
        </div>
      </div>

      {/* Print CSS Fix */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </Modal>
  );
}
