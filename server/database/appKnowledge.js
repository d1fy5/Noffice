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
    summary: 'pusat komando untuk layanan keperdataan umum Notaris. Anda bisa tracking pipeline kasus, membuat permohonan baru, update status pengerjaan secara real-time, estimasi fee, hingga auto-generate nomor akta.',
  },
  'ppat-cases': {
    label: 'PPAT Cases (Kasus PPAT)',
    route: '/ppat-cases',
    category: 'ppat',
    entities: ['cases'],
    summary: 'ruang kendali khusus layanan PPAT (seperti AJB, Hibah, APHT). Mengelola seluruh siklus kasus pertanahan dari awal masuk hingga terbitnya akta.',
  },
  clients: {
    label: 'Klien',
    route: '/clients',
    entities: ['clients', 'cases'],
    summary: 'sistem manajemen relasi (CRM) internal. Fitur meliputi: database klien, histori kasus tiap klien, hingga AI KTP-Extractor untuk input data super cepat.',
  },
  documents: {
    label: 'Dokumen',
    route: '/documents',
    entities: ['documents'],
    summary: 'repositori cerdas untuk seluruh berkas digital kantor. Mendukung upload instan, kategorisasi, tracking kepemilikan, pencarian super cepat, dan pemulihan via Trash.',
  },
  employees: {
    label: 'Karyawan/Staf',
    route: '/employees',
    entities: ['employees'],
    adminOnly: true,
    summary: 'panel HR internal untuk mengelola armada staf, role/jabatan, status kepegawaian, dan pembagian divisi. (Khusus otoritas Admin).',
  },
  dashboard: {
    label: 'Dashboard',
    route: '/dashboard',
    entities: ['cases', 'clients', 'documents', 'employees'],
    summary: 'kokpit analitik utama. Memberikan visualisasi data operasional, statistik real-time, aktivitas terbaru, dan metrik kesehatan kantor secara komprehensif.',
  },
  notifications: {
    label: 'Notifikasi',
    route: '/notifications',
    entities: ['cases'],
    summary: 'pusat notifikasi sistem yang melacak jejak aktivitas penting, seperti transisi status kasus atau pembaruan dokumen.',
  },
  settings: {
    label: 'Pengaturan',
    route: '/settings',
    entities: [],
    summary: 'pusat konfigurasi aplikasi. Anda bisa mengatur tema, bahasa, keamanan (password), template tanda terima, format auto-akta, hingga backup database.',
  },
  inbox: {
    label: 'Inbox',
    route: '/inbox',
    entities: ['documents'],
    summary: 'ruang komunikasi dan pesan masuk untuk koordinasi internal (Inbox).',
  },
  'data-tables': {
    label: 'Data Tables',
    route: '/data-tables',
    entities: [],
    adminOnly: true,
    summary: 'panel akses raw-data khusus admin untuk melakukan inspeksi langsung ke dalam core database.',
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
    return '🚀 **Perbedaan Esensial Notary Cases & PPAT Cases**:\n'
      + '• **Notary Cases (Permohonan Notaris)**: Pusat komando untuk layanan keperdataan umum (seperti Pendirian PT, Akta Kuasa, Perjanjian, Cessie, Legalitas, dsb).\n'
      + '• **PPAT Cases (Kasus PPAT)**: Ruang kendali khusus untuk ranah pertanahan (AJB, Hak Tanggungan/APHT, Hibah, dan layanan PPAT lainnya).\n\n'
      + '💡 *Pro-tip*: Keduanya terintegrasi dalam engine manajemen kasus yang sama, namun dipisahkan agar *workflow* Anda tetap rapi, terstruktur, dan mudah ditracking sesuai spesialisasinya.';
  }

  // 2) case workflow
  if (/\b(workflow|alur|tahapan|proses kasus|status kasus apa saja|tahap|flow|journey)\b/i.test(msg) && /(kasus|permohonan|akta|notaris|ppat|sistem)/i.test(msg)) {
    return '🗺️ **End-to-End Workflow (Alur Kasus) di Noffice**:\n'
      + '1. 📥 **Berkas Masuk & Verifikasi**: Klien mendaftar, tim me-review kelengkapan dokumen (**Kurang** / **Lengkap**).\n'
      + '2. ✍️ **Drafting & Eksekusi**: Pembuatan **Draf Akta** → dijadwalkan **TTD** → proses paralel (mis. **Proses NPWP**, **SIUP/NIB**).\n'
      + '3. ⚖️ **Validasi & Pendaftaran**: Validasi setoran pajak (**BPHTB**, **PPH**) → registrasi ke instansi (**Pendaftaran AHU**, **Pendaftaran BPN**).\n'
      + '4. 📜 **Finalisasi**: Status menjadi **Akta Jadi** → pencetakan **Salinan Selesai**.\n'
      + '5. 🎉 **Handover**: Dokumen diserahkan (**Selesai / Diambil**) atau dikurasi ke rak **Arsip**.\n\n'
      + '🚦 *Status kontrol*: Gunakan **Pending** (menunggu), **Review** (pemeriksaan), atau **Rejected** (ditolak) untuk anomali alur.';
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
    id: 'dashboard',
    fields: ['dashboard', 'analitik', 'statistik', 'pantau', 'metrics'],
    label: 'Dashboard & Analitik',
    where: 'menu Dashboard',
    facts: [
      'Gunakan **Dashboard** sebagai *pusat komando* untuk memantau metrik kantor secara real-time.',
      'Sistem menyajikan data intelijen: total kasus aktif, beban kerja, hingga grafik penyelesaian.',
      'Aktivitas terbaru (recent logs) juga ter-tracking rapi agar tidak ada pergerakan dokumen yang luput dari pantauan.',
    ],
  },
  {
    id: 'approval',
    fields: ['approve', 'setuju', 'validasi', 'review', 'tolak', 'reject'],
    label: 'Alur Validasi & Approval Dokumen',
    where: 'detail Dokumen / detail Kasus',
    facts: [
      'Dokumen atau tahapan kasus yang butuh otorisasi bisa Anda set statusnya ke **Review** atau **Pending**.',
      'Otorisator (Admin/Notaris) dapat mengecek berkas, lalu memberikan stamp **Approve** (Disetujui) lewat *dropdown* status.',
      'Jika ada anomali, kembalikan ke **Rejected** atau **Kurang** beserta catatannya.',
    ],
  },
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
  ktp: ['ktp', 'ektp', 'extract', 'ekstrak', 'ocr', 'scan', 'autofill', 'auto fill', 'ai ktp', 'baca ktp'],
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
    klien: ['Buka menu **Klien**, lalu eksekusi tombol **Tambah Klien** di sudut layar.', 'Isi formulir pendaftaran (nama, NIK, alamat, telepon).', 'Klik **Simpan**; voila, profil klien baru langsung live di database.'],
    karyawan: ['Akses menu **Karyawan**, klik **Tambah Karyawan**.', 'Set up profil login, tentukan otorisasi (role), dan mapping divisinya.', 'Klik **Simpan** untuk mengaktifkan staf.'],
    kasus: ['Masuk ke **Kasus** (atau PPAT Cases), tembak tombol **Buat Permohonan**.', 'Assign ke klien terkait, pilih jenis layanan, dan tulis deskripsi singkat.', 'Klik **Simpan** untuk mendaftarkan kasus ke dalam *pipeline*.'],
    dokumen: ['Navigasi ke menu **Dokumen**, klik **Upload**.', 'Pilih file dari direktori atau gunakan aksi *drag-and-drop* secara instan.', 'Set kategori, tambahkan metadata/keterangan, lalu **Simpan** ke repositori cerdas.'],
    akta: ['Sistem penomoran beroperasi dari dalam antarmuka detail kasus.', 'Gunakan aksi **⚡ Generate Nomor Akta** untuk mencetak nomor registrasi resmi.', 'Pola penomoran bisa Anda kustomisasi penuh di **Pengaturan → Umum → Format Nomor Akta**.'],
    pengguna: ['Manajemen akun profil sepenuhnya dikendalikan via **Pengaturan → Akun**.', 'Catatan: Injeksi akun baru (register) ditangani langsung di level core database demi regulasi keamanan.'],
  },
  edit: {
    klien: ['Akses menu **Klien**, bidik ikon pensil (Edit) pada baris data klien incaran.', 'Lakukan pembaruan data pada form.', 'Trigger aksi **Simpan** untuk sinkronisasi.'],
    karyawan: ['Buka menu **Karyawan**, klik ikon pensil pada staf yang dituju.', 'Mutakhirkan data profil atau jabatannya.', 'Klik **Simpan**.'],
    kasus: ['Di menu **Kasus**, klik ikon mata (detail) untuk masuk ke panel inspeksi.', 'Mutakhirkan checklist berkas atau transisikan status pengerjaannya.', 'Ubah via dropdown status, lalu klik ikon **Simpan**.'],
    dokumen: ['Buka **Dokumen**, klik *item* dokumen untuk membedah detailnya.', 'Anda bisa melakukan validasi dokumen (Approve/Pending/Ditolak) via dropdown status.', 'Catatan: Konten file itu sendiri (PDF/Word) diedit secara eksternal, bukan dari dalam UI Noffice.'],
    akta: ['Format orkestrasi nomor ada di **Pengaturan → Umum → Format Nomor Akta**.', 'Tata letak sintaks variabel sesuai selera (seperti {no}, {bulanRomawi}, {tahun}).', 'Simpan konfigurasi; otomatis berlaku pada iterasi generate berikutnya.'],
    pengguna: ['Navigasi ke **Pengaturan → Akun** untuk memodifikasi identitas login Anda.', 'Sesuaikan profil atau avatar.', 'Klik **Simpan Perubahan**.'],
  },
  delete: {
    klien: ['Buka **Klien**, klik ikon tempat sampah (Delete) di baris data target.', 'Beri otorisasi pada dialog konfirmasi Hapus Data.'],
    karyawan: ['Di menu **Karyawan**, eksekusi ikon tempat sampah.', 'Konfirmasi tindakan; fitur hapus massal (bulk delete) juga siap digunakan jika beberapa baris dipilih.'],
    kasus: ['Untuk audit-trail yang baik, kasus tidak dimusnahkan secara fisik dari Noffice.', 'Cukup transisikan statusnya menjadi **Arsip** atau **Dibatalkan** di panel detail.'],
    dokumen: ['Aksi hapus dokumen (ikon sampah) akan melempar file ke folder **Tempat Sampah (Trash)**.', 'Data aman (bisa di-restore). Pemusnahan absolut hanya dilakukan dari dalam folder Trash oleh Admin.'],
    pengguna: ['Terminasi akun aktif tidak tersedia di front-end UI; operasi ini membutuhkan akses level database.'],
  },
  find: {
    klien: ['Akses layar **Klien**.', 'Tembakkan nama atau NIK klien ke dalam *search bar* di atas tabel untuk pencarian instan.'],
    karyawan: ['Buka panel **Karyawan**.', 'Gunakan kolom pencarian *real-time* di atas tabel.'],
    kasus: ['Di menu **Kasus / PPAT Cases**.', 'Kombinasikan *search bar* (untuk nama/nomor) dengan *dropdown filter* (berdasarkan status) untuk akurasi maksimal.'],
    dokumen: ['Buka repositori **Dokumen**.', 'Ketik kata kunci; manfaatkan filter kategori folder dan filter status untuk isolasi pencarian.'],
    akta: ['Telusuri kasus induknya di menu **Kasus**.', 'Nomor akta definitif akan terpampang di dalam panel detail kasus tersebut.'],
  },
  view: {
    klien: ['Masuk ke layar **Klien**.', 'Tabel akan merender seluruh matriks data; klik baris mana pun untuk *drill-down* ke profil detail.'],
    karyawan: ['Buka panel **Karyawan**.', 'Daftar armada ter-render lengkap (beserta divisi/jabatan).'],
    kasus: ['Buka layar **Kasus / PPAT Cases**.', 'Klik ikon mata pada baris kasus untuk membedah log aktivitas dan detailnya.'],
    dokumen: ['Masuk ke direktori **Dokumen**.', 'Galeri dokumen disajikan secara dinamis dalam format *card* maupun baris data.'],
  },
  save: {
    klien: ['Profil tersimpan otomatis setelah eksekusi tombol **Simpan** pada jendela Tambah/Edit.', 'Pastikan aksi ini tidak tertinggal setelah mengisi data.'],
    karyawan: ['Eksekusi tombol **Simpan** pasca modifikasi form.'],
    kasus: ['Seluruh mutasi status atau update data wajib divalidasi dengan klik tombol **Simpan** di area detail.'],
    dokumen: ['Unggahan ter-commit ke sistem tepat saat Anda mengeklik **Upload**.'],
  },
  filter: {
    klien: ['Filter cerdas (pencarian instan) tertanam langsung di *header* layar Klien.'],
    kasus: ['Panel Kasus dilengkapi dengan interaktif filter status (semua/diambil/arsip/dsb) untuk merapikan pipeline Anda.'],
    dokumen: ['Gunakan sepasang filter super: penyaringan berdasarkan **Folder (Kategori)** dan **Status (Approve/Pending)**.'],
  },
};

