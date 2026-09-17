import db from '../db.js';
import {
  TABLE_META, hasTable, hasColumn, isAdminRole, getVisibleColumns,
  FINAL_CASE_STATUSES,
} from './schemaInspector.js';

// ----------------------------------------------------------------------
// queryService — executes QUERY PLANS from the schema-driven planner as
// safe, READ-ONLY SELECT statements against the local Noffice database.
//
// - Tables/columns come ONLY from the plan (validated against the live
//   schema); values are always bound as parameters.
// - A defensive read-only validator is applied as a second barrier.
// - Role restrictions are enforced: non-admin employees can't read
//   financial fields, are limited to their own level, NIK is masked.
// ----------------------------------------------------------------------

class QueryError extends Error {}
export class DbUnavailableError extends QueryError {}
export class SchemaMissingError extends QueryError {}
export class PermissionDeniedError extends QueryError {}
export class UnsupportedQueryError extends QueryError {}

export const VALID_CASE_STATUSES = [
  'berkas_masuk', 'draf_akta', 'ttd',
  'proses_npwp', 'pendaftaran_ahu', 'siup_nib',
  'bphtb', 'pph', 'cek_plot', 'znt',
  'sk_jadi', 'akta_jadi', 'pendaftaran_bpn',
  'diambil', 'belum_diambil', 'rejected',
  'kurang', 'lengkap', 'draft', 'selesai', 'ahu_bpn', 'salinan_selesai', 'arsip',
  'pending', 'review',
];

const DANGEROUS_TOKEN = /\b(drop|delete|truncate|alter|update|insert|replace|vacuum|attach|detach|create|reindex|grant|revoke|pragma)\b/i;

// Defensive read-only validator (defense-in-depth; our own templates are safe).
function assertReadOnly(sql) {
  const trimmed = sql.trim();
  const single = trimmed.replace(/;\s*$/, '');
  if (single.includes(';')) throw new UnsupportedQueryError('Multi-statement SQL is not allowed');
  if (!/^(select|with)\b/i.test(single)) throw new UnsupportedQueryError('Only SELECT queries allowed');
  if (DANGEROUS_TOKEN.test(single)) throw new UnsupportedQueryError('Write/DDL statements are not allowed');
  return single;
}

function assertUsable() {
  try {
    db.prepare('SELECT 1').get();
  } catch {
    throw new DbUnavailableError('database unavailable');
  }
}

function asSchemaError(err) {
  const m = String(err && err.message || '').toLowerCase();
  if (m.includes('no such table') || m.includes('no such column')) {
    return new SchemaMissingError(m);
  }
  throw err;
}

function runSql(sql, params = []) {
  return runRead(sql, params);
}

// Exported safe read-only runner — used by generic entity search too.
export function runRead(sql, params = []) {
  const safe = assertReadOnly(sql);
  try {
    return db.prepare(safe).all(...params);
  } catch (err) {
    throw asSchemaError(err);
  }
}

// ----------------------------------------------------------------------
// Plan validation — every table/column in a plan must exist in the live
// schema AND be visible to the user's role.
// ----------------------------------------------------------------------
function validateVisibleColumn(entity, column, role) {
  if (!hasColumn(entity, column)) throw new SchemaMissingError(`column "${entity}.${column}" missing`);
  const combined = new Set(getVisibleColumns(entity, role));
  const meta = TABLE_META[entity];
  (meta.financialCols || []).forEach((c) => combined.add(c)); // financial cols are gated separately
  if (!combined.has(column) && !isAdminRole(role)) {
    throw new PermissionDeniedError(`column "${entity}.${column}" restricted for role "${role}"`);
  }
}

