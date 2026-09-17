import db from '../db.js';
import { NOTARY_SERVICES, PPAT_SERVICES } from '../../src/store/constants.js';

// ----------------------------------------------------------------------
// schemaInspector — introspects the REAL local SQLite schema (read-only)
// and exposes a rich, role-aware semantic metadata layer for the DB-aware
// AI question engine.
//
// The AI does NOT hardcode questions. It reads:
//   - the actual tables / columns / PKs / relations of the local DB
//   - per-entity display & semantic metadata (labels, synonyms, fields)
//   - LIVE value vocabularies extracted with SELECT DISTINCT
//   - role/column visibility rules
// and uses those to plan + validate queries generically.
// ----------------------------------------------------------------------

const CACHE = { tables: null, cols: {}, pks: {}, fks: {}, vocab: {}, ts: 0 };
const CACHE_TTL_MS = 30000;

// Tables that must NEVER be exposed to the AI (credentials / internals).
export const RESTRICTED_TABLES = new Set([
  'users', 'sessions', 'akta_counter', 'case_logs', 'checklist_items',
]);

// ----------------------------------------------------------------------
// Semantic metadata per entity (schema-level knowledge: labels, synonyms,
// which columns can be shown / searched / grouped / filtered, relations).
// This is generic knowledge about the data model — NOT per-question rules.
// ----------------------------------------------------------------------
export const TABLE_META = {
  employees: {
    label: 'Karyawan/Staf',
    kata: 'karyawan',
    plural: 'karyawan',
    icon: '👥',
    dateCol: 'joinDate',
    identityCols: ['name'],
    emailCol: 'email',
    searchCols: ['name', 'department', 'email'],
    filterCols: {
      department: ['divisi', 'department', 'dept', 'bagian', 'unit', 'departemen'],
      role: ['role', 'peran', 'jabatan'],
      status: ['status', 'kepegawaian'],
    },
    groupCols: { department: 'divisi', role: 'peran/jabatan', status: 'status' },
    valueCols: ['department', 'role', 'status'],
    fieldLabels: {
      name: 'Nama', email: 'Email', department: 'Divisi', role: 'Peran',
      status: 'Status', joinDate: 'Tanggal Bergabung',
    },
    cols: {
      admin: ['name', 'email', 'department', 'role', 'status', 'joinDate'],
      employee: ['name', 'department', 'role', 'status', 'joinDate'],
    },
    employeeOnlyRows: true,
  },
  documents: {
    label: 'Dokumen/Berkas',
    kata: 'dokumen',
    plural: 'dokumen',
    icon: '📄',
    dateCol: 'dateTs',
    dateLabel: 'diunggah/dibuat',
    identityCols: ['title'],
    emailCol: null,
    searchCols: ['title', 'description', 'category', 'author'],
    filterCols: {
      category: ['kategori', 'category', 'jenis berkas'],
      status: ['status', 'keadaan'],
      dept: ['dept', 'departemen'],
      type: ['type', 'tipe', 'jenis file'],
      author: ['author', 'penulis', 'pemilik', 'pengunggah', 'uploader', 'pembuat', 'upload', 'unggah', 'mengunggah', 'diunggah'],
    },
    groupCols: { category: 'kategori', dept: 'departemen', status: 'status' },
    valueCols: ['category', 'status', 'type', 'dept'],
    fieldLabels: {
      title: 'Dokumen', description: 'Keterangan', category: 'Kategori',
      author: 'Pemilik/Penulis', status: 'Status', date: 'Tanggal',
      type: 'Tipe', dept: 'Departemen',
    },
    cols: {
      admin: ['title', 'description', 'category', 'author', 'status', 'date', 'type', 'dept'],
      employee: ['title', 'description', 'category', 'author', 'status', 'date', 'type', 'dept'],
    },
    onlyActive: true,
  },
  clients: {
    label: 'Klien',
    kata: 'klien',
    plural: 'klien',
    icon: '👤',
    dateCol: 'createdAt',
    identityCols: ['name'],
    emailCol: 'email',
    searchCols: ['name', 'nik', 'phone', 'email'],
    filterCols: {
      name: ['nama', 'name'],
      job: ['pekerjaan', 'job', 'profesi'],
    },
    groupCols: { job: 'pekerjaan' },
    valueCols: ['job'],
    fieldLabels: {
      name: 'Nama', email: 'Email', nik: 'NIK', phone: 'Telepon',
      job: 'Pekerjaan', address: 'Alamat', birthdate: 'Tgl Lahir',
    },
    cols: {
      admin: ['name', 'nik', 'birthdate', 'address', 'phone', 'email', 'job', 'createdAt'],
      employee: ['name', 'nik', 'birthdate', 'address', 'phone', 'job', 'createdAt'],
    },
    maskNik: true,
  },
  cases: {
    label: 'Kasus/Permohonan',
    kata: 'permohonan',
    plural: 'permohonan/kasus',
    icon: '📂',
    dateCol: 'createdAt',
    identityCols: ['caseNumber'],
    emailCol: null,
    searchCols: ['caseNumber', 'serviceType', 'status', 'aktaNumber', 'assignedTo', 'landAddress'],
    filterCols: {
      serviceType: ['layanan', 'service', 'jenis layanan', 'service type'],
      status: ['status', 'keadaan'],
      assignedTo: ['penanggung jawab', 'petugas', 'pengurus', 'assigned'],
    },
    groupCols: { serviceType: 'jenis layanan', status: 'status', assignedTo: 'penanggung jawab' },
    valueCols: ['serviceType', 'status', 'assignedTo'],
    fieldLabels: {
      caseNumber: 'No. Kasus', serviceType: 'Jenis Layanan', status: 'Status',
      aktaNumber: 'No. Akta', assignedTo: 'Penanggung Jawab',
      landAddress: 'Alamat Tanah', createdAt: 'Dibuat',
    },
    cols: {
      admin: ['caseNumber', 'serviceType', 'status', 'assignedTo', 'createdAt', 'estimatedAt', 'aktaNumber', 'landAddress', 'notes', 'notaryFee', 'taxFee', 'pnbpFee', 'paymentStatus'],
      employee: ['caseNumber', 'serviceType', 'status', 'assignedTo', 'createdAt', 'estimatedAt', 'aktaNumber', 'landAddress', 'notes'],
    },
    financialCols: ['notaryFee', 'taxFee', 'pnbpFee', 'paymentStatus'],
    relations: [{ via: 'clientId', to: 'clients', id: 'id', of: 'name', label: 'klien' }],
  },
};

