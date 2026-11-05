import { uid, formatBytes } from './utils.js';

const DAY = 24 * 60 * 60 * 1000;

export const INITIAL_MESSAGES = [
  {
    id: 'msg-01',
    sender: 'Ditjen AHU Kemenkumham RI',
    cat: 'Notaris',
    dateTs: Date.now() - 2 * 3600 * 1000,
    subject: 'Pengesahan Badan Hukum PT Digital Niaga Nusantara Selesai',
    body: 'Yth. Notaris & PPAT,\n\nDengan ini diberitahukan bahwa Surat Keputusan Menteri Hukum dan HAM RI tentang Pengesahan Pendirian Badan Hukum PT DIGITAL NIAGA NUSANTARA (Nomor: AHU-0019283.AH.01.01.TAHUN 2026) telah resmi terbit.\n\nMinuta Akta No. 08 tanggal 20 Oktober 2026 wajib disimpan dan dijilid ke dalam buku register protokol Notaris sesuai ketentuan Pasal 16 UU No. 2 Tahun 2014 (UUJN).\n\nSalam,\nDirektorat Jenderal Administrasi Hukum Umum\nKementerian Hukum dan HAM RI',
    recipient: 'Notaris Utama, S.H., M.Kn.',
    read: false,
  },
  {
    id: 'msg-02',
    sender: 'Kantor Pertanahan ATR/BPN Jakarta Selatan',
    cat: 'PPAT',
    dateTs: Date.now() - 5 * 3600 * 1000,
    subject: 'Hasil Pengecekan Sertipikat SHM No. 4321/Bangka (Clean & Clear)',
    body: 'Yth. PPAT Kantor Notaris Utama,\n\nBerdasarkan permohonan pengecekan sertipikat nomor berkas BPN: 8912/2026, kami konfirmasikan bahwa Sertipikat Hak Milik (SHM) No. 4321/Bangka atas nama Budi Santoso tercatat:\n1. Status: CLEAN AND CLEAR (tidak dalam sengketa atau perkara hukum).\n2. Tidak tercatat beban Hak Tanggungan maupun sita jaminan pengadilan.\n3. Validasi batas bidang tanah pada peta pendaftaran digital BPN telah sesuai.\n\nProses penandatanganan Akta Jual Beli (AJB) dan pendaftaran peralihan hak dapat dilanjutkan.\n\nSeksi Penetapan Hak & Pendaftaran\nKantor Pertanahan Kota Administrasi Jakarta Selatan',
    recipient: 'Andi Prasetyo, S.H.',
    read: false,
  },
  {
    id: 'msg-03',
    sender: 'Bapenda DKI Jakarta (Samsat & BPHTB)',
    cat: 'Pajak Daerah',
    dateTs: Date.now() - 22 * 3600 * 1000,
    subject: 'Validasi SSPD BPHTB Elektronik Berhasil (NTPD: 202611029831)',
    body: 'Pemberitahuan Sistem Host-to-Host e-BPHTB:\n\nPembayaran Bea Perolehan Hak atas Tanah dan Bangunan (BPHTB):\nWajib Pajak: Hj. Siti Rahmawati\nNomor Objek Pajak (NOP): 31.74.020.005.012-0045.0\nAlamat Objek: Jl. Kemang Timur No. 42, Jakarta Selatan\nNilai Perolehan Objek Pajak (NPOP): Rp 900.000.000,-\nJumlah Bayar Setor: Rp 35.000.000,-\nStatus: SUDAH DIVALIDASI / LUNAS.\n\nLembar cetak validasi elektronik dapat langsung dilampirkan dalam berkas pendaftaran balik nama ke BPN.',
    recipient: 'Rina Anggraini, S.E.',
    read: true,
  },
  {
    id: 'msg-04',
    sender: 'PT Bank Central Asia Tbk - Consumer Loan Centre',
    cat: 'Perbankan',
    dateTs: Date.now() - 46 * 3600 * 1000,
    subject: 'Surat Pengantar Pelunasan & Permohonan Roya (KPR-BCA-981023)',
    body: 'Kepada Yth.\nBapak/Ibu Notaris & PPAT,\n\nBersama ini kami kirimkan kelengkapan berkas roya atas fasilitas KPR Debitur:\nNama Debitur: Budi Santoso\nNo. Perjanjian Kredit: KPR-BCA-981023\nObjek: SHM No. 2871/Cilandak, Jakarta Selatan\n\nBerkas fisik berupa:\n1. Asli Sertipikat Hak Milik (SHM) No. 2871/Cilandak\n2. Asli Sertipikat Hak Tanggungan (SHT) No. 01124/2018\n3. Surat Keterangan Lunas dari BCA\ntelah diserahkan kepada staf PPAT kantor Anda. Mohon dibantu proses pencoretan (Roya) pada buku tanah di Kantor Pertanahan setempat.\n\nTerima kasih atas kerjasamanya.\nDivisi Legal Perkreditan BCA',
    recipient: 'Andi Prasetyo, S.H.',
    read: true,
  },
  {
    id: 'msg-05',
    sender: 'Ir. Hendra Gunawan (Klien Notaris)',
    cat: 'Klien',
    dateTs: Date.now() - 70 * 3600 * 1000,
    subject: 'Konfirmasi Jadwal Penandatanganan Minuta Akta Sewa Menyewa',
    body: 'Selamat siang Ibu Dewi / Bapak Notaris,\n\nSaya telah melengkapi dokumen bukti bayar PBB tahun terakhir dan persetujuan keluarga untuk draf Akta Sewa Menyewa Ruko Fatmawati.\n\nApakah jadwal penandatanganan akta di kantor Notaris hari ini pukul 15:00 WIB sudah dapat dipastikan? Kami akan hadir bersama pihak pemilik ruko.\n\nTerima kasih atas bantuan dan pelayanannya yang sangat profesional.\n\nSalam hormat,\nIr. Hendra Gunawan',
    recipient: 'Dewi Rahayu, S.H.',
    read: true,
  }
];

