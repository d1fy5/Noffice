// ----------------------------------------------------------------------
// semantics.js — MEANING-based understanding for the Noffice Copilot.
//
// The philosophy here is NOT a keyword/sentence list. This module turns ANY
// user sentence into a small set of MEANING FEATURES:
//
//   1. tokenize()             — clean tokens (informal -> standard).
//   2. stem()                 — morphological root (mengganti/gantikan ->
//                                "ganti"; tunggahan -> "tunggak").
//   3. meaning()              — bag of DISTINCT stems + their raw words.
//   4. concept()              — score a message against a SEMANTIC FIELD
//                                (a cluster of synonyms/collocations/roots),
//                                generalized to unseen phrasing via stems.
//   5. route()                — confidence scores across the broad intents:
//                                CONVERSATION, NOFFICE_HELP, DATABASE,
//                                DOCUMENT, TROUBLESHOOTING, LEGAL/GENERAL,
//                                STATISTICS, CONTEXT_FOLLOWUP, CLARIFICATION.
//
// NO hardcoded names/counts. Only Indonesian morphology + general domain
// vocabulary live here. The app/DB knowledge layers (appKnowledge.js,
// schemaInspector.js) supply the ACTUAL data/feature facts.
// ----------------------------------------------------------------------

// Colloquial -> standard (widening of understanding.js INFORMAL, but kept
// local so this module is standalone & reusable).
const INFORMAL = {
  gak: 'tidak', nggak: 'tidak', ga: 'tidak', ngak: 'tidak', ndak: 'tidak',
  kagak: 'tidak', g: 'tidak',
  udah: 'sudah', udh: 'sudah', dah: 'sudah',
  gimana: 'bagaimana', gmna: 'bagaimana', gm: 'bagaimana',
  gini: 'begini', gitu: 'begitu', gt: 'begitu',
  cariin: 'cari', carikan: 'cari', cekin: 'cek', liatin: 'lihat', tunjukin: 'tampilkan',
  liat: 'lihat', liatin: 'lihat', nyari: 'cari', nyarin: 'cari',
  nanya: 'tanya', nanyain: 'tanya', ngecek: 'cek', ngecekin: 'cek',
  nomer: 'nomor', nope: 'nomor',
  klient: 'klien', client: 'klien', klean: 'klien',
  kalo: 'kalau', kalau: 'kalau', cman: 'cuma', cuma: 'cuma', cm: 'cuma',
  bgt: 'sangat', banget: 'sangat', bget: 'sangat',
  dpt: 'dapat', mo: 'mau', pengen: 'mau', pingin: 'mau',
  nambah: 'tambah', nambahin: 'tambah', tambahin: 'tambah', tambahnya: 'tambah',
  ngedit: 'edit', ngeditin: 'edit', editin: 'edit',
  ngapus: 'hapus', ngapusin: 'hapus', hapusin: 'hapus',
  ngubah: 'ubah', ngubahin: 'ubah', ngubaha: 'ubah',
  masukin: 'masuk', masukinnya: 'masuk', masukan: 'masuk', inputin: 'input',
  nyimpen: 'simpan', nyimpenin: 'simpan', simpen: 'simpan',
  tanggalin: 'tanggal', ngefilter: 'filter', keurus: 'urus',
  telp: 'telepon', tlpn: 'telepon',
  sama: 'dengan', sm: 'dengan',
  buat: 'untuk', bikin: 'buat',
  disitu: 'disana', disini: 'disini',
  hp: 'ponsel', nomor: 'nomor',
  tanya: 'tanya',
  gantiin: 'ganti', gantikan: 'ganti', ngganti: 'ganti', ngubah: 'ubah', ngatur: 'atur',
  foto: 'gambar', fotonya: 'gambar',
  ngelola: 'kelola', kelolain: 'kelola', dikelolain: 'kelola',
  ngurusin: 'urus', ngurus: 'urus', ngaturin: 'atur',
  dta: 'data', data2: 'data', data2nya: 'data', datanya: 'data',
  gimana2: 'bagaimana', gimana2nya: 'bagaimana',
  'adaa': 'ada', 'adaaapa': 'ada',
};