function buildFilters(entity, filters, role, params) {
  const meta = TABLE_META[entity];
  const clauses = [];
  // documents: only non-trashed rows by default
  if (meta.onlyActive && hasColumn(entity, 'isTrashed')) clauses.push('isTrashed = 0');
  // employees: staff can only see their own level
  if (entity === 'employees' && !isAdminRole(role) && meta.employeeOnlyRows) {
    clauses.push("role = 'employee'");
  }
  for (const f of (filters || [])) {
    if (!f || !f.column) continue;
    const q = `"${f.column}"`;
    if (f.op === 'caseUnion') {
      // combined "notaris & PPAT": union of both service lists, with the
      // overlapping 'WARIS' counted once (under notary) to match the UI pages.
      const notary = Array.isArray(f.value?.notary) ? f.value.notary : [];
      const ppat = Array.isArray(f.value?.ppat) ? f.value.ppat : [];
      if (!notary.length && !ppat.length) continue;
      clauses.push(`(${q} IN (${notary.map(() => '?').join(',')}) OR (${q} IN (${ppat.map(() => '?').join(',')}) AND ${q} NOT IN (${notary.map(() => '?').join(',')})))`);
      notary.forEach((v) => params.push(v));
      ppat.forEach((v) => params.push(v));
      notary.forEach((v) => params.push(v));
      continue;
    }
    if (f.op === 'relatedCase') {
      // clients who have at least one case in the given serviceTypes
      const vals = Array.isArray(f.value) ? f.value : [f.value];
      if (!vals.length) continue;
      clauses.push(`${q} IN (SELECT clientId FROM "cases" WHERE serviceType IN (${vals.map(() => '?').join(',')}))`);
      vals.forEach((v) => params.push(v));
      continue;
    }
    // financial columns are admin-only
    if ((meta.financialCols || []).includes(f.column) && !isAdminRole(role)) {
      throw new PermissionDeniedError('only admin may read financial data');
    }
    validateVisibleColumn(entity, f.column, role);
    if (f.op === 'neq') { clauses.push(`${q} != ?`); params.push(f.value); }
    else if (f.op === 'like') { clauses.push(`${q} LIKE ?`); params.push(`%${f.value}%`); }
    else if (f.op === 'nin') {
      const vals = Array.isArray(f.value) ? f.value : [f.value];
      if (!vals.length) continue;
      clauses.push(`${q} NOT IN (${vals.map(() => '?').join(',')})`);
      vals.forEach((v) => params.push(v));
    }
    else if (f.op === 'in') {
      const vals = Array.isArray(f.value) ? f.value : [f.value];
      if (!vals.length) continue;
      clauses.push(`${q} IN (${vals.map(() => '?').join(',')})`);
      vals.forEach((v) => params.push(v));
    } else {
      clauses.push(`${q} = ?`);
      params.push(f.value);
    }
  }
  return clauses;
}

// Optional safe JOIN — only pre-declared relation edges are allowed.
function buildJoin(entity, relation) {
  if (!relation) return { join: '', fields: [] };
  const meta = TABLE_META[entity];
  const edge = (meta.relations || []).find(
    (r) => r.via === relation.via && r.to === relation.to
  );
  if (!edge) throw new UnsupportedQueryError('unknown relation');
  if (!hasColumn(entity, edge.via) || !hasColumn(edge.to, edge.id)) {
    throw new SchemaMissingError(`relation "${entity}.${edge.via}" -> ${edge.to}.${edge.id} missing`);
  }
  const ofCols = Array.isArray(relation.of) ? relation.of : [relation.of || edge.of];
  const sel = ofCols.map((c) => `${edge.to}."${c}" AS "${edge.to}__${c}"`);
  return { join: `LEFT JOIN "${edge.to}" ON "${edge.to}"."${edge.id}" = "${entity}"."${edge.via}"`, fields: sel };
}

