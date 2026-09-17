import db from '../db.js';
import {
  TABLE_META, hasTable, hasColumn, isAdminRole, getVisibleColumns, CASE_CATEGORIES, CASE_PAGES,
} from './schemaInspector.js';
import { runRead } from './queryService.js';

// ----------------------------------------------------------------------
// entitySearch — GENERIC entity & name search for the AI Copilot.
//
// Goal (per the Noffice AI requirements): "apakah ada Daffa?", "cari Daffa",
// "kasus Daffa apa saja?", "siapa petugas yang menangani kasus Daffa?",
// "kasus nomor 012 punya siapa?" must all work for ANY name in the local
// database — WITHOUT hardcoding names and WITHOUT a per-question rule set.
//
// How it works:
//   1. vocabulary layers read LIVE from the DB (clients, employees,
//      employees/authors, documents, case numbers, akta numbers, officers)
//      with a short TTL so new records (e.g. "TEST AI") appear immediately.
//   2. a fuzzy matcher binds the user's term to real rows (substring,
//      token-prefix and Levenshtein distance — "daffa" -> "Dafffa").
//   3. question focus (cases / clients / employees / documents / officer)
//      and answer shape (exists / count / list / status / akta / officer)
//      are detected generically.
//   4. execution reuses the read-only, parameterized queryService.runRead and
//      enforces role visibility per entity.
//   5. zero matches -> a clear "NOT FOUND" answer (never "tidak paham").
// ----------------------------------------------------------------------

const IDENTITY_SCORE = 3;   // clients/employees names
const AUTHOR_SCORE = 2;     // document authors
const ENTITY_SCORE = 1.5;   // case numbers / akta numbers / doc titles / officers
const VOCAB_TTL_MS = 2000;  // short TTL: newly-added records appear almost instantly

const DOC_MARKER = /\b(dokumen|berkas|arsip|file)\b/i;
const SEARCH_MARKER = /\b(cari|find|cariin|carikan|tampilkan|tampil|lihat|coba)\b/i;
const EXISTS_MARKER = /\b(ada\b|apakah|nggak|gak)\b/i;

let vocabCache = { rows: null, ts: 0 };

// STOP words — question scaffolding that must never become the search term.
const STOP = new Set(
  ['berapa', 'jumlah', 'total', 'sebanyak', 'count', 'banyak', 'ada', 'nggak', 'gak', 'apakah', 'apaa', 'apasih',
    'masih', 'sudah', 'belum', 'sedang', 'akan', 'mau', 'ingin', 'tolong', 'mohon', 'silakan', 'silahkan',
    'cari', 'mencari', 'cariin', 'carikan', 'find', 'mau', 'cek', 'data', 'info', 'informasi', 'tentang',
    'terkait', 'untuk', 'saya', 'kamu', 'anda', 'dia', 'ini', 'itu', 'yang', 'dengan', 'dari', 'di', 'pada',
    'halaman', 'page', 'hal', 'tampil', 'tampilkan', 'lihat', 'show', 'daftar', 'list', 'sebutkan', 'siapa',
    'punya', 'pemilik', 'milik', 'bernama', 'namanya', 'kasus', 'permohonan', 'permohonannya', 'berkas',
    'dokumen', 'klien', 'klient', 'client', 'nasabah', 'pelanggan', 'karyawan', 'employee', 'employees',
    'staf', 'pegawai', 'pekerja', 'petugas', 'menangani', 'pengurus', 'penanggung', 'jawab',
    'penanggungjawab', 'officer', 'status', 'nomor', 'no', 'akta', 'notaris', 'ppat', 'jenis', 'layanan',
    'service', 'dan', 'atau', 'serta', 'didalam', 'dalam', 'pada', 'kini', 'saat', 'ini', 'juga', 'semua',
    'seluruh', 'lihatlah', 'bisa', 'dapat', 'berikan', 'kasih', 'ke', 'kepada', 'bagaimana', 'gimana', 'kah',
    'nya', 'nya?', 'tersedia', 'per', 'divisi', 'juta', 'gaji', 'nominal', 'atas', 'deviasi',
    'kalau', 'begitu', 'lantas', 'terus', 'tadi', 'tersebut', 'saja'].filter(Boolean)
);