// Indonesian affixes, largest-first. Both morphological (standard) and
// common colloquial prefixes ("nge-").
const PREFIXES = ['meng', 'meny', 'mem', 'men', 'ber', 'ter', 'per', 'pen', 'peng', 'peny', 'pem', 'di', 'ke', 'se', 'me', 'pe', 'be', 'nge', 'ny', 'ng'];
// Suffixes, in priority order (first match wins, then we loop for nesting
// like "tampilkannya" -> "tampilkan" -> "tampil"). 'an'/'in' are last and
// skipped when the word is already short enough — root "ganti" must survive.
const SUFFIXES = ['kannya', 'nya', 'kan', 'kah', 'lah', 'in', 'an', 'i'];

// A small set of roots that we must NOT over-strip (very common words).
const PROTECTED = new Set([
  'data', 'ada', 'pada', 'kata', 'saya', 'anda', 'kami', 'kita', 'yang', 'dengan',
  'tidak', 'sudah', 'belum', 'kalau', 'saja', 'bisa', 'mau', 'dari', 'dalam',
  'tahun', 'bulan', 'hari', 'lalu', 'baru', 'mana', 'apa', 'berapa', 'siapa',
  'kapan', 'bagaimana', 'kenapa', 'cara', 'mau', 'untuk', 'nomor', 'perihal',
  'semua', 'lain', 'total', 'jumlah', 'rekap', 'lihat', 'jadi', 'tentu', 'terus',
  'kenapa', 'bagaimana', 'gimana', 'caranya', 'iya', 'tidak', 'iya', 'lah',
]);

// Domain root dictionary. Candidates are matched longest-first against this
// set; inflected/typo forms resolve to these roots. Built from the FIELDS
// below plus common Indonesian function/action words.
const EXTRA_ROOTS = [
  'cari', 'buat', 'bikin', 'tambah', 'hapus', 'ubah', 'ganti', 'simpan', 'kirim',
  'lihat', 'tampil', 'buka', 'tutup', 'cetak', 'print', 'unduh', 'download',
  'pilih', 'filtrasi', 'saring', 'atur', 'kustom', 'bantu', 'tolong', 'tanya',
  'jawab', 'kasih', 'info', 'baca', 'tulis', 'akta', 'nomor', 'surat', 'berkas',
  'draf', 'ttd', 'waris', 'hibah', 'jual', 'beli', 'tanah', 'bangun', 'rumah',
  'pajak', 'bphtb', 'pph', 'sya', 'lengkap', 'serta', 'kuasa', 'fidusia', 'jaminan',
  'kredit', 'bank', 'klien', 'client', 'nasabah', 'kasus', 'permohonan', 'perkara',
  'agenda', 'jadwal', 'karyawan', 'pegawai', 'staff', 'staf', 'divisi', 'departemen',
  'dokumen', 'arsip', 'file', 'sampah', 'trash', 'pulih', 'restore', 'backup',
  'cadang', 'unduh', 'unggah', 'upload', 'import', 'ekspor', 'theme', 'tema',
  'gelap', 'terang', 'malam', 'warna', 'mode', 'kepadatan', 'gerakan', 'bahasa',
  'inggris', 'indonesia', 'password', 'sandi', 'login', 'keamanan', 'pengaturan',
  'preferensi', 'panduan', 'tutorial', 'langkah', 'proses', 'alur', 'fitur',
  'halaman', 'menu', 'sidebar', 'dasbor', 'dashboard', 'notifikasi', 'inbox',
  'pesan', 'profil', 'perusahaan', 'logo', 'kantor', 'notaris', 'ppat', 'tanda terima',
  'kirim', 'statistik', 'rekap', 'persen', 'total', 'global', 'tanda',
];

const ROOT_DICT = new Set(PROTECTED);

// ---- tokenize ----------------------------------------------------------

const NONWORD = /[^\p{L}\p{N}\s+]/gu;

