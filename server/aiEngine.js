import http from 'http';
import { dbQuery, dbGet } from './db.js';

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
    clauseText = `PASAL 1 — PEMBEBANAN HAK TANGGUNAN
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
export async function generateCopilotResponse(userMessage, contextData = {}) {
  if (!userMessage || !userMessage.trim()) return 'Silakan ketik pertanyaan Anda.';

  const rawMsg = userMessage.trim();
  const msgLower = rawMsg.toLowerCase();

  // ----------------------------------------------------------------------
  // A. INTENT DYNAMIC SEARCH IN SQLite DATABASE (Real-time DB query)
  // ----------------------------------------------------------------------
  const isAskingHowTo = msgLower.match(/\b(syarat|persyaratan|cara|buat|bikin|bagaimana|gimana|alur|apa itu|maksud)\b/i);

  // 1. Search Files / Documents
  if (msgLower.match(/\b(file|dokumen|berkas|arsip)\b/i) && !isAskingHowTo) {
    let query = rawMsg.replace(/\b(mencari|nyari|cariin|cariiin|carikan|cari|file|dokumen|berkas|arsip|tentang|terkait|yang|sesuai|tolong|ada|dimana|mana|apa|bro|coy|dong)\b/gi, '').trim();
    query = query.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

    let docs = [];
    if (query) {
      docs = await dbQuery(`SELECT title, category, author FROM documents WHERE title LIKE ? OR description LIKE ? LIMIT 5`, [`%${query}%`, `%${query}%`]);
    } else {
      docs = await dbQuery(`SELECT title, category, author FROM documents ORDER BY dateTs DESC LIMIT 5`);
    }

    if (docs && docs.length > 0) {
      const docList = docs.map((d, i) => `${i+1}. 📄 **${d.title}** (${d.category}) — Oleh: ${d.author}`).join('\n');
      return `📁 **Hasil Pencarian Dokumen untuk "${query || 'Terbaru'}":**\n${docList}\n\n*Silakan cek menu **Dokumen** di sidebar untuk membuka atau mengunduh.*`;
    } else {
      return `Maaf, saya tidak menemukan dokumen yang relevan dengan kata kunci "${query}".`;
    }
  }

  // 2. Search Cases / Akta / Permohonan
  if (msgLower.match(/\b(kasus|permohonan|akta|status permohonan)\b/i) && !isAskingHowTo) {
    let query = rawMsg.replace(/\b(mencari|nyari|cariin|cariiin|carikan|cari|status|kasus|permohonan|akta|nomor|nomornya|terkait|tentang|yang|sesuai|tolong|ada|dimana|mana|apa|bro|coy|dong)\b/gi, '').trim();
    query = query.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

    let cases = [];
    if (query) {
      cases = await dbQuery(`SELECT caseNumber, serviceType, status, aktaNumber FROM cases WHERE caseNumber LIKE ? OR serviceType LIKE ? OR aktaNumber LIKE ? LIMIT 5`, [`%${query}%`, `%${query}%`, `%${query}%`]);
    } else {
      cases = await dbQuery(`SELECT caseNumber, serviceType, status, aktaNumber FROM cases ORDER BY createdAt DESC LIMIT 5`);
    }

    if (cases && cases.length > 0) {
      const caseList = cases.map((c, i) => `${i+1}. 📂 **${c.caseNumber}** (${c.serviceType}) — Status: \`${c.status.toUpperCase()}\`${c.aktaNumber ? ` | Akta: ${c.aktaNumber}` : ''}`).join('\n');
      return `📋 **Hasil Pencarian Permohonan untuk "${query || 'Terbaru'}":**\n${caseList}\n\n*Buka menu **Permohonan Notaris** atau **Kasus PPAT** untuk melihat detail lengkap.*`;
    } else {
      return `Maaf, saya tidak menemukan permohonan yang sesuai dengan kata kunci "${query}".`;
    }
  }

  // 3. Search Clients / Klien / NIK / Phone
  if ((msgLower.match(/\b(klien|client|pemohon|pelanggan|nik)\b/i) || msgLower.includes('nama klien')) && !isAskingHowTo) {
    let query = rawMsg.replace(/\b(mencari|nyari|cariin|cariiin|carikan|cari|data|klien|client|pelanggan|pemohon|atas|namanya|nama|orang|nomornya|nomor|hp|telepon|tentang|terkait|yang|sesuai|tolong|ada|dimana|mana|apa|si|bro|coy|dong)\b/gi, '').trim();
    query = query.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

    if (query) {
      let clients = await dbQuery(`SELECT name, nik, phone, address FROM clients WHERE name LIKE ? OR nik LIKE ? OR phone LIKE ? LIMIT 5`, [`%${query}%`, `%${query}%`, `%${query}%`]);
      if (clients && clients.length > 0) {
        const clientList = clients.map((c, i) => `${i+1}. 👤 **${c.name}** (NIK: \`${c.nik}\`) — No HP: ${c.phone}`).join('\n');
        return `👤 **Hasil Pencarian Klien untuk "${query}":**\n${clientList}\n\n*Buka menu **Klien Notaris** di sidebar untuk mengedit data.*`;
      } else {
        return `Maaf, saya tidak menemukan data klien yang sesuai dengan kata kunci "${query}".`;
      }
    }
  }

  // 4. Search Employees / Staf / Tim Kantor
  if (msgLower.match(/\b(staf|karyawan|employee|pegawai|tim|staf aktif)\b/i) && !isAskingHowTo) {
    let emps = await dbQuery(`SELECT name, role, department, email FROM employees WHERE status = 'active' LIMIT 10`);
    if (emps && emps.length > 0) {
      const empList = emps.map((e, i) => `${i+1}. 💼 **${e.name}** (${e.department || 'Kantor'}) — Role: \`${e.role}\` | Email: ${e.email}`).join('\n');
      return `👥 **Daftar Staf/Karyawan Aktif Kantor:**\n${empList}`;
    }
  }

  // 5. Query Office Statistics & Summaries
  if (msgLower.match(/\b(rekap|statistik|ringkasan|total|laporan|jumlah kasus|jumlah klien)\b/i)) {
    try {
      const caseCount = await dbGet(`SELECT count(*) as count FROM cases`);
      const clientCount = await dbGet(`SELECT count(*) as count FROM clients`);
      const docCount = await dbGet(`SELECT count(*) as count FROM documents WHERE isTrashed = 0`);
      const empCount = await dbGet(`SELECT count(*) as count FROM employees WHERE status = 'active'`);
      return `📊 **Rekap Operasional Kantor Notaris & PPAT (Noffice):**
• 📂 **Total Kasus/Permohonan:** ${caseCount?.count || 0} Kasus
• 👤 **Total Klien Terdaftar:** ${clientCount?.count || 0} Klien
• 📄 **Total Dokumen Aktif:** ${docCount?.count || 0} File
• 👥 **Staf Aktif:** ${empCount?.count || 0} Karyawan

*Semua data tersimpan aman di SQLite lokal Anda.*`;
    } catch {
      // Fallthrough
    }
  }

  // ----------------------------------------------------------------------
  // B. TRY OLLAMA FIRST IF INSTALLED & RUNNING
  // ----------------------------------------------------------------------
  const prompt = `Anda adalah Noffice Copilot, asisten AI lokal Notaris & PPAT Indonesia yang cerdas dan ramah. Jawab singkat dan tepat pertanyaan berikut:\n${rawMsg}`;
  const ollamaResult = await queryOllama(prompt);
  if (ollamaResult && ollamaResult.trim()) {
    return ollamaResult;
  }

  // ----------------------------------------------------------------------
  // C. HIGH INTENSITY OFFLINE LEGAL & OPERATIONAL KNOWLEDGE BASE
  // ----------------------------------------------------------------------

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

  // 15. Default Smart Fallback
  return `🤖 **Noffice Copilot (Asisten Notaris & PPAT Offline):**

Saya mengerti Anda menanyakan tentang **"${rawMsg}"**. Berikut beberapa hal yang dapat Anda telusuri:
• 📋 **Persyaratan Dokumen:** Ketik *"Syarat AJB"*, *"Syarat PT"*, *"Syarat Waris"*, atau *"Syarat Hibah"*.
• 📂 **Pencarian Data:** Ketik *"Dokumen"*, *"Klien"*, atau *"Status Permohonan"*.
• ⚡ **Fitur Sistem:** Ketik *"Nomor Akta"*, *"Backup Database"*, atau *"Ekstrak KTP"*.
• 🧮 **Pajak:** Ketik *"Hitung Pajak BPHTB"*.

*Tips: Semua fitur AI ini berjalan 100% lokal & offline di komputer Anda.*`;
}
