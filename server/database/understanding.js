// ----------------------------------------------------------------------
// understanding.js — meaning-based understanding for the Noffice Copilot.
//
// This layer is GENERIC by design: only Indonesian grammar/semantics and
// domain vocabulary are encoded here. There are NO hardcoded names, counts,
// or data values. It answers three questions about ANY user message:
//
//   1. Is the user just OPINING a conversation / asking for help / planning
//      to check something (with no concrete target)?  -> warm short reply.
//   2. Is the user asking about a client's data but WITHOUT naming anyone?
//                                                -> ask ONE question (name).
//   3. Is the message a bare-handed pointer ("yang tadi", "jumlahnya")
//      with NO prior context?                     -> clarify what data.
//
// Everything else (real queries) is left untouched for the entity/planner
// layers below.
// ----------------------------------------------------------------------

const FILLER_HEADS = ['lah', 'eh', 'ya', 'yah', 'oh', 'duh', 'hmm', 'hm', 'nah', 'oi', 'oke', 'ok', 'anu', 'halo', 'hai'];
const FILLER_TAILS = ['dong', 'kok', 'sih', 'deh', 'dulu', 'ya', 'yah', 'kak', 'bang', 'mbak', 'mas', 'pak', 'bu', 'bro', 'sis', 'min', 'gan'];
const ADDRESS_ONLY = ['permisi', 'bentar', 'kak', 'bang', 'mbak', 'mas', 'pak', 'bu', 'bro', 'sis', 'min', 'gan', 'eh'];

// Colloquial -> standard mapping used ONLY when inferring intent.
const INFORMAL = {
  gak: 'tidak', nggak: 'tidak', ga: 'tidak',
  udah: 'sudah', udh: 'sudah',
  gimana: 'bagaimana', gmna: 'bagaimana',
  gini: 'begini', gitu: 'begitu',
  cariin: 'cari', carikan: 'cari', cekin: 'cek', liatin: 'lihat', tunjukin: 'tampilkan',
  nanya: 'tanya', nanyain: 'tanya',
  nomer: 'nomor', nope: 'nomor hp',
  klient: 'klien',
  kalo: 'kalau', cman: 'cuma', cuma: 'cuma',
  bgt: 'sangat', banget: 'sangat',
  dpt: 'dapat', mo: 'mau',
};

// Words that point at a concrete slice of data. When one of these is present,
// the message is NOT a pure "may I ask / can you help" opener.
const DATA_DOMAIN = /\b(klien|client|customer|nasabah|kasus|permohonan|berkas|arsip|dokumen|agenda|jadwal|akta|karyawan|staf|rekap|statistik|status|nomor|no\.?|data|dashboard|halaman)\b/i;