/**
 * Builds the initial notification feed from real app data whenever possible.
 * Only falls back to curated system notifications when the account is empty.
 */
export function buildInitialNotifications(target = {}) {
  const now = Date.now();
  const out = [];
  const push = (n, offsetDays) => {
    out.push({ id: 'notif-' + uid() + '-' + out.length, dateTs: now - offsetDays * DAY, read: false, ...n });
  };

  const pending = (target.documents || []).filter((d) => !d.isTrashed && d.status === 'pending');
  pending.slice(0, 5).forEach((d, i) => {
    push({
      type: 'submission',
      title: 'Verifikasi Berkas Baru Menunggu',
      message: `${d.author || 'Staf'} mengunggah "${d.title}" dan menunggu persetujuan Notaris.`,
      approval: true,
      route: '/data-tables',
    }, i * 0.6);
  });

  const messages = (target.messages && target.messages.length > 0) ? target.messages : INITIAL_MESSAGES;
  messages.slice(0, 3).forEach((m, i) => {
    push({
      type: 'message',
      title: 'Pesan Masuk Belum Dibaca',
      message: `${m.sender || 'Pengirim'} mengirim: "${m.subject}".`,
      route: '/inbox',
    }, i * 1.2 + 0.3);
  });

  // System-level notifications reflecting real stored state.
  const employees = target.employees || [];
  if (employees.length) {
    const newest = employees.reduce((a, b) => (new Date(b.dateTs || 0) > new Date(a.dateTs || 0) ? b : a), employees[0]);
    push({
      type: 'employee',
      title: 'Staf Terdaftar di Sistem',
      message: `${newest.firstName || newest.name || ''} bergabung sebagai ${newest.role || 'staf kantor'}.`,
      route: '/employees',
    }, 1.5);
  }

  // Storage warning based on real stored bytes.
  const bytes = (target.documents || []).reduce((s, d) => s + (d.sizeBytes || 0), 0);
  if (bytes > 0) {
    push({
      type: 'storage',
      title: 'Kapasitas Arsip Dokumen',
      message: `Total kapasitas dokumen tersimpan di drive lokal: ${formatBytes(bytes)}.`,
      approval: false,
      route: '/settings',
    }, 2.5);
  }

  // Curated items only added when the account has never been set up.
  const hasRealActivity = pending.length || messages.length || employees.length;
  if (!hasRealActivity) {
    push({ type: 'approval', title: 'Audit Sistem Selesai', message: 'Pemeriksaan rutin database lokal offline berhasil.', approval: true, route: '/data-tables' }, 0.2);
    push({ type: 'submission', title: 'Verifikasi Dokumen Baru', message: 'Dokumen baru telah masuk untuk ditinjau.', approval: true, route: '/data-tables' }, 0.8);
    push({ type: 'approval', title: 'Draf Akta Disetujui', message: 'Minuta akta telah disetujui Notaris.', approval: true, route: '/data-tables' }, 3);
  }

  return out;
}
