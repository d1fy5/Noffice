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

// ----------------------------------------------------------------------
// CRUD / DATA-ACTION ANSWERS — "cara tambahin data", "masukin klien
// gimana", "cara edit data", "hapus data dari mana", "tipu caranya cari
// karyawan". This is NOT a Q→A table: the ACTION verb and the OBJECT are
// scored semantically (data_act_*/obj_* concept fields), combined at
// runtime, then answered with REAL Noffice UI facts (menu + button names
// read from the components). Unseen phrasings therefore still work.
// ----------------------------------------------------------------------
const CRUD_ACTION_FIELDS = [
  { id: 'add', field: 'data_act_add', verb: 'menambahkan' },
  { id: 'edit', field: 'data_act_edit', verb: 'mengubah/mengedit' },
  { id: 'delete', field: 'data_act_delete', verb: 'menghapus' },
  { id: 'find', field: 'data_act_find', verb: 'mencari' },
  { id: 'view', field: 'data_act_view', verb: 'melihat' },
  { id: 'save', field: 'data_act_save', verb: 'menyimpan' },
  { id: 'filter', field: 'data_act_filter', verb: 'memfilter' },
];

const CRUD_OBJECTS = [
  { id: 'klien', field: 'obj_klien', label: 'data klien', where: 'menu Klien (sidebar kiri) menuju halaman Klien' },
  { id: 'karyawan', field: 'obj_karyawan', label: 'data karyawan', where: 'menu Karyawan (sidebar) menuju halaman Karyawan' },
  { id: 'kasus', field: 'obj_kasus', label: 'data kasus/permohonan', where: 'menu Kasus atau PPAT Cases (sidebar)' },
  { id: 'dokumen', field: 'document', label: 'dokumen', where: 'menu Dokumen (sidebar)' },
  { id: 'akta', field: 'obj_akta', label: 'nomor akta', where: 'detail kasus + Pengaturan Umum' },
  { id: 'pengguna', field: 'obj_pengguna', label: 'akun/pengguna', where: 'Pengaturan → Akun' },
  { id: 'data', field: 'obj_data', label: 'data', where: 'halaman Klien / Kasus / Karyawan / Dokumen' },
];

