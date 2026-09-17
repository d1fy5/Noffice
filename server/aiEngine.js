import http from 'http';
import { buildDataIntent, getContext, saveContext, clearContext } from './database/aiDatabaseContext.js';
import { executeDataQuery, DbUnavailableError, SchemaMissingError, PermissionDeniedError } from './database/queryService.js';
import { TABLE_META, getDomainSummary, CASE_PAGES, CASE_CATEGORIES } from './database/schemaInspector.js';
import { buildEntityPlan, executeEntityPlan } from './database/entitySearch.js';
import { getAppAnswer } from './database/appKnowledge.js';

// Local Ollama API configuration (default port 11434)
const OLLAMA_URL = 'http://localhost:11434/api/generate';

// Helper to query local Ollama model if available
async function queryOllama(prompt, model = 'qwen2.5') {
  return new Promise((resolve) => {
    try {
      const url = new URL(OLLAMA_URL);
      const postData = JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
      });

      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
          timeout: 4000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve(json.response || '');
            } catch {
              resolve('');
            }
          });
        }
      );

      req.on('error', () => resolve(''));
      req.on('timeout', () => {
        req.destroy();
        resolve('');
      });
      req.write(postData);
      req.end();
    } catch {
      resolve('');
    }
  });
}

// Check Ollama status
export async function checkAiStatus() {
  const isOllamaActive = await queryOllama('ping').then((res) => res !== '');
  return {
    engine: 'Local Notary AI Engine',
    ollamaActive: isOllamaActive,
    fallbackActive: true,
    mode: isOllamaActive ? 'Ollama LLM (Lokal)' : 'Built-in Smart NLP Engine (100% Offline)',
  };
}

// 1. AI Data Extractor (KTP / Berkas Teks)
export async function extractDocumentData(rawText) {
  if (!rawText || !rawText.trim()) {
    return { success: false, message: 'Teks kosong' };
  }

  // Try Ollama first if running
  const prompt = `Ekstrak data berikut dari teks KTP/Dokumen ke dalam format JSON murni tanpa markdown: {"nik": "", "name": "", "birthdate": "", "address": "", "phone": "", "job": "", "npwp": ""}. Teks:\n${rawText}`;
  const ollamaResult = await queryOllama(prompt);

  if (ollamaResult) {
    try {
      const match = ollamaResult.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return { success: true, data: parsed, engine: 'Ollama LLM' };
      }
    } catch {
      // Fallthrough to built-in NLP
    }
  }

  // Built-in Smart NLP Extractor (Offline Fallback)
  const data = {
    nik: '',
    name: '',
    birthdate: '',
    address: '',
    phone: '',
    job: '',
    npwp: '',
  };

  // NIK Extractor (16 digits)
  const nikMatch = rawText.match(/\b\d{16}\b/);
  if (nikMatch) data.nik = nikMatch[0];

  // NPWP Extractor (15 digits formatted or unformatted)
  const npwpMatch = rawText.match(/\b\d{2}[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{1}[\s.-]?\d{3}[\s.-]?\d{3}\b/);
  if (npwpMatch) data.npwp = npwpMatch[0];

  // Phone Extractor (08xx or +628xx)
  const phoneMatch = rawText.match(/\b(08\d{8,11}|\+628\d{8,11})\b/);
  if (phoneMatch) data.phone = phoneMatch[0];

  // Name Extractor
  const nameLineMatch = rawText.match(/(?:Nama|Name|Atas Nama|Pihak I|Pihak II|Pemohon)\s*[:=]\s*([^\r\n,]+)/i);
  if (nameLineMatch) {
    data.name = nameLineMatch[1].trim().replace(/^[:=\s]+/, '');
  }

  // Address Extractor
  const addrMatch = rawText.match(/(?:Alamat|Address|Jl\.|Jalan|Domisili)\s*[:=]?\s*([^\n]+(?:,\s*[^\n]+)*)/i);
  if (addrMatch) {
    data.address = addrMatch[0].replace(/^(?:Alamat|Address|Domisili)\s*[:=]?\s*/i, '').trim();
  }

  // Job Extractor
  const jobMatch = rawText.match(/(?:Pekerjaan|Job|Jabatan|Profesi)\s*[:=]\s*([^\r\n,]+)/i);
  if (jobMatch) data.job = jobMatch[1].trim();

  // Birthdate & Birthplace Extractor
  const ttlMatch = rawText.match(/(?:Tempat[/\s]*Tgl[.\s]*Lahir|TTL|Tgl[.\s]*Lahir|Birthdate)\s*[:=]\s*([^\r\n]+)/i);
  if (ttlMatch) {
    data.birthdate = ttlMatch[1].trim();
  } else {
    const dateMatch = rawText.match(/\b(\d{2}[-/.]\d{2}[-/.]\d{4}|\d{4}[-/.]\d{2}[-/.]\d{2})\b/);
    if (dateMatch) data.birthdate = dateMatch[0];
  }

  return {
    success: true,
    data,
    engine: 'Built-in Smart NLP Engine (100% Offline)',
  };
}

