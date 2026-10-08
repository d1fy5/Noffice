// ----------------------------------------------------------------------
// conversation.js — per-token conversation memory + reference resolver.
//
// Unlike the single-plan planner context (aiDatabaseContext), this keeps a
// RICH semantic memory per session token so the Copilot can answer true
// follow-ups and pronouns:
//
//   ref   { kind, id, name, term }  the last REAL entity the user asked about
//   focus cases | documents | clients | employees | agenda — last topic
//   lastFilters  (status/service/category) implied by the last question
//   lastIntent   coarse intent label of the last answer
//   history      recent user messages (for debugging / disambiguation)
//
// resolveReferenceConversation() decides when a message is a FOLLOW-UP that
// refers back to `ref`, and either:
//   - returns { intent: 'recheck' }  -> the "itu doang kah?" completeness check
//   - returns { focus, rephrased }   -> a FULLY re-worded question that the
//     generic entity/planner layers can now answer directly
// It never fires when the message is a NEW, self-contained query (a count
// question like "berapa total klien?" stays untouched, so stale context can
// never hijack it).
// ----------------------------------------------------------------------

const memory = new Map();
const MAX_MEMORY = 300;

export function getConv(token) {
  return memory.get(token) || null;
}

export function saveConv(token, state) {
  memory.set(token, { ...state, updatedAt: Date.now() });
  prune();
}

export function updateConv(token, patch) {
  const cur = memory.get(token) || {};
  saveConv(token, { ...cur, ...patch });
}

export function clearConv(token) {
  memory.delete(token);
}

export function setRef(token, ref, focus, extra = {}) {
  updateConv(token, {
    ref,
    focus: focus || undefined,
    lastIntent: extra.intent || undefined,
    lastFilters: extra.filters || undefined,
    pending: undefined,
  });
}

// A pending slot = the Copilot asked a question ("siapa nama client?") and is
// waiting for a SHORT reply ("Daffa", "kasus", ...). Types: 'name' | 'choice'.
export function setPending(token, pending) {
  updateConv(token, { pending });
}

export function getPending(token) {
  const cur = getConv(token);
  return cur && cur.pending ? cur.pending : null;
}

export function clearPending(token) {
  updateConv(token, { pending: undefined });
}

// GENERIC TOPIC MEMORY — beyond the client `ref`. Remembers WHAT the previous
// turn discussed (a Noffice feature, a dataset, legal/how-to knowledge, or a
// general topic) so follow-ups like "yang tadi caranya?", "kalau yang itu
// berapa?" continue the right subject WITHOUT needing the client name.
//   topic = { kind: 'dataset'|'feature'|'legal'|'general', id, label }
export function setTopic(token, topic) {
  updateConv(token, { topic: topic || undefined });
}

export function getTopic(token) {
  const cur = getConv(token);
  return cur && cur.topic ? cur.topic : null;
}

export function clearTopic(token) {
  updateConv(token, { topic: undefined });
}

// Does this message point back at the previous TOPIC (not a client)?
// "yang tadi tuh caranya" / "itu gimana ya caranya" / "terus kalo yang itu?"
export function isTopicFollowUp(msg) {
  const m = String(msg || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!m) return false;
  const pointer = /^(yang|yg|itu|ini|tadi|kalau|kalo|terus|lalu|maksudnya|terus gimana|gimana)\b/i.test(m);
  const back = /\b(tadi|kemarin|barusan|sebelumnya|tadi itu|itu tadi|yang tadi)\b/i.test(m) || /\b(caranya|gimana caranya|bagaimana caranya)\b/i.test(m);
  const follow = /^(gimana caranya|bagaimana caranya|cara|itu tadi|yang tadi|terus caranya|lanjut)\b/i.test(m);
  return pointer && (back || follow);
}

export function pushHistory(token, message) {
  const cur = getConv(token) || {};
  const h = Array.isArray(cur.history) ? cur.history.slice(-6) : [];
  h.push(String(message || '').trim());
  if (cur.message !== h[h.length - 1]) updateConv(token, { history: h, message: h[h.length - 1] });
}

