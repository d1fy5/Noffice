import { useState } from 'react';
import Icon from './Icon.jsx';
import { DocumentAPI } from '../services/api.js';

export default function DocThumbnail({ doc, size = 'card' }) {
  const [imgError, setImgError] = useState(false);

  if (!doc) {
    return (
      <div className="doc-thumb">
        <span className="thumb-file"><Icon name="file" size={30} /></span>
      </div>
    );
  }

  const title = (doc.title || doc.originalFilename || '').toLowerCase();
  const type = (doc.type || '').toLowerCase();
  const mime = (doc.mimeType || '').toLowerCase();
  const category = (doc.category || doc.dept || '').toLowerCase();

  const isImage = mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'].includes(type) || title.match(/\.(jpg|jpeg|png|webp|bmp|gif)$/i);
  const isKtp = isImage && (title.includes('ktp') || category.includes('klien'));
  const isSheet = ['xlsx', 'xls', 'csv'].includes(type) || title.match(/\.(xlsx?|csv)$/i);
  const isDocx = ['docx', 'doc', 'rtf'].includes(type) || title.match(/\.(docx?|rtf)$/i);
  const isAkta = category.includes('akta') || title.includes('akta') || title.includes('ajb') || title.includes('apht') || title.includes('minuta');
  const isLand = category.includes('tanah') || category.includes('sertifikat') || title.includes('sertipikat') || title.includes('shm') || title.includes('bphtb') || title.includes('bapenda');
  const isPdf = type === 'pdf' || mime === 'application/pdf' || title.endsWith('.pdf');

  // Preview untuk berkas Gambar / Foto KTP
  if (isImage && !imgError && doc.storedFilename) {
    const imgUrl = DocumentAPI.getDownloadUrl(doc.id);
    return (
      <div
        className="doc-thumb"
        style={{
          position: 'relative',
          height: size === 'modal' ? '280px' : '135px',
          overflow: 'hidden',
          background: '#090d16',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={imgUrl}
          alt={doc.title}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: size === 'modal' ? 'contain' : 'cover',
            transition: 'transform 0.25s ease',
          }}
        />

        {/* Badge Tipe File Gambar */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            color: '#fff',
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          {isKtp ? '🪪 SCAN KTP' : '📷 FOTO / GAMBAR'}
        </div>

        {/* Quick Preview Hover Indicator */}
        <div
          className="doc-thumb-overlay"
          style={{
            position: 'absolute',
            bottom: '6px',
            right: '8px',
            background: 'rgba(0, 0, 0, 0.65)',
            color: '#e2e8f0',
            fontSize: '0.65rem',
            padding: '2px 8px',
            borderRadius: '12px',
            backdropFilter: 'blur(4px)',
          }}
        >
          🔍 Lihat Foto
        </div>
      </div>
    );
  }

  // Jika berupa berkas KTP (atau gambar tanpa file fisik) -> Tampilkan Realistic Indonesian KTP Card Preview
  if (isKtp || (isImage && imgError)) {
    const ocrSnippet = doc.ocrContent || '';
    const nikMatch = ocrSnippet.match(/\b\d{16}\b/);
    const nikDisplay = nikMatch ? nikMatch[0] : (doc.title.match(/\d{10,16}/) ? doc.title.match(/\d{10,16}/)[0] : '317101••••••••••');

    return (
      <div
        className="doc-thumb"
        style={{
          position: 'relative',
          height: size === 'modal' ? '240px' : '135px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px',
        }}
      >
        {/* Mockup Kartu KTP Indonesia */}
        <div
          style={{
            width: '92%',
            height: '88%',
            maxWidth: '260px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 40%, #075985 100%)',
            borderRadius: '8px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.25)',
            padding: '8px 10px',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Header KTP */}
          <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: '3px' }}>
            <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              PROVINSI DKI JAKARTA
            </div>
            <div style={{ fontSize: '0.52rem', fontWeight: 600, letterSpacing: '0.02em', opacity: 0.9 }}>
              KARTU TANDA PENDUDUK
            </div>
          </div>

          {/* Body KTP: NIK & Nama & Foto */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBlock: '2px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.05em', color: '#fef08a' }}>
                NIK : {nikDisplay}
              </div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                {doc.title.replace(/^Scan[_\s]KTP[_\s]/i, '').replace(/\.(pdf|jpg|png)$/i, '') || 'WARGA NEGARA INDONESIA'}
              </div>
              <div style={{ fontSize: '0.52rem', opacity: 0.85, marginTop: '1px' }}>
                BERKAS IDENTITAS RESMI
              </div>
            </div>

            {/* Foto Cutout KTP */}
            <div
              style={{
                width: '32px',
                height: '42px',
                background: '#dc2626',
                borderRadius: '3px',
                border: '1px solid rgba(255,255,255,0.6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginLeft: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fff', opacity: 0.9, marginBottom: '2px' }} />
              <div style={{ width: '20px', height: '10px', borderRadius: '10px 10px 0 0', background: '#fff', opacity: 0.9 }} />
            </div>
          </div>

          {/* Footer KTP */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', opacity: 0.85, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '2px' }}>
            <span>BERLAKU: SEUMUR HIDUP</span>
            <span>OFFLINE ARCHIVE</span>
          </div>
        </div>
      </div>
    );
  }

  // Pilih Gaya Banner Berdasarkan Jenis Dokumen Legal
  let headerColor = '#dc2626'; // PDF Red
  let badgeLabel = 'PDF';
  let badgeIcon = 'fileText';
  let bannerSub = 'DOKUMEN RESMI';

  if (isAkta) {
    headerColor = '#b45309'; // Gold / Amber Notary
    badgeLabel = 'AKTA NOTARIS';
    badgeIcon = 'fileText';
    bannerSub = 'KANTOR NOTARIS & PPAT';
  } else if (isLand) {
    headerColor = '#047857'; // BPN / Agraria Green
    badgeLabel = 'SERTIPIKAT / BPN';
    badgeIcon = 'layers';
    bannerSub = 'AGRARIA & TATA RUANG';
  } else if (isSheet) {
    headerColor = '#15803d'; // Excel Green
    badgeLabel = 'EXCEL';
    badgeIcon = 'table';
    bannerSub = 'TABEL REGISTER & LAPORAN';
  } else if (isDocx) {
    headerColor = '#2563eb'; // Word Blue
    badgeLabel = 'DOCX';
    badgeIcon = 'fileText';
    bannerSub = 'DRAF NASKAH PERJANJIAN';
  }

  // Cuplikan teks OCR dokumen untuk ditampilkan di lembar dokumen mini
  const rawOcr = doc.ocrContent || '';
  const ocrLines = rawOcr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3)
    .slice(0, 3);

  return (
    <div
      className="doc-thumb"
      style={{
        position: 'relative',
        height: size === 'modal' ? '220px' : '135px',
        overflow: 'hidden',
        background: 'var(--surface-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px',
      }}
    >
      {/* Lembar Halaman Dokumen Mini (Realistic Paper Sheet Mockup) */}
      <div
        style={{
          width: '88%',
          height: '92%',
          maxWidth: '240px',
          background: '#ffffff',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.12)',
          border: '1px solid rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s ease',
        }}
      >
        {/* Header Strip Berwarna Sesuai Tipe Berkas */}
        <div
          style={{
            background: headerColor,
            color: '#ffffff',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.04em' }}>
              {badgeLabel}
            </span>
          </div>
          <span style={{ fontSize: '0.52rem', opacity: 0.9, letterSpacing: '0.02em', fontWeight: 600 }}>
            {bannerSub}
          </span>
        </div>

        {/* Isi Lembar Dokumen Mini */}
        <div style={{ padding: '6px 8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Judul & Cuplikan Isi Dokumen Asli */}
          <div>
            <div
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.25,
                marginBottom: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {doc.title.replace(/\.(pdf|docx|xlsx|jpg)$/i, '')}
            </div>

            {/* Jika ada hasil OCR nyata, render teks aslinya! */}
            {ocrLines.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {ocrLines.slice(0, 2).map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: '0.56rem',
                      color: '#475569',
                      lineHeight: 1.25,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontFamily: 'serif',
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            ) : isSheet ? (
              /* Simulasi Spreadsheet Table Grid untuk file Excel */
              <div style={{ marginTop: '3px', border: '1px solid #cbd5e1', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: 'rgba(22, 163, 74, 0.15)', fontSize: '0.5rem', fontWeight: 700, padding: '1px 3px', borderBottom: '1px solid #cbd5e1', color: '#15803d' }}>
                  <span>Kol A</span><span>Kol B</span><span>Kol C</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', fontSize: '0.48rem', padding: '1px 3px', color: '#64748b' }}>
                  <span>Data 1</span><span>Data 2</span><span>Data 3</span>
                </div>
              </div>
            ) : (
              /* Skeleton Paragraph Lines untuk dokumen lainnya */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
                <div style={{ height: '3px', width: '95%', background: '#e2e8f0', borderRadius: '2px' }} />
                <div style={{ height: '3px', width: '85%', background: '#e2e8f0', borderRadius: '2px' }} />
                <div style={{ height: '3px', width: '65%', background: '#e2e8f0', borderRadius: '2px' }} />
              </div>
            )}
          </div>

          {/* Footer Dokumen: Watermark Stempel Notaris & Halaman */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px dashed #cbd5e1',
              paddingTop: '3px',
              marginTop: '4px',
            }}
          >
            <span style={{ fontSize: '0.52rem', color: '#64748b' }}>
              Hal 1 • {doc.size || 'Berkas'}
            </span>
            <span
              style={{
                fontSize: '0.5rem',
                fontWeight: 700,
                color: headerColor,
                border: `1px solid ${headerColor}`,
                padding: '0 3px',
                borderRadius: '3px',
                textTransform: 'uppercase',
              }}
            >
              {isAkta ? 'TERCATAT' : 'OFFICIAL'}
            </span>
          </div>
        </div>

        {/* Dog-ear corner fold effect */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderWidth: '0 10px 10px 0',
            borderColor: 'transparent rgba(0,0,0,0.18) transparent transparent',
          }}
        />
      </div>
    </div>
  );
}