// "saya mau nanya kok" / "eh bentar" / "permisi saya mau bertanya" — meaning-
// based openers. Returns a short warm reply or a CLARIFY for ask-to-check.
export function normalizeText(raw) {
  let s = String(raw || '').toLowerCase();
  s = s.replace(/[?!.,;:()"'“”]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  let prev;
  do {
    prev = s;
    s = s.replace(new RegExp('^(?:' + FILLER_HEADS.join('|') + ')\\b\\s*', 'i'), '');
  } while (s !== prev && s);
  s = s.replace(new RegExp('\\s*\\b(?:' + FILLER_TAILS.join('|') + ')\\s*$', 'i'), '');
  s = s.replace(/\s+/g, ' ').trim();
  const mapped = s.split(' ').map((w) => (INFORMAL[w] || w)).filter((w) => w !== '');
  return mapped.join(' ');
}

export function isAddressOnly(norm) {
  return norm.length > 0 && norm.length <= 12 && ADDRESS_ONLY.includes(norm);
}

export function hasDataDomain(norm) {
  return DATA_DOMAIN.test(norm);
}

// "mau tanya / ingin bertanya / minta bantuan / bisa bantu / tolong" —
// the message WANTS to start asking, with no concrete target.
export function detectAskIntent(norm) {
  if (hasDataDomain(norm)) return false;
  if (/\b(bingung|pusing)\b/.test(norm)) return true;
  const hasModal = /\b(mau|ingin|pengen|pingin|mo|minta|hendak|mohon)\b/.test(norm);
  const hasAskVerb = /\b(tanya|bertanya|menanyak|nanyak|nanya)\w*\b/.test(norm);
  const hasPermission = /\b(bisa|boleh|bisakah|bolehkah)\b/.test(norm);
  if ((hasModal || hasPermission) && hasAskVerb) return true;
  if (/^ada yang\b/.test(norm) && /\b(mau|ingin|saya|aku|gue)\b/.test(norm) && /\b(tany|cek|infokan|ingin)\w*\b/.test(norm)) return true;
  if (/\bbantuan\w*\b/.test(norm) && (hasModal || hasPermission)) return true;
  if (/\b(bantu|tolong|dibantu|bantuan)\w*\b/.test(norm) && (hasModal || hasPermission || /^saya\b/.test(norm))) return true;
  if (/^tolong\b/.test(norm) && /\b(bantu|tolong|dibantu|bantuan)\w*\b/.test(norm)) return true;
  return false;
}

// "bisa cariin?" / "mau cek sesuatu" / "bisa dibantu sebentar?" — wants to
// check something but names no object. Returns true when the tails is empty.
export function detectAskCheck(norm) {
  const m = norm.match(/^(bisa|boleh|bisakah|bolehkah|mau|ingin|pengen|pingin|tolong|coba)\s+(cek|cari|lihat|periksa|carikan)\s*(.*)$/i);
  if (!m) return null;
  const tail = String(m[3] || '').trim();
  if (tail && !/^(data|sesuatu|sedikit|dikit|aja|doang|bentar|sebentar)s?$/.test(tail)) return null;
  return true;
}

// "saya mau cek data salah satu client" / "mau cek client" — client-domain
// request with NO name. Excluded: list/count/stats questions.
export function detectClientAskNoName(norm) {
  if (!/\b(klien|client|customer|nasabah)\b/.test(norm)) return false;
  if (/\b(berapa|total|jumlah|daftar|list|semua|rekap|statistik|stats|terbanyak|tertinggi|paling|mana|siapa|apa|grafik)\b/.test(norm)) return false;
  return true;
}

// Vague single-domain asks ("mau tanya soal kasus", "ada yang belum selesai")
// without a name or a count → respond for that domain. A real anchor (a verb
// like cari/cek, a digit, "nomor", "untuk X") means the user already pointed
// at something concrete, so this must NOT fire.
export function detectVagueDomainAsk(norm) {
  let domain = null;
  if (/\b(kasus|permohonan)\b/.test(norm)) domain = 'kasus';
  else if (/\b(dokumen|berkas)\b/.test(norm)) domain = 'dokumen';
  else if (/\b(agenda|jadwal)\b/.test(norm)) domain = 'agenda';
  if (!domain) return null;
  if (/\b(berapa|total|jumlah|daftar|list|semua|yang|apa|siapa|mana|terbaru|aktif|berjalan|berlangsung|tadi|terakhir|nomor|no\.?|punya|milik|cari|cek|lihat|tampilkan|periksa|untuk|dari|ada|apakah|adakah|kapan)\b/.test(norm)) return null;
  if (/[0-9]/.test(norm)) return null;
  return domain;
}

// "yang tadi" / "itu statusnya sudah berubah belum?" / "jumlahnya berapa?"
// with NO prior context — a pointer that needs a subject before we can act.
export function detectDeicticNoContext(norm) {
  if (/^(yang|yg|itu|ini|dia)\s+(lo|kamu|anda|kalian|saya|aku)\b/.test(norm)) return false;
  if (/^(yang|yg|itu|ini)\s+\w+nya\b/.test(norm)) return true;
  if (/^(yang|yg)\s+(tadi|kemarin|sebelumnya|barusan|semalam|satu\s+lagi|lain|lainnya|satu)\b/.test(norm)) return true;
  if (/^(kalau|kalo|terus)\s+(yang|yg|itu|ini)\s+(tadi|kemarin|sebelumnya|satu\s+lagi|lain|lainnya)\b/.test(norm)) return true;
  if (/^(jumlahnya|totalnya|statusnya|nomornya|kasusnya|dokumennya|berkasnya|datanya|profilnya|alamatnya|kontaknya|teleponnya)\b/.test(norm)) return true;
  return false;
}