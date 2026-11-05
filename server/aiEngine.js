import { execFileSync } from 'child_process';
import http from 'http';
import path from 'path';
import { createWorker } from 'tesseract.js';
import { buildDataIntent, getContext, saveContext, clearContext } from './database/aiDatabaseContext.js';
import { executeDataQuery, runRead, DbUnavailableError, SchemaMissingError, PermissionDeniedError } from './database/queryService.js';
import { TABLE_META, getDomainSummary, getVisibleColumns, CASE_PAGES, CASE_CATEGORIES, FINAL_CASE_STATUSES, SERVICE_LABELS } from './database/schemaInspector.js';
import { buildEntityPlan, executeEntityPlan } from './database/entitySearch.js';
import { getAppAnswer, getSemanticHelp, getTroubleshootAnswer, getCrudHelp } from './database/appKnowledge.js';
import { getNotaryLegalAnswer, NOTARY_TOPICS } from './database/notaryKnowledge.js';
import {
  getConv, saveConv, updateConv, clearConv, setRef, pushHistory, resolveReferenceConversation,
  setPending, getPending, clearPending, setTopic, getTopic, isTopicFollowUp,
} from './database/conversation.js';
import {
  normalizeText, isAddressOnly, hasDataDomain, detectAskIntent, detectAskCheck,
  detectClientAskNoName, detectVagueDomainAsk, detectDeicticNoContext,
} from './database/understanding.js';
import { route as semanticRoute, ROUTE_LABELS as SEM_LABELS, concept as semConcept, meaning as semMeaning } from './database/semantics.js';
import {
  serviceLabel, statusLabel as relStatusLabel, STATUS_ACRONYMS, clientGraph, findEntityName,
  findClientsByName, documentsForCase, clientsCaseCount, incompleteCases,
  agendaForClient, allAgenda, newestCases, statsInPeriod, clientCasesInPeriod,
} from './database/relationshipQuery.js';

// Local Ollama API configuration (default port 11434)
const OLLAMA_URL = 'http://localhost:11434/api/generate';