// 2. AI Clause & Draft Generator
export async function generateLegalClause(serviceType, parameters = {}) {
  const { pihak1 = 'PIHAK PERTAMA', pihak2 = 'PIHAK KEDUA', objek = 'Objek Perjanjian', harga = '' } = parameters;

  const prompt = `Buatkan draf pasal hukum akta ${serviceType} resmi Bahasa Indonesia Notaris untuk ${pihak1} dan ${pihak2} dengan objek ${objek}.`;
  const ollamaResult = await queryOllama(prompt);

  if (ollamaResult && ollamaResult.length > 50) {
    return { success: true, clauseText: ollamaResult, engine: 'Ollama LLM' };
  }

  // Built-in Template Clauses Engine (Comprehensive Offline Templates)
  let clauseText = '';
  const stUpper = (serviceType || '').toUpperCase();

  if (stUpper === 'AJB' || stUpper.includes('JUAL') || stUpper.includes('BELI')) {
    clauseText = `PASAL 1 — JUAL BELI
Bahwa PIHAK PERTAMA (${pihak1}) dengan ini menjual dan menyerahkan secara penuh kepada PIHAK KEDUA (${pihak2}), dan PIHAK KEDUA dengan ini membeli dan menerima penyerahan dari PIHAK PERTAMA atas objek hak tanah dan/atau bangunan berupa: ${objek}${harga ? ` dengan harga yang telah disepakati sebesar ${harga}` : ''}.

PASAL 2 — JAMINAN BEBAS SENGKETA
PIHAK PERTAMA menjamin penuh kepada PIHAK KEDUA bahwa objek jual beli tersebut adalah benar milik sah PIHAK PERTAMA, bebas dari sitaan, tidak tersangkut dalam suatu sengketa hukum, serta tidak sedang dijaminkan kepada pihak lain.

PASAL 3 — PENYERAHAN & BIAYA
Penyerahan fisik objek jual beli dilakukan pada saat ditandatanganinya Akta Jual Beli ini. Segala biaya pembaliknamaan sertifikat di Kantor Pertanahan (BPN), pajak BPHTB (Pembeli), dan PPH (Penjual) ditanggung oleh para pihak sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.`;
  } else if (stUpper === 'AKT-PT' || stUpper.includes('PT') || stUpper.includes('PERSEROAN')) {
    clauseText = `PASAL 1 — NAMA & DOMISILI PERUSAHAAN
Perseroan Terbatas ini bernama PT ${objek || 'BINA SEJAHTERA'} berkedudukan dan berkantor pusat di wilayah Republik Indonesia.

PASAL 2 — MAKSUD & TUJUAN
Maksud dan tujuan Perseroan ini adalah menjalankan usaha di bidang Perdagangan Umum, Jasa Konsultasi, dan Pengadaan Barang/Jasa sesuai peraturan perundang-undangan.

PASAL 3 — MODAL & SAHAM
Modal dasar Perseroan adalah sebesar nominal yang terbagi atas saham-saham dengan nilai nominal tertera pada daftar pemegang saham. Para pendiri (${pihak1} dan ${pihak2}) telah menyetor penuh bagian saham masing-masing pada kas Perseroan.`;
  } else if (stUpper === 'HIBAH') {
    clauseText = `PASAL 1 — PERNYATAAN HIBAH
PIHAK PERTAMA (${pihak1}) dengan ini menyerahkan secara cuma-cuma dan tanpa syarat (Causa Hibah) kepada PIHAK KEDUA (${pihak2}), dan PIHAK KEDUA menyatakan menerima hibah dari PIHAK PERTAMA atas: ${objek}.

PASAL 2 — PERSETUJUAN AHLI WARIS
Pemberian hibah ini dilakukan dengan sepengetahuan dan persetujuan tertulis dari seluruh ahli waris PIHAK PERTAMA yang sah demi hukum demi menghindari perselisihan di kemudian hari.`;
  } else if (stUpper === 'WARIS' || stUpper.includes('SKW') || stUpper.includes('SILSILAH')) {
    clauseText = `PASAL 1 — KETERANGAN AHLI WARIS
Para Pihak dengan ini menerangkan bahwa Almarhum/Almarhumah merupakan pemilik sah atas barang/harta benda berupa ${objek}, dan meninggalkan ahli waris sah yang terdiri dari ${pihak1} dan ${pihak2}.

PASAL 2 — PEMBAGIAN HAK WARIS
Para ahli waris bersepakat membagi dan membaliknamakan harta peninggalan tersebut sesuai dengan ketentuan Hukum Waris yang berlaku di Indonesia secara musyawarah dan mufakat.`;
  } else if (stUpper === 'APHT' || stUpper === 'SKMHT' || stUpper.includes('TANGGUNGAN')) {
    clauseText = `PASAL 1 — PEMBEBANAN HAK TANGGUNGAN
PIHAK PERTAMA dengan ini membebankan Hak Tanggungan atas Objek berupa ${objek} guna menjamin pelunasan utang/kredit PIHAK KEDUA (${pihak2}) pada Bank/Kreditur sesuai Perjanjian Kredit.

PASAL 2 — JANJI-JANJI HAK TANGGUNGAN
PIHAK PERTAMA berjanji tidak akan menyewakan, mengubah bentuk, atau mengalihkan objek Hak Tanggungan tanpa persetujuan tertulis dari Pemegang Hak Tanggungan (Kreditur).`;
  } else if (stUpper === 'FIDUSIA') {
    clauseText = `PASAL 1 — PENYERAHAN HAK MILIK SECARA FIDUSIA
PIHAK PERTAMA menyerahkan hak milik secara Fidusia kepada PIHAK KEDUA (${pihak2}) atas objek benda bergerak berupa: ${objek}, sedangkan fisik benda tersebut tetap berada dalam penguasaan PIHAK PERTAMA sebagai peminjam pakai.`;
  } else {
    clauseText = `PASAL 1 — KESEPAKATAN PARA PIHAK
PIHAK PERTAMA (${pihak1}) dan PIHAK KEDUA (${pihak2}) sepakat untuk mengikatkan diri dalam Perjanjian Resmi Notaris atas objek: ${objek}.

PASAL 2 — HAK DAN KEWAJIBAN
Masing-masing pihak wajib melaksanakan hak dan kewajiban sesuai dengan ketentuan peraturan perundang-undangan dan Kesepakatan Bersama yang dibuat secara sah.`;
  }

  return {
    success: true,
    clauseText,
    engine: 'Built-in Local Legal Clauses Engine (Offline)',
  };
}

// 3. AI Case Auditor & Risk Assister
export async function auditCaseData(caseData, clientData) {
  const warnings = [];
  const suggestions = [];

  const serviceType = caseData.serviceType || 'AJB';
  const checklist = caseData.checklist || [];
  const uncheckedItems = checklist.filter((i) => !i.isChecked);

  if (uncheckedItems.length > 0) {
    warnings.push(`Terdapat ${uncheckedItems.length} dokumen persyaratan yang belum dicentang/dilengkapi.`);
  }

  // Notary & PPAT Rules Engine Audit
  const stUpper = serviceType.toUpperCase();

  if (stUpper === 'AJB') {
    if (clientData && clientData.job && clientData.job.toLowerCase().includes('pns')) {
      suggestions.push('Klien adalah PNS/ASN. Pastikan tidak ada benturan kepentingan terkait tanah negara.');
    }
    const hasTax = checklist.some((i) => i.itemName.toLowerCase().includes('bphtb') || i.itemName.toLowerCase().includes('pph'));
    if (!hasTax || uncheckedItems.some((i) => i.itemName.toLowerCase().includes('bphtb'))) {
      warnings.push('🔴 RISIKO PAJAK: Bukti setor BPHTB (Pembeli) & PPH (Penjual) belum diverifikasi. Validasi SSP & SSB sangat penting sebelum Akta TTD!');
    }
    suggestions.push('💡 SARAN AUDIT: Pastikan KTP Suami/Istri hadir saat TTD Akta Jual Beli untuk memenuhi syarat persetujuan harta bersama (Pasal 36 UU Perkawinan).');
  } else if (stUpper === 'WARIS') {
    warnings.push('🔴 RISIKO WARIS: Pastikan Bagan Silsilah Waris telah distempel dan ditandatangani oleh Lurah/Kepala Desa & Camat setempat.');
    suggestions.push('💡 SARAN AUDIT: Verifikasi Akta Kematian asli dari Disdukcapil sebelum menerbitkan SKW.');
  } else if (stUpper === 'AKT-PT') {
    suggestions.push('💡 SARAN AUDIT: Lakukan pengecekan pemesanan nama PT di sistem AHU Kemenkumham.');
    suggestions.push('💡 SARAN AUDIT: Verifikasi NPWP seluruh pendiri PT minimal 2 orang.');
  } else if (stUpper === 'APHT' || stUpper === 'SKMHT') {
    warnings.push('⚠️ BATAS WAKTU: Pendaftaran APHT di Kantor Pertanahan (BPN) memiliki batas waktu 7 hari kerja sejak Akta ditandatangani.');
  } else if (stUpper === 'FIDUSIA') {
    warnings.push('⚠️ BATAS WAKTU: Pendaftaran Jaminan Fidusia di Kemenkumham maksimal 30 hari sejak tanggal Akta dibuat.');
  }

  return {
    success: true,
    status: warnings.length === 0 ? 'AMAN / SAFE' : 'PERLU PERHATIAN',
    warnings,
    suggestions,
    engine: 'Built-in Smart Notary Auditor Engine (100% Offline)',
  };
}