export function tokenize(text) {
  const raw = String(text || '')
    .toLowerCase()
    .replace(NONWORD, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return [];
  return raw.split(/\s+/).map((w) => INFORMAL[w] || w).filter(Boolean);
}

// ---- morphology --------------------------------------------------------

function suffixCandidates(w) {
  const out = new Set([w]);
  for (const suf of SUFFIXES) {
    if (w.length > suf.length + 3 && w.endsWith(suf)) {
      out.add(w.slice(0, -suf.length));
    }
  }
  return out;
}

function prefixCandidates(w) {
  const out = new Set([w]);
  for (const pre of PREFIXES) {
    if (w.length > pre.length + 2 && w.startsWith(pre)) {
      const rest = w.slice(pre.length);
      if (rest.length >= 3) {
        out.add(rest);
        // One consonant is sometimes "absorbed": menyimpan -> simpan,
        // memakai -> pakai, mengecek -> cek, mengajak -> ajak handled by rest.
        if (pre === 'meny' && rest.startsWith('s')) out.add('s' + rest.slice(1));
        if (pre === 'mem' && rest.startsWith('p')) out.add('p' + rest.slice(1));
        if (pre === 'peng' && rest.startsWith('g')) out.add('g' + rest.slice(1));
        if (pre === 'pen' && rest.startsWith('t')) out.add('t' + rest.slice(1));
        if (pre === 'pem' && rest.startsWith('p')) out.add('p' + rest.slice(1));
        if (pre === 'men' && rest.startsWith('g')) out.add('g' + rest.slice(1));
        if (pre === 'men') { out.add('t' + rest); out.add('d' + rest); }
        if (pre === 'peng' && rest.startsWith('k')) out.add('k' + rest.slice(1));
        if (pre === 'ng' && rest.startsWith('g')) out.add('g' + rest.slice(1));
        if (pre === 'ny' && rest.startsWith('c') || pre === 'ny' && rest.startsWith('s')) out.add(rest);
      }
    }
  }
  return out;
}

function stripAffixes(word) {
  if (!word || word.length < 4 || PROTECTED.has(word)) return [word];
  const out = new Set([word]);
  for (const w of prefixCandidates(word)) out.add(w);
  // nest suffix then prefix again (mengganti -> ganti via prefix on root, and
  // menampilkan -> tampilkan -> tampil via suffix-after-prefix)
  const first = new Set(out);
  for (const w of first) for (const s of suffixCandidates(w)) {
    out.add(s);
    for (const p of prefixCandidates(s)) out.add(p);
  }
  // also suffix-then-prefix for "pengaturan" -> atur
  for (const s of suffixCandidates(word)) {
    for (const p of prefixCandidates(s)) out.add(p);
  }
  // CHAIN suffixes until fixpoint: "tampilannya" -> (nya) "tampilan"
  // -> (an) "tampil"; "gantikannya" -> (nya) "gantikan" -> (kan) "ganti".
  // Each intermediate candidate also gets a prefix re-try.
  let frontier = [...out];
  while (frontier.length) {
    const next = [];
    for (const c of frontier) for (const s of suffixCandidates(c)) {
      if (!out.has(s)) { out.add(s); next.push(s); }
      for (const p of prefixCandidates(s)) out.add(p);
    }
    frontier = next;
  }
  return [...out].filter((c) => c.length >= 3 && !PROTECTED.has(c));
}

function seedRootDict() {
  for (const r of EXTRA_ROOTS) {
    for (const part of String(r).split(/\s+/)) if (part.length >= 3) ROOT_DICT.add(part);
  }
}
seedRootDict();

let stemCache = new Map();
export function clearStemCache() {
  stemCache = new Map();
}

// Best morphological root for a word: pick the LONGEST dictionary-known
// candidate produced by affix stripping (so "gantikan"->"ganti", but a bare
// root like "ganti" is never over-trimmed to "gant"). Fallback: the word
// itself (guarantees we never mangle unknown vocabulary).
export function stem(word) {
  if (!word) return '';
  const w = String(word).toLowerCase();
  if (!/[a-z]/.test(w)) { stemCache.set(w, w); return w; }
  const cached = stemCache.get(w);
  if (cached !== undefined) return cached;
  ensureRoots();
  const cands = /[a-z\s]/.test(w) ? stripAffixes(w) : [w];
  let best = w;
  let bestLen = -1;
  for (const c of cands) {
    if (!ROOT_DICT.has(c)) continue;
    if (c.length > bestLen) { bestLen = c.length; best = c; }
  }
  if (bestLen === -1) best = w;
  // Prefer a known short root over the full word when we clearly saw a
  // productive prefix/suffix on a dictionary root.
  for (const c of cands) {
    if (ROOT_DICT.has(c) && c !== w && c.length >= 4) { best = c; break; }
  }
  stemCache.set(w, best);
  return best;
}

// Meaning bag: distinct stems + all raw words (kept for exact hits).
export function meaning(text) {
  const words = tokenize(text);
  const stems = new Set();
  for (const w of words) stems.add(stem(w));
  return { words, stems: [...stems] };
}

// Edit distance (tolerant to typos: "pengaturan"~"pengaturan", only used tiny).
export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[m][n];
}