const NUM_CASE = /\b(0\d{2,})\b/;

const FOCUS_MARKERS = [
  ['officer', /\b(petugas|menangani|penanggung\s*jawab|pengurus|officer|yang (?:menangani|handle|urus))\b/i],
  ['employees', /\b(karyawan|employee|staf|pegawai|pekerja)\b/i],
  ['clients', /\b(klien|klient|client|nasabah|pelanggan)\b/i],
  ['documents', /\b(dokumen|berkas|arsip|file)\b/i],
  ['cases', /\b(kasusnya|permohonannya|kasus|permohonan|nomor ?akta|no ?akta|akta s\w*|notaris|ppat|sertifikat)\b/i],
];

// ----------------------------------------------------------------------
// LIVE vocabulary
// ----------------------------------------------------------------------
function loadVocab() {
  if (vocabCache.rows && Date.now() - vocabCache.ts < VOCAB_TTL_MS) return vocabCache.rows;
  const out = {
    clients: [],      // { id, name }
    employees: [],    // { id, name }
    documents: [],    // { id, title, author }
    cases: [],        // { id, caseNumber, aktaNumber, assignedTo, clientId, serviceType, status }
    officers: [],     // distinct assignedTo
  };
  try {
    if (hasTable('clients') && hasColumn('clients', 'name')) {
      out.clients = db.prepare('SELECT id, name FROM clients').all()
        .filter((r) => r.name).map((r) => ({ id: r.id, name: String(r.name) }));
    }
  } catch { /* ignore */ }
  try {
    if (hasTable('employees') && hasColumn('employees', 'name')) {
      out.employees = db.prepare('SELECT id, name FROM employees').all()
        .filter((r) => r.name).map((r) => ({ id: r.id, name: String(r.name) }));
    }
  } catch { /* ignore */ }
  try {
    if (hasTable('documents')) {
      const cols = db.prepare('PRAGMA table_info("documents")').all().map((c) => c.name);
      const selTitle = cols.includes('title') ? 'title' : 'id';
      const selAuthor = cols.includes('author') ? 'author' : 'id';
      const trash = cols.includes('isTrashed') ? ' WHERE isTrashed = 0' : '';
      out.documents = db.prepare(`SELECT id, ${selTitle} AS title, ${selAuthor} AS author FROM documents${trash}`).all()
        .map((r) => ({ id: r.id, title: String(r.title || ''), author: String(r.author || '') }));
    }
  } catch { /* ignore */ }
  try {
    if (hasTable('cases')) {
      const cols = db.prepare('PRAGMA table_info("cases")').all().map((c) => c.name);
      const sel = (c) => (cols.includes(c) ? c : "'missing'");
      out.cases = db.prepare(
        `SELECT id, ${sel('caseNumber')} AS caseNumber, ${sel('aktaNumber')} AS aktaNumber, ${sel('assignedTo')} AS assignedTo, ${sel('clientId')} AS clientId, ${sel('serviceType')} AS serviceType, ${sel('status')} AS status FROM cases`
      ).all().map((r) => ({
        id: r.id, caseNumber: String(r.caseNumber || ''), aktaNumber: String(r.aktaNumber || ''),
        assignedTo: String(r.assignedTo || ''), clientId: r.clientId, serviceType: r.serviceType || '', status: r.status || '',
      }));
      const seen = new Set();
      for (const c of out.cases) {
        if (!c.assignedTo || seen.has(c.assignedTo)) continue;
        seen.add(c.assignedTo);
        out.officers.push(c.assignedTo);
      }
    }
  } catch { /* ignore */ }
  vocabCache.rows = out;
  vocabCache.ts = Date.now();
  return out;
}