// 4. Smart Offline NLP Intent & Knowledge Engine for Noffice Copilot
// --------------------------------------------------------------------------
// DB-AWARE COPILOT
//   - Classifies the user message as GENERAL / DATABASE_QUERY / UNKNOWN.
//   - DATABASE_QUERY intents are answered with REAL data read from the
//     local SQLite database via the safe read-only queryService.
//   - Everything stays 100% offline; Ollama is still optional for GENERAL.
// --------------------------------------------------------------------------

const AI_DEBUG = process.env.AI_DEBUG === '1' || process.env.NODE_ENV !== 'production';
function aiLog(...args) {
  if (AI_DEBUG) console.log('[AI]', ...args);
}

function cap(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString('id-ID');
}

function maskNik(nik) {
  if (!nik) return '-';
  const s = String(nik);
  if (s.length <= 4) return s;
  return '••••••••' + s.slice(-4);
}

function groupLabelOf(entity, field) {
  const map = {
    employees: { department: 'divisi', role: 'peran/jabatan', status: 'status' },
    clients: { job: 'pekerjaan' },
    documents: { category: 'kategori', dept: 'departemen', status: 'status' },
    cases: { serviceType: 'jenis layanan', status: 'status', assignedTo: 'penanggung jawab' },
  };
  return (map[entity] && map[entity][field]) || TABLE_META[entity]?.groupCols?.[field] || 'kategori';
}

function fieldLabelOf(entity, col) {
  return TABLE_META[entity]?.fieldLabels?.[col]
    || col.charAt(0).toUpperCase() + col.slice(1);
}

// Generic row renderer driven by the plan's requested fields.
function fmtRow(entity, r, fields, isAdmin) {
  const meta = TABLE_META[entity];
  const idt = (meta.identityCols || [])[0];
  const bold = r[idt] != null && r[idt] !== '' ? String(r[idt])
    : Object.values(r).find((v) => v != null && v !== '') ?? '-';
  const rest = (fields || []).filter((f) => f !== idt).map((f) => {
    if (r[f] === undefined || r[f] === null || r[f] === '') return null;
    let v = r[f];
    if (entity === 'clients' && f === 'nik' && !isAdmin) v = maskNik(v);
    return `${fieldLabelOf(entity, f)}: ${v}`;
  }).filter(Boolean);
  return `• **${bold}**${rest.length ? ` — ${rest.join(' | ')}` : ''}`;
}

function fmtCount(plan, rows) {
  const n = Number(rows[0]?.total ?? 0);
  const m = TABLE_META[plan.entity];
  const desc = plan.humanFilters && plan.humanFilters.length ? ` ${plan.humanFilters.join(' & ')}` : '';
  if (n === 0) {
    return `Tidak ada ${m.plural}${desc} di database Noffice.`;
  }
  return `${m.icon} Saat ini ada **${fmtNum(n)} ${m.plural}**${desc} di database Noffice.`;
}

function fmtGroup(plan, rows) {
  const m = TABLE_META[plan.entity];
  const gLabel = groupLabelOf(plan.entity, plan.groupBy);
  if (!rows.length) {
    const fv = (plan.filters || []).find((f) => f.column === plan.groupBy);
    const scope = fv ? ` pada ${gLabel} **"${cap(String(fv.display || fv.value))}"**` : '';
    return `Tidak ada ${m.plural}${scope} di database Noffice.`;
  }
  const lines = rows.map((r) => `• **${cap(String(r.label || 'Lainnya'))}:** ${fmtNum(r.total)}`).join('\n');
  return `Berikut rincian ${m.plural} berdasarkan ${gLabel}:\n${lines}`;
}

function fmtList(plan, rows, isAdmin) {
  const m = TABLE_META[plan.entity];
  if (!rows.length) {
    const human = plan.humanFilters && plan.humanFilters.length ? ` ${plan.humanFilters.join(' & ')}` : '';
    const isNameFilter = (plan.filters || []).some((f) => f.op === 'like' && (m.identityCols || []).includes(f.column));
    if (isNameFilter) {
      const fv = (plan.filters || []).find((f) => f.op === 'like');
      return `Tidak ada ${m.plural} yang namanya cocok dengan "${cap(String(fv.display || fv.value))}" di database Noffice. Tolong pastikan nama/nilai tersebut benar.`;
    }
    return `Tidak ada ${m.plural}${human} di database Noffice.`;
  }
  const fields = (plan.fields && plan.fields.length) ? plan.fields : (m.cols?.admin || []);
  const header = (plan.metric === 'search' && plan.keyword)
    ? `Hasil pencarian "${cap(plan.keyword)}" untuk ${m.plural}:`
    : `Berikut ${m.plural} dari database Noffice:`;
  const lines = rows.map((r) => fmtRow(plan.entity, r, fields, isAdmin)).join('\n');
  const more = rows.length >= (plan.limit || 8) && (plan.limit || 8) > 1 ? '\n\n…beberapa hasil ditampilkan.' : '';
  return `${m.icon} ${header}\n${lines}${more}`;
}