// Synonyms used to match an entity keyword (topic detection).
export const ENTITY_KEYWORDS = {
  employees: ['staf', 'karyawan', 'pegawai', 'employee', 'divisi', 'departemen'],
  documents: ['dokumen', 'berkas', 'arsip', 'file', 'surat-surat'],
  clients: ['klien', 'klient', 'client', 'nasabah', 'pelanggan'],
  cases: ['kasus', 'permohonan', 'akta', 'perkara'],
};

// Status aliases shared by entity value matching (schema-level vocabulary).
export const STATUS_ALIASES = {
  'berkas_masuk': ['berkas masuk', 'baru masuk'],
  'draf_akta': ['draf akta'],
  'ttd': ['ttd', 'ditandatangani', 'tanda tangan'],
  'proses_npwp': ['proses npwp', 'npwp'],
  'pendaftaran_ahu': ['pendaftaran ahu', 'ahu'],
  'siup_nib': ['siup', 'nib'],
  'bphtb': ['bphtb'],
  'pph': ['pph'],
  'pendaftaran_bpn': ['pendaftaran bpn', 'bpn'],
  'sk_jadi': ['sk jadi'],
  'akta_jadi': ['akta jadi'],
  'draft': ['draft', 'draf'],
  'selesai': ['selesai', 'done', 'tuntas', 'beres'],
  'diambil': ['diambil', 'sudah diambil'],
  'belum_diambil': ['belum diambil'],
  'rejected': ['ditolak', 'rejected', 'reject'],
  'kurang': ['kurang', 'kekurangan'],
  'lengkap': ['lengkap'],
  'arsip': ['arsip'],
  'pending': ['pending', 'menunggu'],
  'review': ['review', 'tinjau'],
  'ahu_bpn': ['ahu bpn'],
  'salinan_selesai': ['salinan selesai', 'salinan'],
};

