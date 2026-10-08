import { runRead } from './queryService.js';
import { hasTable, getVisibleColumns, isAdminRole } from './schemaInspector.js';
import { concept, meaning, stem, tokenize } from './semantics.js';
import { DOC_CATEGORIES } from '../../src/store/constants.js';

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

// ----------------------------------------------------------------------
// SEMANTIC APP-HELP — meaning-based answers about Noffice FEATURES (not raw
// data). Uses the bag-of-stems concept scorer so any unseen phrasing
// ("ganti tampilannya jadi item dong", "cara buat halaman gelap", "biar
// bersih") lands on the right feature. No sentence templates here.
// ----------------------------------------------------------------------

// Feature map: id -> { fields:[semantic field names], label, where, steps }
// The `where`/`steps` mirror the REAL code (Settings.jsx sections, Sidebar.jsx,
// Documents.jsx, Docs. The answers are assembled from these facts, never from
// a canned "Q -> A" table.
const FEATURE_MAP = [
  {
    id: 'theme',
    fields: ['theme'],
    label: 'Tema & tampilan',
    where: 'Pengaturan → Tampilan (Appearance)',
    facts: [
      'Pilih tema: **Terang**, **Gelap**, atau **Bawaan Sistem** (ikut mode perangkat).',
      'Atur **kerapatan/kepadatan** tampilan (Nyaman atau Compact).',
      'Atur **gerakan rendah** (reduced motion) untuk mengurangi animasi.',
    ],
  },
  {
    id: 'upload',
    fields: ['upload', 'document'],
    label: 'Upload dokumen',
    where: 'menu Dokumen → tombol Upload',
    facts: [
      'Buka halaman **Dokumen**, lalu klik tombol **Upload**.',
      'Pilih file (pada kategori dokumen yang tersedia), atau tarik-lepas (drag-drop) file ke area upload.',
      'Isi judul/keterangan dan pilih kategori (mis. Akta, Perjanjian, Dokumen Klien), lalu simpan.',
    ],
  },
  {
    id: 'trash',
    fields: ['trash'],
    label: 'Tempat sampah & restore dokumen',
    where: 'menu Dokumen → folder Tempat Sampah (Trash)',
    facts: [
      'Dokumen yang dihapus masuk ke **Tempat Sampah** (tidak langsung hilang).',
      'Di folder Trash ada aksi **Pulihkan (Restore)** dan **Hapus Permanen**.',
      'Hapus permanen dan kosongkan Trash hanya bisa dilakukan **Admin/Notaris Utama**.',
    ],
  },
  {
    id: 'backup',
    fields: ['backup'],
    label: 'Backup database',
    where: 'Pengaturan → Keamanan (Security)',
    facts: [
      'Tersedia tombol **Unduh Backup Database (.sqlite)** satu-klik.',
      'Disarankan rutin menyimpan salinan cadangan (mis. ke flashdisk/HDD eksternal).',
    ],
  },
  {
    id: 'security',
    fields: ['security'],
    label: 'Keamanan & password',
    where: 'Pengaturan → Keamanan (Security)',
    facts: [
      'Ganti password dari **Pengaturan → Keamanan** (verifikasi password lama).',
      'Tersedia opsi **dua-faktor (2FA)** dan **tetap masuk (keep session)**.',
      'Demo ini menyimpan perubahan secara lokal di browser.',
    ],
  },
  {
    id: 'language',
    fields: ['language'],
    label: 'Bahasa aplikasi',
    where: 'Pengaturan → Bahasa (Language)',
    facts: [
      'Pilih bahasa antarmuka: **Indonesia** atau **English**.',
      'Bahasa default untuk aplikasi juga diatur di Pengaturan → Umum.',
    ],
  },
  {
    id: 'akta',
    fields: ['akta'],
    label: 'Format & generate nomor akta',
    where: 'Pengaturan → Umum → Format Nomor Akta; kasus → Generate No. Akta',
    facts: [
      'Format nomor akta dikonfigurasi di **Pengaturan → Umum (Format Nomor Akta)** memakai variabel {no}, {bulanRomawi}, {tahun}, {jenisAkta}, dst.',
      'Saat membuka detail kasus, tombol **⚡ Generate Nomor Akta** menerbitkan nomor sesuai format itu.',
    ],
  },
  {
    id: 'recipient',
    fields: ['recipient'],
    label: 'Tanda terima (receipt)',
    where: 'Pengaturan → Umum → Template Tanda Terima',
    facts: [
      'Subtitle kop surat dan alamat kontak kantor diatur di **Pengaturan → Umum → Template Tanda Terima**.',
      'Nama perusahaan pada kop surat diambil dari field **Nama Perusahaan**.',
    ],
  },
  {
    id: 'import_ktp',
    fields: ['ktp'],
    label: 'AI Extract Data KTP',
    where: 'menu Klien → tombol AI Extract KTP',
    facts: [
      'Buka Klien → tombol **AI Extract KTP**, tempel teks hasil scan/copy, lalu Ekstrak.',
      'AI mengisi NIK, nama, tanggal lahir, alamat, dan pekerjaan secara otomatis.',
    ],
  },
];

// Tiny semantic field aliases for features with no explicit FIELDS entry.
const EXTRA_ALIASES = {
  recipient: ['tanda terima', 'tanda terimanya', 'kop surat', 'receipt', 'subtitle', 'alamat kantor'],
  ktp: ['ktp', 'ektp', 'extract', 'ekstrak', 'ocr', 'scan', 'autofill', 'auto fill'],
};

