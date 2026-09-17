import { runRead } from './queryService.js';
import { hasTable, getVisibleColumns, isAdminRole } from './schemaInspector.js';

// ----------------------------------------------------------------------
// appKnowledge — answers to APPLICATION / MODULE questions ("apa fungsi
// halaman ...", "apa bedanya ...", "alur kasus", "halaman ini data apa").
// The page descriptions mirror the real UI (routes + page components), so
// nothing here is invented. Used ONLY as a fallback before the LLM: if no
// page/module intent is present the AI falls through to the data engine.
// ----------------------------------------------------------------------

export const APP_PAGES = {
  'notary-cases': {
    label: 'Notary Cases (Permohonan Notaris)',
    route: '/cases',
    category: 'notary',
    entities: ['cases'],
    summary: 'halaman kelola permohonan/kasus Notaris: daftar kasus, membuat permohonan baru, membuka detail kasus, mengisi/update status pengerjaan, menghitung estimasi fee notaris, dan menerbitkan nomor akta.',
  },
  'ppat-cases': {
    label: 'PPAT Cases (Kasus PPAT)',
    route: '/ppat-cases',
    category: 'ppat',
    entities: ['cases'],
    summary: 'halaman kelola kasus PPAT (misal AJB/Jual Beli, serta layanan PPAT lainnya): daftar kasus, membuat kasus baru, update status, dan menerbitkan akta PPAT.',
  },
  clients: {
    label: 'Klien',
    route: '/clients',
    entities: ['clients', 'cases'],
    summary: 'halaman kelola data klien: daftar klien, tambah/ubah klien, ekstraksi data dari KTP, dan melihat kasus milik tiap klien.',
  },
  documents: {
    label: 'Dokumen',
    route: '/documents',
    entities: ['documents'],
    summary: 'halaman pengelolaan dokumen/berkas: upload file, kategori, pemilik/penulis dokumen, pencarian, dan trash dokumen yang dihapus.',
  },
  employees: {
    label: 'Karyawan/Staf',
    route: '/employees',
    entities: ['employees'],
    adminOnly: true,
    summary: 'halaman kelola karyawan/staf kantor: daftar pegawai, divisi/departemen, peran, dan status kepegawaian. Khusus admin.',
  },
  dashboard: {
    label: 'Dashboard',
    route: '/dashboard',
    entities: ['cases', 'clients', 'documents', 'employees'],
    summary: 'halaman ringkasan (dashboard): statistik kasus/klients, aktivitas terbaru, dan notifikasi.',
  },
  notifications: {
    label: 'Notifikasi',
    route: '/notifications',
    entities: ['cases'],
    summary: 'halaman notifikasi/aktivitas sistem, misal perubahan status kasus dan pemberitahuan lainnya.',
  },
  settings: {
    label: 'Pengaturan',
    route: '/settings',
    entities: [],
    summary: 'halaman pengaturan aplikasi (setting).',
  },
  inbox: {
    label: 'Inbox',
    route: '/inbox',
    entities: ['documents'],
    summary: 'halaman inbox/pesan masuk.',
  },
  'data-tables': {
    label: 'Data Tables',
    route: '/data-tables',
    entities: [],
    adminOnly: true,
    summary: 'halaman tabel data mentah (admin) untuk melihat data langsung dari database.',
  },
};

const PAGE_KEYWORDS = [
  ['notary-cases', /\b(notary ?cases|permohonan notaris|kasus notaris|halaman notaris|menu notaris)\b/i],
  ['ppat-cases', /\b(ppat ?cases|kasus ppat|halaman ppat|menu ppat)\b/i],
  ['clients', /\b(klien|clients|client)\b/i],
  ['documents', /\b(dokumen|documents)\b/i],
  ['employees', /\b(karyawan|employees|employee|staf)\b/i],
  ['dashboard', /\b(dashboard|beranda)\b/i],
  ['notifications', /\b(notifikasi|notifications)\b/i],
  ['settings', /\b(pengaturan|settings)\b/i],
  ['inbox', /\b(inbox)\b/i],
];

const FUNCTION_RE = /\b(fungsi|fungsinya|kegunaan|guna|untuk apa|apa (itu|yang dilakukan|yang bisa dilakukan)|apa isi|menu apa saja)\b/i;