function formatDbAnswer(plan, result, role) {
  const isAdmin = role === 'admin';
  const rows = result.rows || [];

  if (plan.metric === 'recap') {
    const d = result.data || {};
    return `📊 **Rekap Operasional Kantor Notaris & PPAT (Noffice):**
• 📂 **Total Kasus/Permohonan:** ${fmtNum(d.cases)} kasus (${fmtNum(d.casesActive)} sedang dalam proses)
• 👤 **Total Klien Terdaftar:** ${fmtNum(d.clients)} klien
• 📄 **Dokumen Aktif:** ${fmtNum(d.documents)} dokumen
• 👥 **Staf Aktif:** ${fmtNum(d.employees)} karyawan

*Seluruh angka merupakan data nyata dari database lokal Noffice Anda.*`;
  }

  if (plan.metric === 'fees') {
    const d = rows[0] || {};
    return `💰 **Ringkasan Keuangan dari Kasus/Permohonan:**
• **Notary Fee (total):** Rp ${fmtNum(d.notaryFee)}
• **Biaya Pajak (total):** Rp ${fmtNum(d.taxFee)}
• **PNBP BPN (total):** Rp ${fmtNum(d.pnbpFee)}
• **Jumlah kasus:** ${fmtNum(d.total)}${plan.payment ? ` (sudah dibayar/lunas)` : ''}

*Data keuangan hanya dapat diakses oleh Admin/Notaris Utama.*`;
  }

  if (plan.metric === 'count') return fmtCount(plan, rows);
  if (plan.metric === 'group') return fmtGroup(plan, rows);

  if (plan.metric === 'issued') {
    // ISSUED_DEEDS — "akta resmi diterbitkan" scoped to the resolved (or
    // explicit) notaris/PPAT category. Worded so the entity is never ambiguous.
    const n = Number(rows[0]?.total ?? 0);
    const cats = plan.caseCategories || [];
    let label = '';
    if (cats.length === 2) label = 'Notaris & PPAT';
    else if (cats[0] === 'notary') label = 'Notaris';
    else if (cats[0] === 'ppat') label = 'PPAT';
    return fmtIssuedDeeds(n, label);
  }

  return fmtList(plan, rows, isAdmin);
}

function fmtDomain(role) {
  const list = getDomainSummary(role);
  if (!list.length) return 'Saya tidak dapat mengakses data apa pun untuk akun Anda.';
  const lines = list.map((s) => `• ${s.icon} **${s.label}** — ${s.plural}${s.relations ? ' (terhubung dengan tabel terkait)' : ''}`);
  return `🗄️ **Data yang tersedia untuk akun Anda di sistem Noffice:**
${lines.join('\n')}

Semua data diambil langsung dari database lokal (100% offline). Sebutkan apa yang ingin Anda ketahui, misalnya *"berapa jumlah karyawan?"* atau *"dokumen apa yang paling baru?"*.`;
}