// ----------------------------------------------------------------------
// Fuzzy matching
// ----------------------------------------------------------------------
function norm(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}
function ed(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1);
  const cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j];
  }
  return prev[n];
}

// Score how well a vocab string matches the term. Returns a positive score
// or 0 when it does not match.
function nameScore(str, term, kindScore) {
  const s = norm(str);
  const t = norm(term);
  if (!s || !t) return 0;
  if (s === t) return 100 * kindScore;
  if (s.includes(t) || t.includes(s)) return (s.length >= 3 || t.length >= 3) ? 50 * kindScore : 0;
  const sTok = s.split(' ').filter((w) => w.length >= 3);
  const tTok = t.split(' ').filter((w) => w.length >= 3);
  for (const tw of tTok) {
    for (const sw of sTok) {
      if (sw === tw) return 40 * kindScore;
      if (sw.startsWith(tw) || tw.startsWith(sw)) return 30 * kindScore;
    }
  }
  if (t.length >= 4 && s.length >= 4) {
    const d = ed(s, t);
    if (d <= Math.max(1, Math.floor(Math.min(s.length, t.length) / 3))) return (28 - d * 4) * kindScore;
  }
  return 0;
}

// Match a term across the vocabulary. Returns grouped matches.
function matchTerm(term, vocab) {
  const found = [];
  const seenRow = new Set();
  const push = (kind, id, display) => {
    if (seenRow.has(kind + ':' + id)) return;
    seenRow.add(kind + ':' + id);
    found.push({ kind, id, display });
  };
  for (const c of vocab.clients) {
    const sc = nameScore(c.name, term, IDENTITY_SCORE);
    if (sc > 0) push('clientId', c.id, c.name);
  }
  for (const e of vocab.employees) {
    const sc = nameScore(e.name, term, IDENTITY_SCORE);
    if (sc > 0) push('employeeId', e.id, e.name);
  }
  for (const d of vocab.documents) {
    const st = nameScore(d.title, term, ENTITY_SCORE / 2);
    if (st > 0) push('docTitleId', d.id, d.title);
    const sa = nameScore(d.author, term, AUTHOR_SCORE);
    if (sa > 0) push('docAuthorId', d.id, d.author);
  }
  for (const c of vocab.cases) {
    if (c.caseNumber && nameScore(c.caseNumber, term, ENTITY_SCORE) > 0) push('caseNumberId', c.id, c.caseNumber);
    if (c.aktaNumber && nameScore(c.aktaNumber, term, ENTITY_SCORE) > 0) push('aktaId', c.id, c.aktaNumber);
    if (c.assignedTo && nameScore(c.assignedTo, term, ENTITY_SCORE) > 0) push('officerCaseId', c.id, c.assignedTo);
  }
  return found;
}