// ----------------------------------------------------------------------
// Generic plan executor
// ----------------------------------------------------------------------
export function executePlannedQuery(plan, role) {
  assertUsable();
  if (!plan || !plan.entity) throw new UnsupportedQueryError('invalid query plan');
  if (!TABLE_META[plan.entity]) throw new UnsupportedQueryError('unknown entity');
  if (!hasTable(plan.entity)) throw new SchemaMissingError(`table "${plan.entity}" missing`);

  const meta = TABLE_META[plan.entity];
  const isAdmin = isAdminRole(role);
  const params = [];
  const whereClauses = buildFilters(plan.entity, plan.filters, role, params);
  const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const join = plan.relation ? buildJoin(plan.entity, plan.relation) : { join: '', fields: [] };

  let sql;
  if (plan.aggregate && plan.aggregate.type === 'sum') {
    const col = plan.aggregate.column;
    validateVisibleColumn(plan.entity, col, role);
    if ((meta.financialCols || []).includes(col) && !isAdmin) throw new PermissionDeniedError('only admin may read financial data');
    sql = `SELECT COALESCE(SUM("${col}"),0) AS total, COUNT(*) AS cnt FROM "${plan.entity}" ${join.join} ${where}`;
  } else if (plan.groupBy) {
    let gcol = plan.groupBy;
    validateVisibleColumn(plan.entity, gcol, role);
    sql = `SELECT "${gcol}" AS label, COUNT(*) AS total FROM "${plan.entity}" ${join.join} ${where} GROUP BY "${gcol}" ORDER BY total DESC LIMIT 50`;
  } else if (plan.metric === 'count' || plan.metric === 'issued') {
    sql = `SELECT COUNT(*) AS total FROM "${plan.entity}" ${join.join} ${where}`;
  } else {
    // list / search / recent — with optional keyword LIKE
    const roleCols = getVisibleColumns(plan.entity, role);
    const wanted = plan.fields && plan.fields.length
      ? plan.fields.filter((c) => hasColumn(plan.entity, c) && (roleCols.includes(c) || isAdmin))
      : roleCols;
    if (!wanted.length) throw new UnsupportedQueryError('no visible columns');
    const cols = wanted.map((c) => `"${c}"`).concat(join.fields);
    sql = `SELECT ${cols.join(', ')} FROM "${plan.entity}" ${join.join} ${where}`;
    if (plan.keyword) {
      const searchCols = (meta.searchCols || [])
        .filter((c) => hasColumn(plan.entity, c) && (roleCols.includes(c) || isAdmin))
        .slice(0, 4);
      const like = searchCols.map((c) => `"${c}" LIKE ?`).join(' OR ');
      sql += (where ? ' AND' : ' WHERE') + ' (' + like + ')';
      searchCols.forEach(() => params.push(`%${plan.keyword}%`));
    }
    const ob = plan.orderBy;
    if (ob && hasColumn(plan.entity, ob.column)) {
      const dir = String(ob.dir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      sql += ` ORDER BY "${ob.column}" ${dir}`;
    }
    const limit = Math.min(Number(plan.limit) || 8, 20);
    sql += ` LIMIT ?`;
    params.push(limit);
  }

  const rows = runSql(sql, params);
  return { rows, table: plan.entity, loggedSql: sql + ` | params: ${JSON.stringify(params)}` };
}

// ----------------------------------------------------------------------
// Legacy curated queries (recap + financial summary)
// ----------------------------------------------------------------------
function feesQuery(spec) {
  if (spec.role && !isAdminRole(spec.role)) throw new PermissionDeniedError('only admin may read financial data');
  assertUsable();
  for (const c of ['notaryFee', 'taxFee', 'pnbpFee']) {
    if (!hasColumn('cases', c)) throw new SchemaMissingError(`column cases.${c} missing`);
  }
  const paid = spec.payment === 'paid' ? "WHERE paymentStatus = 'paid'" : '';
  const sql = `SELECT COALESCE(SUM(notaryFee),0) AS notaryFee, COALESCE(SUM(taxFee),0) AS taxFee, COALESCE(SUM(pnbpFee),0) AS pnbpFee, COUNT(*) AS total FROM cases ${paid}`;
  const rows = runSql(sql, []);
  return { rows, table: 'cases', loggedSql: sql + ` | params: []` };
}

function recapQuery(role) {
  assertUsable();
  const isAdmin = isAdminRole(role);
  const need = [];
  const out = {};
  const one = (sql, key, params = []) => {
    try { out[key] = runSql(sql, params)[0].total; }
    catch { need.push(key); }
  };
  if (hasTable('cases')) {
    one('SELECT COUNT(*) AS total FROM cases', 'cases');
    one(
      `SELECT COUNT(*) AS total FROM cases WHERE status NOT IN (${FINAL_CASE_STATUSES.map(() => '?').join(',')})`,
      'casesActive',
      FINAL_CASE_STATUSES
    );
  }
  if (hasTable('clients')) one('SELECT COUNT(*) AS total FROM clients', 'clients');
  if (hasTable('documents') && hasColumn('documents', 'isTrashed')) {
    one('SELECT COUNT(*) AS total FROM documents WHERE isTrashed = 0', 'documents');
  }
  if (hasTable('employees')) {
    const scope = isAdmin ? '' : " AND role = 'employee'";
    if (hasColumn('employees', 'status')) {
      one(`SELECT COUNT(*) AS total FROM employees WHERE status = 'active'${scope}`, 'employees');
    }
  }
  return {
    rows: [],
    data: out,
    table: 'summary',
    loggedSql: 'SELECT COUNT(*) FROM cases / cases(running) / clients / documents(active) / employees(active)',
  };
}

export function executeDataQuery(spec) {
  if (!spec || !spec.entity) throw new UnsupportedQueryError('invalid data intent');

  if (spec.metric === 'recap') return recapQuery(spec.role);
  if (spec.metric === 'fees') return feesQuery(spec);

  return executePlannedQuery(spec, spec.role || 'admin');
}