import { runRead } from './queryService.js';
import { hasTable, hasColumn, getVisibleColumns, isAdminRole, FINAL_CASE_STATUSES, SERVICE_LABELS } from './schemaInspector.js';

// ----------------------------------------------------------------------
// relationshipQuery — relationship-aware reads for the Copilot.
//
// The Copilot must understand the Noffice data GRAPH, not just one table:
//
//   Client ── has ──► Cases ──► (akta/status/assignee) ──► Agenda (jadwal)
//      │                 │
//      └── related ──────┴──► Documents (via author / case-number matching)
//
// documents has NO caseId/clientId foreign key, so doc↔entity links use an
// HONEST matching heuristic (doc.author matches the client name — fuzzy —
// OR the doc title/description contains the case number). Everything else is
// real FK / live data. No invented values.
// ----------------------------------------------------------------------

export function serviceLabel(id) {
  return (id && SERVICE_LABELS[id]) || String(id || '');
}

export const STATUS_ACRONYMS = new Set(['npwp', 'bpn', 'siup', 'nib', 'bphtb', 'pph', 'ahu', 'ttd', 'ppat', 'pmkn', 'skmht']);

export function statusLabel(s) {
  if (!s) return '';
  return String(s).split('_').filter(Boolean).map((w) => {
    const lo = w.toLowerCase();
    return STATUS_ACRONYMS.has(lo) ? lo.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

// Statuses that clearly mean "berkas belum lengkap / masih di awal".
export const INCOMPLETE_STATUSES = ['kurang', 'berkas_masuk', 'pending', 'review', 'draf_akta'];

function normForMatch(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Words so common in Indonesian names they carry no discriminating signal for
// whether a document belongs to THIS client ("muhammad hasbi" must NOT match a
// doc authored by "muhammad daffa alfarisi" just because of "muhammad").
const COMMON_NAME_TOKENS = new Set(['muhammad', 'moh', 'mohamad', 'haji', 'hajjah', 'ibnu', 'binti', 'bin', 'abdi', 'agus']);

function levNorm(a, b) {
  const A = normForMatch(a), B = normForMatch(b);
  const m = A.length, n = B.length;
  if (!m || !n) return Math.max(m, n);
  const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[m][n];
}

function fuzz(a, b) {
  const A = normForMatch(a).split(' ').filter((w) => w.length > 1);
  const B = normForMatch(b).split(' ').filter((w) => w.length > 1);
  if (!A.length || !B.length) return false;
  // strong — every token of the shorter side appears in the longer side.
  // signatures like "Muhammad Hasbi Takumi" vs author "Muhammad Hasbi" match;
  // a shared single common token ("muhammad") is NOT enough (handled below).
  const [shorter, longer] = A.length <= B.length ? [A, B] : [B, A];
  if (shorter.every((t) => longer.some((bt) => bt === t || bt.startsWith(t) || t.startsWith(bt)))) return true;
  // weak — a DISCRIMINATING token of side A matches an author token within edit
  // distance ~2. Catches real-world name typos: client "Dafffa" ↔ author
  // "Muhammad Daffa Alfarisi". The token must NOT be a common name word.
  const disc = A.filter((w) => w.length >= 3 && !COMMON_NAME_TOKENS.has(w));
  if (!disc.length) return false;
  return disc.some((t) => B.some((bt) => levNorm(t, bt) <= Math.max(2, Math.floor(t.length / 3))));
}

// ----------------------------------------------------------------------
// Name resolution — find the strongest CLIENT row for a term/message.
// Used to re-anchor a reference, and by smart intents.
// ----------------------------------------------------------------------
export function findClientsByName(term) {
  if (!hasTable('clients') || !hasColumn('clients', 'name')) return [];
  const rows = runRead(`SELECT "id", "name" FROM "clients"`);
  const t = normForMatch(term);
  if (!t) return [];
  const tToks = t.split(' ').filter((w) => w.length >= 2);
  const scored = [];
  for (const c of rows) {
    const cName = String(c.name || '');
    const n = normForMatch(cName);
    if (n === t) { scored.push({ client: c, score: 1000 }); continue; }
    if (n.includes(t) || t.includes(n)) { scored.push({ client: c, score: 500 }); continue; }
    const cToks = n.split(' ').filter((w) => w.length >= 2);
    let hits = 0;
    for (const tt of tToks) {
      if (cToks.some((ct) => ct === tt || ct.startsWith(tt) || tt.startsWith(ct))) hits++;
    }
    if (hits > 0 && hits >= Math.min(2, tToks.length)) {
      scored.push({ client: c, score: 100 * hits });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map((s) => s.client);
}

export function findEntityName(msg, ref) {
  // Look for a real client name INSIDE a message (e.g. "ada data Hasbi yang
  // lain?"). Prefer the current ref when it appears, else match a client.
  if (ref) {
    const n = normForMatch(ref.name || ref.term);
    if (n && normForMatch(msg).includes(n)) {
      return { kind: ref.kind, id: ref.id, name: ref.name, term: ref.term };
    }
  }
  const tokens = normForMatch(msg).split(' ').filter((w) => w.length >= 3);
  for (const tok of tokens) {
    const hits = findClientsByName(tok);
    if (hits.length) {
      const c = hits[0];
      return { kind: 'client', id: c.id, name: c.name, term: c.name };
    }
  }
  return null;
}

// ----------------------------------------------------------------------
// CLIENT GRAPH — client profile + all its cases (+ status detail) + related
// documents + agenda rows. ONE structure, cross-entity.
// ----------------------------------------------------------------------
export function clientGraph(clientId, role) {
  const out = { client: null, cases: [], documents: [], agenda: [], foundAny: false };
  if (!hasTable('clients')) return out;
  const cl = runRead(`SELECT * FROM "clients" WHERE "id" = ?`, [clientId]);
  if (!cl.length) return out;
  out.client = cl[0];
  out.foundAny = true;
  if (hasTable('cases') && hasColumn('cases', 'clientId')) {
    const cols = ['id', 'caseNumber', 'serviceType', 'status', 'assignedTo', 'aktaNumber', 'clientId', 'createdAt', 'estimatedAt', 'landAddress', 'notes']
      .filter((c) => hasColumn('cases', c));
    out.cases = runRead(`SELECT ${cols.map((c) => `"${c}"`).join(',')} FROM "cases" WHERE "clientId" = ? ORDER BY "createdAt" DESC`, [clientId]);
  }
  if (hasTable('documents') && hasColumn('documents', 'isTrashed')) {
    out.documents = documentsForClientGraph(out.client).filter((d) => d);
  }
  if (hasTable('cases') && hasColumn('cases', 'appointmentDate')) {
    const jn = hasTable('clients') && hasColumn('clients', 'name')
      ? 'LEFT JOIN "clients" cl ON cl.id = c.clientId ' : '';
    try {
      out.agenda = runRead(
        `SELECT c.caseNumber AS caseNumber, c.status AS status, c.serviceType AS serviceType, c.appointmentDate AS appointmentDate, c.appointmentTime AS appointmentTime, cl.name AS clientName FROM "cases" c ${jn}WHERE c.clientId = ? AND c.appointmentDate IS NOT NULL AND c.appointmentDate != '' ORDER BY c.appointmentDate ASC, c.appointmentTime ASC`,
        [clientId]
      );
    } catch { out.agenda = []; }
  }
  return out;
}

function documentsForClientGraph(client) {
  if (!hasTable('documents') || !hasColumn('documents', 'isTrashed')) return [];
  const rows = runRead(`SELECT "id", "title", "author", "category", "status", "dateTs" FROM "documents" WHERE isTrashed = 0`);
  const name = String(client.name || '');
  const matched = [];
  for (const d of rows) {
    // Moreno-tolerant: author contains name OR name contains author tokens.
    if (d.author && (fuzz(name, d.author) || fuzz(d.author, name))) matched.push(d);
  }
  return matched;
}

// ----------------------------------------------------------------------
// CASES of a client with doc-availability (title/description contains the
// case number) — used by the F-format recheck and case lists.
// ----------------------------------------------------------------------
export function caseListWithDoc(caseRows) {
  if (!caseRows || !caseRows.length) return { rows: [], docByCase: {} };
  const docs = hasTable('documents') && hasColumn('documents', 'isTrashed')
    ? runRead(`SELECT "title", "description" FROM "documents" WHERE isTrashed = 0`)
    : [];
  const docByCase = {};
  for (const c of caseRows) {
    const cn = normForMatch(c.caseNumber);
    docByCase[c.id] = docs.some((d) => {
      const t = normForMatch(d.title + ' ' + (d.description || ''));
      return cn && (t.includes(cn));
    });
  }
  return { rows: caseRows, docByCase };
}

// ----------------------------------------------------------------------
// AGGREGATES
// ----------------------------------------------------------------------

// Clients ordered by their number of cases. op: 'gt1' | 'all' | 'top'.
export function clientsCaseCount(op = 'all', limit = 10) {
  if (!hasTable('clients') || !hasTable('cases') || !hasColumn('cases', 'clientId')) return [];
  const isAdmin = true;
  const scope = isAdmin ? '' : '';
  const having = op === 'gt1' ? 'HAVING COUNT(k.id) > 1' : '';
  const lim = op === 'top' ? 1 : limit;
  return runRead(
    `SELECT c.id AS clientId, c.name AS name, COUNT(k.id) AS total,
            SUM(CASE WHEN k.status NOT IN (${FINAL_CASE_STATUSES.map(() => '?').join(',')}) THEN 1 ELSE 0 END) AS running
     FROM "clients" c JOIN "cases" k ON k.clientId = c.id
     GROUP BY c.id, c.name ${having} ORDER BY total DESC LIMIT ?`,
    [...FINAL_CASE_STATUSES, lim]
  );
}

// ----------------------------------------------------------------------
// DOCUMENTS related to a CASE — via title/description containing the case
// number, OR matching the case's client name (author).
// ----------------------------------------------------------------------
export function documentsForCase(caseRow, clientName) {
  if (!hasTable('documents') || !hasColumn('documents', 'isTrashed')) return [];
  const rows = runRead(`SELECT "title", "description", "author", "category", "status" FROM "documents" WHERE isTrashed = 0`);
  const cn = normForMatch(caseRow && caseRow.caseNumber);
  const client = clientName ? String(clientName) : '';
  return rows.filter((d) => {
    const blob = normForMatch(String(d.title || '') + ' ' + String(d.description || ''));
    if (cn && blob.includes(cn)) return true;
    if (client && d.author && fuzz(client, d.author)) return true;
    return false;
  });
}

// ----------------------------------------------------------------------
// AGENDA
// ----------------------------------------------------------------------
export function allAgenda(role) {
  if (!hasTable('cases') || !hasColumn('cases', 'appointmentDate')) return [];
  const jn = hasTable('clients') && hasColumn('clients', 'name') ? 'LEFT JOIN "clients" cl ON cl.id = c.clientId ' : '';
  return runRead(
    `SELECT c.caseNumber AS caseNumber, c.status AS status, c.serviceType AS serviceType, c.appointmentDate AS appointmentDate, c.appointmentTime AS appointmentTime, cl.name AS clientName FROM "cases" c ${jn}WHERE c.appointmentDate IS NOT NULL AND c.appointmentDate != '' ORDER BY c.appointmentDate ASC, c.appointmentTime ASC LIMIT 30`,
    []
  );
}

export function agendaForClient(clientId) {
  if (!hasTable('cases') || !hasColumn('cases', 'appointmentDate')) return [];
  return runRead(
    `SELECT c.caseNumber AS caseNumber, c.status AS status, c.serviceType AS serviceType, c.appointmentDate AS appointmentDate, c.appointmentTime AS appointmentTime FROM "cases" c WHERE c.clientId = ? AND c.appointmentDate IS NOT NULL AND c.appointmentDate != '' ORDER BY c.appointmentDate ASC`,
    [clientId]
  );
}

// ----------------------------------------------------------------------
// INCOMPLETE / running cases
// ----------------------------------------------------------------------
export function runningCasesByClient(clientId) {
  if (!hasTable('cases') || !hasColumn('cases', 'clientId')) return [];
  return runRead(
    `SELECT "caseNumber", "serviceType", "status", "aktaNumber", "assignedTo" FROM "cases" WHERE "clientId" = ? AND "status" NOT IN (${FINAL_CASE_STATUSES.map(() => '?').join(',')}) ORDER BY "createdAt" DESC`,
    [clientId, ...FINAL_CASE_STATUSES]
  );
}

export function incompleteCases(scopedClientId = null) {
  if (!hasTable('cases') || !hasColumn('cases', 'status')) return [];
  const where = scopedClientId ? 'WHERE "clientId" = ? AND ' : 'WHERE ';
  const params = scopedClientId ? [scopedClientId, ...INCOMPLETE_STATUSES] : INCOMPLETE_STATUSES;
  return runRead(
    `SELECT "caseNumber", "serviceType", "status", "aktaNumber", "assignedTo" FROM "cases" ${where}"status" IN (${INCOMPLETE_STATUSES.map(() => '?').join(',')}) ORDER BY "createdAt" DESC LIMIT 20`,
    params
  );
}

// newest cases across the DB (used for "yang paling baru" without context)
export function newestCases(limit = 3) {
  if (!hasTable('cases') || !hasColumn('cases', 'createdAt')) return [];
  const cols = ['caseNumber', 'serviceType', 'status', 'aktaNumber', 'createdAt'].filter((c) => hasColumn('cases', c));
  return runRead(`SELECT ${cols.map((c) => `"${c}"`).join(',')} FROM "cases" ORDER BY "createdAt" DESC LIMIT ?`, [limit]);
}

// ----------------------------------------------------------------------
// TIME WINDOW stats — "bulan ini ada berapa permohonan?" count real
// createdAt rows inside a [start, end] date range (ISO YYYY-MM-DD).
// ----------------------------------------------------------------------
export function statsInPeriod(start, end) {
  const out = { cases: 0, clients: 0, docs: 0 };
  if (!start || !end) return out;
  if (hasTable('cases') && hasColumn('cases', 'createdAt')) {
    out.cases = Number(runRead(`SELECT COUNT(*) AS n FROM "cases" WHERE date("createdAt") >= ? AND date("createdAt") <= ?`, [start, end])[0]?.n || 0);
  }
  if (hasTable('clients') && hasColumn('clients', 'createdAt')) {
    out.clients = Number(runRead(`SELECT COUNT(*) AS n FROM "clients" WHERE date("createdAt") >= ? AND date("createdAt") <= ?`, [start, end])[0]?.n || 0);
  }
  if (hasTable('documents') && hasColumn('documents', 'dateTs')) {
    const sMs = new Date(String(start)).getTime(), eMs = new Date(String(end)).getTime();
    if (!Number.isNaN(sMs) && !Number.isNaN(eMs)) {
      out.docs = Number(runRead(`SELECT COUNT(*) AS n FROM "documents" WHERE isTrashed = 0 AND "dateTs" >= ? AND "dateTs" <= ?`, [sMs, eMs + 86399999])[0]?.n || 0);
    }
  }
  return out;
}

export function clientCasesInPeriod(clientId, start, end) {
  if (!hasTable('cases') || !hasColumn('cases', 'clientId') || !hasColumn('cases', 'createdAt')) return 0;
  return Number(runRead(
    `SELECT COUNT(*) AS n FROM "cases" WHERE "clientId" = ? AND date("createdAt") >= ? AND date("createdAt") <= ?`,
    [clientId, start, end]
  )[0]?.n || 0);
}

export function isAdmin(role) {
  return isAdminRole(role);
}