function prune() {
  if (memory.size <= MAX_MEMORY) return;
  const sorted = [...memory.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
  const toRemove = sorted.slice(0, MAX_MEMORY - 200);
  for (const [k] of toRemove) memory.delete(k);
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/[“”"]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ----------------------------------------------------------------------
// Reference resolution
// ----------------------------------------------------------------------

// Junk words we strip from the tail of a follow-up before re-phrasing.
const TAIL_JUNK = /^(apa|yang|itu|ini|kah|a|aja|saja|dia|punya|memiliki)\s*(saja|aja|semua|doang)?[?!.\s]*$/i;

function anchorFocus(ref, ctx) {
  if (ref.kind === 'case') return 'cases';
  if (ref.kind === 'document') return 'documents';
  if (ref.kind === 'employee') return 'employees';
  return ctx && ctx.focus ? ctx.focus : 'cases';
}

function buildRephrase(ref, focus, tail) {
  const name = ref.name || ref.term;
  let base = '';
  switch (focus) {
    case 'cases': base = `kasus ${name}`; break;
    case 'documents': base = `dokumen ${name}`; break;
    case 'agenda': base = `agenda ${name}`; break;
    case 'employees': base = `karyawan ${name}`; break;
    default: base = `cari data ${name}`;
  }
  const t = String(tail || '').trim();
  if (/(masih\s+)?berjalan|aktif|belum\s+selesai|belum\s+tuntas|belum\s+beres|diproses|berlangsung|masih\s+proses/i.test(t)) {
    return `${base} yang masih berjalan`;
  }
  if (/(belum\s+lengkap|kurang\s+lengkap|belum\s+kuat|belum\s+beres)/i.test(t)) {
    return `${base} yang belum lengkap`;
  }
  if (/(paling\s+(baru|terbaru)|terbaru|terakhir|latest|paling\s+akhir)/i.test(t)) {
    return `${base} terbaru`;
  }
  if (/(yang\s+tersedia|tersedia|ada\??|ready|lengkap\??)/i.test(t) && focus === 'documents') {
    return `${base} apa saja?`;
  }
  const stripped = t.replace(TAIL_JUNK, '').replace(/[?!.\s]+$/g, '').trim();
  if (!stripped || /^(apa\s*saja|ada|semua|yang|itu)$/i.test(stripped)) return `${base} apa saja`;
  return `${base} ${stripped}`;
}

// Does this message look like a self-contained NEW question (not a follow-up)?
function isNewQuestion(msg) {
  // Pure stats / list requests about the WHOLE system are never a follow-up,
  // so stale context can never hijack them.
  if (/\b(berapa|jumlah|total|rekap|dashboard|semua (klien|karyawan|kasus|dokumen))\b/i.test(msg)) return true;
  // A brand-new entity name reintroduces a subject.
  if (/\b(cari|lihat|tampilkan|kasih|infokan)\b/i.test(msg)) return true;
  return false;
}

/**
 * Try to interpret `rawMsg` as a follow-up that refers back to the last
 * entity (`ctx.ref`). Returns null when the message is self-contained.
 * Returns a resolution object otherwise:
 *   { ref, intent: 'recheck' }
 *   { ref, focus, rephrased }
 */
export function resolveReferenceConversation(rawMsg, ctx, findName) {
  if (!ctx || !ctx.ref) return null;
  const msg = norm(rawMsg);
  if (!msg) return null;
  const ref = ctx.ref;

  // recheck — "itu doang kah yang punya Hasbi?" / "ada data Hasbi yang lain?"
  // / "tidak ada data yang lain?" / "apakah itu saja?" — completeness check.
  if (
    /\b(itu\s+doang|itu\s+saja|itu\s+aja|cuma\s+itu|hanya\s+itu|itu\s+saja\?)\b/i.test(msg)
    || /\b(ada\s+(data|kasus|dokumen|berkas|client|klien|yang)?\s*(yang\s+)?(lain|lagi)|masih\s+ada\s+(yang\s+)?(lain|lagi)|ada\s+lagi|apalagi|apa\s+lagi)\b/i.test(msg)
    || /\b(tidak\s+ada|nggak\s+ada|gak\s+ada|tidak\s+punya|hanya\s+itu)\b[^?!]{0,40}\b(lain|lagi)\b/i.test(msg)
    || /\b(ada|masih\s+ada|apakah\s+ada|apakah\s+masih\s+ada)\b[^?!]{0,40}\b(yang\s+)?(lain|lagi)\b/i.test(msg)
    || /^(betul|benar|bener)\s*\??$/i.test(msg)
    || /\b(apakah\s+(cuma|hanya)|apakah\s+itu\s+saja|benarkah|betulkah)\b/i.test(msg)
    || /\b(cek\s+(lagi|dulu|ulang|kembali)|coba\s+cek|periksa\s+lagi|coba\s+periksa)\b/i.test(msg)
    || /^(lain|lainnya|yang\s+lain|ada\s+yang\s+lain|ada\s+lagi)\s*[?!.]*$/i.test(msg)
  ) {
    // The user may repeat the name ("ada data Hasbi yang lain?") — re-anchor.
    let useRef = ref;
    if (findName && typeof findName === 'function') {
      const named = findName(msg);
      if (named) useRef = named;
    }
    return { ref: useRef, intent: 'recheck' };
  }

  // Count-ish follow-ups must NOT be hijacked (["berapa kasus dia?", ...])
  if (/\b(berapa|jumlah|total)\b/i.test(msg)) return null;
  if (isNewQuestion(msg)) return null;

  const rest = (re) => msg.replace(re, '').replace(/^[\s,;:!?.\-–—]+/, '').trim();

  // Pure pronoun — "dia punya kasus apa?", "orang itu?".
  const pPron = /^(dia|beliau|mereka|itu|ini|orang\s+(itu|tersebut|tadi)|client\s+(itu|tersebut|tadi|ini)|klien\s+(itu|tersebut|tadi|ini)|karyawan\s+(itu|tersebut|tadi)|nasabah\s+(itu|tersebut|tadi))\b/i;
  const mPron = msg.match(pPron);
  if (mPron) {
    const after = rest(pPron);
    const focus = /(kasus|permohonan|berkas)/i.test(after) ? 'cases'
      : /(dokumen|berkas|file)/i.test(after) ? 'documents'
        : /(agenda|jadwal)/i.test(after) ? 'agenda'
          : anchorFocus(ref, ctx);
    return { ref, focus, rephrased: buildRephrase(ref, focus, after) };
  }

  // Head = possessive subject ("kasusnya", "dokumennya", "datanya"...).
  const pHead = /^(kasusnya|permohonannya|berkasnya|dokumennya|file-nya|datanya|profilnya|identitasnya|agendanya|jadwalnya|pekerjaannya|riwayatnya)\b/i;
  const mHead = msg.match(pHead);
  if (mHead) {
    const head = mHead[1];
    const after = msg.slice(head.length).trim();
    const focus = /^(kasusnya|permohonannya)$/i.test(head) ? 'cases'
      : /^(berkasnya|dokumennya|file-nya)$/i.test(head) ? 'documents'
        : /^(agendanya|jadwalnya)$/i.test(head) ? 'agenda'
          : anchorFocus(ref, ctx);
    return { ref, focus, rephrased: buildRephrase(ref, focus, after) };
  }

  // "Dokumen milik dia / kasus untuk orang itu ..." (object + owner pronoun)
  const pOwner = /^(dokumen|berkas|kasus|permohonan|agenda|jadwal)(\s+.*?)?\s*\b(milik|punya|untuk|dari|dengan)\s+(dia|beliau|itu|ini|orang\s+(itu|tersebut|tadi)|client\s+itu|klien\s+itu)\b/i;
  const mOwner = msg.match(pOwner);
  if (mOwner) {
    const focus = /^(dokumen|berkas)/i.test(mOwner[1]) ? 'documents'
      : /^(agenda|jadwal)/i.test(mOwner[1]) ? 'agenda'
        : 'cases';
    return { ref, focus, rephrased: buildRephrase(ref, focus, '') };
  }

  // "yang ..." clause referring back ("yang berjalan", "yang terbaru", "yang lain").
  const mYang = msg.match(/^yang\s+([\w\s\-]+?)\s*[?!.]*$/i);
  if (mYang) {
    const tail = mYang[1];
    if (/\b(berjalan|aktif|selesai|lengkap|terbaru|baru|tersedia|berlangsung|proses)\b/i.test(tail)) {
      return { ref, focus: ctx.focus || anchorFocus(ref, ctx), rephrased: buildRephrase(ref, ctx.focus || anchorFocus(ref, ctx), tail) };
    }
  }

  return null;
}