// ----------------------------------------------------------------------
// Term extraction from a natural-language question
// ----------------------------------------------------------------------
function extractTerm(msg, vocab) {
  const m = msg.match(NUM_CASE);
  if (m) return { term: m[1], via: 'number' };

  // Prefer the LONGEST real name / entity value that appears verbatim.
  // Single-word document titles that collide with domain terms ("AKTA") are
  // only taken when the question explicitly mentions documents — otherwise
  // "berapa akta resmi diterbitkan?" goes to the issued-deeds planner.
  const candidates = [];
  for (const c of vocab.clients) candidates.push([c.name, 3]);
  for (const e of vocab.employees) candidates.push([e.name, 3]);
  for (const d of vocab.documents) { candidates.push([d.title, 1.2]); if (d.author) candidates.push([d.author, 2]); }
  for (const c of vocab.cases) { candidates.push([c.caseNumber, 1.2]); if (c.aktaNumber) candidates.push([c.aktaNumber, 1.2]); }
  candidates.sort((a, b) => b[0].length - a[0].length);
  for (const [name, w] of candidates) {
    const n = norm(name);
    const strong = w >= 2; // person/author names
    if (n.length >= 3 && msg.includes(n) && (strong || n.length >= 5 || DOC_MARKER.test(msg))) {
      return { term: name, via: 'name', weight: w };
    }
  }

  // Token-level fuzzy binding. Plain numbers are ignored here (only case-like
// numbers "007/012" matter, handled separately) so salary/year questions
// like "gaji di atas 10 juta" never become a name search for "10".
  const tokens = msg.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);
  const terms = tokens.filter((t) => t.length >= 4 && !STOP.has(t) && !/^\d+$/.test(t));
  if (terms.length) {
    const scored = terms.map((t) => ({ t, score: matchTerm(t, vocab).reduce((s, f) => s + (f.kind.startsWith('client') || f.kind.startsWith('employee') ? 3 : 1), 0) }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored.find((s) => s.score > 0);
    if (best) return { term: best.t, via: 'fuzzy' };
    return { term: terms.slice(0, 2).join(' '), via: 'word' }; // title-ish free search
  }
  return null;
}

// ----------------------------------------------------------------------
// Question focus + answer shape
// ----------------------------------------------------------------------
function focusOf(msg, page) {
  for (const [focus, re] of FOCUS_MARKERS) if (re.test(msg)) return focus;
  const cat = CASE_PAGES[page];
  if (cat && cat.category) return 'cases';
  return 'auto';
}

function qtypeOf(msg, focus) {
  const statusWord = /\bstatus\b/i.test(msg);
  const isCount = /\b(berapa|banyak)\b/i.test(msg);
  const askOfficer = /\b(petugas|menangani|penanggung\s*jawab|pengurus|yang (?:menangani|handle|urus))\b/i.test(msg);
  const askAkta = /\b(nomor\s*akta|no\.?\s*akta|nomor akta|akta(?:n| pun)?)\b/i.test(msg) && !/\b(dokumen|berkas)\b/i.test(msg);
  const exists = /\b(apakah|ada\b|nggak|gak|tidak ada|apakah ada)\b/i.test(msg);
  if (isCount) return 'count';
  if (askOfficer) return 'officer';
  if (askAkta) return 'akta';
  if (statusWord) return 'status';
  if (focus === 'documents') return 'documents';
  if (focus === 'cases') return 'cases';
  if (/\b(kasus|permohonan|punya|memiliki)\b/i.test(msg)) return 'cases';
  if (exists) return 'exists';
  return 'raw';
}

function categoryFilter(msg, page) {
  const explicit = [];
  if (/\b(notaris|notary)\b/i.test(msg)) explicit.push('notary');
  if (/\bppat\b/i.test(msg)) explicit.push('ppat');
  if (explicit.length === 2) return 'both';
  if (explicit.length === 1) return explicit[0];
  return CASE_PAGES[page]?.category || null;
}

// ----------------------------------------------------------------------
// PUBLIC PLANNER
// ----------------------------------------------------------------------
export function buildEntityPlan(rawMsg, opts = {}) {
  const vocab = loadVocab();
  const msg = rawMsg.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!msg) return null;
  const role = opts.role || 'admin';
  const page = opts.page || null;
  const context = opts.context || null;

  const fresh = extractTerm(msg, vocab);
  let extracted = fresh;
  let freshMatched = extracted ? matchTerm(extracted.term, vocab) : [];
  // Anaphoric follow-up ("kalau begitu kasusnya apa saja?", "yang itu") —
  // no new vocab match, but clearly referring back to the previous term.
  const anaphora = /\b(kasusnya|permohonannya|yang (?:itu|tadi)|tersebut|kalau|lalu|lantas|terus)\b/i.test(msg);
  if ((!extracted || freshMatched.length === 0) && anaphora && context && context.metric === 'entity' && context.term) {
    extracted = { term: context.term, via: 'context' };
    freshMatched = matchTerm(context.term, vocab);
  }
  if (!extracted) return null;

  // A pure data question with a term that matches nothing is still an entity
  // question (so the answer is a proper NOT FOUND, not "tidak paham").
  const matched = freshMatched;
  const focus = focusOf(msg, page);
  const qtype = qtypeOf(msg, focus);
  const category = categoryFilter(msg, page);

  // Only treat this as an ENTITY question when we have an actual reason:
  //   - the term hit something in the vocab (fuzzy/name/number), OR
  //   - explicit search wording (cari/tampil/ada/apakah/lihat), OR
  //   - a number/case-number token, OR
  //   - the previous question already established this entity term.
  // Otherwise "berapa kasus yang diproses?" (no entity) falls through to the
  // normal query planner instead of being hijacked here.
  // Only treat this as an ENTITY question when we have an actual reason:
  //   - the term hit something in the vocab (fuzzy/name/number), OR
  //   - explicit search wording (cari/tampil/ada/apakah/lihat), OR
  //   - a number/case-number token.
  // Term reuse from a previous question only happens via the anaphoric
  // override above — a stale entity term must NOT hijack an unrelated new
  // question ("berapa total gaji?" after "cari AKTA").
  const justified = matched.length > 0 || SEARCH_MARKER.test(msg) || EXISTS_MARKER.test(msg) || extracted.via === 'number';
  if (!justified) return null;

  // Officers referenced only inside the question (e.g. personnel performing
  // the work) are NOT the search subject; the subject is what they handle.
  // For auto/clients focus we still want the entity's related cases shown.
  const subject = (focus === 'officer' || focus === 'cases' || focus === 'auto' || focus === 'clients') ? 'cases' : focus;

  return {
    metric: 'entity',
    term: extracted.term,
    via: extracted.via,
    focus,
    qtype,
    category,
    subject,
    page,
    role,
    matched,
    matchedCount: matched.length,
  };
}