// Statuses treated as "finished/closed" — used for 'yang masih berjalan',
// 'sedang diproses', 'aktif' (cases are open). 
export const FINAL_CASE_STATUSES = ['selesai', 'diambil', 'belum_diambil', 'arsip', 'rejected'];

// ServiceType categories derived from the SAME constants file the UI pages
// import (src/store/constants.js NOTARY_SERVICES / PPAT_SERVICES). This is
// the single source of truth for "Total Permohonan" vs "Kasus PPAT" — both
// the UI pages and the AI read exactly the same id lists, so when the DB
// changes tomorrow the AI follows automatically (nothing is hardcoded).
// NB: 'WARIS' legitimately exists in BOTH lists (frontend constants);
// combined queries de-duplicate it (counted once, under notary).
export const CASE_CATEGORIES = {
  notary: {
    label: 'notaris',
    services: NOTARY_SERVICES.map((s) => s.id).filter(Boolean),
    runningExcludes: ['diambil', 'belum_diambil', 'arsip', 'rejected'],
  },
  ppat: {
    label: 'PPAT',
    services: PPAT_SERVICES.map((s) => s.id).filter(Boolean),
    runningExcludes: ['selesai', 'arsip', 'rejected'],
  },
};

// Frontend page -> category + naming used for structured debug output and
// unambiguous "akta resmi diterbitkan" answers scoped to the current page.
export const CASE_PAGES = {
  'notary-cases': { category: 'notary', entity: 'NOTARY_CASE', source: 'NotaryCaseService', label: 'Notaris' },
  'ppat-cases': { category: 'ppat', entity: 'PPAT_CASE', source: 'PPATCaseService', label: 'PPAT' },
};

// Generic value aliases (not tied to one question).
export const VALUE_ALIASES = {
  active: { col: 'status', value: 'active', words: ['aktif', 'active'] },
  inactive: { col: 'status', value: 'inactive', words: ['nonaktif', 'non-aktif', 'inactive', 'berhenti'] },
  running: { col: 'status', value: 'RUNNING', words: ['berjalan', 'diproses', 'berlangsung', 'sedang diproses', 'berjalan'] },
  paid: { col: 'paymentStatus', value: 'paid', words: ['dibayar', 'lunas', 'paid', 'terbayar'] },
};

// Generic phrases that indicate a request to enumerate the available domain.
export const DOMAIN_PHRASES = [
  'data apa', 'apa saja data', 'data apa saja', 'tersedia', 'bisa kamu baca',
  'bisa anda baca', 'bisa akses', 'bisa anda akses', 'bisa kamu akses',
  'entitas', 'data apa yang tersedia', 'semua data yang', 'apa yang bisa kamu',
  'apa yang bisa anda', 'kamu punya data', 'anda punya data', 'ada data apa',
];

// ------------------- database introspection (PRAGMA) ----------------------

function readTables() {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((r) => r.name);
}

function readColumns(table) {
  return db.prepare(`PRAGMA table_info("${table}")`).all().map((c) => c.name);
}

function readKeys(table) {
  const pks = db.prepare(`PRAGMA table_info("${table}")`).all().filter((c) => c.pk).map((c) => c.name);
  const fks = db.prepare(`PRAGMA foreign_key_list("${table}")`).all();
  return { pks, fks: fks.map((f) => ({ from: f.from, to: f.table, toId: f.to })) };
}

export function refreshSchema() {
  CACHE.tables = readTables();
  CACHE.cols = {};
  CACHE.pks = {};
  CACHE.fks = {};
  CACHE.vocab = {};
  for (const t of CACHE.tables) {
    CACHE.cols[t] = readColumns(t);
    const { pks, fks } = readKeys(t);
    CACHE.pks[t] = pks;
    CACHE.fks[t] = fks;
  }
  CACHE.ts = Date.now();
}