// ---- semantic fields ---------------------------------------------------

// A semantic field = cluster of words/collocations that all point to the
// same meaning. Stems generalize: any inflected form matches the field stem.
export const FIELDS = {
  greeting: ['halo', 'hai', 'pagi', 'siang', 'sore', 'malam', 'selamat', 'salam', 'apa kabar', 'hi', 'hello', 'selamat datang'],
  thanks: ['terima kasih', 'makasih', 'thank', 'thanks', 'berterima kasih'],
  farewell: ['selamat tinggal', 'sampai jumpa', 'dadah', 'bye', 'sudah dulu'],
  identity: ['siapa kamu', 'siapa anda', 'kamu siapa', 'anda siapa', 'nama kamu', 'kamu itu apa'],
  capability: ['bisa apa', 'bantu apa', 'kemampuan', 'bisa lakukan', 'bisa kerja apa'],

  // ----- NOFFICE app (feature-level) — facts live in appKnowledge.js -----
  theme: ['tema', 'tampil', 'gelap', 'terang', 'malam', 'hitam', 'putih', 'warna', 'mode', 'dark', 'light', 'kepadatan', 'reduced', 'gerakan', 'compact', 'appearance'],
  upload: ['upload', 'unggah', 'tambah dokumen', 'naikkan', 'kirim file', 'import', 'drag'],
  document: ['dokumen', 'berkas', 'arsip', 'file', 'surat', 'paper', 'document'],
  trash: ['trash', 'sampah', 'hapus permanen', 'pulihkan', 'restore', 'tong sampah', 'bins'],
  backup: ['backup', 'cadangan', 'download db', 'salinan data', 'back up', 'database'],
  settings: ['pengaturan', 'setting', 'preferensi', 'konfigurasi', 'atur', 'opsi', 'option'],
  language: ['bahasa', 'language', 'terjemah', 'inggris', 'indonesia', 'translate', 'english'],
  security: ['password', 'kata sandi', 'keamanan', 'security', 'ganti sandi', 'login', 'auth'],
  akta: ['akta', 'nomor akta', 'penomoran', 'generate', 'format akta', 'no akta', 'deed'],
  ktp: ['ktp', 'ektp', 'extract', 'ekstrak', 'scan', 'ocr', 'autofill', 'card'],
  recipient: ['kop surat', 'tanda terima', 'receipt', 'subtitle', 'alamat kantor', 'stempel', 'template tanda terima'],

  // ----- Data / statistics -----
  statistics: ['statistik', 'rekap', 'total', 'jumlah', 'berapa', 'count', 'dashboard', 'persentase', 'rata'],
  data_domain: ['klien', 'client', 'customer', 'nasabah', 'kasus', 'permohonan', 'perkara', 'agenda', 'jadwal', 'karyawan', 'staff', 'staf', 'pegawai', 'divisi', 'akta', 'dokumen'],

  // ----- INFORMATION / CATALOG request --------------------------------
  // "data yang ada apa aja", "aplikasi ini isinya apa?", "bisa ngelola data
  // apa saja?", "selain klien ada apalagi?" — user wants to ENUMERATE what
  // data/info the app holds. Answered from the REAL schema/menu structure
  // (getDomainSummary), never a canned list. Meaning-level so ANY wording
  // ("kayak apa saja yang tersedia", "meliputi apa saja cakupannya") hits.
  // Guards live in route(): a specific data object (klien/kasus/...) or a
  // statistic ("berapa...") always beats this, so real data questions stay
  // real.
  catalog: [
    'apa aja', 'apa saja', 'apasaja', 'apa yang ada', 'apa yang tersedia',
    'apa yang bisa', 'apa yang dapat', 'ada apa', 'ada apa aja', 'ada apa saja',
    'ada data apa', 'data apa', 'datanya apa', 'data yang ada',
    'informasi apa', 'info apa', 'apa informasi', 'tersedia', 'tersedia di',
    'meliputi apa', 'mencakup apa', 'isinya apa', 'isi apa', 'isi', 'konten',
    'cakupan', 'macam', 'jenis data', 'jenis informasi', 'kelola', 'dikelola',
    'mengelola', 'ngelola', 'bisa apa', 'bisa lihat', 'bisa akses', 'bisa baca', 'bisa kelola',
    'punya data', 'punya apa', 'simpan apa', 'menyimpan apa', 'di sini',
    'sistem', 'aplikasi', 'selain', 'apalagi', 'yang lain', 'ada lagi',
    'apa lagi', 'semua data', 'fitur', 'kumpulan data', 'kumpulan', 'gambaran',
    'gambaran data', 'diketahui', 'isinya', 'isikan', 'kayak apa', 'rupanya',
    'seperti apa', 'yang dimiliki', 'dimiliki', 'tersimpan', 'tersimpan di',
    'jangkauan', 'cakupan', 'dibuka', 'bisa dibuka', 'yang harus diketahui',
  ],

  // ----- DATA ACTIONS (CRUD how-to) — meaning-level, NOT keyword lists. ----
  // These let the app answer "cara tambahin data", "masukin klien gimana",
  // "cara edit data", "hapus data dari mana" WITHOUT any sentence template:
  // the ACTION verb (add/edit/delete/find/view/save) + the OBJECT the user
  // talks about are both scored semantically, then combined by getCrudHelp().
  data_act_add: ['tambah', 'memasukkan', 'masuk', 'input', 'entri', 'insert', 'create', 'add', 'buat', 'bikin', 'daftar', 'register', 'naikkan'],
  data_act_edit: ['edit', 'ubah', 'ganti', 'update', 'perbarui', 'modify', 'change', 'koreksi', 'sunting'],
  data_act_delete: ['hapus', 'menghapus', 'hilang', 'buang', 'delete', 'remove'],
  data_act_find: ['cari', 'temukan', 'find', 'lookup', 'search'],
  data_act_view: ['lihat', 'tampil', 'check', 'cek', 'periksa', 'tampilkan'],
  data_act_save: ['simpan', 'keep', 'save', 'store'],
  data_act_filter: ['seleksi', 'filter', 'pilah', 'saring', 'sortir'],

  // ----- DATA OBJECTS — what the user is talking about manipulating. ----
  // Used together with data_act_* to build CRUD navigation answers without
  // sentence templates ("tambahin klien baru" => add + obj_klien).
  obj_klien: ['klien', 'client', 'customer', 'nasabah', 'orang', 'nemu', 'pihak', 'relasi', 'pelanggan'],
  obj_karyawan: ['karyawan', 'pegawai', 'staff', 'staf', 'pekerja', 'divisi', 'employee'],
  obj_kasus: ['kasus', 'permohonan', 'perkara', 'perjanjian', 'case'],
  obj_akta: ['akta', 'no akta', 'nomor akta', 'deed'],
  obj_pengguna: ['pengguna', 'user', 'akun', 'anggota'],
  obj_data: ['data', 'data-data', 'info', 'informasi', 'record', 'entri', 'catatan'],

  // ----- Troubleshooting / problems -----
  problem: ['tidak bisa', 'nggak bisa', 'gak bisa', 'gagal', 'error', 'salah', 'masalah', 'kenapa', 'gimana itu', 'bermasalah', 'rusak', 'blank', 'kosong', 'nggak keaccept', 'gak keaccept', 'tidak keaccept', 'keaccept', 'nggak jalan', 'gak jalan', 'tidak jalan', 'nggak muncul', 'gak muncul', 'tidak muncul', 'nggak nyimpen', 'tidak nyimpen', 'nggak kepake'],
  howto: ['cara', 'bagaimana', 'gimana', 'langkah', 'proses', 'tutorial', 'panduan', 'cara pakai'],

  // ----- Legal / general knowledge -----
  legal: ['syarat', 'ajb', 'jual beli', 'hibah', 'waris', 'pt', 'cv', 'fidusia', 'apht', 'skmht', 'bphtb', 'pph', 'legalisasi', 'waarmerking', 'akta', 'pendirian', 'pajak', 'bphtb', 'ppn', 'nop'],
  general: ['apa itu', 'apa saja', 'pengertian', 'definisi', 'misal', 'contoh', 'tentang', 'menjelaskan'],
};