// Per action × object, the REAL user-interface steps (button names appear in
// the source). Missing combos fall back to a generic-but-honest pointer so we
// never invent a button that does not exist.
const CRUD_STEPS = {
  add: {
    klien: ['Buka menu Klien, klik tombol Tambah Klien', 'Isi form (nama, NIK, alamat, telepon, dsb)', 'Klik Simpan; klien baru langsung masuk daftar'],
    karyawan: ['Buka menu Karyawan, klik tombol Tambah Karyawan', 'Isi form login + data pribadi', 'Klik Simpan'],
    kasus: ['Buka menu Kasus (atau PPAT Cases), klik tombol Buat Permohonan / Permohonan Akta', 'Pilih/isi klien, jenis layanan, dan detail kasus', 'Klik Simpan; kasus muncul di daftar'],
    dokumen: ['Buka menu Dokumen, klik tombol Upload', 'Pilih file (bisa juga tarik-lepas/drag-drop) dan tentukan kategori', 'Simpan; dokumen masuk daftar'],
    akta: ['Nomor akta dibuat dari detail kasus', 'Klik tombol Generate Nomor Akta untuk menerbitkan nomor sesuai format', 'Formatnya diatur di Pengaturan → Umum → Format Nomor Akta'],
    pengguna: ['Kelola akun lewat Pengaturan → Akun', 'Menambah akun login baru tidak tersedia di antarmuka ini; data pengguna dikelola dari database'],
  },
  edit: {
    klien: ['Buka menu Klien, klik ikon pensil (Edit) di baris klien yang dituju', 'Perbarui datanya pada form', 'Klik Simpan'],
    karyawan: ['Buka menu Karyawan, klik ikon pensil (Edit) di baris karyawan', 'Perbarui datanya', 'Klik Simpan'],
    kasus: ['Buka menu Kasus, klik ikon mata (detail) pada kasus', 'Ubah status pengerjaan / checklist pada panel detail', 'Ubah status lewat dropdown, lalu simpan'],
    dokumen: ['Buka menu Dokumen, klik dokumennya untuk membuka detail', 'Ubah status dokumen (Approve/Pending/Ditolak) lewat dropdown pada detail', 'Dokumen tidak bisa di-edit isinya di antarmuka ini'],
    akta: ['Format nomor akta diatur di Pengaturan → Umum → Format Nomor Akta', 'Ubah variabel sesuai pola ({no}, {bulanRomawi}, {tahun}, {jenisAkta})', 'Simpan agar berlaku untuk generate berikutnya'],
    pengguna: ['Buka Pengaturan → Akun untuk mengubah data/profil login', 'Ubah foto/profil yang tersedia', 'Klik Simpan Perubahan'],
  },
  delete: {
    klien: ['Buka menu Klien, klik ikon tempat sampah (Hapus) di baris klien', 'Konfirmasi pada dialog Hapus Data Klien'],
    karyawan: ['Buka menu Karyawan, klik ikon tempat sampah di baris karyawan', 'Konfirmasi hapus; tersedia juga hapus massal untuk yang terpilih'],
    kasus: ['Kasus tidak dihapus permanen di Noffice', 'Ubah status kasus menjadi Arsip/Dibatalkan lewat detail kasus sebagai pengganti hapus'],
    dokumen: ['Buka menu Dokumen, klik ikon tempat sampah di baris dokumen', 'Dokumen masuk ke folder Tempat Sampah, masih bisa dipulihkan', 'Hapus permanen (Admin) dilakukan dari folder Trash'],
    pengguna: ['Hapus akun login tidak tersedia di antarmuka ini; dikelola dari database'],
  },
  find: {
    klien: ['Buka menu Klien', 'Ketik nama/NIK di kolom pencarian di atas tabel'],
    karyawan: ['Buka menu Karyawan', 'Gunakan kolom pencarian di atas tabel'],
    kasus: ['Buka menu Kasus / PPAT Cases', 'Gunakan kolom pencarian dan filter status'],
    dokumen: ['Buka menu Dokumen', 'Ketik judul di kolom pencarian; bisa difilter folder & status'],
    akta: ['Cari kasus terkait di menu Kasus', 'Nomor akta tampil di detail kasus'],
  },
  view: {
    klien: ['Buka menu Klien', 'Daftar klien tampil sebagai tabel; klik baris untuk detail'],
    karyawan: ['Buka menu Karyawan', 'Tabel karyawan tampil lengkap dengan divisi/jabatan'],
    kasus: ['Buka menu Kasus / PPAT Cases', 'Daftar kasus tampil; klik ikon mata untuk detail'],
    dokumen: ['Buka menu Dokumen', 'Daftar dokumen tampil sebagai kartu/tabel'],
  },
  save: {
    klien: ['Data klien tersimpan lewat tombol Simpan pada form Tambah/Edit', 'Pastikan klik Simpan setelah mengisi form'],
    karyawan: ['Data karyawan tersimpan lewat tombol Simpan pada form Tambah/Edit'],
    kasus: ['Perubahan kasus disimpan lewat tombol Simpan pada detail/form'],
    dokumen: ['Dokumen disimpan saat tombol Upload diklik'],
  },
  filter: {
    klien: ['Di halaman Klien tersedia filter/kolom pencarian di atas tabel'],
    kasus: ['Di halaman Kasus ada dropdown filter status (semua/diambil/draf/arsip/dsb)'],
    dokumen: ['Di halaman Dokumen ada filter status dan folder di atas daftar'],
  },
};

const CRUD_ANYOBJECT = {
  add: ['Di Noffice data ditambahkan di masing-masing halamannya', 'Klien → tombol Tambah Klien; Karyawan → Tambah Karyawan; Kasus → Buat Permohonan; Dokumen → Upload'],
  edit: ['Data diubah lewat ikon Edit (pensil) di baris tabel halaman terkait', 'Kasus diubah statusnya lewat detail kasus'],
  delete: ['Data dihapus lewat ikon tempat sampah di baris tabel', 'Dokumen yang dihapus masuk ke Tempat Sampah; kasus dipindah ke status Arsip'],
  find: ['Gunakan kolom pencarian di atas tabel pada halaman Klien, Karyawan, Kasus, atau Dokumen', 'Sebutkan data apa yang ingin dicari supaya saya arahkan ke halaman yang tepat'],
  view: ['Buka halaman Klien, Kasus, Dokumen, atau Karyawan lewat sidebar', 'Data tampil sebagai tabel/daftar; klik baris untuk detail'],
  save: ['Pastikan setiap form (Klien/Karyawan/Kasus) diklik tombol Simpan agar perubahan tersimpan', 'Dokumen tersimpan lewat tombol Upload'],
  filter: ['Tiap halaman data punya filter (status, folder, pencarian) di bagian atas'],
};