function featureScore(msgLower, fieldName) {
  // primary semantic field hit
  let sc = concept(msgLower, fieldName).score;
  // alias words (stems) secondary hits — multiword aliases are compared as
  // raw substrings ("kop surat", "tanda terima") because tokenizing splits
  // them apart.
  for (const alias of EXTRA_ALIASES[fieldName] || []) {
    if (/\s/.test(alias)) {
      if (msgLower.includes(alias)) sc += 0.75;
    } else {
      const as = stem(alias);
      for (const w of tokenize(msgLower)) {
        if (stem(w) === as) { sc += 0.5; break; }
      }
    }
  }
  return sc;
}

const HOWTO_RE = /\b(cara|bagaimana|gimana|langkah|proses|tutorial|panduan|cara pakai|biar|supaya|kasih tahu|mau aja|nitip dong|jelasin)\b/i;

// Return a NOFFICE feature help answer for `rawMsg` if the message meaning
// clearly targets one feature, else null. `page`/`role` only used to scope.
export function getSemanticHelp(rawMsg, page, role) {
  const msgLower = String(rawMsg || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!msgLower) return null;
  const m = meaning(msgLower);
  const stems = new Set(m.stems);

  // Data questions must NOT be captured here (numbers/counts go to DB layer).
  // Only DIRECT hits block (>=1): a fuzzy 0.5 ("cara"~"rata") must not
  // hijack "cara ubah tema jadi gelap".
  if (concept(m, 'statistics').score >= 1) return null;
  // Any question that clearly names real data ("cara lihat dokumen klien",
  // "upload untuk klien Siska") belongs to the DB/entity layer — except when
  // the data-domain word IS the feature itself (single akta/doc mention is
  // still fine: "cara upload dokumen" has score 1).
  if (concept(m, 'data_domain').score >= 2) return null;

  // score every feature, pick the best
  let best = null;
  for (const f of FEATURE_MAP) {
    let s = 0;
    for (const field of f.fields) s += featureScore(msgLower, field);
    // "item/itam === hitam" (typo) strengthens the theme feature
    if (s === 0 && (stems.has('item') || stems.has('itam')) && /tampil|tema|mode|warna|malam/.test(msgLower)) {
      if (f.id === 'theme') s += 0.5;
    }
    // delete/restore imperatives ("hapus file ini", "restore berkas") boost the
    // TRASH feature specifically — document words ALONE ("cara buat dokumen")
    // must not pull in trash.
    if (f.id === 'trash') {
      if (/hapus|menghapus|kehapus|dihapus|terhapus|buang|delete|pulih|restore/.test(msgLower)) s += 1.5;
      if (/\b(sampah|trash|tong sampah)\b/.test(msgLower)) s += 1;
    }
    if (!best || s > best.score) best = { feature: f, score: s };
  }

  if (!best || best.score < 0.75) return null;

  // A how-to flavor is expected for pure feature asks; a strong single word
  // (like "tema", "upload", "restore") alone also works. Short imperatives
  // ("restore dokumen", "mau backup", "ganti password") shouldn't be missed.
  if (!HOWTO_RE.test(msgLower) && best.score < 1.25
    && !/tema|upload|unggah|restore|pulih|trash|sampah|hapus|backup|password|sandi|bahasa|akta|format|database|tampil|gelap|terang|keamanan/.test(msgLower)) {
    return null;
  }

  const f = best.feature;
  const reply = [`Topik: **${f.label}** (di **${f.where}**).`, ...f.facts.map((x, i) => `${i + 1}. ${x}`)];
  reply.push(`Buka ${f.where} untuk melakukannya.`);
  return { reply: reply.join('\n'), feature: { id: f.id, label: f.label, where: f.where, facts: f.facts } };
}

// ----------------------------------------------------------------------
// TROUBLESHOOTING — honest answers for "kok nggak bisa?", "kenapa error?",
// "blank/gabisa upload". Uses the SAME semantic scorer so unseen phrasings
// still route here. It never invents root causes: it explains what Noffice
// actually guarantees (local storage, backup, admin-only actions) and asks
// for the detail when unknown.
// ----------------------------------------------------------------------
export function getTroubleshootAnswer(rawMsg, page, role) {
  const msgLower = String(rawMsg || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!msgLower) return null;
  const m = meaning(msgLower);
  const prob = concept(m, 'problem').score;
  if (prob <= 0) return null;

  // Which feature is the user struggling with?
  const help = getSemanticHelp(rawMsg, page, role);
  const topicGuess = (msgLower.match(/(tema|tampilan|gelap|upload|trash|sampah|backup|password|akta|dokumen)/) || [])[1] || 'soal yang Anda sebut';
  const featurePart = help
    ? `\n\nUntuk topik ${topicGuess}, berikut panduannya:\n${help.reply}`
    : `\nKalau bisa sebutkan juga topiknya (misal: upload, tema, backup, password) supaya saya bisa bantu lebih spesifik.`;

  const honest = 'Noffice menyimpan data aplikasi secara lokal (SQLite + localStorage) sehingga perubahan umumnya langsung berlaku setelah disimpan/direfresh (F5). Saya tidak membaca log error sistem, jadi untuk detail akurat mohon sampaikan gejala spesifiknya (kapan terjadi, di halaman mana, pesan errornya seperti apa).';
  return `Sepertinya Anda mengalami kendala. ${honest}${featurePart}`;
}