// Seed the root dictionary once the FIELDS vocabulary is defined.
// Do this lazily on first use to keep the module import side-effect free.
let ROOT_SEEDED = false;
function ensureRoots() {
  if (ROOT_SEEDED) return;
  for (const [name] of Object.entries(FIELDS)) {
    for (const w of FIELDS[name]) {
      for (const part of String(w).split(/\s+/)) {
        if (part.length >= 3) ROOT_DICT.add(part);
      }
    }
  }
  ROOT_SEEDED = true;
}

const FIELD_TAGS = Object.entries(FIELDS);

// ---- concept scoring ---------------------------------------------------

// Score `text` against the given field. Returns {score, stemsHit}.
// The bag-of-stems approach generalizes: "ganti tampilannya jadi item" and
// "cara ubah tema menjadi gelap" both hit the `theme` field through stems.
// Typos are handled with a small fuzzy weight ("itam" -> "hitam").
export function concept(textOrMeaning, field) {
  const { stems } = typeof textOrMeaning === 'string' ? meaning(textOrMeaning) : textOrMeaning;
  const fieldStems = new Set((FIELDS[field] || []).map((w) => stem(w)));
  const multiword = (FIELDS[field] || []).filter((w) => /\s/.test(w));
  const tokens = [stems.join(' '), ...stems];
  const flatText = typeof textOrMeaning === 'string' ? String(textOrMeaning).toLowerCase() : stems.join(' ');
  let hit = 0;
  const hitStems = [];
  const fuzzyStems = [];
  for (const s of stems) {
    if (fieldStems.has(s)) { hit++; hitStems.push(s); }
  }
  // fuzzy typo fallback: a message stem close to a field stem (<2 edits,
  // similar length, >=4 chars) adds partial credit
  let fuzzyFlag = fuzzyCount(sourceStems(textOrMeaning), field);
  if (fuzzyFlag > 0) { hit += 0.5; hitStems.push(`~${fuzzyFlag}`); }
  // multiword collocations ("terima kasih", "kata sandi", "apa kabar")
  for (const mw of multiword) {
    if (flatText.includes(mw)) { hit += 1; hitStems.push(mw); }
  }
  return { score: hit, hitStems };
}