// ----------------------------------------------------------------------
// GENERIC ENTITY SEARCH formatter — answers for "apakah ada Daffa?",
// "cari Daffa", "kasus Daffa apa saja?", "siapa petugas yang menangani
// kasus X?", "kasus nomor 012 punya siapa?" — from the LIVE local DB.
// ----------------------------------------------------------------------
function statusLabel(s) {
  if (!s) return '';
  return String(s).split('_').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function fmtEntityAnswer(plan, result, role) {
  const term = plan.term;
  const isAdmin = role === 'admin';
  const catNote = plan.category === 'notary' ? ' Notaris' : plan.category === 'ppat' ? ' PPAT' : '';

  // NOT FOUND — an entity question whose term exists in the question but
  // matched nothing in the DB (never "tidak paham").
  if (!result.foundAny) {
    return `🔍 **Saya tidak menemukan data bernama/bernomor "${term}" pada data Noffice yang dapat Anda akses.**\nKlien, karyawan, dokumen, dan nomor kasus/akta dicari langsung di database; pastikan nama atau nomornya sudah benar.`;
  }

  if (plan.qtype === 'exists') {
    // When the question names a specific entity ("ada client X?"), absence on
    // THAT entity is a NOT FOUND even if the term coincidentally matches
    // something elsewhere ("dokumen yang berisi kata 'test'").
    const focusSet = { clients: result.clients, employees: result.employees, documents: result.documents, cases: result.cases }[plan.focus];
    if (focusSet !== undefined && !focusSet.length) {
      const focusLabel = { clients: 'klien', employees: 'karyawan', documents: 'dokumen', cases: 'kasus' }[plan.focus];
      return `🔍 **Saya tidak menemukan ${focusLabel} bernama/bernomor "${term}" pada data Noffice yang dapat Anda akses.**\nPastikan nama/nomornya benar — data klien, karyawan, dokumen, dan kasus dicari langsung dari database.`;
    }
    const bits = [];
    if (result.clients.length) bits.push(`👤 klien **${result.clients.map((c) => c.name).join(', ')}**`);
    if (result.cases.length) bits.push(`📂 **${result.cases.length} kasus/permohonan${catNote}**`);
    if (result.employees.length) bits.push(`👥 karyawan **${result.employees.map((e) => e.name).join(', ')}**`);
    if (result.documents.length) bits.push(`📄 **${result.documents.length} dokumen**`);
    const head = result.clients.length
      ? `✅ Ya, **${result.clients[0].name}** ditemukan`
      : `✅ Ya, saya menemukan **"${term}"**`;
    return `${head} pada data Noffice:\n${bits.map((b) => `• ${b}`).join('\n')}`;
  }

  if (plan.qtype === 'count') {
    const scope = plan.category ? `kasus ${catNote.trim()}` : 'kasus';
    let out = result.cases.length
      ? `📊 Terdapat **${result.cases.length} ${scope}** yang terkait dengan **"${term}"** di database Noffice.`
      : `📊 Tidak ada ${scope} yang terkait dengan **"${term}"** di database Noffice.`;
    if (result.documents.length) out += `\nSelain itu ada ${result.documents.length} dokumen yang juga terkait.`;
    return out;
  }

  if (plan.qtype === 'status') {
    if (!result.cases.length) return `📊 Tidak ada kasus **"${term}${catNote}"** di database Noffice.`;
    const set = [...new Set(result.cases.filter((c) => c.status).map((c) => c.status))];
    if (!set.length) return `📊 Status kasus **"${term}"${catNote}** belum tercatat.`;
    return `📊 **Status kasus untuk "${term}"${catNote}:**\n${set.map((s) => `• ${statusLabel(s)}`).join('\n')}`;
  }

  if (plan.qtype === 'akta') {
    const aks = [...new Set(result.cases.map((c) => c.aktaNumber).filter(Boolean))];
    if (!aks.length) return `📜 **Belum ada nomor akta yang diterbitkan untuk kasus "${term}${catNote}".**`;
    return `📜 **Nomor akta untuk kasus "${term}"${catNote}:**\n${aks.map((a) => `• ${a}`).join('\n')}`;
  }

  if (plan.qtype === 'officer' || plan.focus === 'officer') {
    if (!result.officers.length) return `👤 Saya tidak menemukan petugas yang menangani **"${term}${catNote}"**.`;
    return `👤 **Petugas yang menangani kasus "${term}"${catNote}:** ${result.officers.join(', ')}`;
  }

  if (plan.qtype === 'documents') {
    if (!result.documents.length) return `📄 Tidak ada dokumen terkait **"${term}"**.`;
    return `📄 **Dokumen terkait "${term}":**\n${result.documents.map((d) => `• 📄 **${d.title}**${d.author ? ` (penulis: ${d.author})` : ''}${d.category ? ` — ${d.category}` : ''}`).join('\n')}`;
  }

  // default "raw" — show profiles + related cases/documents
  const lines = [];
  for (const c of result.clients) {
    const bits = [];
    if (c.nik) bits.push(`NIK ${isAdmin ? c.nik : maskNik(c.nik)}`);
    if (c.job) bits.push(`Pekerjaan: ${c.job}`);
    if (c.phone) bits.push(`Telp: ${c.phone}`);
    if (c.email) bits.push(`Email: ${c.email}`);
    if (c.address) bits.push(`Alamat: ${c.address}`);
    lines.push(`• 👤 **${c.name}**${bits.length ? ` — ${bits.join(' | ')}` : ''}`);
  }
  for (const e of result.employees) {
    const bits = [];
    if (e.department) bits.push(`Divisi: ${e.department}`);
    if (e.role) bits.push(`Peran: ${e.role}`);
    if (e.status) bits.push(statusLabel(e.status));
    lines.push(`• 👥 **${e.name}**${bits.length ? ` — ${bits.join(' | ')}` : ''}`);
  }
  if (result.cases.length) {
    lines.push('', `📂 **Kasus terkait${catNote}:**`);
    const max = Math.min(result.cases.length, 15);
    for (const c of result.cases.slice(0, max)) {
      const bit = [];
      if (c.caseNumber) bit.push(`**${c.caseNumber}**`);
      if (c.serviceType) bit.push(c.serviceType);
      if (c.status) bit.push(statusLabel(c.status));
      if (c.aktaNumber) bit.push(`akta ${c.aktaNumber}`);
      lines.push(`• ${bit.join(' — ')}`);
    }
    if (result.cases.length > max) lines.push(`…${result.cases.length - max} kasus lainnya.`);
  }
  if (result.documents.length) {
    lines.push('', '📄 **Dokumen terkait:**');
    for (const d of result.documents.slice(0, 10)) {
      lines.push(`• 📄 **${d.title}**${d.author ? ` (${d.author})` : ''}`);
    }
  }
  if (!lines.length) return `🔍 Saya tidak menemukan rincian data **"${term}"**.`;
  return `🔍 **Hasil pencarian "${term}":**\n${lines.join('\n')}`;
}

// Structured naming for the debug log (Entity / Source). Uses the resolved
// notaris/PPAT category — from the question words or the current page.
function entityDebugName(intent, page) {
  const cats = intent.caseCategories || [];
  if (intent.entity === 'cases') {
    if (cats.length === 2) return { entity: 'NOTARY_CASE + PPAT_CASE', source: 'NotaryCaseService + PPATCaseService' };
    const resolved = cats[0] || CASE_PAGES[page]?.category;
    if (resolved === 'notary') return { entity: 'NOTARY_CASE', source: 'NotaryCaseService' };
    if (resolved === 'ppat') return { entity: 'PPAT_CASE', source: 'PPATCaseService' };
    return { entity: 'CASE', source: 'CaseService' };
  }
  return { entity: String(intent.entity || '-').toUpperCase(), source: TABLE_META[intent.entity]?.label || '-' };
}

function fmtIssuedDeeds(n, label) {
  const num = fmtNum(n);
  if (n === 0) {
    return `📜 **Belum ada akta resmi yang diterbitkan${label ? ` untuk permohonan ${label}` : ''} di database Noffice.**`;
  }
  return `📜 **Saat ini terdapat ${num} akta resmi${label ? ` ${label}` : ''} yang telah diterbitkan.**`;
}

function fmtIssuedBoth(notary, ppat) {
  return `📜 **Saat ini terdapat ${fmtNum(notary)} akta resmi Notaris dan ${fmtNum(ppat)} akta resmi PPAT yang telah diterbitkan.**`;
}

function generalKnowledgeBase(rawMsg, msgLower) {
  // 1. Akta Jual Beli (AJB)
  if (msgLower.match(/\b(ajb|jual beli|tanah|bangunan|rumah)\b/i)) {
    return `📋 **Persyaratan Akta Jual Beli (AJB) PPAT:**
1. **Pihak Penjual & Pembeli:** KTP, KK, & Surat Nikah/Cerai (Suami & Istri).
2. **Sertifikat Asli Tanah:** SHM / SHGB / HP.
3. **PBB & STTS:** PBB 5 tahun terakhir beserta Bukti Lunas.
4. **Pajak-Pajak:** 
   • **PPH Penjual:** 2,5% dari Harga Jual / NOP.
   • **BPHTB Pembeli:** 5% x (Harga Jual - NOPTKP).
5. **Surat Persetujuan:** Persetujuan Suami/Istri (Pasal 36 UU Perkawinan) atau Persetujuan Ahli Waris jika sertifikat atas nama almarhum.`;
  }

  // 2. Pendirian PT (Perseroan Terbatas)
  if (msgLower.match(/\b(pt|perseroan|pendirian pt|bikin pt|buat pt)\b/i)) {
    return `🏢 **Persyaratan Pendirian PT (Notaris & AHU):**
1. **Para Pendiri:** KTP & NPWP minimal 2 orang (kecuali PT Perorangan/UMKM).
2. **Nama PT:** Minimal 3 kata Bahasa Indonesia (di-booking via AHU Kemenkumham).
3. **Modal & Saham:** Penetapan Modal Dasar, Modal Disetor (min 25%), dan komposisi kepemilikan saham.
4. **Pengurus:** Susunan Direksi (Direktur Utama/Direktur) & Dewan Komisaris.
5. **Alamat / Domisili:** Keterangan Alamat Kantor Perusahaan.`;
  }

  // 3. Pendirian CV (Commanditaire Vennootschap)
  if (msgLower.match(/\b(cv|komanditer|perseroan komanditer)\b/i)) {
    return `🏬 **Persyaratan Pendirian CV:**
1. **Pendiri:** KTP & NPWP Sekutu Aktif (Pengurus) & Sekutu Pasif (Peserta Modal). Minimal 2 orang.
2. **Nama CV:** Pengecekan & reservasi nama di Sistem SABU Kemenkumham.
3. **Maksud & Tujuan:** Bidang usaha (KBLI 2020) yang dijalankan.
4. **Modal:** Modal yang disetorkan oleh sekutu.`;
  }

  // 4. Akta Hibah
  if (msgLower.match(/\b(hibah|pemberian hibah|kasih tanah)\b/i)) {
    return `🎁 **Persyaratan Akta Hibah (PPAT):**
1. KTP & KK Pemberi Hibah dan Penerima Hibah.
2. Sertifikat Asli Hak Atas Tanah (SHM/SHGB).
3. **Persetujuan Ahli Waris:** Surat Persetujuan dari seluruh Ahli Waris Kandung Pemberi Hibah.
4. PBB 5 Tahun Terakhir & Bukti Bayar.
5. **Validasi Pajak:** Pajak BPHTB Hibah & PPH Hibah (sesuai hubungan sedarah/bebas pajak).`;
  }

  // 5. Surat Keterangan Waris (SKW) & Akta Waris
  if (msgLower.match(/\b(waris|skw|silsilah waris|turun waris|kematian)\b/i)) {
    return `📜 **Persyaratan Surat Keterangan Waris (SKW) & Pembagian Waris:**
1. **Kematian:** Akta Kematian Asli dari Disdukcapil.
2. **Silsilah Waris:** Bagan Silsilah Keluarga yang ditandatangani Ahli Waris & diketahui Lurah/Kades + Camat.
3. **Identitas:** KTP & KK seluruh Ahli Waris yang masih hidup.
4. **Buku Nikah:** Surat Nikah/Akta Perkawinan Almarhum/Almarhumah.
5. **Aset:** Sertifikat Tanah / Tabungan / Dokumen Kepemilikan Harta Peninggalan.`;
  }

  // 6. Hak Tanggungan (APHT & SKMHT)
  if (msgLower.match(/\b(hak tanggungan|apht|skmht|jaminan bank|hipotik)\b/i)) {
    return `🏦 **Persyaratan Akta Pemberian Hak Tanggungan (APHT):**
1. Sertifikat Tanah Asli yang dijaminkan.
2. Perjanjian Kredit (PK) Asli dari Bank / Lembaga Keuangan.
3. KTP & KK Debitur/Pemberi Hak Tanggungan & Suami/Istri.
4. NIK & Identitas Kuasa Bank.
5. *Batas Waktu Pendaftaran BPN:* Maksimal **7 hari kerja** sejak Akta TTD.`;
  }

  // 7. Jaminan Fidusia
  if (msgLower.match(/\b(fidusia|jaminan kendaraan|fiducial)\b/i)) {
    return `🚗 **Persyaratan Akta Jaminan Fidusia (Benda Bergerak):**
1. Identitas Pemberi & Penerima Fidusia (KTP/NPWP/Legalitas PT).
2. Perjanjian Pokok (Kredit / Utang Piutang).
3. Rincian Objek Fidusia (BPKB, No. Rangka, No. Mesin, atau Invoice Mesin).
4. *Batas Waktu Pendaftaran:* Maksimal **30 hari** sejak tanggal Akta Fidusia dibuat.`;
  }

  // 8. Legalisasi vs Waarmerking
  if (msgLower.match(/\b(legalisasi|waarmerking|legalisir|waarmerk|bedanya)\b/i)) {
    return `🔍 **Perbedaan Legalisasi vs Waarmerking:**
• **Legalisasi (Pasal 15 UU JN):** Notaris menyaksikan **secara langsung** penandatanganan surat di bawah tangan oleh para pihak. Notaris menjamin kepastian tanggal, identitas, dan tanda tangan.
• **Waarmerking:** Notaris **hanya mendaftarkan/mencatat** surat di bawah tangan ke dalam Buku Khusus (Buku Register). Notaris tidak menyaksikan penandatanganan.`;
  }

  // 9. Perhitungan Pajak BPHTB & PPH
  if (msgLower.match(/\b(hitung pajak|hitung bphtb|hitung pph|pajak jual beli|rumus pajak)\b/i)) {
    return `🧮 **Rumus Perhitungan Pajak Transaksi Tanah (AJB):**
1. **PPH Penjual (Final):** 
   \`PPH = 2,5% × Harga Transaksi / NJOP\`
2. **BPHTB Pembeli:** 
   \`BPHTB = 5% × (Harga Transaksi - NOPTKP)\`
   *(Catatan: NOPTKP bervariasi per daerah, misal Jakarta/Tangerang Rp 80jt - Rp 60jt).*
3. **PNBP BPN (Pemeriksaan / Pembalikan Nama):** 
   \`PNBP = (1‰ × Nilai Tanah) + Rp 50.000\``;
  }

  // 10. Fitur Noffice — Generate Nomor Akta
  if (msgLower.match(/\b(generate akta|nomor akta|no akta|penomoran)\b/i)) {
    return `⚡ **Fitur Penomoran Akta Otomatis di Noffice:**
1. Buka menu **Permohonan Notaris** atau **Kasus PPAT**.
2. Klik kasus yang diinginkan untuk membuka modal detail.
3. Klik tombol **"⚡ Generate Nomor Akta Otomatis"**.
4. Sistem akan otomatis menerbitkan nomor akta urut sesuai format (misal: \`No. 01/VIII/2026\`) dan memperbarui status berkas ke \`DRAFT\`.`;
  }

  // 11. Fitur Noffice — Ekstrak Data KTP
  if (msgLower.match(/\b(ekstrak|ocr|scan ktp|baca ktp|auto fill)\b/i)) {
    return `🤖 **Fitur AI Extract Data KTP (Offline):**
1. Buka menu **Klien Notaris** di sidebar.
2. Klik tombol **" AI Extract KTP"**.
3. Paste/tempel teks hasil copy dari dokumen/KTP.
4. Klik **"Ekstrak Data"**. AI Notaris akan otomatis mengisi NIK, Nama, Tanggal Lahir, Alamat, dan Pekerjaan!`;
  }

  // 12. Fitur Noffice — Trash & Restore Dokumen
  if (msgLower.match(/\b(tempat sampah|trash|restore|hapus dokumen|pulihkan)\b/i)) {
    return `🗑️ **Manajemen Tempat Sampah Dokumen:**
• **Pindahkan ke Tempat Sampah:** Klik tombol hapus (ikon tong sampah) pada dokumen. Dokumen masuk ke folder Tempat Sampah (tidak hilang permanen).
• **Pulihkan (Restore):** Buka folder Tempat Sampah di menu Dokumen, lalu klik **"Pulihkan"**.
• **Hapus Permanen / Kosongkan Trash:** Hanya dapat dilakukan oleh **Admin / Notaris Utama**.`;
  }

  // 13. Fitur Noffice — Backup Database
  if (msgLower.match(/\b(backup|cadangan|download db|database|simpan data)\b/i)) {
    return `💾 **Backup Database SQLite:**
Buka menu **Pengaturan (Settings)** -> tab **Sistem / Keamanan**, lalu klik **"Unduh Backup Database (.sqlite)"**. File cadangan lengkap akan otomatis diunduh ke komputer Anda.`;
  }

  // 14. Poin Bantuan Umum / Sapaan
  if (msgLower.match(/\b(halo|hai|pagi|siang|malam|bro|sis|siapa kamu|siapa anda|bisa apa)\b/i)) {
    return `👋 **Halo! Saya Noffice Copilot — Asisten AI Notaris & PPAT Lokal (100% Offline).**

Saya dilatih untuk membantu operasional kantor Anda tanpa perlu koneksi internet:
1. 📂 **Pencarian Data:** Ketik *"cari berkas Budi"*, *"status permohonan AJB"*, atau *"klien Siti"*.
2. 📋 **Persyaratan Hukum:** Tanya *"syarat PT"*, *"syarat AJB"*, *"syarat Hibah"*, atau *"syarat Hak Tanggungan"*.
3. 🧮 **Perhitungan Pajak:** Tanya *"rumus pajak BPHTB"*.
4. ⚙️ **Panduan Noffice:** Tanya *"cara generate nomor akta"*, *"cara backup database"*, atau *"ekstrak KTP"*.

*Apa yang bisa saya bantu sekarang?*`;
  }

  return null;
}

export async function generateCopilotResponse(userMessage, contextData = {}, sessionInfo = {}) {
  if (!userMessage || !userMessage.trim()) {
    return { reply: 'Silakan ketik pertanyaan Anda.', intent: 'UNKNOWN' };
  }

  const rawMsg = userMessage.trim();
  const msgLower = rawMsg.toLowerCase();
  const role = sessionInfo?.role || 'admin';
  const token = sessionInfo?.token || 'anon';

  // How-to / legal-knowledge questions must NOT hit the database.
  const isAskingHowTo = msgLower.match(/\b(syarat|persyaratan|cara|buat|bikin|bagaimana|gimana|alur|apa itu|maksud|rumus)\b/i);
  const isGreeting = msgLower.match(/\b(halo|hai|pagi|siang|malam|hi|hello|bro|sis|perkenalkan|terima kasih|makasih|thanks)\b/i);

  // ----------------------------------------------------------------------
  // APPLICATION PATH — explains the app itself ("apa fungsi halaman X?",
  // "apa bedanya Notary Cases vs PPAT Cases?", "halaman ini data apa?",
  // "alur status kasus"). Runs before the DB & general paths (also for
  // how-to questions) but ONLY when a page/module intent is detected.
  // ----------------------------------------------------------------------
  if (!isGreeting) {
    const appAnswer = getAppAnswer(rawMsg, contextData && contextData.page ? contextData.page : null);
    if (appAnswer) {
      aiLog(`Question: ${rawMsg}`);
      aiLog(`Intent: APPLICATION | Page: ${(contextData && contextData.page) || 'none'}`);
      aiLog(`Final response: ${appAnswer.split('\n')[0]}...`);
      return { reply: appAnswer, intent: 'APPLICATION' };
    }
  }

  // ----------------------------------------------------------------------
  // DB-AWARE PATH — answer from real local data (runs before Ollama so the
  // response is always grounded in actual database contents).
  // ----------------------------------------------------------------------
  if (!isAskingHowTo && !isGreeting) {
    const page = contextData && contextData.page ? contextData.page : null;
    const pageCtx = page ? CASE_PAGES[page] : null;
    aiLog(`Question: ${rawMsg}`);
    aiLog(`Page Context: ${pageCtx ? `${page} (${pageCtx.label})` : 'none'}`);

    // 1) GENERIC ENTITY SEARCH first — any real name / case number / akta
    //    number / document title / officer found in the LOCAL vocabulary
    //    ("cari Daffa", "apakah ada TEST AI?", "kasus 007 punya siapa?").
    const entPlan = buildEntityPlan(msgLower, { role, context: getContext(token), page });
    if (entPlan) {
      const result = executeEntityPlan(entPlan);
      aiLog(`Entity: ENTITY_SEARCH (${entPlan.focus.toUpperCase()})`);
      aiLog(`Metric: ${result.foundAny ? 'ENTITY_FOUND' : 'ENTITY_NOT_FOUND'}`);
      aiLog(`Source: GenericEntitySearchService`);
      aiLog(`Search term: "${entPlan.term}" (${entPlan.via}) | matched=${entPlan.matchedCount} | focus=${entPlan.focus} | qtype=${entPlan.qtype}`);
      saveContext(token, { metric: 'entity', entity: 'entity', term: entPlan.term, focus: entPlan.focus, qtype: entPlan.qtype });
      const reply = fmtEntityAnswer(entPlan, result, role);
      aiLog(`Final response: ${reply.split('\n')[0]}...`);
      return { reply, intent: 'DATABASE_QUERY', meta: { table: 'entity-search', count: entPlan.matchedCount } };
    }

    const intent = buildDataIntent(msgLower, { role, context: getContext(token), page });
    if (intent) {
      if (intent.metric === 'domain') {
        aiLog(`Intent: SCHEMA_DOMAIN | Relevant tables: ${getDomainSummary(role).map((d) => d.label).join(', ')}`);
        return { reply: fmtDomain(role), intent: 'DATABASE_QUERY', meta: { table: 'schema' } };
      }
      if (intent.metric === 'unsupported') {
        aiLog(`Intent: UNSUPPORTED_CONCEPT | concept "${intent.concept}"`);
        if (intent.concept === 'notifikasi') {
          return {
            reply: '🔔 **Data notifikasi belum tersedia di database Noffice.** Notifikasi disimpan di perangkat/browser masing-masing pengguna (local storage) — bukan di database pusat — sehingga jumlahnya tidak bisa saya baca dari sini.',
            intent: 'DATABASE_QUERY',
            meta: { table: null },
          };
        }
        return { reply: `Data tersebut (${intent.concept}) belum tersedia di database Noffice. Saya hanya dapat membaca data sesuai tabel yang ada di sistem Anda.`, intent: 'DATABASE_QUERY', meta: { table: null } };
      }

      const debug = entityDebugName(intent, page);
      aiLog(`Entity: ${debug.entity}`);
      aiLog(`Metric: ${intent.metric === 'issued' ? 'ISSUED_DEEDS' : String(intent.metric || '-').toUpperCase()}`);
      aiLog(`Source: ${debug.source}`);

      const tTable = intent.entity || '-';
      aiLog(`Intent/entity detection: table="${tTable}"${intent.score ? ` score=${intent.score}` : ''}${intent.follow ? ' (follow-up)' : ''}`);
      aiLog(`Query plan: entity=${tTable} metric=${intent.metric} fields=${(intent.fields || []).join(',')} filters=${JSON.stringify(intent.filters || [])} groupBy=${intent.groupBy || '-'} orderBy=${JSON.stringify(intent.orderBy || null)} limit=${intent.limit || '-'}`);
      try {
        const t0 = Date.now();
        let result;
        if (intent.metric === 'issued' && !(intent.caseCategories || []).length) {
          // "berapa akta resmi diterbitkan?" WITHOUT page context and without
          // naming notaris/PPAT — answer BOTH explicitly instead of guessing.
          aiLog('Source: NotaryCaseService + PPATCaseService (ambiguous, no page context)');
          const rNotary = executeDataQuery(buildDataIntent('berapa akta resmi diterbitkan notaris?', { role, context: null }));
          const rPpat = executeDataQuery(buildDataIntent('berapa akta resmi diterbitkan ppat?', { role, context: null }));
          const nNotary = Number(rNotary.rows[0]?.total ?? 0);
          const nPpat = Number(rPpat.rows[0]?.total ?? 0);
          aiLog(`Validated SQL: ${rNotary.loggedSql}`);
          aiLog(`Validated SQL: ${rPpat.loggedSql}`);
          aiLog(`Count: notary=${nNotary} ppat=${nPpat}`);
          clearContext(token);
          const reply = fmtIssuedBoth(nNotary, nPpat);
          aiLog(`Final response: ${reply.split('\n')[0]}...`);
          return { reply, intent: 'DATABASE_QUERY', meta: { table: 'cases', count: nNotary + nPpat } };
        }
        result = executeDataQuery(intent);
        const isNum = intent.metric === 'count' || intent.metric === 'issued';
        const count = isNum ? Number(result.rows[0]?.total ?? 0) : Array.isArray(result.rows) ? result.rows.length : undefined;
        aiLog(`Validated SQL: ${result.loggedSql}`);
        aiLog(`Rows returned: ${Array.isArray(result.rows) ? result.rows.length : 0} (${Date.now() - t0} ms)`);
        if (count !== undefined) aiLog(`Count: ${count}`);

        if (intent.metric === 'recap') clearContext(token);
        else saveContext(token, intent);

        const reply = formatDbAnswer(intent, result, role);
        aiLog(`Final response: ${reply.split('\n')[0]}...`);
        return {
          reply,
          intent: 'DATABASE_QUERY',
          meta: { table: result.table, count },
        };
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          aiLog('Permission denied:', err.message);
          return { reply: 'Maaf, Anda tidak memiliki izin untuk melihat data tersebut. Hubungi Admin/Notaris Utama.', intent: 'DATABASE_QUERY' };
        }
        if (err instanceof DbUnavailableError) {
          aiLog('DB unavailable:', err.message);
          return { reply: 'Saya tidak dapat mengakses data Noffice saat ini karena database tidak tersedia. Silakan coba lagi nanti.', intent: 'DATABASE_QUERY' };
        }
        if (err instanceof SchemaMissingError) {
          aiLog('Schema missing:', err.message);
          return { reply: 'Data tersebut belum tersedia di database Noffice. Saya hanya dapat membaca data kasus/permohonan, klien, dokumen, dan karyawan yang tersimpan di sistem.', intent: 'DATABASE_QUERY' };
        }
        aiLog('Unhandled DB error:', err.message);
        return { reply: 'Maaf, saya tidak berhasil memproses pertanyaan data Anda. Coba gunakan kata kunci lain seperti jumlah, daftar, atau cari.', intent: 'DATABASE_QUERY' };
      }
    }
  }

  // ----------------------------------------------------------------------
  // GENERAL PATH — optional local Ollama, then the offline knowledge base.
  // ----------------------------------------------------------------------
  aiLog(`Intent: GENERAL (${rawMsg})`);
  const prompt = `Anda adalah Noffice Copilot, asisten AI lokal Notaris & PPAT Indonesia yang cerdas dan ramah. Jawab singkat dan tepat pertanyaan berikut:\n${rawMsg}`;
  const ollamaResult = await queryOllama(prompt);
  if (ollamaResult && ollamaResult.trim()) {
    return { reply: ollamaResult, intent: 'GENERAL' };
  }

  const kb = generalKnowledgeBase(rawMsg, msgLower);
  if (kb) return { reply: kb, intent: 'GENERAL' };

  // ----------------------------------------------------------------------
  // UNKNOWN INTENT — ask to clarify (only reached when the question is
  // neither a data question, nor a legal/knowledge question).
  // ----------------------------------------------------------------------
  aiLog('Intent: UNKNOWN');
  return {
    reply: `🤖 **Noffice Copilot (Asisten Notaris & PPAT Offline):**

Saya belum dapat memahami pertanyaan "**${rawMsg}**". Bisa diperjelas maksudnya?

Saya bisa membantu:
• 📊 **Rekap Kantor** — ringkasan data nyata dari database lokal.
• 🗄️ **Data aplikasi** — ketik pertanyaan bebas seperti *"berapa jumlah karyawan?"*, *"siapa saja yang bekerja di Engineering?"*, *"dokumen apa yang paling baru?"*, atau *"berapa kasus yang sedang diproses?"*.
• 📋 **Persyaratan Hukum** — *"syarat AJB"*, *"syarat PT"*, *"syarat Hibah"*.
• 🧮 **Pajak** — *"hitung pajak BPHTB"*.

*Semua jawaban data diambil langsung dari database SQLite lokal Noffice Anda (100% offline).*`,
    intent: 'UNKNOWN',
  };
}