const CRUD_ANYOBJECT = {
  add: ['Di ekosistem Noffice, entri data selalu berpusat di masing-masing modulnya.', 'Contoh: Klien → klik **Tambah Klien**; Karyawan → **Tambah Karyawan**; Kasus → **Buat Permohonan**; Dokumen → aksi **Upload**.'],
  edit: ['Proses mutasi data dieksekusi via ikon Edit (pensil) pada *grid/table* terkait.', 'Khusus untuk Kasus, update pengerjaan dilakukan di dalam panel detail kasus.'],
  delete: ['Eliminasi data dipicu via ikon tempat sampah.', 'Dokumen transit ke Tempat Sampah (bisa direcovery); kasus cukup dialihkan ke status **Arsip** untuk *safekeeping*.'],
  find: ['Engine pencarian cerdas tertanam di *header* setiap layar (Klien, Karyawan, Kasus, Dokumen).', 'Beri tahu saya spesifik data apa yang Anda lacak, dan saya arahkan kompasnya ke sana.'],
  view: ['Akses modul data (Klien, Kasus, dsb) melalui panel sidebar navigasi utama.', 'Sistem merender data dalam bentuk matriks; klik baris data untuk melakukan *deep-dive*.'],
  save: ['Protokol utamanya: selalu pastikan menekan tombol **Simpan** di akhir tiap form entri.', 'Aksi ini menjamin sinkronisasi data Anda dengan *database layer*.'],
  filter: ['Noffice mempersenjatai setiap modul utamanya dengan alat filter (berbasis status/kategori/search) di bagian atas layar.'],
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