import {
  TABLE_META, ENTITY_KEYWORDS, STATUS_ALIASES, VALUE_ALIASES, FINAL_CASE_STATUSES,
  CASE_CATEGORIES, CASE_PAGES, DOMAIN_PHRASES, hasTable, hasColumn, getValueVocab, getIdentityVocab,
} from './schemaInspector.js';

// ----------------------------------------------------------------------
// queryPlanner — turns a NATURAL-LANGUAGE question into a validated,
// read-only QUERY PLAN using ONLY the live database + schema metadata.
//
// Pipeline per question:
//   1. normalize
//   2. topic detection (score every table via entity keywords, column
//      synonyms and LIVE value vocabularies from SELECT DISTINCT)
//   3. filter detection (value aliases, status aliases, live vocabularies,
//      person names, leftover categorical values)
//   4. requested fields + metric (count / list / group / search / recent)
//   5. validated plan (every column re-checked against the real schema)
//
// This is a GENERIC engine — there is no per-question rule set.
// ----------------------------------------------------------------------

const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2700}-\u{27BF}\u{FE0F}]/gu;

const FUNCTION_WORDS = new Set([
  'berapa', 'jumlah', 'total', 'sebanyak', 'count', 'banyaknya', 'ada',
  'masing', 'masing-masing', 'masing2', 'per', 'berdasarkan', 'setiap', 'by', 'group',
  'daftar', 'siapa', 'sebutkan', 'tampilkan', 'list', 'semua', 'tolong', 'mohon',
  'terbaru', 'terakhir', 'latest', 'paling', 'baru', 'terkahir',
  'cari', 'mencari', 'cariin', 'carikan', 'find', 'cek', 'data', 'info', 'informasi',
  'tentang', 'terkait', 'yang', 'dengan', 'untuk', 'saya', 'mau', 'kamu', 'anda', 'bisa',
  'kantor', 'notaris', 'sekarang', 'hari', 'ini', 'nya', 'sudah', 'masih', 'berisi',
  'saja', 'dari', 'di', 'on', 'the', 'a', 'an', 'apakah', 'adalah', 'itu',
  'bekerja', 'kerja', 'aktif', 'berjalan', 'diproses', 'berlangsung', 'silakan', 'tolongin',
  'ppat',
]);

// Semantic hints: a word that directly names a table/topic.
const TOPIC_HINTS = {
  karyawan: 'employees', pegawai: 'employees', staf: 'employees', employee: 'employees',
  divisi: 'employees', departemen: 'employees', jabatan: 'employees',
  dokumen: 'documents', berkas: 'documents', arsip: 'documents', 'surat-surat': 'documents',
  file: 'documents', penulis: 'documents', pengunggah: 'documents', upload: 'documents',
  klien: 'clients', klient: 'clients', client: 'clients', nasabah: 'clients', pelanggan: 'clients',
  kasus: 'cases', permohonan: 'cases', akta: 'cases', perkara: 'cases', layanan: 'cases',
};

// Escape regex metacharacters so vocab/identity values can be matched safely.
function escRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const RECAP_PHRASES = /(rekap|statistik|ringkasan|laporan kantor|rangkuman|overview|gambaran umum)/i;
const FEES_PHRASES = /(pendapatan|fee|honor|notary fee|biaya jasa|uang masuk|keuangan|laba)\b/i;
const COUNT_PHRASES = /\b(berapa|jumlah|total|sebanyak|count|banyaknya|ada berapa)\b/i;
const GROUP_PHRASES = /\b(per|masing-masing|masing2|masing|berdasarkan|setiap)\b/i;
const LIST_PHRASES = /\b(daftar|siapa saja|siapa|sebutkan|tampilkan|list|semua|apa saja|yang mana)\b/i;
const RECENT_PHRASES = /\b(terbaru|terakhir|latest|paling baru|paling terbaru)\b/i;
const SEARCH_PHRASES = /\b(cari|mencari|cariin|carikan|find|cek)\b/i;