function countRows(table, extra = '') {
  if (!hasTable(table)) return null;
  try {
    const r = runRead(`SELECT COUNT(*) AS n FROM "${table}"${extra}`);
    return r[0] ? r[0].n : null;
  } catch {
    return null;
  }
}

function identifyPage(msg, page) {
  const explicit = [];
  for (const [key, re] of PAGE_KEYWORDS) if (re.test(msg)) explicit.push(key);
  if (explicit.length === 1) return explicit[0];
  return explicit.length > 1 ? null : page;
}

function pageDataReply(pageKey, page) {
  const p = APP_PAGES[pageKey];
  if (!p) return null;
  const bits = [`Halaman **${p.label}** menampilkan: **${p.summary}**`];
  const role = 'admin';
  for (const entity of p.entities) {
    if (!hasTable(entity)) continue;
    const n = countRows(entity);
    if (n === null) continue;
    const cols = getVisibleColumns(entity, role);
    const colTxt = cols.length ? ` kolom: ${cols.join(', ')}` : '';
    const label = entity === 'cases' ? 'kasus' : entity === 'clients' ? 'klien' : entity;
    bits.push(`• ${label} (${entity}): **${n}** record${colTxt}`);
  }
  return bits.join('\n');
}

export function getAppAnswer(rawMsg, page) {
  const msg = rawMsg.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!msg) return null;

  // 1) "apa bedanya Notary Cases dan PPAT Cases?"
  if (/\b(bedanya|perbedaan|perbandingan|difference)\b/i.test(msg) && /notar/i.test(msg) && /ppat/i.test(msg)) {
    return 'Perbedaan **Notary Cases** dan **PPAT Cases**:\n'
      + '• **Notary Cases** — permohonan layanan Notaris (Pendirian PT, Akta Kuasa, Perjanjian, Cessie, Legalitas, dan layanan notaris lainnya).\n'
      + '• **PPAT Cases** — kasus layanan PPAT (AJB/Jual-Beli dan layanan PPAT lainnya) yang berhubungan dengan tanah/Pertanahan.\n'
      + 'Keduanya adalah kasus/permohonan pada sistem; kategori ditentukan dari *jenis layanan* tiap kasus (sumber data yang sama dengan halaman Notary Cases & PPAT Cases).';
  }

  // 2) case workflow
  if (/\b(workflow|alur|tahapan|proses kasus|status kasus apa saja|tahap)\b/i.test(msg) && /(kasus|permohonan|akta|notaris|ppat)/i.test(msg)) {
    return 'Alur umum status kasus di Noffice (from database `status`):\n'
      + '1. **Berkas Masuk** → review kelengkapan (**Kurang** / **Lengkap**)\n'
      + '2. **Draf Akta** → **TTD** → proses terbit (mis. **Proses NPWP**, **SIUP/NIB**)\n'
      + '3. Proses pajak & pendaftaran (**BPHTB**, **PPH**, **Pendaftaran AHU**, **Pendaftaran BPN**)\n'
      + '4. **Akta Jadi** → **Salinan Selesai** → **Selesai / Diambil** atau **Arsip**\n'
      + 'Status dapat juga berupa **Pending**, **Review**, atau **Rejected**.';
  }

  // 3) "halaman ini data apa saja?" — live count on the current page
  if (/\b(halaman ini|page ini|di halaman|dihalaman|halaman sekarang)\b/i.test(msg) && /\b(ada apa|data apa|isi apa|apa saja|data)\b/i.test(msg)) {
    return pageDataReply(page, page);
  }

  // 4) page function questions ("apa fungsi halaman X?", "apa itu Notary Cases?")
  const wantsFunction = FUNCTION_RE.test(msg);
  if (wantsFunction || /\bapa itu\b/i.test(msg)) {
    const key = identifyPage(msg, page);
    if (key) {
      const p = APP_PAGES[key];
      return `**${p.label}** (${p.route}) adalah ${p.summary}${p.adminOnly ? ' Halaman ini khusus **admin**.'
        : `\nData terkait: ${p.entities.length ? p.entities.join(', ') : 'tidak ada entitas data.'}`}`;
    }
  }

  return null;
}