// ----------------------------------------------------------------------
// EXECUTOR — safe, read-only, parameterized; enforces role visibility.
// ----------------------------------------------------------------------
function roleVisible(entity, role) {
  if (!TABLE_META[entity]) return false;
  return getVisibleColumns(entity, role).length > 0;
}

function visible(entity, role) {
  return getVisibleColumns(entity, role);
}

function inList(list, max = 900) {
  const ids = [...new Set(list)].filter(Boolean);
  return ids.slice(0, max);
}

export function executeEntityPlan(plan) {
  const { role, term } = plan;
  const vocab = loadVocab();
  const kindIds = { clientId: [], employeeId: [], docTitleId: [], docAuthorId: [], caseNumberId: [], aktaId: [], officerCaseId: [] };
  for (const f of plan.matched) if (kindIds[f.kind]) kindIds[f.kind].push(f.id);

  const out = {
    term,
    clients: [],
    employees: [],
    documents: [],   // { title, author }
    cases: [],
    officers: [],
    serviceTypes: [],
    foundAny: false,
  };

  // ---- clients ----
  if (roleVisible('clients', role)) {
    const ids = inList(kindIds.clientId);
    if (ids.length) {
      const cols = visible('clients', role).filter((c) => hasColumn('clients', c)).slice(0, 12);
      const rows = runRead(`SELECT ${cols.map((c) => `"${c}"`).join(',')} FROM "clients" WHERE "id" IN (${ids.map(() => '?').join(',')})`, ids);
      for (const r of rows) {
        r.__id = r.id; out.clients.push(r);
      }
      out.foundAny = true;
    }
  }

  // ---- employees (non-admin sees only their own level) ----
  if (roleVisible('employees', role)) {
    const ids = inList(kindIds.employeeId);
    if (ids.length) {
      const cols = visible('employees', role).filter((c) => hasColumn('employees', c)).slice(0, 10);
      const scope = isAdminRole(role) || !TABLE_META.employees.employeeOnlyRows ? '' : ` AND "role" = 'employee'`;
      const rows = runRead(`SELECT ${cols.map((c) => `"${c}"`).join(',')} FROM "employees" WHERE "id" IN (${ids.map(() => '?').join(',')})${scope}`, ids);
      for (const r of rows) out.employees.push(r);
      if (rows.length) out.foundAny = true;
    }
  }

  // ---- documents (only non-trashed) ----
  if (roleVisible('documents', role)) {
    const ids = inList([...kindIds.docTitleId, ...kindIds.docAuthorId]);
    if (ids.length) {
      const rows = runRead(
        `SELECT "id", "title", "author", "category", "status" FROM "documents" WHERE "id" IN (${ids.map(() => '?').join(',')}) AND isTrashed = 0`,
        ids
      );
      for (const r of rows) out.documents.push({ id: r.id, title: r.title, author: r.author, category: r.category, status: r.status });
      if (rows.length) out.foundAny = true;
    }
  }

  // ---- cases (via: matched client ids OR case number OR akta OR officer) ----
  if (roleVisible('cases', role) && plan.subject === 'cases') {
    const cols = visible('cases', role).filter((c) => hasColumn('cases', c)).slice(0, 20);
    const wantCols = ['caseNumber', 'serviceType', 'status', 'assignedTo', 'aktaNumber', 'clientId'].filter((c) => cols.includes(c) || isAdminRole(role));
    const sel = wantCols.map((c) => `"${c}"`).join(',');
    const clientIds = inList(kindIds.clientId);
    const numIds = inList(kindIds.caseNumberId);
    const aktaIds = inList(kindIds.aktaId);
    const offIds = inList(kindIds.officerCaseId);
    const clauses = [];
    const params = [];
    if (clientIds.length) { clauses.push(`"clientId" IN (${clientIds.map(() => '?').join(',')})`); clientIds.forEach((v) => params.push(v)); }
    if (numIds.length) { clauses.push(`"id" IN (${numIds.map(() => '?').join(',')})`); numIds.forEach((v) => params.push(v)); }
    if (aktaIds.length) { clauses.push(`"id" IN (${aktaIds.map(() => '?').join(',')})`); aktaIds.forEach((v) => params.push(v)); }
    if (offIds.length) { clauses.push(`"id" IN (${offIds.map(() => '?').join(',')})`); offIds.forEach((v) => params.push(v)); }
    if (clauses.length) {
      const cat = plan.category;
      if (cat === 'notary') { clauses.push(`"serviceType" IN (${CASE_CATEGORIES.notary.services.map(() => '?').join(',')})`); CASE_CATEGORIES.notary.services.forEach((v) => params.push(v)); }
      else if (cat === 'ppat') { clauses.push(`"serviceType" IN (${CASE_CATEGORIES.ppat.services.map(() => '?').join(',')})`); CASE_CATEGORIES.ppat.services.forEach((v) => params.push(v)); }
      const rows = runRead(`SELECT ${sel} FROM "cases" WHERE ${clauses.join(' AND ')} ORDER BY "createdAt" DESC LIMIT 40`, params);
      for (const r of rows) out.cases.push(r);
      if (rows.length) out.foundAny = true;
    }
  }

  // ---- officers distinct (who handles the subject's cases) ----
  if (out.cases.length && (plan.qtype === 'officer' || plan.focus === 'officer')) {
    const set = new Set();
    for (const c of out.cases) if (c.assignedTo) set.add(c.assignedTo);
    out.officers = [...set];
  }

  outflow: {
    out.serviceTypes = [...new Set(out.cases.map((c) => c.serviceType).filter(Boolean))];
    out.foundAny = out.foundAny || out.cases.length > 0;
  }
  return out;
}

// Reset vocabulary cache (used by tests that mutate the DB).
export function resetEntitySearchCache() {
  vocabCache = { rows: null, ts: 0 };
}