const UNSUPPORTED_CONCEPTS = ['gaji', 'upah', 'invoice', 'faktur', 'tagihan', 'hutang', 'piutang',
  'aset', 'inventaris', 'kehadiran', 'absensi', 'lembur', 'tunjangan', 'bonus', 'cuti',
  'izin', 'stok', 'penjualan', 'pembelian', 'laba', 'rugi', 'pajak karyawan'];

// Which categorical column to prefer when the user supplies a value that is
// not already in a live value vocabulary (e.g. "Engineering" for a new dept).
const DEFAULT_VALUE_COL = {
  employees: 'department',
  documents: 'category',
  clients: 'name',
  cases: 'serviceType',
};

const GROUP_LABELS = {
  employees: { department: 'divisi', role: 'peran/jabatan', status: 'status' },
  clients: { job: 'pekerjaan' },
  documents: { category: 'kategori', dept: 'departemen', status: 'status' },
  cases: { serviceType: 'jenis layanan', status: 'status', assignedTo: 'penanggung jawab' },
};

function groupLabel(entity, col) {
  return (GROUP_LABELS[entity] && GROUP_LABELS[entity][col]) || col;
}

function strip(msg) {
  return String(msg)
    .replace(EMOJI_RE, ' ')
    .replace(/['"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokens(msg) {
  return msg.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
}

// All words that merely carry meaning about model/columns — not values.
function structuralWords(set) {
  const out = new Set(FUNCTION_WORDS);
  for (const kw of Object.keys(TOPIC_HINTS)) out.add(kw);
  for (const kw of Object.values(TOPIC_HINTS)) out.add(kw);
  for (const entity of Object.keys(TABLE_META)) {
    const meta = TABLE_META[entity];
    for (const syns of Object.values(meta.filterCols || {})) {
      for (const syn of syns) {
        if (syn.length > 1) out.add(syn);
      }
    }
  }
  return out;
}
const STRUCTURAL = structuralWords();

function contentWords(msg) {
  return tokens(msg).filter((w) => w.length > 1 && !STRUCTURAL.has(w));
}

// ----------------------------------------------------------------------
// TOPIC DETECTION
// ----------------------------------------------------------------------
function topicScores(msg) {
  const scores = {};
  for (const entity of Object.keys(TABLE_META)) {
    if (!hasTable(entity)) continue;
    const meta = TABLE_META[entity];
    let s = 0;

    for (const kw of ENTITY_KEYWORDS[entity]) {
      if (new RegExp(`\\b${kw}\\b`, 'i').test(msg)) s += 4;
    }
    for (const syns of Object.values(meta.filterCols || {})) {
      for (const syn of syns) {
        if (syn.length > 3 && new RegExp(`\\b${syn}\\b`, 'i').test(msg)) s += 2;
      }
    }
    if (meta.emailCol && new RegExp(`\\b(email|mail)\\b`, 'i').test(msg)) s += 1.5;
    // weak hints: "bekerja di X", "di bagian X" strongly suggest employees
    if (entity === 'employees' && /\b(bekerja|kerja|team|bagian)\b/.test(msg)) s += 1;
    for (const v of getValueVocab(entity)) {
      // word-boundary matching so e.g. the doc category word "klien" does NOT
      // fire inside the typo "klient" (that was routing it to documents).
      const words = (v.token || '').split(' ').filter((w) => w.length > 2);
      const hit = new RegExp(`\\b${escRe(v.lower)}\\b`, 'i').test(msg)
        || words.some((w) => new RegExp(`\\b${escRe(w)}\\b`, 'i').test(msg));
      if (v.value.length > 2 && hit) { s += 1.5; break; }
    }
    for (const idn of getIdentityVocab()) {
      const words = idn.lower.split(/\s+/);
      const hit = words.some((w) => w.length > 2 && new RegExp(`\\b${escRe(w)}\\b`, 'i').test(msg));
      if (idn.value.length > 2 && hit) { s += 2; break; }
    }
    for (const rel of meta.relations || []) {
      if (rel.label && new RegExp(`\\b${rel.label}\\b`, 'i').test(msg)) s += 2;
    }
    if (s > 0) scores[entity] = s;
  }
  return scores;
}

function pickTopic(msg) {
  const scores = topicScores(msg);
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0] ? { entity: sorted[0][0], score: sorted[0][1], scores } : null;
}

// ----------------------------------------------------------------------
// CASE CATEGORY (notaris vs PPAT) — mirrors the UI page split.
// ----------------------------------------------------------------------
function detectCaseCategories(msg) {
  const out = [];
  if (/\b(notaris|notary)\b/i.test(msg)) out.push('notary');
  if (/\bppat\b/i.test(msg)) out.push('ppat');
  return out;
}

// Category explicitly named in the question ("notaris" / "PPAT" / both).
function explicitCaseCategory(msg) {
  const n = /\b(notaris|notary)\b/i.test(msg);
  const p = /\bppat\b/i.test(msg);
  if (n && p) return 'both';
  if (n) return 'notary';
  if (p) return 'ppat';
  return null;
}

// Effective case categories for a question: explicit words WIN, otherwise
// fall back to the current page context (if the frontend supplied one).
function resolveCaseCategories(msg, page) {
  const explicit = explicitCaseCategory(msg);
  if (explicit === 'both') return ['notary', 'ppat'];
  if (explicit === 'notary' || explicit === 'ppat') return [explicit];
  const pageCat = CASE_PAGES[page]?.category;
  return pageCat ? [pageCat] : [];
}

function runningExcludesFor(entity, cats) {
  if (entity !== 'cases') return FINAL_CASE_STATUSES;
  const set = new Set();
  let any = false;
  for (const c of cats || []) {
    const meta = CASE_CATEGORIES[c];
    if (meta) { any = true; for (const s of meta.runningExcludes) set.add(s); }
  }
  return any ? [...set] : FINAL_CASE_STATUSES;
}

// ----------------------------------------------------------------------
// FILTER DETECTION
// ----------------------------------------------------------------------
export function resolveValueAlias(msg, entity, caseCategories) {
  const meta = TABLE_META[entity];
  if (!meta) return null;

  for (const alias of Object.values(VALUE_ALIASES)) {
    for (const word of alias.words) {
      if (new RegExp(String.raw`\b${word}\b`, 'i').test(msg)) {
        if (alias.value === 'RUNNING') {
          if (!hasColumn(entity, 'status')) continue;
          return { column: 'status', op: 'nin', value: runningExcludesFor(entity, caseCategories), display: 'masih berjalan' };
        }
        const col = alias.col || alias.column;
        if (!col || !hasColumn(entity, col)) continue;
        return { column: col, op: 'eq', value: alias.value, display: alias.words[0] };
      }
    }
  }

  if (meta.filterCols.status && hasColumn(entity, 'status')) {
    for (const [st, aliasList] of Object.entries(STATUS_ALIASES)) {
      for (const a of aliasList) {
        if (new RegExp(`\\b${a.replace(/[_\s]+/g, '[-_ ]')}\\b`, 'i').test(msg)) {
          return { column: 'status', op: 'eq', value: st, display: st.replace(/_/g, ' ') };
        }
      }
    }
  }

  for (const v of getValueVocab(entity)) {
    if (v.value.length > 1 && msg.includes(v.lower)) {
      return { column: v.column, op: 'eq', value: v.value, display: v.value };
    }
  }
  return null;
}

// Bind a leftover word to either a person/identity column or the entity's
// default categorical column ("Engineering" -> department, etc.).
function resolveLeftover(msg, entity) {
  const meta = TABLE_META[entity];
  const FIELD_WORDS = new Set(['email', 'mail', 'nik', 'phone', 'telepon', 'hape', 'alamat', 'address', 'nama', 'name', 'nomor', 'no.', 'hp', 'wa', 'whatsapp', 'perihal']);
  const words = contentWords(msg).filter((w) => !FIELD_WORDS.has(w));
  if (!words.length) return null;
  const first = words[0];

  for (const idn of getIdentityVocab()) {
    if (idn.entity === entity && first.length > 2 && idn.lower.includes(first)) {
      return { column: idn.column, op: 'like', value: first, display: first, likeCols: [idn.column] };
    }
  }

  let col = DEFAULT_VALUE_COL[entity] || Object.keys(meta.groupCols || {})[0] || (meta.identityCols || [])[0];
  if (col && hasColumn(entity, col)) {
    return { column: col, op: 'like', value: first, display: first, likeCols: [col] };
  }
  return null;
}

// ----------------------------------------------------------------------
// FIELDS + GROUP + METRIC
// ----------------------------------------------------------------------
function requestedFields(entity, msg) {
  const meta = TABLE_META[entity];
  const fields = new Set();
  const visible = meta.cols?.admin || [];
  const pick = (col) => { if (hasColumn(entity, col) && visible.includes(col)) fields.add(col); };

  if (meta.emailCol && hasColumn(entity, meta.emailCol) && msg.includes('email')) pick(meta.emailCol);
  if (meta.emailCol && /\b(nik|no ?ktp)\b/.test(msg)) pick('nik');
  for (const [col] of Object.entries(meta.fieldLabels || {})) {
    const syns = (meta.filterCols?.[col] || []).concat([col]);
    for (const syn of syns) {
      if (syn !== col && syn.length > 3 && new RegExp(`\\b${syn}\\b`, 'i').test(msg)) {
        pick(col);
        break;
      }
    }
  }
  for (const c of meta.identityCols) pick(c);
  // Generic "data/info/daftar <entity>" requests -> show every visible column.
  if (/\b(data|info|informasi|semua|daftar|list|lihat|tampilkan)\b/.test(msg)) {
    for (const c of visible) pick(c);
  }
  return [...fields];
}

function groupByDetection(msg, entity) {
  const meta = TABLE_META[entity];
  const cols = Object.keys(meta.groupCols || {});
  for (const col of cols) {
    const syns = meta.filterCols?.[col] || [col];
    for (const syn of syns) {
      if (new RegExp(`\\b${syn}\\b`, 'i').test(msg)) return col;
    }
    if (msg.includes(meta.groupCols[col])) return col;
  }
  if (msg.includes('divisi')) return cols[0];
  if (msg.includes('kategori')) return cols[0];
  if (msg.includes('status')) return 'status';
  return null;
}

// ----------------------------------------------------------------------
// PLAN ASSEMBLY
// ----------------------------------------------------------------------
function buildPlan(msg, entity, role, overrides = {}) {
  const meta = TABLE_META[entity];
  const caseCategories = overrides.caseCategories || [];
  const plan = {
    entity,
    role,
    metric: overrides.metric || null,
    fields: overrides.fields || [],
    filters: [],
    aggregate: null,
    groupBy: null,
    orderBy: null,
    limit: null,
    keyword: null,
    caseCategories,
    humanFilters: [],
  };

  const isCases = entity === 'cases';
  const isClients = entity === 'clients';

  // Notaris/PPAT split — only meaningful for cases (and clients that have a
  // case in that category). Driven by CASE_CATEGORIES, never hardcoded totals.
  const catF = caseCategoryFilter(caseCategories, entity);
  if (catF) {
    plan.filters.push(catF);
    plan.humanFilters.push(humanFilterText(catF, entity));
  }

  const vf = overrides.explicitFilter || resolveValueAlias(msg, entity, caseCategories);
  if (vf) {
    plan.filters.push(vf);
    plan.humanFilters.push(humanFilterText(vf, entity));
  }

  const isCount = COUNT_PHRASES.test(msg);
  const isGroup = GROUP_PHRASES.test(msg);
  const isList = LIST_PHRASES.test(msg);
  const isRecent = RECENT_PHRASES.test(msg);
  const isSearch = SEARCH_PHRASES.test(msg);
  const leftover = contentWords(msg);

  // ISSUED DEEDS — "akta resmi diterbitkan" (Akta Resmi Diterbitkan card on
  // both UI pages = cases with a non-empty aktaNumber). The aktaNumber != ''
  // filter is the same condition the UI cards evaluate client-side.
  const aktaIssuedWord = /\b(diterbitkan|terbit|bernomor)\b/.test(msg);
  const STATUS_WORDS = /\b(diproses|berjalan|berlangsung|selesai|pending|masuk|tinjau|review|kurang|arsip|rejected|ditolak|draf|ttd|ditandatangani|diambil)\b/i;
  const wantsIssued = isCases && isCount && !isGroup && /akta/i.test(msg) && !vf
    && (aktaIssuedWord || !STATUS_WORDS.test(msg));
  // The ISSUED_DEEDS metric always filters on aktaNumber != '' — even for
  // clean questions like "berapa akta notaris?" where no "diterbitkan" word
  // appears. An explicit diterbitkan/terbit/bernomor word also keeps the
  // filter for listing/other metrics.
  if ((wantsIssued || aktaIssuedWord) && !plan.filters.some((f) => f.column === 'aktaNumber')) {
    plan.filters.push({ column: 'aktaNumber', op: 'neq', value: '', display: 'sudah diterbitkan' });
    plan.humanFilters.push(humanFilterText(plan.filters[plan.filters.length - 1], entity));
  }

  if (wantsIssued) {
    plan.metric = 'issued';
  } else if (isCount && isGroup) {
    plan.metric = 'group';
    plan.groupBy = overrides.groupBy || groupByDetection(msg, entity) || Object.keys(meta.groupCols || {})[0] || null;
  } else if (isCount) {
    plan.metric = 'count';
  } else if (isRecent) {
    plan.metric = 'list';
    plan.orderBy = { column: meta.dateCol, dir: 'desc' };
    plan.limit = Number(overrides.limit || 1);
  } else if (isSearch && leftover.length) {
    plan.metric = 'search';
    plan.keyword = leftover.join(' ');
  } else if (!isList && leftover.length && !vf) {
    // natural-language value binding ("yang bekerja di Engineering")
    const lf = overrides.leftoverFilter || resolveLeftover(msg, entity);
    if (lf) {
      plan.filters.push(lf);
      plan.humanFilters.push(humanFilterText(lf, entity));
      plan.metric = 'list';
    } else {
      plan.metric = 'search';
      plan.keyword = leftover[0];
    }
  } else if (isList && leftover.length && !vf) {
    // listing that also carries a value ("Siapa yang bekerja di Engineering?")
    const lf = overrides.leftoverFilter || resolveLeftover(msg, entity);
    if (lf) {
      plan.filters.push(lf);
      plan.humanFilters.push(humanFilterText(lf, entity));
    }
    plan.metric = 'list';
  } else {
    plan.metric = 'list';
    plan.orderBy = { column: meta.dateCol, dir: 'desc' };
    plan.limit = 8;
  }

  if (!plan.fields.length) plan.fields = requestedFields(entity, msg);
  if (plan.groupBy && !hasColumn(entity, plan.groupBy)) plan.groupBy = null;
  if (plan.orderBy && !hasColumn(entity, plan.orderBy.column)) plan.orderBy = null;

  return plan;
}

function humanFilterText(f, entity) {
  const meta = TABLE_META[entity];
  let label;
  if (f.op === 'caseUnion' || f.op === 'in') {
    return `pada jenis layanan **"${cap(String(f.display || 'tersebut'))}"**`;
  }
  if (f.op === 'relatedCase') return `yang memiliki kasus ${cap(String(f.display || 'tersebut'))}`;
  if (f.column === 'aktaNumber' && f.op === 'neq') return 'yang nomor akta-nya sudah diterbitkan';
  if (f.op === 'like') {
    const colIsCategory = meta.filterCols?.[f.column] && f.column !== (meta.identityCols || [])[0];
    return colIsCategory
      ? `pada ${groupLabel(entity, f.column)} **"${cap(String(f.display || f.value))}"**`
      : `yang namanya mengandung "${cap(String(f.display || f.value))}"`;
  }
  if (f.op === 'nin') return `yang ${f.display || 'masih berjalan'}`;
  if (f.value === 'active' || f.display === 'aktif') return 'yang berstatus aktif';
  return `berstatus "${String(f.value)}"`;
}

function cap(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Category filter for the CURRENT conversation category set (re-derived,
// never copied from an older turn — otherwise a page navigation would keep
// answering for the previous notaris/PPAT page).
function caseCategoryFilter(cats, entity) {
  if (!cats || !cats.length) return null;
  if (entity === 'clients') {
    const services = [];
    for (const c of cats) services.push(...(CASE_CATEGORIES[c]?.services || []));
    return { column: 'id', op: 'relatedCase', value: services, display: cats.map((c) => (CASE_CATEGORIES[c]?.label || c)).join(' & ') };
  }
  if (cats.length === 2) {
    return { column: 'serviceType', op: 'caseUnion', value: { notary: CASE_CATEGORIES.notary.services, ppat: CASE_CATEGORIES.ppat.services }, display: 'Notaris & PPAT' };
  }
  const c = CASE_CATEGORIES[cats[0]];
  if (!c) return null;
  return { column: 'serviceType', op: 'in', value: c.services, display: c.label };
}

// ----------------------------------------------------------------------
// FOLLOW-UP RESOLUTION — "Yang Engineering?", "Siapa saja?", "ini berapa?"
// ----------------------------------------------------------------------
function buildFollowUp(msg, context, overrideCats = null) {
  if (!context || !context.entity || !TABLE_META[context.entity]) return null;
  const entity = context.entity;
  const cats = overrideCats || context.caseCategories || [];
  const isCatF = (f) => f.op === 'caseUnion' || (f.column === 'serviceType' && f.op === 'in') || f.op === 'relatedCase';
  const baseFilters = () => {
    const cat = caseCategoryFilter(cats, entity);
    const rest = (context.filters || []).filter((f) => !isCatF(f)).map((f) => ({ ...f }));
    return cat ? [...rest, cat] : rest;
  };

  // "Siapa saja?" / "Daftarnya?" -> list the last topic
  if (/^(siapa|daftar|list|sebutkan)\b/i.test(msg)) {
    return {
      entity, role: context.role, metric: 'list',
      fields: context.fields || [],
      filters: baseFilters(),
      groupBy: null,
      orderBy: { column: TABLE_META[entity].dateCol, dir: 'desc' },
      limit: 8,
      keyword: null,
      caseCategories: cats,
      humanFilters: [...(context.humanFilters || [])],
    };
  }

  // "Yang <value> berapa?" / "Yang <value>?" -> refine last topic
  const m = msg.match(/^yang\s+([\w\s-]+?)\s*(berapa|siapa|ada)?\??$/i);
  if (m && m[1]) {
    const value = m[1].trim();
    const next = buildPlan(entity + ' ' + value, entity, context.role, { caseCategories: cats });
    next.filters = baseFilters();
    next.humanFilters = [...(context.humanFilters || [])];
    next.caseCategories = cats;
    if (context.metric === 'count' || /\bberapa\b/i.test(msg)) next.metric = 'count';

    const vf = resolveValueAlias(value, entity, cats);
    if (vf) {
      next.filters.push(vf);
      next.humanFilters.push(humanFilterText(vf, entity));
    } else {
      const lf = resolveLeftover(value, entity);
      if (lf) {
        next.filters.push(lf);
        next.humanFilters.push(humanFilterText(lf, entity));
      }
    }
    return next;
  }

  // "Lalu berapa totalnya?" etc.
  const plus = buildPlan(msg, entity, context.role, { caseCategories: cats });
  plus.filters = baseFilters();
  plus.humanFilters = [...(context.humanFilters || [])];
  plus.caseCategories = cats;
  return plus;
}

// ----------------------------------------------------------------------
// PUBLIC PLANNER
// ----------------------------------------------------------------------
export function planQuestion(rawMessage, opts = {}) {
  const msg = strip(rawMessage);
  if (!msg) return null;
  const role = opts.role || 'admin';
  const context = opts.context || null;
  const page = opts.page || null;
  // Page context (from the frontend) picks a fallback category ONLY for case
  // questions that do not name notaris/PPAT explicitly.
  const pagesCatsForCases = () => resolveCaseCategories(msg, page);

  // 1) terse follow-ups (keep the conversation topic)
  const FOLLOW_START = /^(yang|itu|kalau|lalu|terus|klo|kalo|mana)\b/i;
  const BARE_FOLLOW = /^(siapa(\s+saja)?|daftar(\s+saja)?|list(nya)?|sebutkan(\s+saja)?)\s*[?!.\s]*$/i;
  const TOTAL_FOLLOW = /^(total(nya)?|jumlah(nya)?|keseluruhan(nya)?|berapa total(nya)?|lalu(kah)? total(nya)?)\s*[?!.\s]*$/i;
  if (context && (FOLLOW_START.test(msg) || BARE_FOLLOW.test(msg) || TOTAL_FOLLOW.test(msg))) {
    // Fresh page context overrides a stale conversation category (e.g. user
    // was on Notary, navigated to PPAT, then asks another follow-up).
    const overrideCats = context.entity === 'cases' ? pagesCatsForCases() : null;
    const follow = buildFollowUp(msg, context, overrideCats);
    if (follow) return { follow: true, ...follow, role };
  }

  // 1b) notifications live in browser storage, not the local DB — be honest.
  if (/\b(notifikasi|notif|pemberitahuan)\b/i.test(msg)) {
    return { entity: null, metric: 'unsupported', concept: 'notifikasi', role };
  }

  // 2) known-but-unsupported concepts -> honest "belum tersedia"
  for (const c of UNSUPPORTED_CONCEPTS) {
    if (new RegExp(`\\b${c}\\w*\\b`, 'i').test(msg)) {
      return { entity: null, metric: 'unsupported', concept: c, role };
    }
  }

  // 3) office recap
  if (RECAP_PHRASES.test(msg)) {
    return { entity: 'summary', metric: 'recap', role };
  }

  // 4) financial summary (admin-only at execution)
  if (FEES_PHRASES.test(msg)) {
    const paid = /\b(dibayar|lunas|paid|terbayar)\b/.test(msg) ? 'paid' : null;
    return { entity: 'cases', metric: 'fees', payment: paid, role };
  }

  const topic = pickTopic(msg);
  const hasEntityWord = topic && topic.scores[topic.entity] >= 4;

  // 5) "Data apa saja yang tersedia di sistem?" -> schema domain
  if (!hasEntityWord) {
    for (const phrase of DOMAIN_PHRASES) {
      if (msg.includes(phrase)) {
        return { entity: null, metric: 'domain', role };
      }
    }
  }

  // 6) generic database question
  if (!topic) return null;

  // Explicit notaris/PPAT words win; page context only fills in the gap for
  // case questions. For clients, only explicit words scope the related cases.
  const caseCategories = topic.entity === 'cases' ? pagesCatsForCases() : detectCaseCategories(msg);
  const plan = buildPlan(msg, topic.entity, role, { caseCategories });
  if (!plan.metric) return null;
  return { follow: false, ...plan, topic: topic.entity, score: topic.score };
}