// Helper to query local Ollama model if available
async function queryOllama(prompt, model = 'qwen2.5', systemPrompt = '') {
  return new Promise((resolve) => {
    try {
      const url = new URL(OLLAMA_URL);
      const postPayload = {
        model: model,
        prompt: prompt,
        stream: false,
      };
      if (systemPrompt) postPayload.system = systemPrompt;
      const postData = JSON.stringify(postPayload);

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
          timeout: 10000,
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
    engine: 'Noffice Smart Legal AI Engine',
    ollamaActive: isOllamaActive,
    fallbackActive: true,
    mode: isOllamaActive ? 'Ollama LLM (Lokal)' : 'AI Notaris & PPAT (100% Offline Cerdas)',
  };
}

// 1. AI Data Extractor (KTP / Berkas Teks) — Versi Presisi Tinggi
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
        if (parsed.birthdate) {
          const dMatch = parsed.birthdate.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
          if (dMatch) {
            parsed.birthdate = `${dMatch[3]}-${String(dMatch[2]).padStart(2, '0')}-${String(dMatch[1]).padStart(2, '0')}`;
          }
        }
        return { success: true, data: parsed, engine: 'Ollama LLM' };
      }
    } catch {
      // Fallthrough to built-in NLP
    }
  }

  // ============================================================
  // Built-in Smart NLP Extractor — Presisi Tinggi untuk KTP RI
  // ============================================================
  const data = { nik: '', name: '', birthdate: '', address: '', phone: '', job: '', npwp: '' };

  // Normalisasi: hapus karakter sampah OCR, pisahkan baris
  const cleanText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Perbaiki OCR artefak umum pada KTP: titik dua kadang jadi '.' atau '|'
    .replace(/(?<=(?:NIK|Nama|Alamat|Lahir|Pekerjaan|Kelamin|Agama|Darah|Status|Kecamatan|Kelurahan|Desa|Kewarganegaraan|Berlaku))\s*[.|;,]\s*/gi, ': ');

  const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // ---- 1. NIK Extractor ----
  // Prioritas 1: 16 digit berurutan di baris yang mengandung NIK (termasuk jika huruf N tertutup jempol: "IK :")
  for (const l of lines) {
    if (/(?:NIK|N1K|N!K|\bIK\b|Nomor\s*Induk)/i.test(l)) {
      // WAJIB hapus prefix label DULUAN sebelum konversi huruf jadi angka (mencegah "IK" jadi "1K" lalu jadi digit 1)
      const withoutLabel = l.replace(/^(?:.*?)(?:NIK|N1K|N!K|\bIK\b|Nomor\s*Induk\s*Kependudukan)[\s:=.\-—–]*/i, '');
      const digits = withoutLabel
        .replace(/[OoDd]/g, '0').replace(/[Ili|!]/g, '1').replace(/[Zz]/g, '2')
        .replace(/[Ss]/g, '5').replace(/[Bb]/g, '8').replace(/[gq]/g, '9')
        .replace(/[^\d]/g, '');
      if (digits.length >= 16) { data.nik = digits.slice(0, 16); break; }
    }
  }

  if (!data.nik) {
    // Prioritas 2: Pola 16 digit berurutan di mana saja
    for (const l of lines) {
      const digitsOnly = l.replace(/[^\d]/g, '');
      if (digitsOnly.length === 16 && /^[1-9]/.test(digitsOnly)) {
        data.nik = digitsOnly;
        break;
      }
    }
  }

  if (!data.nik) {
    // Toleransi spasi: "3171 0123 0485 0001"
    const mSpace = rawText.match(/\b(\d{4}[\s.-]\d{4}[\s.-]\d{4}[\s.-]\d{4})\b/);
    if (mSpace) {
      const clean = mSpace[1].replace(/[\s.-]/g, '');
      if (clean.length === 16) data.nik = clean;
    }
  }

  if (!data.nik) {
    // Prioritas 3: Baris yang hampir seluruhnya digit (OCR misread NIK)
    for (const l of lines) {
      if (/^[0-9OIlZSBDgqo\s.,-]{14,22}$/.test(l)) {
        const norm = l
          .replace(/[Oo]/g, '0').replace(/[Ili|!]/g, '1').replace(/[Zz]/g, '2')
          .replace(/[Ss]/g, '5').replace(/[Bb]/g, '8').replace(/[gq]/g, '9')
          .replace(/[^\d]/g, '');
        if (norm.length === 16) { data.nik = norm; break; }
      }
    }
  }

  // ---- 2. NPWP ----
  const npwpMatch = rawText.match(/\b\d{2}[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{1}[\s.-]?\d{3}[\s.-]?\d{3}\b/);
  if (npwpMatch) data.npwp = npwpMatch[0];

  // ---- 3. Phone ----
  const phoneMatch = rawText.match(/\b(0\d{9,13}|\+62\d{9,13})\b/);
  if (phoneMatch) data.phone = phoneMatch[0];

  // ---- 4. Nama ----
  // Kata-kata yang BUKAN nama — per kata (single word) check
  const NON_NAME_SINGLE = new Set([
    'REPUBLIK','INDONESIA','PROVINSI','KABUPATEN','KOTA','KARTU','TANDA','PENDUDUK',
    'GOLONGAN','DARAH','WARGA','NEGARA','SEUMUR','HIDUP','KAWIN','BELUM','CERAI',
    'ISLAM','KRISTEN','KATOLIK','HINDU','BUDHA','BUDDHA','KONGHUCU',
    'LAKI','PEREMPUAN','WNI','WNA',
    'PETANI','PELAJAR','MAHASISWA','WIRASWASTA','KARYAWAN','PEGAWAI','BURUH',
    'MENGURUS','RUMAH','TANGGA','PENSIUNAN','TNI','POLRI',
    'DOKTER','GURU','DOSEN','BIDAN','PERAWAT','SWASTA','NELAYAN',
    'BERLAKU','NOMOR','INDUK','KEPENDUDUKAN','JENIS','KELAMIN',
    'AGAMA','STATUS','PERKAWINAN','PEKERJAAN','KEWARGANEGARAAN',
    'ALAMAT','KELURAHAN','DESA','KECAMATAN','RT','RW','JALAN',
    'TEMPAT','LAHIR','BARAT','TIMUR','UTARA','SELATAN','TENGAH',
    'TANDA','PENDUDUK','PEMILU','ELEKTRONIK','NASIONAL','BARU',
    'DAERAH','KHUSUS','IBUKOTA','ISTIMEWA',
    'JAWA','SUMATERA','SUMATRA','KALIMANTAN','SULAWESI','PAPUA','BALI','NUSA','TENGGARA','MALUKU','ACEH','BANTEN','BENGKULU','GORONTALO','JAMBI','LAMPUNG','RIAU','YOGYAKARTA',
    'BANYUMAS','BANDUNG','SURABAYA','SEMARANG','MEDAN','MAKASSAR','PALEMBANG','BEKASI','TANGERANG','DEPOK','BOGOR','JAKARTA','MALANG','SOLO','SURAKARTA','PURWOKERTO','CIREBON','SERANG','DENPASAR','YOGYA','SLEMAN','BANTUL','KULONPROGO','GUNUNGKIDUL','KLATEN','SUKOHARJO','WONOGIRI','BOYOLALI','SRAGEN','KARANGANYAR','GROBOGAN','BLORA','REMBANG','PATI','KUDUS','JEPARA','DEMAK','KENDAL','BATANG','PEKALONGAN','PEMALANG','TEGAL','BREBES','CILACAP','PURBALINGGA','BANJARNEGARA','KEBUMEN','PURWOREJO','WONOSOBO','MAGELANG','TEMANGGUNG'
  ]);

  // Apakah sebuah string mengandung kata non-nama?
  function hasNonNameWord(s) {
    return s.trim().toUpperCase().split(/\s+/).some(w => NON_NAME_SINGLE.has(w));
  }

  // Fungsi clean nama — hapus prefix label, em-dash, dan noise
  function cleanNameCandidate(s) {
    // Hapus prefix label Nama (dengan pemisah bebas termasuk em-dash, tilde, colon)
    s = s.replace(/^(?:Nama|Narna|Narria|Marna|Hama|N\s*ama|NAMA)(?:\s*\/\s*Name)?\s*[:=.\-|;!—–_~ ]*\s*/i, '');
    s = s.replace(/^\/\s*Name\s*[:=.\-|;!—–_~ ]*\s*/i, '');
    // Hapus suffix field lain
    s = s.replace(/\s*(?:Tempat|TTL|Tgl|Lahir|Jenis|Kelamin|Gol|Agama|Status|Berlaku|Alamat|NIK|RT|RW).*$/i, '');
    // Hapus digit dan simbol bukan nama
    s = s.replace(/[0-9#@$%^&*()_+=\[\]{};:"<>?,\/\\]/g, '');
    // Hapus leading/trailing punctuation & em-dash
    s = s.replace(/^[\s.,!|:;=\-—–_~]+|[\s.,!|:;=\-—–_~]+$/g, '').trim();
    // Strip 1-2 letter OCR noise prefix seperti ": Sa MUHAMMAD" -> "MUHAMMAD"
    s = s.replace(/^[A-Za-z]{1,2}\s+(?=[A-Z]{3,})/i, '').trim();
    return s;
  }

  let nameFound = '';

  // Metode 1: Cari label "Nama" eksplisit — WAJIB ada separator setelah label
  // Ini mencegah false match pada baris seper"HAMA TEN BANYUMAS" yang tidak punya separator
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // Label harus diikuti separator (: = . - | ; !) agar tidak salah deteksi
    if (/^(?:Nama|Narna|Narria|Marna|Hama|N\s*ama)(?:\s*\/\s*Name)?\s*[:=.\-|;!—–_~ ]/i.test(l)) {
      let cand = cleanNameCandidate(l);
      if (!cand && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (!/^(?:Tempat|TTL|Tgl|NIK|Provinsi|Kabupaten|Kota|Agama|Jenis|Gol|Alamat|RT|Status)/i.test(nextLine)) {
          cand = cleanNameCandidate(nextLine);
        }
      }
      if (cand && cand.length >= 3 && /[A-Za-z]/.test(cand)) {
        // Validasi: tidak boleh mengandung kata non-nama
        if (!hasNonNameWord(cand)) {
          nameFound = cand.trim();
          break;
        }
        // Jika mengandung kata non-nama, coba trim hingga kata non-nama pertama
        const words = cand.trim().split(/\s+/);
        const cleanWords = [];
        for (const w of words) {
          if (NON_NAME_SINGLE.has(w.toUpperCase())) break;
          cleanWords.push(w);
        }
        if (cleanWords.length >= 1 && cleanWords.join(' ').length >= 3) {
          nameFound = cleanWords.join(' ');
          break;
        }
      }
    }
  }

  // Metode 2: Baris tepat di bawah NIK (layout standar KTP RI: NIK → NAMA)
  if (!nameFound && data.nik) {
    const nikLineIdx = lines.findIndex(l => l.replace(/[\s.,-]/g, '').includes(data.nik));
    if (nikLineIdx !== -1) {
      // Kumpulkan kata dari header KTP (baris sebelum NIK) untuk filter
      // Mencegah nama kota header (mis. "BANYUMAS") terpilih sebagai nama orang
      const headerWords = new Set();
      for (let hi = 0; hi < nikLineIdx; hi++) {
        lines[hi].trim().toUpperCase().split(/\s+/).forEach(w => {
          if (w.length >= 4) headerWords.add(w);
        });
      }
      for (let off = 1; off <= 3 && nikLineIdx + off < lines.length; off++) {
        let cand = cleanNameCandidate(lines[nikLineIdx + off]);
        if (!cand || cand.length < 3) continue;
        if (/^(?:Tempat|TTL|Tgl|Alamat|Agama|Jenis|Gol|Provinsi|Kota|Kabupaten|RT|Status)/i.test(cand)) break;
        if (/[A-Za-z]{2}/.test(cand) && !hasNonNameWord(cand)) {
          // Skip jika ADA SATU PUN kata dari header KTP (nama kota/kabupaten) di baris ini
          // Ini mencegah "HAMA TEN BANYUMAS" terpilih karena "BANYUMAS" ada di header
          const candWords = cand.trim().toUpperCase().split(/\s+/);
          const headerOverlap = candWords.filter(w => headerWords.has(w)).length;
          if (headerOverlap >= 1) continue; // ada kata dari header → bukan nama orang
          nameFound = cand.trim();
          break;
        }
      }
    }
  }

  // Metode 3: Fallback — baris ALL CAPS 2+ kata yang semuanya bukan kata kunci
  // PENTING: Skip 2 baris teratas (area header Provinsi / Kabupaten KTP)
  if (!nameFound) {
    const startIndex = Math.min(2, lines.length);
    for (let i = startIndex; i < lines.length; i++) {
      const l = lines[i];
      if (!/^[A-Z][A-Z\s.,'\-]{3,49}$/.test(l)) continue;
      const words = l.trim().split(/\s+/);
      if (words.length < 2) continue;
      // Semua kata harus bukan kata kunci — tidak ada satu pun yang lolos
      if (words.some(w => NON_NAME_SINGLE.has(w.toUpperCase()))) continue;
      // Tambahan: minimal ada 1 kata >= 3 huruf (filter noise seperti "A B C D")
      if (!words.some(w => w.length >= 3)) continue;
      nameFound = l.trim();
      break;
    }
  }

  if (nameFound) {
    if (nameFound.length > 60) nameFound = nameFound.slice(0, 60).trim();
    data.name = nameFound;
  }

  // ---- 5. Tanggal Lahir ----
  const monthMap = {
    januari: '01', jan: '01', february: '02',
    februari: '02', pebruari: '02', feb: '02',
    maret: '03', march: '03', mar: '03',
    april: '04', apr: '04',
    mei: '05', may: '05',
    juni: '06', june: '06', jun: '06',
    juli: '07', july: '07', jul: '07',
    agustus: '08', august: '08', agu: '08', ags: '08', aug: '08',
    september: '09', sep: '09', sept: '09',
    oktober: '10', october: '10', okt: '10', oct: '10',
    november: '11', nopember: '11', nov: '11',
    desember: '12', december: '12', dec: '12', des: '12'
  };

  let dateFound = '';
  // Cari di baris yang mengandung Tempat/TTL atau digit tanggal
  for (const l of lines) {
    // Bersihkan substitusi OCR umum pada digit tahun
    const cl = l
      .replace(/[Oo]/g, '0').replace(/[Ss]/g, '5').replace(/[Bb]/g, '8')
      .replace(/[Il]/g, '1').replace(/[Zz]/g, '2');

    // Format: DD-MM-YYYY atau DD/MM/YYYY atau DD MM YYYY
    const m1 = cl.match(/\b(\d{1,2})[-\/. ](\d{1,2})[-\/. ]((?:19|20)\d{2})\b/);
    if (m1) {
      const d = String(m1[1]).padStart(2, '0');
      const mo = String(m1[2]).padStart(2, '0');
      const y = m1[3];
      if (+mo >= 1 && +mo <= 12 && +d >= 1 && +d <= 31) {
        dateFound = `${y}-${mo}-${d}`; break;
      }
    }

    // Format: DD MonthName YYYY (e.g. "01 Januari 1990")
    const m2 = l.match(/(\d{1,2})[\s\-]+(\w{3,12})[\s\-]+((?:19|20)\d{2})/);
    if (m2) {
      const d = String(m2[1]).padStart(2, '0');
      const mStr = m2[2].toLowerCase();
      const y = m2[3];
      if (monthMap[mStr]) { dateFound = `${y}-${monthMap[mStr]}-${d}`; break; }
    }
  }
  data.birthdate = dateFound;

  // Auto-derivasi dari NIK jika tanggal lahir tidak terbaca
  if (!data.birthdate && data.nik && data.nik.length === 16) {
    const rawDay = parseInt(data.nik.slice(6, 8), 10);
    const month = parseInt(data.nik.slice(8, 10), 10);
    const rawYear = parseInt(data.nik.slice(10, 12), 10);
    const day = rawDay > 40 ? rawDay - 40 : rawDay;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const cyy = new Date().getFullYear() % 100;
      const fullYear = rawYear > cyy ? 1900 + rawYear : 2000 + rawYear;
      data.birthdate = `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // ---- 6. Alamat ----
  let street = '', rtrw = '', kel = '', kec = '', kota = '';

  // Helper: validasi bahwa string layak jadi nama tempat (minimal 4 huruf, bukan noise)
  function isValidPlaceName(s) {
    const cleaned = s.trim();
    // Minimal 4 karakter, mengandung minimal 3 huruf berurutan
    if (cleaned.length < 4) return false;
    if (!/[A-Za-z]{3}/.test(cleaned)) return false;
    // Tidak boleh semua non-huruf
    if (/^[^A-Za-z]+$/.test(cleaned)) return false;
    return true;
  }

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // ---- Jalan / Street ----
    if (/^(?:Alamat|Alarnat|Alam[ae]t|Adarnat|Aama|Mama|Alanat|Aamat)\b\s*[:=.\-—–_~ ]?/i.test(l)) {
      let cand = l.replace(/^(?:Alamat|Alarnat|Alam[ae]t|Adarnat|Aama|Mama|Alanat|Aamat)\b\s*[:=.\-—–_~ ]*\s*/i, '').trim();
      cand = cand.replace(/\s*[\-—–=_~]{2,}.*$/, '').trim();
      cand = cand.replace(/\s+/g, ' ').trim();
      cand = cand.replace(/[\s.,\-—–~!_=+;:]+$/, '');
      cand = cand.replace(/\s+[a-z]{1,5}$/, '');
      cand = cand.replace(/[\s.,\-—–~!_=+;:]+$/, '').trim();
      if (!cand && i + 1 < lines.length) {
        const nx = lines[i + 1].trim();
        if (!/^(?:RT|RW|Kel|Desa|Kecamatan|Agama)/i.test(nx)) cand = nx;
      }
      if (cand && cand.length >= 3) street = cand;
    }
    // Baris dimulai Jl./Jalan langsung (tanpa label Alamat)
    if (!street && /^(?:Jl\.?|Jalan|Gg\.?|Gang|Komp\.?|Komplek|Blok|Kp\.?|Kampung|Perum)/i.test(l)) {
      let cand = l.replace(/\s*[\-—–=_~]{2,}.*$/, '').trim();
      cand = cand.replace(/\s+/g, ' ').trim();
      cand = cand.replace(/[\s.,\-—–~!_=+;:]+$/, '');
      cand = cand.replace(/\s+[a-z]{1,5}$/, '');
      street = cand.replace(/[\s.,\-—–~!_=+;:]+$/, '').trim();
    }

    // ---- RT/RW ----
    // Format 1: 6 digit dengan slash dibaca 1/Il (misal 0021006 -> 002/006)
    if (!rtrw) {
      const mRt6 = l.match(/(?:RT[\/.\s]*RW|RTRW|RERW|REBW)\s*[:=.\-—–“"]*\s*(\d{3})[1Il\/|](\d{3})/i);
      if (mRt6) {
        rtrw = `${mRt6[1]}/${mRt6[2]}`;
      }
    }
    // Format 2: RT/RW dengan pemisah jelas
    if (!rtrw) {
      const mRt1 = l.match(/(?:RT[\/.\s]*RW|RTRW|RERW|REBW)\s*[:=.\-—–“"]*\s*(\d{1,3})\s*[\/.\-—–“"]\s*(\d{1,3})/i);
      if (mRt1) {
        rtrw = `${mRt1[1].padStart(3,'0')}/${mRt1[2].padStart(3,'0')}`;
      }
    }
    // Format 3: RT NNN RW NNN terpisah
    if (!rtrw) {
      const mRtLegacy = l.match(/RT\s*[\/.:]?\s*(\d{1,3})\s*[\/.\-]?\s*RW\s*[\/.:]?\s*(\d{1,3})/i);
      if (mRtLegacy) {
        rtrw = `${mRtLegacy[1].padStart(3,'0')}/${mRtLegacy[2].padStart(3,'0')}`;
      }
    }

    // ---- Kelurahan/Desa — toleransi variasi OCR (KeVDesa, KellDesa, Kel/Desa, Kel|Desa, dll) ----
    const mKel = l.match(/(?:Ke[lvI|\/\\]*Desa|Kel(?:urahan)?[\/\s.l|!~_I\\-—–]*Desa|Kelurahan|Kel(?:\.|\s*[:=—–]|\s+[A-Z])(?!amin|ahiran|uarga))[\s:=.~|\-_—–]*([A-Za-z][A-Za-z\s]{2,30})/i);
    if (mKel && !kel) {
      let kelCand = mKel[1].replace(/\s*[\-—–=_~]{2,}.*$/, '').trim();
      kelCand = kelCand.replace(/\s+/g,' ').replace(/[^a-zA-Z\s]/g, '').trim();
      kelCand = kelCand.replace(/^Desa\s+/i, '').trim();
      if (isValidPlaceName(kelCand)) {
        const kelWords = kelCand.split(/\s+/);
        const kelClean = kelWords.filter((w,idx) => idx === 0 || w.length >= 3).join(' ');
        if (isValidPlaceName(kelClean)) kel = kelClean;
      }
    }

    // ---- Kecamatan — validasi panjang minimal ----
    const mKec = l.match(/(?:Kecamatan|Kecarnatan|Kec[.:\s—–])\s*[:=.\-—–_~ ]*\s*([A-Za-z][A-Za-z\s]{3,40})/i);
    if (mKec && !kec) {
      let kecCand = mKec[1].replace(/\s*[\-—–=_~]{2,}.*$/, '').trim();
      kecCand = kecCand.replace(/\s+/g,' ').replace(/[^a-zA-Z\s]/g, '').trim();
      const words = kecCand.split(/\s+/);
      const cleanWords = words.filter(w => w.length >= 3 && !['FY', 'SE', 'OR', 'SANG'].includes(w.toUpperCase()));
      kecCand = cleanWords.join(' ');
      if (isValidPlaceName(kecCand)) kec = kecCand;
    }

    // ---- Kota/Kabupaten ----
    const mKota = l.match(/(?:KOTA|KABUPATEN|KAB[.:\s])\s+([A-Za-z][A-Za-z\s]{2,40})/i);
    if (mKota && !kota) {
      let cand = mKota[0].replace(/\s*[\-—–=_~]{2,}.*$/, '').trim();
      cand = cand.replace(/\s+/g,' ').replace(/[\s.,\-—–~!_=+;:]+$/, '').trim();
      cand = cand.replace(/\s+[A-Za-z0-9]{1,2}$/, '').trim();
      kota = cand;
    }

    // Pola Kota Administrasi DKI Jakarta (tanpa awalan KOTA)
    const mJkt = l.match(/\b(JAKARTA\s+(?:BARAT|PUSAT|SELATAN|TIMUR|UTARA)|KEPULAUAN\s+SERIBU)\b/i);
    if (mJkt && !kota) kota = mJkt[1].replace(/\s+/g,' ').trim();
  }

  // Normalisasi koreksi OCR nama jalan/desa umum jika terjadi typo tipis
  if (['TANIING', 'TANIONG'].includes(street.toUpperCase())) street = 'TANJUNG';
  if (['TANIING', 'TANIONG', 'TARING'].includes(kel.toUpperCase())) kel = 'TANJUNG';

  // Susun alamat lengkap — hanya tambahkan field yang sudah tervalidasi
  const addrParts = [];
  if (street) addrParts.push(street);
  if (rtrw) addrParts.push(`RT/RW ${rtrw}`);
  if (kel) addrParts.push(`Kel. ${kel}`);
  if (kec) addrParts.push(`Kec. ${kec}`);
  if (kota) addrParts.push(kota);
  data.address = addrParts.join(', ');

  // ---- 7. Pekerjaan ----
  const occupations = [
    'WIRASWASTA', 'KARYAWAN SWASTA', 'PEGAWAI SWASTA', 'PEGAWAI NEGERI SIPIL', 'PNS', 'ASN',
    'PELAJAR/MAHASISWA', 'PELAJAR', 'MAHASISWA', 'BELUM/TIDAK BEKERJA',
    'MENGURUS RUMAH TANGGA', 'IBU RUMAH TANGGA', 'BURUH HARIAN LEPAS', 'BURUH',
    'PEDAGANG', 'PETANI/PEKEBUN', 'PETANI', 'PETERNAK', 'NELAYAN',
    'DOKTER', 'BIDAN', 'PERAWAT', 'GURU', 'DOSEN', 'PENGACARA', 'ADVOKAT',
    'NOTARIS', 'PPAT', 'AKUNTAN', 'KONSULTAN', 'ARSITEK', 'SOPIR', 'PENSIUNAN',
    'TNI', 'POLRI', 'KARYAWAN BUMN', 'KARYAWAN BUMD', 'KARYAWAN', 'SWASTA',
  ];
  let jobFound = '';
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^(?:Pekerjaan|Pekerjaarn|Pekeriaan|Profesi|Jabatan)\s*[:=.]?/i.test(l)) {
      let cand = l.replace(/^(?:Pekerjaan|Pekerjaarn|Pekeriaan|Profesi|Jabatan)\s*[:=.]?\s*/i, '').trim();
      if (!cand && i + 1 < lines.length) {
        const nx = lines[i + 1];
        if (!/^(?:Kewarganegaraan|WNI|Agama|Berlaku|Status)/i.test(nx)) cand = nx;
      }
      if (cand) {
        cand = cand.replace(/(?:Kewarganegaraan|WNI|WNA|Agama|Berlaku|Status).*$/i, '').trim();
        cand = cand.replace(/\s+/g, ' ').trim();
        // Cek apakah mengandung salah satu pekerjaan standar
        const candUpper = cand.toUpperCase();
        for (const occ of occupations) {
          if (candUpper.includes(occ)) { cand = occ; break; }
        }
        if (cand.length >= 3) { jobFound = cand; break; }
      }
    }
  }
  if (!jobFound) {
    const upperText = rawText.toUpperCase();
    for (const occ of occupations) {
      if (upperText.includes(occ)) { jobFound = occ; break; }
    }
  }
  data.job = jobFound;

  return { success: true, data, engine: 'Built-in Smart NLP Engine v2 (100% Offline)' };
}

// ============================================================
// SINGLETON TESSERACT WORKER — Inisialisasi sekali, reuse terus.
// Menghilangkan overhead 3-5 detik createWorker setiap request.
// ============================================================
let _ktpWorker = null;
let _ktpWorkerReady = false;
let _ktpWorkerBusy = false;
let _ktpWorkerQueue = [];

async function getKtpWorker() {
  if (_ktpWorkerReady && !_ktpWorkerBusy) return _ktpWorker;

  // Jika worker sedang dibuat oleh request lain, tunggu di antrian
  if (!_ktpWorkerReady) {
    if (!_ktpWorker) {
      // Mulai inisialisasi worker
      _ktpWorker = createWorker(['ind', 'eng'], 1, {
        langPath: path.resolve('public/tessdata'),
        cachePath: path.resolve('public/tessdata'),
        errorHandler: (err) => console.warn('[Tesseract]', err),
      }).then((w) => {
        _ktpWorkerReady = true;
        _ktpWorker = w;
        console.log('[KTP OCR] Singleton worker siap.');
        return w;
      }).catch((err) => {
        console.error('[KTP OCR] Gagal inisialisasi worker:', err.message);
        _ktpWorker = null;
        _ktpWorkerReady = false;
        throw err;
      });
    }
    return _ktpWorker; // Ini adalah Promise jika masih pending
  }

  return _ktpWorker;
}

// Warm-up worker saat server start (tidak blocking)
setTimeout(() => {
  getKtpWorker().catch(() => {});
}, 1500);


// Helper: Auto-crop foto HP portrait & perbesar kartu KTP via Python PIL (offline & instan ~300ms)
function preprocessKtpWithPython(buf) {
  try {
    const pyScript = `import sys, io
from PIL import Image, ImageEnhance
try:
    raw = sys.stdin.buffer.read()
    im = Image.open(io.BytesIO(raw))
    w, h = im.size
    # Jika foto tegak / portrait dari kamera HP, crop fokus pada kartu KTP di tengah
    if h > w * 1.05:
        im = im.crop((int(w * 0.04), int(h * 0.25), int(w * 0.96), int(h * 0.75)))
    # Skala resolusi kartu agar font berukuran optimal untuk Tesseract OCR (~25-30px)
    target_w = max(1600, int(im.width * 1.5))
    im_scaled = im.resize((target_w, int(im.height * (target_w / im.width))), Image.Resampling.BICUBIC)
    gray = im_scaled.convert('L')
    enh = ImageEnhance.Contrast(gray).enhance(1.25)
    out = io.BytesIO()
    enh.save(out, format='PNG')
    sys.stdout.buffer.write(out.getvalue())
except Exception:
    sys.stdout.buffer.write(raw)
`;
    return execFileSync('python', ['-c', pyScript], { input: buf, maxBuffer: 30 * 1024 * 1024 });
  } catch {
    return buf;
  }
}

// 1b. Scan KTP Image via Local Offline Tesseract OCR (Singleton Worker + Smart Multi-Pass)
export async function scanKtpImage(imageData, rawImageData = null) {
  if (!imageData) {
    return { success: false, message: 'Data gambar tidak ditemukan' };
  }

  const toBuffer = (img) => {
    try {
      if (typeof img === 'string' && img.startsWith('data:image')) {
        const base64Data = img.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
      } else if (Buffer.isBuffer(img)) {
        return img;
      }
    } catch {
      return null;
    }
    return null;
  };

  const buffer1 = toBuffer(imageData);   // enhanced/filtered image (prioritas utama)
  const buffer2 = rawImageData ? toBuffer(rawImageData) : null;  // raw image (fallback)
  const preprocessedBuf = buffer1 ? preprocessKtpWithPython(buffer1) : null;

  let worker = null;
  let workerWasCreatedLocally = false;
  try {
    // Dapatkan singleton worker (atau buat lokal jika gagal)
    try {
      worker = await getKtpWorker();
    } catch {
      // Fallback: buat worker baru untuk request ini saja
      worker = await createWorker(['ind', 'eng'], 1, {
        langPath: path.resolve('public/tessdata'),
        cachePath: path.resolve('public/tessdata'),
      });
      workerWasCreatedLocally = true;
    }

    _ktpWorkerBusy = true;

    let combinedRawText = '';
    let bestExtracted = null;

    // -----------------------------------------------
    // OCR parameters optimal untuk KTP Indonesia
    // PSM 6: Uniform block of text — terbaik untuk KTP lurus/datar
    // PSM 11: Sparse text — terbaik untuk foto diagonal/dipegang tangan
    // -----------------------------------------------
    const OCR_PARAMS_PSM6 = {
      tessedit_pageseg_mode: '6',
      preserve_interword_spaces: '1',
      tessedit_char_blacklist: '|~`^{}[]<>',
    };
    const OCR_PARAMS_PSM11 = {
      tessedit_pageseg_mode: '11',
      preserve_interword_spaces: '1',
      tessedit_char_blacklist: '|~`^{}[]<>',
    };

    // Urutan buffer: auto-crop/upscale dulu (terlengkap), lalu enhanced, lalu raw
    const buffersToTry = [preprocessedBuf, buffer1, buffer2].filter(Boolean);

    for (const buf of buffersToTry) {
      // --- Pass 1: PSM 6 (paling cepat & akurat untuk KTP lurus) ---
      try {
        await worker.setParameters(OCR_PARAMS_PSM6);
        const r1 = await worker.recognize(buf);
        const t1 = r1.data?.text || '';
        combinedRawText += '\n' + t1;
        const e1 = await extractDocumentData(t1);
        const d1 = e1?.data || {};
        const hasNik1 = d1.nik && d1.nik.length === 16;
        const hasName1 = d1.name && d1.name.trim().length > 2;
        if (hasNik1 && hasName1) {
          bestExtracted = e1;
          break;
        }
        if (hasNik1) {
          // NIK sudah ada, simpan sebagai kandidat terbaik sejauh ini
          if (!bestExtracted) bestExtracted = e1;
        }
      } catch (e) {
        console.warn('[KTP] PSM 6 error:', e.message);
      }

      // --- Pass 2: PSM 11 hanya jika Pass 1 belum lengkap ---
      if (!bestExtracted || !(bestExtracted.data?.nik && bestExtracted.data?.name)) {
        try {
          await worker.setParameters(OCR_PARAMS_PSM11);
          const r2 = await worker.recognize(buf);
          const t2 = r2.data?.text || '';
          combinedRawText += '\n' + t2;
          // Ekstrak dari teks gabungan semua pass (lebih banyak konteks = lebih akurat)
          const e2 = await extractDocumentData(combinedRawText);
          const d2 = e2?.data || {};
          const hasNik2 = d2.nik && d2.nik.length === 16;
          const hasName2 = d2.name && d2.name.trim().length > 2;
          if (hasNik2 && hasName2) {
            bestExtracted = e2;
            break;
          }
          if (hasNik2 || hasName2) {
            bestExtracted = e2;
          }
        } catch (e) {
          console.warn('[KTP] PSM 11 error:', e.message);
        }
      } else {
        break; // Sudah lengkap dari pass 1 pada buffer pertama
      }
    }

    // Final extraction dari semua teks yang terkumpul jika masih belum ada
    if (!bestExtracted || !(bestExtracted.data?.nik)) {
      const eFinal = await extractDocumentData(combinedRawText);
      if (!bestExtracted || (eFinal.data?.nik && !bestExtracted.data?.nik)) {
        bestExtracted = eFinal;
      }
    }

    const d = bestExtracted?.data || {};
    const hasNik = Boolean(d.nik && d.nik.length === 16);
    const hasName = Boolean(d.name && d.name.trim().length > 2);

    if (!hasNik || !hasName) {
      const isPartial = Boolean(hasNik || hasName);
      let errMsg = 'Teks KTP tidak terbaca jelas (terlalu jauh atau buram). Silakan dekatkan KTP ke kamera hingga memenuhi bingkai kotak, atau unggah foto KTP dari HP.';
      if (hasNik && !hasName) {
        errMsg = 'NIK terbaca (' + d.nik + '), tetapi Nama Lengkap belum terbaca jelas. Silakan foto ulang lebih dekat ke arah nama.';
      } else if (!hasNik && hasName) {
        errMsg = 'Nama terbaca (' + d.name + '), tetapi NIK 16-digit belum terbaca jelas. Silakan foto ulang lebih dekat ke arah NIK.';
      }
      return { success: false, incomplete: isPartial, partialData: d, text: combinedRawText, data: d, message: errMsg };
    }

    return { success: true, text: combinedRawText, data: d, engine: 'Tesseract OCR + Smart NLP (100% Offline)' };

  } catch (err) {
    if (workerWasCreatedLocally && worker) {
      try { await worker.terminate(); } catch {}
    }
    console.error('[KTP] Scan error:', err.message);
    return { success: false, message: 'Gagal memindai gambar KTP: ' + err.message };
  } finally {
    _ktpWorkerBusy = false;
  }
}

// 1c. Scan General Document Image via Local Tesseract OCR (Full-text Content Indexing)
export async function scanDocumentImage(imageData) {
  if (!imageData) return '';
  let cleanBuffer = null;
  try {
    if (typeof imageData === 'string' && imageData.startsWith('data:image')) {
      const base64Data = imageData.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      cleanBuffer = Buffer.from(base64Data, 'base64');
    } else if (Buffer.isBuffer(imageData)) {
      cleanBuffer = imageData;
    }
  } catch (e) {
    return '';
  }

  let worker = null;
  try {
    worker = await createWorker(['ind', 'eng'], 1, {
      langPath: path.resolve('public/tessdata'),
      cachePath: path.resolve('public/tessdata'),
      errorHandler: (err) => console.warn('Worker error:', err),
    });
    await worker.setParameters({
      tessedit_pageseg_mode: '3', // Fully automatic page segmentation
      preserve_interword_spaces: '1',
    });
    const ret = await worker.recognize(cleanBuffer || imageData);
    await worker.terminate();
    return ret.data?.text || '';
  } catch (err) {
    if (worker) {
      try { await worker.terminate(); } catch {}
    }
    console.warn('scanDocumentImage error:', err.message);
    return '';
  }
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

// ----------------------------------------------------------------------
// CLEAN FORMATTING — Noffice Copilot outputs are plain text: no decorative
// quotes, no raw markdown symbols. Client profiles use the label/value block
// layout, case lists are numbered blocks with indented sub-fields.
// ----------------------------------------------------------------------

function dispService(id) {
  return serviceLabel(id) || relStatusLabel(id) || String(id || '');
}

function caseItem(index, c, extraNote) {
  const lines = [`${index}. ${dispService(c.serviceType)}`];
  if (c.caseNumber) lines.push(`   Nomor kasus: ${c.caseNumber}`);
  if (c.status) lines.push(`   Status: ${relStatusLabel(c.status)}`);
  if (c.aktaNumber) lines.push(`   Akta: ${c.aktaNumber}`);
  if (c.assignedTo) lines.push(`   Penanggung jawab: ${c.assignedTo}`);
  if (extraNote) lines.push(`   ${extraNote}`);
  return lines.join('\n');
}

function clientProfileBlock(c, isAdmin) {
  const pairs = [];
  if (c.nik) pairs.push(['NIK', isAdmin ? c.nik : maskNik(c.nik)]);
  if (c.job) pairs.push(['Pekerjaan', c.job]);
  if (c.phone) pairs.push(['Telepon', c.phone]);
  if (c.email) pairs.push(['Email', c.email]);
  if (c.address) pairs.push(['Alamat', c.address]);
  const blocks = pairs.map(([label, v]) => `${label}\n${v}`);
  return [String(c.name || '...'), '', blocks.join('\n\n')].join('\n');
}

// Generic row renderer driven by the plan's requested fields (non-case lists).
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
  if (!rest.length) return `• ${bold}`;
  return `• ${bold}\n${rest.map((l) => `   ${l}`).join('\n')}`;
}

function fmtCount(plan, rows) {
  const n = Number(rows[0]?.total ?? 0);
  const m = TABLE_META[plan.entity];
  const desc = plan.humanFilters && plan.humanFilters.length ? ` ${plan.humanFilters.join(' & ')}` : '';
  if (n === 0) {
    return `Tidak ada ${m.plural}${desc} di database Noffice.`;
  }
  return `${m.icon} Saat ini ada ${fmtNum(n)} ${m.plural}${desc} di database Noffice.`;
}

function fmtGroup(plan, rows) {
  const m = TABLE_META[plan.entity];
  const gLabel = groupLabelOf(plan.entity, plan.groupBy);
  if (!rows.length) {
    const fv = (plan.filters || []).find((f) => f.column === plan.groupBy);
    const scope = fv ? ` pada ${gLabel} ${cap(String(fv.display || fv.value))}` : '';
    return `Tidak ada ${m.plural}${scope} di database Noffice.`;
  }
  const lines = rows.map((r) => `• ${cap(String(r.label || 'Lainnya'))}: ${fmtNum(r.total)}`).join('\n');
  return `Berikut rincian ${m.plural} berdasarkan ${gLabel}:\n${lines}`;
}

function fmtList(plan, rows, isAdmin) {
  const m = TABLE_META[plan.entity];
  if (!rows.length) {
    const human = plan.humanFilters && plan.humanFilters.length ? ` ${plan.humanFilters.join(' & ')}` : '';
    const isNameFilter = (plan.filters || []).some((f) => f.op === 'like' && (m.identityCols || []).includes(f.column));
    if (isNameFilter) {
      const fv = (plan.filters || []).find((f) => f.op === 'like');
      return `Tidak ada ${m.plural} yang namanya cocok dengan ${cap(String(fv.display || fv.value))} di database Noffice. Pastikan nama/nilai tersebut benar.`;
    }
    return `Tidak ada ${m.plural}${human} di database Noffice.`;
  }
  const fields = (plan.fields && plan.fields.length) ? plan.fields : (m.cols?.admin || []);
  const header = (plan.metric === 'search' && plan.keyword)
    ? `Hasil pencarian ${cap(plan.keyword)} untuk ${m.plural}:`
    : `Berikut ${m.plural} dari database Noffice:`;
  let lines;
  if (plan.entity === 'cases') {
    lines = rows.map((r, i) => caseItem(i + 1, r)).join('\n');
  } else {
    lines = rows.map((r) => fmtRow(plan.entity, r, fields, isAdmin)).join('\n');
  }
  const more = rows.length >= (plan.limit || 8) && (plan.limit || 8) > 1 ? '\n\n…beberapa hasil lainnya tidak ditampilkan.' : '';
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

  if (plan.metric === 'dashboard') {
    const d = result.data || {};
    const parts = [];
    const add = (label, v) => { if (v != null) parts.push(`${label}: ${fmtNum(v)}`); };
    add('Total kasus/permohonan', d.cases);
    add('Masih berjalan/diproses', d.casesRunning);
    add('Permohonan Notaris', d.casesNotary);
    add('Kasus PPAT', d.casesPpat);
    add('Klien terdaftar', d.clients);
    add('Dokumen aktif', d.documents);
    add('Karyawan aktif', d.employees);
    let reply = `📊 Data yang ada di dashboard Noffice saat ini:\n${parts.map((p) => `• ${p}`).join('\n')}`;
    if (result.recent && result.recent.length) {
      const last = result.recent.map((r) => r.caseNumber || r.serviceType).filter(Boolean).slice(0, 4).join(', ');
      if (last) reply += `\n\nKasus terbaru: ${last}.`;
    }
    reply += '\n\nSemua angka berasal dari database lokal Noffice (100% offline).';
    return reply;
  }

  if (plan.metric === 'agenda') {
    const rowsA = result.rows || [];
    if (!rowsA.length) {
      return '🗓️ Belum ada jadwal penandatanganan / agenda yang tercatat di database Noffice (kolom jadwal pada kasus masih kosong). Ketika ada kasus dengan jadwal, agenda akan muncul di sini.';
    }
    const lines = rowsA.map((r) => `• ${r.clientName || 'Klien koreksi'} — ${r.serviceType || 'tanpa layanan'}${r.status ? ` (${statusLabel(r.status)})` : ''} — ${r.appointmentDate || ''}${r.appointmentTime ? ` ${r.appointmentTime}` : ''}`);
    return `🗓️ Agenda / jadwal penandatanganan dari database Noffice (jumlah ${rowsA.length}):\n${lines.join('\n')}`;
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

Semua data diambil langsung dari database lokal (100% offline). Sebutkan apa yang ingin Anda ketahui, misalnya berapa jumlah karyawan atau dokumen apa yang paling baru.`;
}

// INFORMATION/CATALOG reply — enumerates what the app actually holds, from the
// real schema. Free-form phrasings ("data yang ada apa aja", "isinya apa aja",
// "selain klien ada apalagi") all land here via the `catalog` semantic field.
// When the user is browsing a dataset (prior topic kind 'dataset'), the answer
// scopes to THAT data instead of repeating the whole app catalog.
function fmtCatalog(role, rawMsg, priorTopic) {
  const list = getDomainSummary(role);
  if (!list.length) return 'Saya tidak dapat mengakses data apa pun untuk akun Anda.';

  const lower = normalizeText(rawMsg);
  const excl = /\b(selain|kecuali|lainnya|apalagi)\b/i.test(lower);
  const mentions = (entity) => {
    const m = TABLE_META[entity];
    if (!m) return false;
    const words = [entity, m.label, m.kata, m.plural].filter(Boolean);
    return words.some((w) => lower.includes(String(w).toLowerCase()));
  };

  // "selain data klien ada apalagi?" -> list every domain EXCEPT klien.
  if (excl) {
    const others = list.filter((s) => !mentions(s.entity));
    if (others.length) {
      const lines = others.map((s) => `• ${s.icon} **${s.label}** — ${s.plural}`);
      return `Selain itu, di Noffice juga tersedia beberapa bagian data yang bisa Anda kelola:\n${lines.join('\n')}\n\nSemuanya diambil langsung dari database lokal yang ada di perangkat Anda.`;
    }
  }

  // Dataset scope: user is browsing one kind of data ("data klien") and asks
  // "yang tersedia apa aja?" — enumerate the columns of that dataset.
  if (priorTopic && priorTopic.kind === 'dataset' && priorTopic.id) {
    const ent = Object.keys(TABLE_META).find((e) => e === priorTopic.id || e.toLowerCase() === String(priorTopic.id).toLowerCase() || (priorTopic.id && String(priorTopic.id).toLowerCase().includes(e.toLowerCase())));
    const meta = ent && TABLE_META[ent];
    if (meta && list.some((s) => s.entity === ent)) {
      const cols = getVisibleColumns(ent, role);
      const labels = cols.map((c) => meta.fieldLabels?.[c] || c);
      return `Di bagian **${meta.label}** (${meta.icon}) yang sedang Anda lihat, kolom yang tersedia untuk ditampilkan adalah: ${labels.join(', ')}.\n\nMau saya tampilkan datanya sekarang?`;
    }
  }

  return fmtDomain(role);
}

// ----------------------------------------------------------------------
// GENERIC ENTITY SEARCH formatter — answers for "apakah ada Daffa?",
// "cari Daffa", "kasus Daffa apa saja?", "siapa petugas yang menangani
// kasus X?", "kasus nomor 012 punya siapa?" — from the LIVE local DB.
// ----------------------------------------------------------------------
function statusLabel(s) {
  if (!s) return '';
  return String(s).split('_').filter(Boolean).map((w) => {
    const lo = w.toLowerCase();
    return STATUS_ACRONYMS.has(lo) ? lo.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

function fmtEntityAnswer(plan, result, role) {
  const term = plan.term;
  const isAdmin = role === 'admin';
  const catNote = plan.category === 'notary' ? ' Notaris' : plan.category === 'ppat' ? ' PPAT' : '';

  // NOT FOUND — an entity question whose term exists in the question but
  // matched nothing in the DB (never "tidak paham").
  if (!result.foundAny) {
    return `Saya tidak menemukan data bernama/bernomor ${term} pada data Noffice yang dapat Anda akses. Klien, karyawan, dokumen, dan nomor kasus/akta dicari langsung di database; pastikan nama atau nomornya sudah benar.`;
  }

  if (plan.qtype === 'exists') {
    // When the question names a specific entity ("ada client X?"), absence on
    // THAT entity is a NOT FOUND even if the term coincidentally matches
    // something elsewhere ("dokumen yang berisi kata 'test'").
    const focusSet = { clients: result.clients, employees: result.employees, documents: result.documents, cases: result.cases }[plan.focus];
    if (focusSet !== undefined && !focusSet.length) {
      const focusLabel = { clients: 'klien', employees: 'karyawan', documents: 'dokumen', cases: 'kasus' }[plan.focus];
      const t = String(term || '').replace(/^(atas\s+nama\s+|nama\s+|data\s+)/i, '').trim();
      return `Saya tidak menemukan ${focusLabel} bernama/bernomor ${t} pada data Noffice yang dapat Anda akses. Pastikan nama/nomornya benar — data klien, karyawan, dokumen, dan kasus dicari langsung dari database.`;
    }
    // Pure presence check of a client ("ada data daffa?", "daffa ada ga?") →
    // confirm first, offer the details, then show them on a bare "iya".
    if ((plan.focus === 'auto' || plan.focus === 'clients') && result.clients.length === 1) {
      const c = result.clients[0];
      return `Ya, saya menemukan data ${c.name} di Noffice.\nMau saya tampilkan detailnya? (kontak, kasus, dan dokumen terkait)`;
    }
    const bits = [];
    if (result.clients.length) bits.push(`klien ${result.clients.map((c) => c.name).join(', ')}`);
    if (result.cases.length) bits.push(`${result.cases.length} kasus/permohonan${catNote}`);
    if (result.employees.length) bits.push(`karyawan ${result.employees.map((e) => e.name).join(', ')}`);
    if (result.documents.length) bits.push(`${result.documents.length} dokumen`);
    const head = result.clients.length
      ? `Ya, ${result.clients[0].name} ditemukan`
      : `Ya, saya menemukan ${term}`;
    return `${head} pada data Noffice:\n${bits.map((b) => `• ${b}`).join('\n')}`;
  }

  if (plan.qtype === 'count') {
    const scope = plan.category ? `kasus ${catNote.trim()}` : 'kasus';
    let out = result.cases.length
      ? `Saat ini ada ${result.cases.length} ${scope} yang terkait dengan ${term} di database Noffice.`
      : `Tidak ada ${scope} yang terkait dengan ${term} di database Noffice.`;
    if (result.documents.length) out += `\nSelain itu ada ${result.documents.length} dokumen yang juga terkait.`;
    return out;
  }

  if (plan.qtype === 'status') {
    if (!result.cases.length) return `Tidak ada kasus ${term}${catNote} di database Noffice.`;
    const set = [...new Set(result.cases.filter((c) => c.status).map((c) => c.status))];
    if (!set.length) return `Status kasus ${term}${catNote} belum tercatat.`;
    return `Status kasus untuk ${term}${catNote}:\n${set.map((s) => `• ${statusLabel(s)}`).join('\n')}`;
  }

  if (plan.qtype === 'akta') {
    const aks = [...new Set(result.cases.map((c) => c.aktaNumber).filter(Boolean))];
    if (!aks.length) return `Belum ada nomor akta yang diterbitkan untuk kasus ${term}${catNote}.`;
    return `Nomor akta untuk kasus ${term}${catNote}:\n${aks.map((a) => `• ${a}`).join('\n')}`;
  }

  if (plan.qtype === 'officer' || plan.focus === 'officer') {
    if (!result.officers.length) return `Saya tidak menemukan petugas yang menangani ${term}${catNote}.`;
    return `Petugas yang menangani kasus ${term}${catNote}: ${result.officers.join(', ')}.`;
  }

  if (plan.qtype === 'documents') {
    let docs = result.documents;
    if (result.clients.length === 1) {
      const resolved = result.clients[0].id ? result.clients[0] : (findClientsByName(String(result.clients[0].name || ''))[0] || result.clients[0]);
      if (resolved.id) {
        const g = clientGraph(resolved.id, role);
        if (g.foundAny) docs = g.documents;
      }
    }
    if (!docs.length) {
      return `Sejauh data yang tersedia, belum ada dokumen yang terdeteksi terkait ${term}.`
        + (result.clients.length === 1 ? ' Dokumen di Noffice dikaitkan lewat nama penulis atau isi dokumen, dan belum ada yang cocok dengan nama ini.' : '');
    }
    return `Dokumen terkait ${term}:\n${docs.map((d, i) => `${i + 1}. ${d.title}${d.author ? ` (penulis: ${d.author})` : ''}${d.category ? `\n   Kategori: ${d.category}` : ''}`).join('\n')}`;
  }

  // default "raw" — show profiles + related cases/documents
  const lines = [];
  const singleClient = result.clients.length === 1 ? result.clients[0] : null;
  let graph = null;
  if (singleClient) {
    const resolved = singleClient.id ? singleClient : findClientsByName(String(singleClient.name || plan.term || ''))[0] || singleClient;
    graph = resolved.id ? clientGraph(resolved.id, role) : null;
    lines.push(clientProfileBlock(singleClient, isAdmin));
  } else {
    for (const c of result.clients) lines.push(clientProfileBlock(c, isAdmin));
  }
  for (const e of result.employees) {
    const bits = [];
    if (e.department) bits.push(`Divisi: ${e.department}`);
    if (e.role) bits.push(`Peran: ${e.role}`);
    if (e.status) bits.push(statusLabel(e.status));
    lines.push(`${e.name}${bits.length ? '\n' + bits.join('\n') : ''}`);
  }
  // Prefer the precise relationship graph when a single client is resolved
  // (cases come from the FK; documents from the honest author-based link —
  // a graph is authoritative even when it finds nothing).
  const caseRows = (graph && graph.foundAny && graph.cases.length) ? graph.cases : result.cases;
  const docRows = (graph && graph.foundAny) ? graph.documents : (result.documents || []);
  if (caseRows.length) {
    lines.push('', `Kasus terkait${catNote}${plan.statusFilter ? ' yang masih berjalan' : ''}:`);
    const docOwner = singleClient ? singleClient.name : (result.clients.length ? result.clients[0].name : null);
    const max = Math.min(caseRows.length, 15);
    caseRows.slice(0, max).forEach((c, i) => {
      const docOk = plan.docReady && documentsForCase(c, docOwner).length > 0;
      lines.push(caseItem(i + 1, c, plan.docReady ? (docOk ? 'Dokumen tersedia.' : 'Dokumen belum terdeteksi.') : null));
    });
    if (caseRows.length > max) lines.push(`…${caseRows.length - max} kasus lainnya.`);
  }
  if (docRows.length) {
    lines.push('', 'Dokumen terkait:');
    docRows.slice(0, 10).forEach((d, i) => {
      lines.push(`${i + 1}. ${d.title}${d.author ? ` (penulis: ${d.author})` : ''}`);
    });
  }
  if (!lines.length) return `Saya tidak menemukan rincian data untuk ${term}.`;
  return `Hasil pencarian ${term}:\n${lines.join('\n')}`;
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
  // Check the comprehensive Notaris & PPAT Knowledge Base
  const legalMatch = getNotaryLegalAnswer(rawMsg, msgLower);
  if (legalMatch && legalMatch.reply) {
    return legalMatch.reply;
  }

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
3. Klik tombol ⚡ Generate Nomor Akta Otomatis.
4. Sistem akan otomatis menerbitkan nomor akta urut sesuai format (misal: \`No. 01/VIII/2026\`) dan memperbarui status berkas ke \`DRAFT\`.`;
  }

  // 11. Fitur Noffice — Ekstrak Data KTP
  if (msgLower.match(/\b(ekstrak|ocr|scan ktp|baca ktp|auto fill)\b/i)) {
    return `🤖 **Fitur AI Extract Data KTP (Offline):**
1. Buka menu **Klien Notaris** di sidebar.
2. Klik tombol AI Extract KTP.
3. Paste/tempel teks hasil copy dari dokumen/KTP.
4. Klik Ekstrak Data. AI Notaris akan otomatis mengisi NIK, Nama, Tanggal Lahir, Alamat, dan Pekerjaan!`;
  }

  // 12. Fitur Noffice — Trash & Restore Dokumen
  if (msgLower.match(/\b(tempat sampah|trash|restore|hapus dokumen|pulihkan)\b/i)) {
    return `🗑️ **Manajemen Tempat Sampah Dokumen:**
• **Pindahkan ke Tempat Sampah:** Klik tombol hapus (ikon tong sampah) pada dokumen. Dokumen masuk ke folder Tempat Sampah (tidak hilang permanen).
• **Pulihkan (Restore):** Buka folder Tempat Sampah di menu Dokumen, lalu klik Pulihkan.
• **Hapus Permanen / Kosongkan Trash:** Hanya dapat dilakukan oleh **Admin / Notaris Utama**.`;
  }

  // 13. Fitur Noffice — Backup Database
  if (msgLower.match(/\b(backup|cadangan|download db|database|simpan data)\b/i)) {
    return `💾 **Backup Database SQLite:**
Buka menu **Pengaturan (Settings)** -> tab **Sistem / Keamanan**, lalu klik Unduh Backup Database (.sqlite). File cadangan lengkap akan otomatis diunduh ke komputer Anda.`;
  }

  // 14. Poin Bantuan Umum / Sapaan
  if (msgLower.match(/\b(halo|hai|pagi|siang|malam|bro|sis|siapa kamu|siapa anda|bisa apa)\b/i)) {
    return `👋 Halo! Saya Noffice Copilot, asisten AI Notaris & PPAT lokal (100% offline).

Saya sudah dilatih untuk membantu operasional kantor Anda tanpa perlu koneksi internet:
1. 📂 Pencarian Data: coba ketik cari berkas Budi, status permohonan AJB, atau klien Siti.
2. 📋 Persyaratan Hukum: tanya syarat PT, syarat AJB, syarat Hibah, atau syarat Hak Tanggungan.
3. 🧮 Perhitungan Pajak: tanya rumus pajak BPHTB.
4. ⚙️ Panduan Noffice: tanya cara generate nomor akta, cara backup database, atau ekstrak KTP.

Apa yang bisa saya bantu sekarang?`;
  }

  return null;
}

// ----------------------------------------------------------------------
// ROOT REPLY SANITIZER — the Copilot UI must NEVER show raw markdown
// symbols ("**") or backticks. Every reply passes through here at the
// engine root (and again at the HTTP route as defense-in-depth).
// ----------------------------------------------------------------------
export function sanitizeReply(text) {
  return String(text ?? '')
    .replace(/\*\*/g, '')
    .replace(/\*+/g, '')
    .replace(/`+/g, '')
    .replace(/[“”]/g, '"')
    .replace(/"/g, '')
    .replace(/\#{1,6}/g, '')
    .replace(/—/g, '-')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function copilot(reply, intent, meta) {
  return { reply: sanitizeReply(reply), intent, meta };
}

// ----------------------------------------------------------------------
// CONVERSATION INTENT — greetings / thanks / capabilities / identity /
// farewell / ack. Only WINS when the message is purely conversational (no
// data/knowledge intent word), so "halo, berapa klien?" still reaches the
// data engine and is answered with real data.
// ----------------------------------------------------------------------
const CHIT_CHAT = /^(ya|yah|siap|oke|ok|banyak|semuanya|atas bantuannya|bantuannya|sudah|banget|sangat|kamu|anda|kau|apa kabar|kabarnya|gimana kabar|kabar(nya)?|kabar baik|baik|baik saja|baik\s+baik\s+saja|bro|sis|min|gan|kak|bang|mas|mbak|pak|bu|kawan|sobat|banyak\s+(bro|sis|min|gan|kak|bang|mas|mbak|pak|bu|ya|yah))\s*[?.!]*$/i;

function detectConversation(rawMsg) {
  const lower = String(rawMsg || '').trim().toLowerCase().replace(/\s+/g, ' ').trim();
  if (!lower) return null;
  const rest = (re) =>
    lower.replace(re, '').replace(/^[\s,;:!?.\-–—]+/, '').replace(/[\s,;:!?.\-–—]+$/, '');
  const isPure = (re) => {
    const r = rest(re);
    return !r || CHIT_CHAT.test(r);
  };

  if (/^(terima kasih|makasih|thanks|thank(?:\s*)you|thankyou|tq|trims)\b/i.test(lower)) {
    if (isPure(/^(terima kasih|makasih|thanks|thank(?:\s*)you|thankyou|tq|trims)\b/i)) return 'thanks';
  }
  if (/^(dadah|bye\b|sampai jumpa|selamat tinggal)\b/i.test(lower)) return 'farewell';
  if (/^(halo|hai|hi|hello|hallo|hay|oy|pagi|siang|sore|malam|selamat (pagi|siang|sore|malam))\b/i.test(lower)) {
    if (isPure(/^(halo|hai|hi|hello|hallo|hay|oy|pagi|siang|sore|malam|selamat (pagi|siang|sore|malam))\b/i)) return 'greeting';
  }
  if (/^apa kabar\b|^gimana kabar\b/i.test(lower)) return 'greeting';
  if (/^(kamu|anda|kau)?\s*bisa (bantu apa|apa saja|ngapain|apa|lakukan apa|kerjakan apa)\b|\bapa yang bisa (kamu|anda) (bantu|lakukan|kerjakan|jawab)\b|^bisa bantu apa saja\b|^bantu apa\b/i.test(lower)) {
    if (isPure(/^(kamu|anda|kau)?\s*bisa (bantu apa|apa saja|ngapain|apa|lakukan apa|kerjakan apa)\b|\bapa yang bisa (kamu|anda) (bantu|lakukan|kerjakan|jawab)\b|^bisa bantu apa saja\b|^bantu apa\b/i)) return 'capabilities';
  }
  if (/\bsiapa (kamu|anda|kau)\b|^(kamu|anda|kau) siapa\b/i.test(lower)) return 'identity';
  if (/^(oke|ok|siap|noted|mantap|nice|good|bagus|sip)\b[?.!]*$/i.test(lower)) return 'ack';
  return null;
}

const CONVERSATION_REPLIES = {
  greeting: 'Salam! Saya Noffice Copilot, asisten AI Notaris & PPAT Anda. Ada yang bisa saya bantu?',
  capabilities: 'Saya bisa membantu Anda dengan data nyata dari database Noffice (100% offline):\n'
    + '1. Pencarian data — misal: cari Daffa / kasus nomor 007 / dokumen milik seorang klien\n'
    + '2. Statistik real-time — misal: berapa total klien? berapa kasus aktif? siapa yang punya kasus aktif?\n'
    + '3. Dashboard & agenda — misal: data apa saja yang ada di dashboard? apa agenda penandatanganan?\n'
    + '4. Relasi antar data — misal: kasusnya apa saja? dokumennya ada? siapa kliennya? klik diikuti pertanyaan lanjutan agar saya ingat konteksnya.\n'
    + '5. Pengetahuan hukum notaris — misal: syarat AJB, syarat PT, perbedaan legalisasi vs waarmerking\n'
    + '6. Panduan fitur Noffice — misal: cara generate nomor akta, cara backup database\n'
    + 'Silakan tanyakan apa saja!',
  identity: 'Saya Noffice Copilot, asisten AI Notaris & PPAT yang berjalan 100% offline di komputer Anda.\n'
    + 'Saya membaca data nyata dari database Noffice (klien, kasus/permohonan, dokumen, dan karyawan), memahami hubungan antar datanya, dan menjawab soal operasional kantor, persyaratan hukum, serta fitur aplikasi.',
  thanks: 'Sama-sama! Senang bisa membantu. Ada lagi yang ingin Anda tanyakan seputar data kantor atau persyaratan notaris?',
  farewell: 'Sampai jumpa! Jika nanti ada pertanyaan seputar data Noffice, persyaratan hukum, atau fitur aplikasi, saya siap membantu.',
  ack: 'Siap! Ada lagi yang bisa saya bantu seputar data Noffice?',
};

const CONVERSATION_INTENTS = {
  greeting: 'GENERAL', capabilities: 'GENERAL', identity: 'GENERAL',
  thanks: 'GENERAL', farewell: 'GENERAL', ack: 'GENERAL',
};

// ----------------------------------------------------------------------
// REFERENCE & SMART-INTENT LAYER — answers that tie the previous turn to
// this one (D, E, F), plus relational aggregates that are simpler and more
// honest as dedicated intents than as planner plans (C, F).
// ----------------------------------------------------------------------

function deriveRefFromResult(result, plan) {
  if (result.clients && result.clients.length) {
    const c = result.clients[0];
    const name = String(c.name || plan.term);
    if (c.id) return { kind: 'client', id: c.id, name: c.name, term: plan.term };
    const hit = findClientsByName(name)[0];
    if (hit) return { kind: 'client', id: hit.id, name, term: plan.term };
    return { kind: 'client', id: null, name, term: plan.term };
  }
  if (result.employees && result.employees.length) {
    const e = result.employees[0];
    return { kind: 'employee', id: e.id, name: e.name, term: plan.term };
  }
  const cs = (result.cases || [])[0];
  if (cs) return { kind: 'case', id: cs.id, caseNumber: cs.caseNumber, term: plan.term };
  return null;
}

function fmtRecheck(g, ref) {
  if (!g.foundAny || !g.cases.length) {
    return `Sejauh data yang tersedia di sistem, saya tidak menemukan kasus yang terkait dengan ${ref.name}. Mungkin nama client tersebut berbeda dengan yang tersimpan, atau datanya belum tercatat.`;
  }
  const lines = [`Sejauh data yang tersedia di sistem, ${ref.name} memiliki ${fmtNum(g.cases.length)} kasus yang tercatat:`];
  g.cases.forEach((c, i) => lines.push(caseItem(i + 1, c)));
  lines.push(`Belum ditemukan kasus lain yang terkait dengan ${ref.name}.`);
  return lines.join('\n');
}

// Is this message a SHORT, anaphoric follow-up (possessive-head or a yes/no
// property question)? Only such messages may borrow the stored ref when the
// resolver did not classify them as a follow-up itself.
function isAnaphoricFollowUp(msg, ref) {
  const clean = String(msg || '').toLowerCase().replace(/[-_.,]/g, ' ').replace(/\s+/g, ' ').trim();
  const possessive = /\b[\w]*nya\b/.test(clean) && !/(punya|tanya|nanya|bertanya\w*|menanya\w*)\b/i.test(clean);
  const questionHead = /^(yang|yg|itu|ini|dia)\b/i.test(clean)
    || /^(yang\s+)?(mana|gimana|terbaru|terakhir|paling)\b/i.test(clean)
    || /^(kasus|permohonan|dokumen|berkas|agenda|jadwal)\s+yang\b/i.test(clean)
    || /^(kalau|kalo|terus|maksudnya)\s+(yang|yg|itu|ini)\b/i.test(clean);
  const propertyAsk = /^(apakah|bener|benar|benarkah|nggak|gak|ga|udah|belum|sudah)\s+\w+nya\b/i.test(clean)
    || /^(apakah|bener|benar|nggak|gak|ga|udah|belum|sudah)\s+\w+\s+nya\b/i.test(clean);
  const newValueFilter = /^(kasus|permohonan|dokumen|berkas|agenda|data|klien|client)\s+(apa|mana|siapa)\b/i.test(clean)
    || /(status|tahap|jenis|layanan|butir|isi)\w*\s+[A-Z]/.test(clean);
  return clean.length <= 40 && clean.length >= 3 && (possessive || questionHead || propertyAsk) && !newValueFilter;
}

function buildSmartIntent(rawMsg, msgLower, ref, role) {
  const hasRef = !!ref && ref.kind === 'client';
  const normLower = msgLower.replace(/[-_.,]/g, ' ');
  const casual = /^(itu|yang|yg|ini|dia|si)\b/.test(msgLower)
    || /^(kalau|kalo|terus|maksudnya)\s+(yang|yg|itu|ini)\b/.test(msgLower)
    || (/\b[\w]*nya\b/.test(normLower) && !/(punya|tanya|nanya|bertanya\w*|menanya\w*)\b/i.test(msgLower))
    || /(doang|saja|aja)\b/.test(msgLower)
    || /^(kasus|permohonan|dokumen|berkas|agenda|jadwal|data)\s+yang\b/i.test(msgLower);
  const newQ = /(cari|lihat|tampilkan|rekap|dashboard|statistik|berapa|jumlah|total)/i.test(msgLower);
  const useRef = hasRef && (casual || /(terakhir|terbaru|selanjutnya|berikutnya|lanjut|lain|satu lagi|kemarin|sebelumnya|tadi)\b/i.test(msgLower));

  // REF-BASED intents (only when a client was anchored).
  if (useRef && /\b(ada (lagi|banyak)|masih ada|cuma|hanya|itu doang|itukah|mungkin|cek.*lagi|betul|benar|bener|benarkah)\b/i.test(msgLower)) {
    return { type: 'recheck', ref };
  }
  if (useRef && /\b(paling baru|terbaru|terakhir|paling akhir)\w*\b/i.test(msgLower)) {
    return { type: 'newest', ref };
  }
  // "yang tadi" / "yang kemarin" / "kalau yang satu lagi" — a pointer back to
  // the anchored topic. When there is no ref, the understanding layer already
  // asked for the subject, so this only ever runs with real context.
  if (useRef && /\b(yang\s+)?(tadi|kemarin|sebelumnya|barusan|semalam|satu\s+lagi|satunya)\b/i.test(msgLower)) {
    return { type: 'deicticRef', ref };
  }
  // "dokumennya ada?" — but a case-status question that mentions dokumen
  // ("kasus aktif ... yang dokumennya sudah tersedia") stays a CASE intent.
  const isCasey = /\b(kasus|permohonan|aktif|berjalan|diproses|berlangsung)\b/i.test(msgLower);
  if (useRef && /\b(dokumen|berkas|file|arsip)\w*\b/i.test(msgLower) && !isCasey) {
    return { type: 'docs', ref };
  }
  // "yang masih jalan berapa?" / "yang aktif ada berapa?" → count of the
  // anchored client's running cases (never a global "berapa kasus aktif?").
  if (useRef && /\b(berapa|jumlah|total)\b/i.test(msgLower)
    && /\b(aktif|berjalan|berlangsung|diproses|masih\s*jalan|belum\s*selesai)\w*\b/i.test(msgLower)) {
    return { type: 'runningCount', ref };
  }
  // "yang masih jalan?" / "yang aktif?" / "yang selesai?" — filter the
  // anchored client's cases by status instead of dumping everything.
  let statusFilter = null;
  if (/\b(masih|sedang|lagi|belum)\s+(jalan|berjalan|berlangsung|aktif|diproses|proses)\b/i.test(msgLower)
    || /^(yang|yg|itu)\s+(aktif|berjalan|berlangsung|proses|diproses)\b/i.test(msgLower)) {
    statusFilter = 'running';
  } else if (/^(yang|yg|itu)\s+(selesai|beres|lengkap|sudah\s+selesai)\b/i.test(msgLower) || /\b(sudah|yang)\s+selesai\b/i.test(msgLower)) {
    statusFilter = 'finished';
  }
  if (useRef && statusFilter) {
    return { type: 'statusFilter', ref, filter: statusFilter };
  }
  // (E) "apakah datanya lengkap?"
  if (hasRef && /\b(lengkap|belum lengkap|kurang lengkap|belum kuat|belum siap)\w*\b/i.test(msgLower)) {
    return { type: 'incomplete', ref };
  }
  // "jumlahnya berapa?" / "totalnya?" — number of the anchored client's cases.
  if (useRef && /\b(jumlahnya|totalnya|banyaknya|berapa\s+banyak|semuanya\s+berapa|berapa\s+semuanya)\b/i.test(msgLower)) {
    return { type: 'refCount', ref };
  }
  // (B, D) "kasusnya apa saja?" / "bagaimana statusnya?"
  if (useRef && /\b(kasus|permohonan|proses|status|tahap|berjalan|aktif)\w*\b/i.test(msgLower)) {
    return { type: 'cases', ref };
  }
  if (hasRef && /\b(agenda|jadwal|penandatangan\w*|meeting)\b/i.test(msgLower)) {
    return { type: 'agenda', ref };
  }
  // Contact field of the anchored client — "nomornya?", "no hp-nya?".
  if (useRef && /\b(nomor|telepon|no\.?\s*(hp|telp)|hp-nya?|telp|kontak)\w*\b/i.test(msgLower)
    && !/\b(kasus|permohonan|akta|kasus ?no)\b/i.test(msgLower)) {
    return { type: 'contact', ref };
  }
  // "yang masih berjalan berapa?" / "yang aktif ada berapa?" → count of the
  // anchored client's running cases (never a global "berapa kasus aktif?").
  if (useRef && /\b(berapa|jumlah|total)\b/i.test(msgLower)
    && /\b(aktif|berjalan|berlangsung|diproses|masih\s*jalan|belum\s*selesai)\w*\b/i.test(msgLower)) {
    return { type: 'runningCount', ref };
  }
  // Bare confirmation after an existence answer — "iya", "ya", "tampilkan".
  if (hasRef && /^(iya|ya|yaa|yap|boleh|mau|tampilkan|detail|liat|lihat|show|gas)\s*[.!?]*$/i.test(msgLower)) {
    return { type: 'detail', ref };
  }
  // "ada data-nya?" / "gak ada?" — existence of the anchored client itself.
  if (useRef && /\b(ada|apakah ada|masih ada|gak ada|tidak ada)\w*\b/i.test(msgLower)
    && !/\b(kasus|permohonan|dokumen|berkas|agenda|jadwal)\w*\b/i.test(msgLower)) {
    return { type: 'existsRef', ref };
  }

  // STANDALONE aggregates — run BEFORE the new-question guard so "berapa
  // klien yang punya lebih dari satu kasus?" is still answered relationally.
  if (/\b(lebih dari satu|lebih dari 1|punya beberapa|banyak kasus)\b/i.test(msgLower)
    && /\b(klien|client|customer)\b/i.test(msgLower)) {
    return { type: 'clientsGt1' };
  }
  if (/\b(paling (banyak|banyaknya)|terbanyak|tertinggi|nomor satu)\b/i.test(msgLower)
    && /\b(kasus|permohonan)\w*\b/i.test(msgLower)
    && !/\bberapa\b/i.test(msgLower)) {
    return { type: 'topClient' };
  }
  if (/\b(belum selesai|belum tuntas|belum beres|masih berjalan|masih berproses|masih proses)\b/i.test(msgLower)
    && /\b(kasus|permohonan|berkas)\w*\b/i.test(msgLower)
    && !hasRef && !newQ) {
    return { type: 'runningNow' };
  }
  if (/\b(agenda|jadwal|penandatanganan|penandatangan|meeting)\b/i.test(msgLower)
    && !hasRef && !newQ) {
    return { type: 'agendaAll' };
  }
  if (/\b(apa|kasus|permohonan)\S* .*(paling baru|terbaru)\b/i.test(msgLower)) {
    return { type: 'newestAll' };
  }
  if (/\b(ada|apakah ada)\b.*\b(belum lengkap|kurang lengkap)\b/i.test(msgLower)
    && /\b(kasus|berkas)\w*\b/i.test(msgLower)) {
    return { type: 'incompleteAll' };
  }
  // TIME WINDOW "bulan ini / minggu ini / hari ini / tahun ini" — real counts.
  if (/(bulan ini|bulan sekarang|minggu ini|hari ini|tahun ini)/.test(msgLower)) {
    return { type: 'window', ref: hasRef && ref && ref.id ? ref : null };
  }
  if (newQ) return null;
  return null;
}

function fmtSmart(smart, role, msgLower) {
  const ref = smart.ref;
  if (smart.type === 'recheck') {
    if (!ref || !ref.id) return 'Klien mana yang ingin Anda cek? Coba sebutkan namanya, misal: cek data Hasbi.';
    return fmtRecheck(clientGraph(ref.id, role), ref);
  }
  if (smart.type === 'existsRef') {
    if (!ref || !ref.id) return 'Data siapa yang ingin Anda cek? Coba sebutkan namanya.';
    const g = clientGraph(ref.id, role);
    if (!g && !g.cases.length && !g.documents.length && !g.phone) return `Sejauh data yang tersedia, data ${ref.name} tidak ditemukan.`;
    return `Ya, data ${ref.name} ada tercatat di Noffice (${fmtNum(g.cases.length)} kasus). Mau saya tampilkan detailnya?`;
  }
  if (smart.type === 'newest') {
    if (!ref || !ref.id) return 'Klien mana yang paling barunya? Coba sebutkan namanya.';
    const g = clientGraph(ref.id, role);
    if (!g.cases.length) return `Belum ada kasus yang tercatat untuk ${ref.name}.`;
    const sorted = [...g.cases].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const top = sorted.slice(0, 3);
    return `Kasus paling baru milik ${ref.name}:\n${top.map((c, i) => caseItem(i + 1, c)).join('\n')}\nSisanya ${fmtNum(sorted.length - top.length)} kasus lama ditandai berdasarkan tanggal masuk.`;
  }
  if (smart.type === 'deicticRef') {
    if (!ref || !ref.id) return 'Data yang mana? Coba sebutkan nama client, nomor kasus, atau judul dokumen.';
    return fmtRecheck(clientGraph(ref.id, role), ref);
  }
  if (smart.type === 'statusFilter') {
    if (!ref || !ref.id) return 'Kasus milik siapa yang ingin Anda lihat? Coba sebutkan nama kliennya.';
    const g = clientGraph(ref.id, role);
    if (!g.cases.length) return `Belum ada kasus yang tercatat untuk ${ref.name}.`;
    if (smart.filter === 'running') {
      const run = g.cases.filter((c) => !FINAL_CASE_STATUSES.includes(String(c.status || '')));
      if (!run.length) return `Semua kasus ${ref.name} sudah selesai.`;
      return `${ref.name} memiliki ${fmtNum(run.length)} kasus yang masih berjalan:\n${run.map((c, i) => caseItem(i + 1, c)).join('\n')}`;
    }
    const done = g.cases.filter((c) => FINAL_CASE_STATUSES.includes(String(c.status || '')));
    if (!done.length) return `Semua kasus ${ref.name} masih berjalan, belum ada yang selesai.`;
    return `${ref.name} memiliki ${fmtNum(done.length)} kasus yang sudah selesai:\n${done.map((c, i) => caseItem(i + 1, c)).join('\n')}`;
  }
  if (smart.type === 'docs') {
    if (!ref || !ref.id) return 'Klien mana yang dokumennya ingin Anda lihat? Coba sebutkan namanya.';
    const g = clientGraph(ref.id, role);
    if (!g.documents.length) return `Sejauh data yang tersedia, belum ada dokumen yang terdeteksi milik ${ref.name}. Dokumen di Noffice dikaitkan lewat nama penulisnya, dan belum ada yang cocok.`;
    return `Dokumen yang terdeteksi terkait ${ref.name}:\n${g.documents.map((d, i) => `${i + 1}. ${d.title}${d.author ? ` (penulis: ${d.author})` : ''}${d.category ? `  kategori: ${d.category}` : ''}`).join('\n')}`;
  }
  if (smart.type === 'incomplete' || smart.type === 'incompleteAll') {
    const rows = ref && ref.id ? incompleteCases(ref.id) : incompleteCases();
    if (!rows.length) return 'Tidak ada kasus dengan status belum lengkap di database Noffice. Semua berkas sudah lengkap.';
    return `Kasus yang masih belum lengkap:\n${rows.map((c, i) => caseItem(i + 1, c)).join('\n')}`;
  }
  if (smart.type === 'cases') {
    if (!ref || !ref.id) return 'Kasus milik siapa? Coba sebutkan nama kliennya, misal: kasus Hasbi apa saja.';
    const g = clientGraph(ref.id, role);
    if (!g.cases.length) return `Belum ada kasus yang tercatat untuk ${ref.name} di database Noffice.`;
    const running = g.cases.filter((c) => !FINAL_CASE_STATUSES.includes(String(c.status || ''))).length;
    // When the question also asks about dokumen/berkas, annotate each case
    // with doc availability (honest heuristic: doc title/author contains the
    // case number or client name).
    const wantDoc = msgLower && /\b(dokumen|berkas|tersedia|lengkap)\w*\b/i.test(msgLower);
    const items = g.cases.map((c, i) => caseItem(i + 1, c, wantDoc ? (documentsForCase(c, ref.name).length ? 'Dokumen tersedia.' : 'Dokumen belum terdeteksi.') : null));
    return `${ref.name} memiliki ${fmtNum(g.cases.length)} kasus${running ? ` (${fmtNum(running)} masih berjalan)` : ''}:\n${items.join('\n')}`;
  }
  if (smart.type === 'agenda') {
    if (!ref || !ref.id) return 'Agenda siapa? Coba sebutkan nama kliennya.';
    const rows = agendaForClient(ref.id);
    if (!rows.length) return `Belum ada agenda penandatanganan/jadwal yang tercatat untuk ${ref.name}.`;
    return `Agenda terkait ${ref.name}:\n${rows.map((r, i) => `${i + 1}. ${r.appointmentDate}${r.appointmentTime ? ' ' + r.appointmentTime : ''}  ${serviceLabel(r.serviceType)}`).join('\n')}`;
  }
  if (smart.type === 'agendaAll') {
    const rows = allAgenda(role);
    if (!rows.length) return 'Belum ada jadwal penandatanganan yang tercatat di database Noffice. Data agenda masih kosong.';
    return `Agenda penandatanganan yang tercatat di database:\n${rows.map((r, i) => `${i + 1}. ${r.appointmentDate}${r.appointmentTime ? ' ' + r.appointmentTime : ''}  ${serviceLabel(r.serviceType)}${r.clientName ? '  (' + r.clientName + ')' : ''}${r.caseNumber ? '  ' + r.caseNumber : ''}`).join('\n')}`;
  }
  if (smart.type === 'runningNow') {
    const all = clientsCaseCount('all', 50).filter((r) => r.running > 0);
    if (!all.length) return 'Saat ini tidak ada kasus yang masih berjalan di database Noffice.';
    return `Kasus yang masih berjalan saat ini:\n${all.map((r, i) => `${i + 1}. ${r.name}: ${fmtNum(r.running)} kasus dari total ${fmtNum(r.total)}`).join('\n')}`;
  }
  if (smart.type === 'incompleteAll') {
    const rows = incompleteCases();
    if (!rows.length) return 'Tidak ada kasus dengan status belum lengkap di database Noffice. Semua berkas sudah lengkap.';
    return `Kasus yang masih belum lengkap:\n${rows.map((c, i) => caseItem(i + 1, c)).join('\n')}`;
  }
  if (smart.type === 'clientsGt1') {
    const rows = clientsCaseCount('gt1');
    if (!rows.length) return 'Tidak ada klien yang memiliki lebih dari satu kasus di database Noffice.';
    return `Klien dengan lebih dari satu kasus:\n${rows.map((r, i) => `${i + 1}. ${r.name}: ${fmtNum(r.total)} kasus${Number(r.running) ? `, ${fmtNum(r.running)} masih berjalan` : ''}`).join('\n')}`;
  }
  if (smart.type === 'topClient') {
    const rows = clientsCaseCount('top');
    if (!rows.length) return 'Belum ada kasus yang tercatat.';
    const t = rows[0];
    return `Klien dengan kasus terbanyak adalah ${t.name} dengan ${fmtNum(t.total)} kasus${Number(t.running) ? `, dan ${fmtNum(t.running)} di antaranya masih berjalan` : ''}.`;
  }
  if (smart.type === 'newestAll') {
    const rows = newestCases(3);
    if (!rows.length) return 'Belum ada kasus yang tercatat di database Noffice.';
    return `Kasus paling baru yang tercatat:\n${rows.map((c, i) => caseItem(i + 1, c)).join('\n')}`;
  }
  if (smart.type === 'detail') {
    if (!ref || !ref.id) return 'Klien mana yang mau Anda lihat detailnya? Coba sebutkan namanya.';
    const g = clientGraph(ref.id, role);
    if (!g.foundAny) return `Belum ada data klien ${ref.name} di Noffice.`;
    const lines = [clientProfileBlock(g.client, role === 'admin')];
    const running = g.cases.filter((c) => !FINAL_CASE_STATUSES.includes(String(c.status || ''))).length;
    if (g.cases.length) {
      lines.push(`Kasus terkait (${fmtNum(g.cases.length)} total${running ? `, ${fmtNum(running)} masih berjalan` : ''}):`);
      g.cases.forEach((c, i) => lines.push(caseItem(i + 1, c)));
    }
    if (g.documents.length) lines.push(`Dokumen terdeteksi terkait: ${fmtNum(g.documents.length)}.`);
    return lines.join('\n');
  }
  if (smart.type === 'contact') {
    if (!ref || !ref.id) return 'Nomor siapa yang ingin Anda lihat? Coba sebutkan nama kliennya.';
    const cl = clientGraph(ref.id, role).client || {};
    const phone = String(cl.phone || '').trim();
    if (!phone) return `Belum ada nomor telepon yang tercatat untuk ${ref.name} di Noffice.`;
    return `Nomor telepon ${ref.name}: ${phone}.`;
  }
  if (smart.type === 'runningCount') {
    if (!ref || !ref.id) return 'Kasus siapa yang jumlah berjalannya ingin Anda lihat? Coba sebutkan nama kliennya.';
    const g = clientGraph(ref.id, role);
    if (!g.cases.length) return `Belum ada kasus yang tercatat untuk ${ref.name}.`;
    const running = g.cases.filter((c) => !FINAL_CASE_STATUSES.includes(String(c.status || ''))).length;
    return running
      ? `${ref.name} memiliki ${fmtNum(running)} kasus yang masih berjalan, dari total ${fmtNum(g.cases.length)} kasus.`
      : `Semua kasus ${ref.name} sudah selesai (${fmtNum(g.cases.length)} kasus).`;
  }
  if (smart.type === 'refCount') {
    if (!ref || !ref.id) return 'Jumlah kasus siapa yang ingin Anda lihat? Coba sebutkan nama kliennya.';
    const g = clientGraph(ref.id, role);
    if (!g.cases.length) return `Belum ada kasus yang tercatat untuk ${ref.name}.`;
    const running = g.cases.filter((c) => !FINAL_CASE_STATUSES.includes(String(c.status || ''))).length;
    return `${ref.name} memiliki total ${fmtNum(g.cases.length)} kasus${running ? `, ${fmtNum(running)} di antaranya masih berjalan` : ''}.`;
  }
  if (smart.type === 'window') {
    const range = windowRange(msgLower);
    const scoped = ref && ref.id && /\b(yang|nya|tadi|kali ini)\b/i.test(msgLower);
    if (scoped) {
      const g = clientGraph(ref.id, role);
      const n = clientCasesInPeriod(ref.id, range.start, range.end);
      return `${ref.name} memiliki ${fmtNum(n)} kasus yang tercatat pada ${range.label}, dari total ${fmtNum(g.cases.length)} kasus miliknya.`;
    }
    const s = statsInPeriod(range.start, range.end);
    return `Pada ${range.label} tercatat ${fmtNum(s.cases)} kasus/permohonan, ${fmtNum(s.clients)} klien baru, dan ${fmtNum(s.docs)} dokumen di Noffice, berdasarkan tanggal masuk. Kasus aktif bukan berarti tanggal masuk hari ini, ya.`;
  }
  return null;
}

// Resolve "hari ini / minggu ini / bulan ini / tahun ini" to real date bounds.
function windowRange(msgLower, now = new Date()) {
  const y = now.getFullYear();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let start = iso(now), end = iso(now), label = 'hari ini';
  if (/hari ini/.test(msgLower)) { label = 'hari ini'; }
  else if (/minggu ini/.test(msgLower)) {
    const d = new Date(now);
    const back = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - back);
    start = iso(d); end = iso(now); label = 'minggu ini';
  } else if (/tahun ini/.test(msgLower)) {
    start = `${y}-01-01`; end = iso(now); label = 'tahun ini';
  } else {
    start = `${y}-${String(now.getMonth() + 1).padStart(2, '0')}-01`; end = iso(now); label = 'bulan ini';
  }
  return { start, end, label };
}

// Small-talk openers that need NO data ("lah aku mau nanya kok", "permisi
// saya mau bertanya", "saya mau minta bantuan", "min mau tanya") — answered
// warmly instead of a robotic "tidak dipahami". Meaning-based: interjections
// and politeness words are stripped, then the ask-intent is inferred from
// modal + ask-verb, with NO hardcoded sentence list.
function smallTalkIntent(norm, hasEntity) {
  if (hasEntity) return null;
  if (hasDataDomain(norm)) return null;
  if (getNotaryLegalAnswer(norm, norm)) return null;

  if (detectAskCheck(norm)) {
    return { reply: 'Tentu. Mau saya cek data klien, kasus, atau dokumen? Bisa sebutkan juga nama atau nomor yang lebih spesifik.', pending: { type: 'choice' } };
  }

  if (isAddressOnly(norm)) {
    return { reply: 'Tentu, silakan. Apa yang ingin Anda tanyakan?', pending: null };
  }

  if (detectAskIntent(norm)) {
    if (/\b(bingung|pusing)\b/.test(norm)) {
      return { reply: 'Tidak masalah, saya di sini untuk membantu. Anda ingin bertanya soal data klien, kasus, dokumen, atau hal lain?', pending: null };
    }
    if (/bantu|tolong|bantuan/.test(norm) && !/\btanya/.test(norm)) {
      return { reply: 'Tentu, saya siap membantu. Apa yang ingin Anda tanyakan?', pending: null };
    }
    return { reply: 'Tentu, silakan. Apa yang ingin Anda tanyakan?', pending: null };
  }

  return null;
}

// Short, unambiguous answer to a pending "siapa nama client?" — a 1..3 word
// name-like reply with no question/data/meta verb in it ("Daffa", "Daffa aja").
function extractBareName(norm) {
  if (/\b(berapa|siapa|apa|mana|kenapa|kapan|gimana|bagaimana|apakah|tolong|gak|enggak|tidak|ya|tidak|bisa|boleh|mau|ingin|yang|yg|itu|ini|dia|aja|doang|saja)\b/.test(norm)) return null;
  const words = norm.split(/\s+/).filter(Boolean);
  if (!words.length || words.length > 3) return null;
  return words.join(' ');
}

// Answer to a pending "klien / kasus / dokumen?" choice question.
function matchChoice(norm) {
  if (/\b(berapa|total|jumlah|semua|daftar|list|rekap|status|nomor|no\.?|cari|cek|lihat|tampilkan|mana|siapa|apa|yang|yg|lalu|tadi)\b/.test(norm)) return null;
  const words = norm.split(/\s+/).filter(Boolean);
  if (words.length > 4) return null;
  if (/\b(klien|client|customer|nasabah)\b/.test(norm)) return 'klien';
  if (/\b(kasus|permohonan|perkara)\b/.test(norm)) return 'kasus';
  if (/\b(dokumen|berkas|arsip|file)\b/.test(norm)) return 'dokumen';
  return null;
}

// A clarifying question that needs no data query.
function clarif(reply) {
  aiLog(`Intent: CLARIFY`);
  aiLog(`Final response: ${reply.split('\n')[0]}...`);
  return copilot(reply, 'CLARIFY', {});
}

// Re-answer a stored (non-client) topic when the user points back at it with
// a follow-up ("yang tadi caranya?", "itu gimana?", "kalau yang itu berapa?").
// The topic carries a short recap of what was said; this replies from that
// recap + an honest pointer, never from invented facts.
function topicFollowUpReply(topic, msgLower) {
  if (!topic) return null;
  const label = topic.label || 'topik tadi';
  const recap = topic.recap || (topic.kind === 'feature' ? `topik ${label}` : `data ${label}`);
  const askDetail = /\b(ulangi|ulang|lanjut|lagi|caranya|gimana caranya|bagaimana caranya|jelasin|detail|lebih lanjut|kalau.*itu.*berapa|berapa.*itu)\b/i.test(msgLower);
  let extra = '';
  switch (topic.kind) {
    case 'feature':
      extra = askDetail
        ? '\nMau saya ulangi langkah-langkah lengkapnya? Sebutkan "ya" dan saya akan buka kembali panduannya.'
        : '';
      break;
    case 'dataset':
      extra = '\nMau saya tampilkan datanya kembali atau hitung lagi jumlahnya?';
      break;
    case 'legal':
    case 'general':
      extra = '\nMau penjelasan lebih lanjut soal hal ini?';
      break;
    default:
      extra = '';
  }
  return `Sebelumnya kita membahas ${label}: ${recap}.${extra}`;
}

// Vague "coba cek" / "tolong lihat" (no subject) — ask ONE simple question
// instead of the UNKNOWN "tidak dipahami" wall.
function isAmbiguousAsk(msgLower) {
  return /^(coba|tolong|mohon|silahkan|ayo)\s+(cek|lihat|periksa|cari|tampilkan|kasih|infokan)\s*[.!?]*$/i.test(msgLower)
    || /^(coba|tolong)\s+(cek|lihat|periksa)\b/i.test(msgLower);
}

// A "name found in this message" only counts when it is STRONG enough to
// route the whole turn to entity search. Fuzzy hits on tiny interjection
// tokens ("lah aku mau nanya kok" touching "lah") must NOT block the opener.
function realNameMention(raw, ent) {
  if (!ent) return null;
  const norm = String(raw || '').toLowerCase().replace(/[^a-z0-9\s]/gi, ' ');
  const name = String(ent.name || ent.term || '').toLowerCase().replace(/[^a-z0-9\s]/gi, ' ').trim();
  if (!name) return null;
  if (norm.includes(name)) return ent;
  const strong = name.split(/\s+/).filter((w) => w.length >= 4);
  if (strong.some((w) => norm.includes(w))) return ent;
  return null;
}

// Which proper names does THIS message (ignoring conversation context) fuzzy
// match in the entity vocabulary? Returns { named, names } or null.
// Used to NOT ask "siapa namanya?" when the user already wrote a name with a
// typo ("klien Daffa"), and to NOT let a stale ref hijack a message that names
// someone new ("client Siska kasusnya apa saja"). Context is excluded so a
// bare pointer ("kasusnya?") can still resolve through the reference layer.
function mentionAnchor(raw, role, page) {
  try {
    const plan = buildEntityPlan(raw, { role, context: null, page });
    if (!plan || plan.matchedCount < 1) return null;
    const rows = (plan.matched || [])
      .map((m) => m && (m.display || m.name) ? String(m.display || m.name) : null)
      .filter((n) => n && n.length && /[a-z]/i.test(n));
    return { named: rows.length > 0, names: rows.map((n) => n.toLowerCase().replace(/\s+/g, ' ').trim()) };
  } catch {
    return null;
  }
}

export async function generateCopilotResponse(userMessage, contextData = {}, sessionInfo = {}) {
  if (!userMessage || !userMessage.trim()) {
    return copilot('Silakan ketik pertanyaan Anda.', 'UNKNOWN', {});
  }

  let rawMsg = userMessage.trim();
  let msgLower = rawMsg.toLowerCase();
  const role = sessionInfo?.role || 'admin';
  const token = sessionInfo?.token || 'anon';
  const normLower = normalizeText(rawMsg);
  const entityMention = realNameMention(rawMsg, findEntityName(rawMsg));

  // ----------------------------------------------------------------------
  // CONVERSATION PATH — greetings / thanks / capabilities / identity.
  // ----------------------------------------------------------------------
  const conv = detectConversation(rawMsg);
  if (conv) {
    aiLog(`Intent: ${String(conv).toUpperCase()} (${rawMsg})`);
    aiLog(`Final response: ${CONVERSATION_REPLIES[conv].split('\n')[0]}...`);
    return copilot(CONVERSATION_REPLIES[conv], CONVERSATION_INTENTS[conv], {});
  }

  // SMALL TALK — openers that need no data ("lah aku mau nanya kok", "permisi
  // saya mau bertanya", "saya mau minta bantuan") get a warm, short reply
  // instead of UNKNOWN. Interjections/politeness are normalized first.
  const smallTalk = smallTalkIntent(normLower, entityMention);
  if (smallTalk) {
    if (smallTalk.pending) setPending(token, smallTalk.pending);
    aiLog(`Intent: SMALL_TALK (${rawMsg})`);
    aiLog(`Final response: ${smallTalk.reply.split('\n')[0]}...`);
    return copilot(smallTalk.reply, 'GENERAL', {});
  }

  // How-to / legal-knowledge questions must NOT hit the database. "gimana" /
  // "bagaimana" alone is NOT enough (that also appears in reference follow-ups
  // like "yang kasusnya gimana?") — it only counts when asking for a HOW
  // (cara/alur/buat/proses/...).
  const gimanaHowTo = /\b(gimana|bagaimana)\s+(cara|caranya|alur|proses|membuat|buat|bikin|mengurus|urus|menjadi|jadi|mulai|langkah)\b/i;
  const isAskingHowTo = /\b(syarat|persyaratan|cara|caranya|buat|bikin|alur|apa itu|maksud|rumus|langkah)\b/i.test(msgLower)
    || gimanaHowTo.test(msgLower);
  const isGreeting = conv === 'greeting';

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
      return copilot(appAnswer, 'APPLICATION', {});
    }

    // ----------------------------------------------------------------------
    // NOTARY & PPAT LEGAL KNOWLEDGE — authoritative legal knowledge base for
    // Indonesian Notary & PPAT practice (UUJN, UUPA, PP 24/1997, PP 37/1998,
    // 8 Akta PPAT, perizinan AHU, perpajakan transaksi, pertanahan BPN, dsb).
    // Answers legal requirements, conceptual queries, regulations, and taxes.
    // ----------------------------------------------------------------------
    const legalAnswer = getNotaryLegalAnswer(rawMsg, msgLower);
    if (legalAnswer) {
      aiLog(`Intent: LEGAL_KNOWLEDGE (${legalAnswer.id}) | ${rawMsg}`);
      aiLog(`Final response: ${legalAnswer.reply.split('\n')[0]}...`);
      return copilot(legalAnswer.reply, 'LEGAL_KNOWLEDGE', { topic: legalAnswer.id });
    }
  }

  // ----------------------------------------------------------------------
  // SEMANTIC ROUTER — broad, meaning-based answer layer for Noffice FEATURE
  // questions (tema, upload, trash, backup, akta, bahasa, keamanan, tanda
  // terima, AI Extract KTP), TROUBLESHOOTING, and non-client TOPIC FOLLOW-UPS
  // ("yang tadi caranya?"). Built on bag-of-stems + fuzzy typo matching, so
  // unseen phrasings ("ganti tampilannya jadi item dong", "cara bikin halaman
  // gelap") land on the right feature WITHOUT any sentence template.
  //
  // It explicitly DOES NOT talk to the database: statistics/data-domain
  // questions never reach here (getSemanticHelp guards them), and the intent
  // labels below only cover app features + troubleshooting + topic pointers.
  // ----------------------------------------------------------------------
  if (!isGreeting) {
    const page = contextData && contextData.page ? contextData.page : null;
    const semRoute = semanticRoute(normLower);
    aiLog(`Semantic route: ${semRoute.label} (conf=${semRoute.score}) | ${rawMsg}`);

    // Non-client topic follow-up: a prior FEATURE answer ("cara ubah tema")
    // followed by "yang tadi caranya?"/"itu gimana?" resumes that topic.
    // Client-based follow-ups ("itu doang yang punya Hasbi?") still take the
    // reference path below — a stored client ref always has priority.
    const _convNow = getConv(token);
    const _hasClientRef = !!( _convNow && _convNow.ref && _convNow.ref.name );
    if (!_hasClientRef && !entityMention && getTopic(token) && isTopicFollowUp(normLower)) {
      const topic = getTopic(token);
      const rev = topicFollowUpReply(topic, normLower);
      if (rev) {
        aiLog(`Intent: CONTEXT_FOLLOWUP (${rawMsg}) | topic=${topic.kind}:${topic.id || topic.label}`);
        aiLog(`Final response: ${rev.split('\n')[0]}...`);
        return copilot(rev, 'CONTEXT_FOLLOWUP', {});
      }
    }

    // TROUBLESHOOTING — honest "kok gagal?"/"kenapa error?" answers. Only when
    // the router is sure (problem words, no data/stat scope).
    if (semRoute.label === SEM_LABELS.troubleshooting) {
      const t = getTroubleshootAnswer(rawMsg, page, role);
      if (t) {
        setTopic(token, { kind: 'feature', id: 'troubleshooting', label: 'Pemecahan masalah', recap: t.split('\n')[0] });
        aiLog(`Intent: TROUBLESHOOTING (${rawMsg})`);
        aiLog(`Final response: ${t.split('\n')[0]}...`);
        return copilot(t, 'TROUBLESHOOTING', {});
      }
    }

    // NOFFICE feature help (DOCUMENT = upload/trash/restore, NOFFICE_HELP =
    // tema/settings/akta/backup/bahasa/keamanan...).
    if (semRoute.label === SEM_LABELS.noffice_help || semRoute.label === SEM_LABELS.document) {
      const h = getSemanticHelp(rawMsg, page, role);
      if (h) {
        setTopic(token, { kind: 'feature', id: h.feature.id, label: h.feature.label, recap: h.reply.split('\n')[0] });
        aiLog(`Intent: NOFFICE_HELP (${rawMsg}) | feature=${h.feature.id}`);
        aiLog(`Final response: ${h.reply.split('\n')[0]}...`);
        return copilot(h.reply, 'NOFFICE_HELP', {});
      }
    }

    // INFORMATION / CATALOG request — "data yang ada apa aja", "aplikasi ini
    // isinya apa?", "bisa ngelola data apa saja?", "selain klien ada apalagi?"
    // Answered from the REAL schema (getDomainSummary) so the app tells the
    // truth about what it holds; scoped to the current dataset topic when the
    // user is inside one ("yang tersedia apa aja" after browsing "data klien").
    // A continuation follow-up on an ACTIVE client ref ("masih ada kasus Siska
    // yang lain?", "tidak ada data yang lain?") is NOT a catalog question —
    // it rechecks that client's records on the data path below.
    const catContinuation = _hasClientRef && !entityMention && /\b(masih ada|yang lain|ada lagi|apalagi|data yang lain|tadi|terus)\b/i.test(normLower);
    if (semRoute.label === SEM_LABELS.information && !catContinuation) {
      const priorTopic = getTopic(token);
      const infoReply = fmtCatalog(role, rawMsg, priorTopic);
      setTopic(token, { kind: 'general', id: 'catalog', label: 'Data yang tersedia', recap: infoReply.split('\n')[0] });
      aiLog(`Intent: INFORMATION_REQUEST (${rawMsg})`);
      aiLog(`Final response: ${infoReply.split('\n')[0]}...`);
      return copilot(infoReply, 'INFORMATION_REQUEST', {});
    }

    // DATA-ACTION / CRUD answers — "cara tambahin data gimana", "masukin
    // klien gimana", "cara ngedit klien", "hapus data dari mana". Resolved
    // semantically (data_act_* verb × obj_* object), answered with REAL
    // Noffice UI navigation (menu + button names). Runs for ANY route label
    // because these phrasings often name a data object (=> DATABASE route);
    // getCrudHelp self-guards: statistics/entity lookups back off to the DB.
    // A stored topic ("data klien") supplies the OBJECT for short follow-ups
    // like "masukinnya gimana?" so the topic survives the terse message.
    {
      const priorTopic = getTopic(token) || {};
      let fbObj;
      if (priorTopic.objId) fbObj = priorTopic.objId;
      else if (String(priorTopic.id || '').startsWith('crud_') && String(priorTopic.id).split('_').length >= 3) fbObj = String(priorTopic.id).split('_')[2];
      const crud = getCrudHelp(rawMsg, page, role, { entityMention: !!entityMention, fallbackObjId: fbObj });
      if (crud) {
        setTopic(token, { kind: 'feature', id: crud.feature.id, label: crud.feature.label, recap: crud.reply.split('\n')[0], objId: crud.feature.objId });
        aiLog(`Intent: DATA_ACTION (${rawMsg}) | ${crud.feature.id}`);
        aiLog(`Final response: ${crud.reply.split('\n')[0]}...`);
        return copilot(crud.reply, 'DATA_ACTION', {});
      }
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

    // ------------------------------------------------------------------
    // UNDERSTANDING LAYER — pending replies & vague/no-context asks.
    //
    // 1) If the Copilot just asked a question ("siapa nama client?") and the
    //    user replies with the short answer ("Daffa", "kasus"), honor it.
    // 2) A client request with NO name ("cek data salah satu client") gets
    //    ONE clarifying question instead of a wrong "tidak ada data" wall.
    // 3) A bare pointer with no context ("yang tadi", "jumlahnya berapa?")
    //    asks what data is meant.
    // ------------------------------------------------------------------
    const convMem = getConv(token);
    const pendingSlot = getPending(token);
    const hasEntity = !!entityMention;
    const anchorHere = mentionAnchor(rawMsg, role, page);

    if (pendingSlot) {
      if (pendingSlot.type === 'name' && !hasEntity) {
        const bare = extractBareName(normLower);
        if (bare) {
          clearPending(token);
          aiLog(`Intent: PENDING_NAME (${bare})`);
          // Rewrite the turn as a regular search; the entity loop below
          // resolves "Daffa" -> the real client Dafffa.
          rawMsg = `cari ${bare}`;
          msgLower = rawMsg.toLowerCase();
          pushHistory(token, rawMsg);
        } else {
          clearPending(token);
        }
      } else if (pendingSlot.type === 'choice' && !hasEntity) {
        const choice = matchChoice(normLower);
        if (choice) {
          clearPending(token);
          if (choice === 'klien') {
            setPending(token, { type: 'name' });
            return clarif('Baik. Siapa nama client yang ingin Anda cek? Sebutkan namanya.');
          }
          if (choice === 'kasus') {
            const rows = newestCases(6);
            const reply = `Baik. Berikut kasus/permohonan yang tercatat di Noffice:\n${rows.map((c, i) => caseItem(i + 1, c)).join('\n')}`;
            aiLog(`Intent: DATABASE (${rawMsg})`);
            aiLog(`Final response: ${reply.split('\n')[0]}...`);
            return copilot(reply, 'DATABASE_QUERY', { table: 'cases', count: rows.length });
          }
          if (choice === 'dokumen') {
            setPending(token, { type: 'name' });
            return clarif('Baik, kita lihat bagian dokumen. Siapa nama client-nya? Nanti saya tampilkan dokumen terkaitnya.');
          }
        } else {
          clearPending(token);
        }
      } else {
        clearPending(token);
      }
    }

    // Vague/no-context asks → ONE clarifying question (never the UNKNOWN
    // wall). Skipped when a real entity already exists. A stale ref is also
    // ignored when the user EXPLICITLY switches topic ("sekarang client lain").
    if (!hasEntity) {
      const switchingTopic = /\b(sekarang|ganti|pindah|lanjut)\b[^?!]*\b(lain|berikutnya|selanjutnya)\b/i.test(normLower)
        || /\b(client|klien|customer|nasabah)\s+lain\b/i.test(normLower);
      let vagueReply = null;
      let vaguePending = null;
      if (!(convMem && convMem.ref) && detectDeicticNoContext(normLower)) {
        vagueReply = 'Sebelumnya kita belum membahas data tertentu. Data yang mana yang ingin Anda lihat? Sebutkan nama client, nomor kasus, atau ketik: klien / kasus / dokumen.';
        vaguePending = { type: 'choice' };
      } else if (!(convMem && convMem.ref) && detectVagueDomainAsk(normLower)) {
        vagueReply = 'Tentu. Bagian kasus/permohonan mana yang ingin Anda lihat? Sebutkan nama client atau nomor kasusnya, atau minta saya tampilkan kasus yang sedang berjalan.';
      } else if (detectClientAskNoName(normLower) && !(anchorHere && anchorHere.named)
        && (!(convMem && convMem.ref) || switchingTopic)) {
        vagueReply = 'Tentu. Siapa nama client yang ingin Anda cek? Sebutkan namanya.';
        vaguePending = { type: 'name' };
      } else if (!(convMem && convMem.ref)
        && /\b(nomor\s*(hp|telp|telepon)|no\.?\s*(hp|telp|telepon)|hp-nya|telp-nya|kontaknya)\b/i.test(normLower)) {
        vagueReply = 'Siapa nama client yang nomor kontaknya ingin Anda lihat? Sebutkan namanya.';
        vaguePending = { type: 'name' };
      }
      if (vagueReply) {
        if (vaguePending) setPending(token, vaguePending);
        return clarif(vagueReply);
      }
    }

    // 0) REFERENCE LAYER — follow-ups ("kasusnya apa saja?", "dokumennya ada?",
    //    "itu doang kah?", "yang paling baru yang mana?") reuse the memory of
    //    the previous turn ONLY when a client/topic was anchored. A reference
    //    is never applied to a brand-new question (cari/lihat/berapa/...) nor
    //    when the message itself names a DIFFERENT person than the anchor
    //    (fuzzy: "client Siska"). Re-stating the same anchored name
    //    ("itu doang kah yang punya Hasbi?") is still a reference follow-up.
    const normRef = convMem && convMem.ref && convMem.ref.name
      ? String(convMem.ref.name).toLowerCase().replace(/\s+/g, ' ').trim() : null;
    const sameAnchor = !!anchorHere && !!normRef && anchorHere.named
      && anchorHere.names.some((n) => n === normRef || n.includes(normRef) || normRef.includes(n));
    const blockRef = !!(anchorHere && anchorHere.named && !sameAnchor);
    const refResolved = !blockRef ? resolveReferenceConversation(rawMsg, convMem, findEntityName) : null;
    const referenceNote = refResolved ? { ref: refResolved.ref, focus: refResolved.focus } : null;
    if (refResolved && refResolved.intent === 'recheck') {
      const g = clientGraph(refResolved.ref.id, role);
      const reply = fmtRecheck(g, refResolved.ref);
      aiLog(`Intent: REFERENCE_RECHECK (${refResolved.ref.name})`);
      aiLog(`Final response: ${reply.split('\n')[0]}...`);
      return copilot(reply, 'DATABASE_QUERY', { table: 'cases+clients', count: g.cases.length });
    }
    // Candidate texts to try: the raw question first, then the rephrased
    // version that embeds the resolved reference ("dokumennya ada?" →
    // "dokumen Hasbi ada?").
    const texts = [msgLower];
    if (refResolved && refResolved.rephrased && refResolved.rephrased.toLowerCase() !== msgLower) {
      texts.push(refResolved.rephrased.toLowerCase());
    }

    // 0b) SMART INTENTS — relational questions that are cleaner as their own
    //     handler than as a generic plan (C, D, E, F).
    // A stored ref is only given to the SMART layer when the message is a real
  // anaphoric follow-up. Brand-new self-contained questions ("siapa saja yang
  // punya kasus aktif?", "kasus apa yang statusnya Berkas Masuk?") never see
  // the old ref, so stale context can't hijack them. Same when the message
  // names someone new.
  const refForSmart = referenceNote
    ? referenceNote.ref
    : (convMem && convMem.ref && (
        isAnaphoricFollowUp(msgLower, convMem.ref)
        || /^(iya|ya|yaa|yap|boleh|mau|tampilkan|detail|lihat|show)\s*[.!?]*$/i.test(msgLower)
        || /\b(yang|nya)\b/.test(msgLower) && /(bulan ini|minggu ini|hari ini|tahun ini)/.test(msgLower)
      )) && !blockRef ? convMem.ref : null;
  const smart = buildSmartIntent(rawMsg, msgLower, refForSmart, role);
    if (smart) {
      aiLog(`Intent: SMART_${String(smart.type).toUpperCase()}${smart.ref ? ` (${smart.ref.name})` : ''}`);
      const reply = fmtSmart(smart, role, msgLower) || fmtRecheck(clientGraph(smart.ref && smart.ref.id || '', role), smart.ref || { name: '' });
      aiLog(`Final response: ${reply.split('\n')[0]}...`);
      return copilot(reply, 'DATABASE_QUERY', { table: 'relationships' });
    }

    // 1) GENERIC ENTITY SEARCH first — any real name / case number / akta
    //    number / document title / officer found in the LOCAL vocabulary
    //    ("cari Daffa", "apakah ada TEST AI?", "kasus 007 punya siapa?").
    for (const candidate of texts) {
      const entPlan = buildEntityPlan(candidate, { role, context: getContext(token), page });
      if (!entPlan) continue;
      const result = executeEntityPlan(entPlan);
      aiLog(`Entity: ENTITY_SEARCH (${entPlan.focus.toUpperCase()})`);
      aiLog(`Metric: ${result.foundAny ? 'ENTITY_FOUND' : 'ENTITY_NOT_FOUND'}`);
      aiLog(`Source: GenericEntitySearchService`);
      aiLog(`Search term: "${entPlan.term}" (${entPlan.via}) | matched=${entPlan.matchedCount} | focus=${entPlan.focus} | qtype=${entPlan.qtype}`);
      saveContext(token, { metric: 'entity', entity: 'entity', term: entPlan.term, focus: entPlan.focus, qtype: entPlan.qtype });
      const ref = deriveRefFromResult(result, entPlan);
      if (ref) setRef(token, ref);
      pushHistory(token, rawMsg);
      const reply = fmtEntityAnswer(entPlan, result, role);
      aiLog(`Final response: ${reply.split('\n')[0]}...`);
      return copilot(reply, 'DATABASE_QUERY', { table: 'entity-search', count: entPlan.matchedCount });
    }

    // 2) MULTI-DATA — "Berapa kasus aktif dan siapa saja kliennya?" is ONE
    //    question that needs TWO real queries (running-case count + the
    //    clients who own them). Answered together, never guessed.
    const combined = /\b(berapa|jumlah|total)\b/i.test(msgLower)
      && /\bkasus\b/i.test(msgLower)
      && /\b(aktif|berjalan|diproses|berlangsung)\b/i.test(msgLower)
      && /\bsiapa\b/i.test(msgLower)
      && /\bklien\w*\b/i.test(msgLower);
    if (combined) {
      let count = 0;
      try {
        const cntPlan = buildDataIntent('berapa kasus yang masih berjalan', { role, context: null, page });
        if (cntPlan && cntPlan.entity) count = Number((executeDataQuery(cntPlan).rows[0] || {}).total ?? 0);
      } catch { count = 0; }
      let ownerRows = [];
      try {
        ownerRows = runRead(
          `SELECT DISTINCT name FROM "clients" WHERE id IN (SELECT clientId FROM "cases" WHERE status NOT IN (${FINAL_CASE_STATUSES.map(() => '?').join(',')})) ORDER BY name ASC`,
          FINAL_CASE_STATUSES
        );
      } catch { ownerRows = []; }
      const names = ownerRows.map((r) => r.name).filter(Boolean);
      const reply = count === 0
        ? 'Saat ini belum ada kasus yang masih berjalan di database Noffice.'
        : names.length
          ? `Saat ini ada ${fmtNum(count)} kasus yang masih berjalan di database Noffice. Klien yang memilikinya: ${names.join(', ')}.`
          : `Saat ini ada ${fmtNum(count)} kasus yang masih berjalan di database Noffice.`;
      aiLog('Intent: MULTI_DATA (running cases + owner clients)');
      aiLog(`Final response: ${reply.split('\n')[0]}...`);
      return copilot(reply, 'DATABASE_QUERY', { table: 'cases+clients', count });
    }

    let intent = buildDataIntent(msgLower, { role, context: getContext(token), page });
    if (!intent && texts.length > 1) intent = buildDataIntent(texts[1], { role, context: getContext(token), page });
    if (intent) {
      if (intent.metric === 'domain') {
        aiLog(`Intent: SCHEMA_DOMAIN | Relevant tables: ${getDomainSummary(role).map((d) => d.label).join(', ')}`);
        return copilot(fmtDomain(role), 'DATABASE_QUERY', { table: 'schema' });
      }
      if (intent.metric === 'unsupported') {
        aiLog(`Intent: UNSUPPORTED_CONCEPT | concept "${intent.concept}"`);
        if (intent.concept === 'notifikasi') {
          return copilot(
            '🔔 Data notifikasi belum tersedia di database Noffice. Notifikasi disimpan di perangkat/browser masing-masing pengguna (local storage) — bukan di database pusat — sehingga jumlahnya tidak bisa saya baca dari sini.',
            'DATABASE_QUERY',
            { table: null }
          );
        }
        return copilot(`Data tersebut (${intent.concept}) belum tersedia di database Noffice. Saya hanya dapat membaca data sesuai tabel yang ada di sistem Anda.`, 'DATABASE_QUERY', { table: null });
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
          return copilot(reply, 'DATABASE_QUERY', { table: 'cases', count: nNotary + nPpat });
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
        const recapLine = reply.split('\n')[0].replace(/^\*\*|\*\*$/g, '');
        setTopic(token, { kind: 'dataset', id: intent.entity || result.table || 'data', label: (intent.entity || result.table || 'data').replace(/([A-Z])/g, ' $1').toLowerCase().trim(), recap: recapLine });
        aiLog(`Final response: ${reply.split('\n')[0]}...`);
        return copilot(reply, 'DATABASE_QUERY', { table: result.table, count });
      } catch (err) {
        if (err instanceof PermissionDeniedError) {
          aiLog('Permission denied:', err.message);
          return copilot('Maaf, Anda tidak memiliki izin untuk melihat data tersebut. Hubungi Admin/Notaris Utama.', 'DATABASE_QUERY', {});
        }
        if (err instanceof DbUnavailableError) {
          aiLog('DB unavailable:', err.message);
          return copilot('Saya tidak dapat mengakses data Noffice saat ini karena database tidak tersedia. Silakan coba lagi nanti.', 'DATABASE_QUERY', {});
        }
        if (err instanceof SchemaMissingError) {
          aiLog('Schema missing:', err.message);
          return copilot('Data tersebut belum tersedia di database Noffice. Saya hanya dapat membaca data kasus/permohonan, klien, dokumen, dan karyawan yang tersimpan di sistem.', 'DATABASE_QUERY', {});
        }
        aiLog('Unhandled DB error:', err.message);
        return copilot('Maaf, saya tidak berhasil memproses pertanyaan data Anda. Coba gunakan kata kunci lain seperti jumlah, daftar, atau cari.', 'DATABASE_QUERY', {});
      }
    }
  }

  // ----------------------------------------------------------------------
  // GENERAL PATH — optional local Ollama, then the offline knowledge base.
  // ----------------------------------------------------------------------
  aiLog(`Intent: GENERAL (${rawMsg})`);
  const systemPrompt = 'Anda adalah Noffice Copilot, asisten AI profesional untuk kantor Notaris dan PPAT di Indonesia. Anda menguasai penuh hukum kenotariatan (UUJN), pertanahan (UUPA, PP 24/1997, PP 37/1998), keperdataan, perpajakan transaksi (PPh, BPHTB), dan operasional kantor. Berikan jawaban dalam Bahasa Indonesia yang sangat baik, ramah, jelas, terstruktur rapi, dan solutif.';
  const ollamaResult = await queryOllama(rawMsg, 'qwen2.5', systemPrompt);
  if (ollamaResult && ollamaResult.trim()) {
    return copilot(ollamaResult, 'GENERAL', {});
  }

  const kb = generalKnowledgeBase(rawMsg, msgLower);
  if (kb) return copilot(kb, 'GENERAL', {});

  // VAGUE REQUEST — "coba cek" with no subject: one simple clarifying
  // question instead of the UNKNOWN "tidak dipahami" wall.
  if (isAmbiguousAsk(msgLower)) {
    aiLog(`Intent: CLARIFY (${rawMsg})`);
    return copilot('Tentu. Mau saya cek data klien, kasus, atau dokumen?', 'CLARIFY', {});
  }

  // ----------------------------------------------------------------------
  // UNKNOWN INTENT — natural, honest fallback (only reached when the question
  // is neither a data question, nor a legal/knowledge question). Uses any
  // stored topic for continuity and keeps the tone human, never robotic.
  // ----------------------------------------------------------------------
  aiLog('Intent: UNKNOWN');
  const _topic = getTopic(token);
  if (_topic && _topic.label) {
    return copilot(
      `Hmm, saya belum yakin yang Anda maksud. Tadi kita sedang membahas ${_topic.label}.\n\nCoba sebutkan lebih jelas: mau melihat datanya, menghitung jumlahnya, atau mencari sesuatu di dalamnya?`,
      'UNKNOWN',
      {}
    );
  }
  return copilot(
    `Saya belum sepenuhnya menangkap maksud pertanyaan Anda. Bisa dijelaskan dengan kalimat lain?\n\nSebagai Asisten Cerdas Notaris & PPAT, saya siap menjawab seputar:\n• Syarat & Prosedur Akta (AJB, Hibah, APHT, APHB, Ruislag, Pendirian PT/CV, Yayasan, Perjanjian Kawin, Wasiat, Fidusia)\n• Pertanahan BPN (Pengecekan sertifikat, Roya HT, Balik Nama, SKMHT, Pemecahan sertifikat, Peningkatan hak SHGB ke SHM)\n• Pajak Transaksi & Biaya (Simulasi PPh Final 2,5%, BPHTB 5%, PNBP BPN, Honorarium)\n• Operasional Noffice (misal: "berapa kasus aktif?", "daftar klien", "rekap kantor", "cara backup db")`,
    'UNKNOWN',
    {}
  );
}