// Object detection WITHOUT re-scoring the same message against huge field
// lists: use the already-tokenised meaning + stem sets.
function crudDetect(rawMsg, extra = {}) {
  const msgLower = String(rawMsg || '').trim().toLowerCase();
  if (!msgLower) return null;
  const m = meaning(msgLower);
  // statistics ("berapa total klien") and pure data-snapshot questions must go
  // to the live DB layer — never captured here.
  if (concept(m, 'statistics').score >= 1) return null;
  // "Berkas Masuk" is a real case STATUS, not an add-action. The word "masuk"
  // also means "input a record", so when it appears alongside "berkas" it is
  // status language — let the DB layer answer the status filter.
  if (/\b(berkas\s+masuk|berksa\s+masuk)\b/i.test(msgLower)) return null;

  const objects = [];
  for (const o of CRUD_OBJECTS) {
    const sc = concept(m, o.field).score;
    if (sc >= 1) objects.push({ ...o, score: sc });
  }
  // The generic "data" matches easily; when a SPECIFIC object is also named
  // ("data orang baru" = klien), drop the redundant generic so replies stay
  // clean instead of "menambahkan data klien dan data".
  if (objects.some((o) => o.id !== 'data' && o.id !== 'pengguna') && objects.some((o) => o.id === 'data')) {
    const i = objects.findIndex((o) => o.id === 'data');
    if (i >= 0) objects.splice(i, 1);
  }
  // Micro follow-up ("masukinnya gimana?") after a topic ("data klien") —
  // the stored object supplies what THIS short message does not name.
  if (!objects.length && extra && extra.fallbackObjId) {
    const fb = CRUD_OBJECTS.find((o) => o.id === extra.fallbackObjId);
    if (fb) objects.push({ ...fb, score: 1 });
  }
  if (!objects.length) return null;

  // which HOW? An action verb is required (add/edit/delete/find/view/...).
  const actions = [];
  for (const a of CRUD_ACTION_FIELDS) {
    const sc = concept(m, a.field).score;
    if (sc >= 1) actions.push({ ...a, score: sc });
  }
  if (!actions.length) return null;
  actions.sort((x, y) => y.score - x.score);

  // Find/view: only answer when the user is asking HOW ("cara cari data",
  // "cara lihat data karyawan"). Bare lookup phrasing ("cek data salah satu
  // client", "cek client lain", "carikan data klien lain") is a REAL data
  // request and must reach the DB/ask-WHO layer, never a CRUD help block.
  if (actions[0].id === 'find' || actions[0].id === 'view') {
    const how = /\b(cara|gimana|bagaimana|caranya|langkah|tutorial|prosedur|begini\s+caranya)\b/i.test(msgLower);
    if (!how) return null;
  }

  return { actions, objects, m, msgLower, entityMention: !!(extra && extra.entityMention) };
}

// Return a CRUD navigation answer or null. `entityMention` means the message
// already names a real client/document ("cari surat Siska") — in that case a
// REAL data lookup is better than "how to find it", so we back off.
export function getCrudHelp(rawMsg, page, role, extra) {
  const d = crudDetect(rawMsg, extra);
  if (!d) return null;
  const { actions, objects } = d;
  const act = actions[0]; // strongest action

  // find/view + a named entity -> the DB layer should answer with real data.
  if ((act.id === 'find' || act.id === 'view') && d.entityMention) return null;

  // multi-intent: several objects in one message ("tambah klien + dokumen")
  if (objects.length > 1 && act.id !== 'data') {
    const lines = objects.map((o) => `- ${CRUD_STEPS[act.id] && CRUD_STEPS[act.id][o.id] ? `${o.label}: ${CRUD_STEPS[act.id][o.id].join('; ')}` : `${o.label}: ${(CRUD_ANYOBJECT[act.id] || ['']).join('; ')}`}`);
    return {
      reply: `Saya tangkap Anda mau ${act.verb} ${objects.map((o) => o.label).join(' dan ')}. Berikut cara dari masing-masing:\n${lines.join('\n')}`,
      feature: { id: `crud_${act.id}_multi`, label: `${act.verb} data`, where: 'halaman terkait', facts: lines },
    };
  }

  const obj = objects[0];
  const steps = CRUD_STEPS[act.id] && CRUD_STEPS[act.id][obj.id];
  if (!steps || !steps.length) {
    const fallback = CRUD_ANYOBJECT[act.id] || [];
    if (!fallback.length) return null;
    return {
      reply: `Untuk ${act.verb} ${obj.label}, begini caranya:\n${fallback.map((x, i) => `${i + 1}. ${x}`).join('\n')}`,
      feature: { id: `crud_${act.id}_${obj.id}`, label: `${act.verb} ${obj.label}`, where: obj.where, facts: fallback, objId: obj.id },
    };
  }
  return {
    reply: `Untuk ${act.verb} ${obj.label}, begini caranya:\n${steps.map((x, i) => `${i + 1}. ${x}`).join('\n')}`,
    feature: { id: `crud_${act.id}_${obj.id}`, label: `${act.verb} ${obj.label}`, where: obj.where, facts: steps, objId: obj.id },
  };
}