function sourceStems(textOrMeaning) {
  const text = typeof textOrMeaning === 'string' ? textOrMeaning : (textOrMeaning.words || []).join(' ');
  return meaning(text).stems;
}

let _fuzzyCache = new Map();
function fuzzyCount(stems, field) {
  const key = field + '|' + stems.slice().sort().join(' ');
  const cached = _fuzzyCache.get(key);
  if (cached !== undefined) return cached;
  const fieldStems = (FIELDS[field] || []).map((w) => stem(w)).filter((w) => w.length >= 4);
  let hits = 0;
  for (const s of stems) {
    if (s.length < 4) continue;
    for (const f of fieldStems) {
      if (s === f) continue;
      if (Math.abs(s.length - f.length) > 2) continue;
      if (levenshtein(s, f) <= 2) { hits++; break; }
    }
  }
  _fuzzyCache.set(key, hits);
  return hits;
}

// ---- router ------------------------------------------------------------

// Simple stem-aware bool helpers used by the router.
export function hasConcept(text, field, min = 1) {
  return concept(text, field).score >= min;
}

export function topFields(text, minScore = 1) {
  const m = meaning(text);
  const out = [];
  for (const [name] of FIELD_TAGS) {
    const c = concept(m, name);
    if (c.score >= minScore) out.push({ field: name, ...c });
  }
  return out.sort((a, b) => b.score - a.score);
}

