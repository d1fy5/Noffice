import { planQuestion } from './queryPlanner.js';
import { getSchemaGlossary } from './schemaInspector.js';

// ----------------------------------------------------------------------
// aiDatabaseContext — conversation memory for follow-up questions
// ("Yang Engineering?", "Siapa saja?") + schema summaries.
// The actual question watermark → plan work is delegated to the generic
// queryPlanner (schema-driven, no per-question rules).
// ----------------------------------------------------------------------

const memory = new Map();
const MAX_MEMORY = 300;

export function getContext(token) {
  return memory.get(token) || null;
}

export function saveContext(token, plan) {
  if (!plan || !plan.entity) return;
  memory.set(token, { ...plan, updatedAt: Date.now() });
  pruneMemory();
}

export function clearContext(token) {
  memory.delete(token);
}

function pruneMemory() {
  if (memory.size <= MAX_MEMORY) return;
  const sorted = [...memory.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
  const toRemove = sorted.slice(0, MAX_MEMORY - 200);
  for (const [k] of toRemove) memory.delete(k);
}

// Public classifier — same signature as before, now powered by the
// generic schema-driven planner.
export function buildDataIntent(rawMessage, opts = {}) {
  return planQuestion(rawMessage, opts);
}

export function buildSchemaSummary(role) {
  return getSchemaGlossary(role);
}