function getSchema() {
  if (!CACHE.tables || Date.now() - CACHE.ts > CACHE_TTL_MS) refreshSchema();
  return CACHE;
}

export function hasTable(name) {
  return getSchema().tables.includes(name);
}

export function hasColumn(table, column) {
  const cols = getSchema().cols[table];
  return cols ? cols.includes(column) : false;
}

export function isAdminRole(role) {
  return role === 'admin';
}

export function getVisibleColumns(entity, role) {
  const meta = TABLE_META[entity];
  if (!meta) return [];
  return meta.cols[isAdminRole(role) ? 'admin' : 'employee'] || [];
}

export function getPk(table) {
  const pk = getSchema().pks[table];
  return (pk && pk[0]) || 'id';
}

export function getTableNames() {
  return getSchema().tables;
}

// ----------------------------------------------------------------------
// LIVE value vocabularies — SELECT DISTINCT on each entity's value columns.
// This is what lets "Engineering" / "pending" / "Akta" be recognised
// WITHOUT hardcoding them anywhere.
// ----------------------------------------------------------------------
export function getValueVocab(entity) {
  const meta = TABLE_META[entity];
  if (!meta || !meta.valueCols) return [];
  const cache = getSchema().vocab;
  if (cache[entity]) return cache[entity];

  const out = [];
  for (const column of meta.valueCols) {
    if (!hasColumn(entity, column)) continue;
    try {
      const raw = db
        .prepare(`SELECT DISTINCT "${column}" AS v FROM "${entity}" WHERE "${column}" IS NOT NULL AND "${column}" != ''`)
        .all()
        .map((r) => String(r.v));
      for (const value of raw) {
        const lower = value.toLowerCase();
        out.push({ column, value, lower, token: lower.replace(/[^a-z0-9]+/g, ' ') });
      }
    } catch {
      // column may not be filterable in this DB; skip
    }
  }
  cache[entity] = out;
  return out;
}

// Person/identity values (client & employee names) so "Andi", "Siti" etc.
// can bind to the right table/column dynamically.
export function getIdentityVocab() {
  const cache = getSchema().vocab;
  if (cache.__identity) return cache.__identity;
  const out = [];
  for (const entity of ['clients', 'employees']) {
    const meta = TABLE_META[entity];
    for (const col of meta.identityCols || []) {
      if (!hasColumn(entity, col)) continue;
      try {
        const names = db
          .prepare(`SELECT DISTINCT "${col}" AS v FROM "${entity}" WHERE "${col}" IS NOT NULL AND "${col}" != ''`)
          .all()
          .map((r) => String(r.v));
        for (const name of names) {
          out.push({ entity, column: col, value: name, lower: name.toLowerCase() });
        }
      } catch {
        // ignore
      }
    }
  }
  cache.__identity = out;
  return out;
}

// Short, role-aware summary of the AI data domain ("Data apa saja...").
export function getDomainSummary(role) {
  const lines = [];
  for (const entity of Object.keys(TABLE_META)) {
    if (!hasTable(entity)) continue;
    const visible = getVisibleColumns(entity, role);
    if (!visible.length) continue;
    const m = TABLE_META[entity];
    const rel = m.relations ? ` (terhubung dengan ${m.relations.map((r) => r.to).join(', ')})` : '';
    lines.push({
      entity,
      label: m.label,
      plural: m.plural,
      icon: m.icon,
      cols: visible,
      relations: m.relations ? m.relations.length : 0,
      relNote: rel,
    });
  }
  return lines;
}

// Indonesian glossary of the real schema (used for logging / context).
export function getSchemaGlossary(role) {
  const lines = [];
  for (const entity of Object.keys(TABLE_META)) {
    if (!hasTable(entity)) continue;
    const cols = getVisibleColumns(entity, role);
    lines.push(`• ${TABLE_META[entity].label} (tabel "${entity}"): ${cols.join(', ')}`);
  }
  return lines;
}

export { getSchema };