// Route a raw user message across intents with a 0..1 CONFIDENCE.
// Pure rules over meaning — returns one of the standard intent labels the
// router expects, or 'unknown'.
export const ROUTE_LABELS = {
  conversation: 'CONVERSATION',
  noffice_help: 'NOFFICE_HELP',
  database: 'DATABASE',
  document: 'DOCUMENT',
  troubleshooting: 'TROUBLESHOOTING',
  legal: 'GENERAL_KNOWLEDGE',
  statistics: 'STATISTICS',
  followup: 'CONTEXT_FOLLOWUP',
  clarification: 'CLARIFICATION',
  information: 'INFORMATION_REQUEST',
  unknown: 'UNKNOWN',
};

export function route(text) {
  const m = meaning(text);
  const has = (f, min = 1) => concept(m, f).score >= min;

  // pure conversation (no app/data word) scores highest first
  if (has('greeting') && !has('data_domain')) return { label: ROUTE_LABELS.conversation, score: 0.98, meaning: m };
  if (has('thanks') && !has('data_domain')) return { label: ROUTE_LABELS.conversation, score: 0.96, meaning: m };
  if (has('farewell') && !has('data_domain')) return { label: ROUTE_LABELS.conversation, score: 0.96, meaning: m };
  if (has('identity') || has('capability')) return { label: ROUTE_LABELS.conversation, score: 0.9, meaning: m };

  // troubleshooting (problem words) stays high even with app words
  if (has('problem') && !has('statistics') && !has('data_domain')) return { label: ROUTE_LABELS.troubleshooting, score: 0.8, meaning: m };

  // statistics count/aggregate
  if (has('statistics')) return { label: ROUTE_LABELS.statistics, score: 0.75, meaning: m };

  // document feature/management (upload/trash/restore/hapus file)
  const docDelete = /\b(hapus|menghapus|kehapus|dihapus|terhapus|buang|delete)\b/i.test(String(text || '').toLowerCase())
    && has('document');
  if (has('upload') || has('trash') || docDelete) return { label: ROUTE_LABELS.document, score: 0.85, meaning: m };

  // noffice app feature
  if (has('theme') || has('settings') || has('security') || has('language') || has('backup') || has('ktp') || has('recipient')) return { label: ROUTE_LABELS.noffice_help, score: 0.85, meaning: m };
  if (has('howto') && (has('document') || has('akta') || has('backup'))) return { label: ROUTE_LABELS.noffice_help, score: 0.8, meaning: m };
  // akta-format/penomoran questions are NOFFICE features, not legal knowledge
  if (has('akta') && /\b(format|penomor|generate|nomor akta|no akta|cara.*akta)\b/i.test(String(text || '').toLowerCase())) {
    return { label: ROUTE_LABELS.noffice_help, score: 0.85, meaning: m };
  }

  // legal knowledge
  if (has('legal')) return { label: ROUTE_LABELS.legal, score: 0.8, meaning: m };

  // INFORMATION / CATALOG request: "data yang ada apa aja", "aplikasi ini
  // isinya apa?", "bisa ngelola data apa saja?" — user enumerates what the
  // app holds. If a SPECIFIC entity is named ("dokumen apa yang tersedia")
  // that stays a real DB query (DATABASE below). "selain ... apalagi?"
  // names an entity but asks about OTHER kinds -> INFORMATION.
  const catExclude = /\b(selain|lainnya|apalagi|selain itu)\b/i.test(String(text || '').toLowerCase());
  const catWho = /\bsiapa\b/i.test(String(text || '').toLowerCase());
  if (has('catalog') && !catWho && (!has('data_domain') || catExclude)) return { label: ROUTE_LABELS.information, score: 0.78, meaning: m };

// data domain
  if (has('data_domain')) return { label: ROUTE_LABELS.database, score: 0.7, meaning: m };

  // low-confidence -> clarification path (router fallback for COPILOT)
  if (/^(yang|yg|itu|ini|yang tadi|kemarin|sebelumnya|tadi)\b/.test(String(text || '').toLowerCase().trim())) {
    return { label: ROUTE_LABELS.followup, score: 0.6, meaning: m };
  }
  return { label: ROUTE_LABELS.unknown, score: 0.1, meaning: m };
}

export default { tokenize, stem, meaning, concept, route, hasConcept, topFields, FIELDS };