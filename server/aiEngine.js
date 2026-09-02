import http from 'http';

// Local Ollama API configuration (default port 11434)
const OLLAMA_URL = 'http://localhost:11434/api/generate';

// Helper to query local Ollama model if available
async function queryOllama(prompt, model = 'qwen2.5') {
  return new Promise((resolve, reject) => {
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
    mode: isOllamaActive ? 'Ollama LLM (Lokal)' : 'Built-in Local Smart NLP Engine (Offline)',
  };
}

// 1. AI Data Extractor (KTP / Berkas Teks)
export async function extractDocumentData(rawText) {
  if (!rawText || !rawText.trim()) {
    return { success: false, message: 'Teks kosong' };
  }

  // Try Ollama first if running
  const prompt = `Ekstrak data berikut dari teks KTP/Dokumen ke dalam format JSON murni tanpa markdown: {"nik": "", "name": "", "birthdate": "", "address": "", "phone": "", "job": ""}. Teks:\n${rawText}`;
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

  // Built-in Rule-based NLP Extractor (Offline Fallback)
  const data = {
    nik: '',
    name: '',
    birthdate: '',
    address: '',
    phone: '',
    job: '',
  };

  // NIK Extractor (16 digits)
  const nikMatch = rawText.match(/\b\d{16}\b/);
  if (nikMatch) data.nik = nikMatch[0];

  // Phone Extractor (08xx or +628xx)
  const phoneMatch = rawText.match(/\b(08\d{8,11}|\+628\d{8,11})\b/);
  if (phoneMatch) data.phone = phoneMatch[0];

  // Name Extractor
  const nameLineMatch = rawText.match(/(?:Nama|Name|Atas Nama|Pihak I|Pihak II)\s*[:=]\s*([A-Za-z\s',.]+)/i);
  if (nameLineMatch) {
    data.name = nameLineMatch[1].trim();
  }

  // Address Extractor
  const addrMatch = rawText.match(/(?:Alamat|Address|Jl\.|Jalan)\s*[:=]?\s*([^\n,]+(?:,\s*[^\n,]+)*)/i);
  if (addrMatch) {
    data.address = addrMatch[0].replace(/^(?:Alamat|Address)\s*[:=]?\s*/i, '').trim();
  }

  // Job Extractor
  const jobMatch = rawText.match(/(?:Pekerjaan|Job|Jabatan)\s*[:=]\s*([A-Za-z\s]+)/i);
  if (jobMatch) data.job = jobMatch[1].trim();

  // Date Extractor
  const dateMatch = rawText.match(/\b(\d{2}[-/.]\d{2}[-/.]\d{4}|\d{4}[-/.]\d{2}[-/.]\d{2})\b/);
  if (dateMatch) data.birthdate = dateMatch[0];

  return {
    success: true,
    data,
    engine: 'Built-in Local Smart NLP Engine',
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

  // Built-in Template Clauses Engine
  let clauseText = '';

  if (serviceType === 'AJB') {
    clauseText = `PASAL 1 — JUAL BELI
Bahwa PIHAK PERTAMA (${pihak1}) dengan ini menjual dan menyerahkan kepada PIHAK KEDUA (${pihak2}), dan PIHAK KEDUA dengan ini membeli dan menerima penyerahan dari PIHAK PERTAMA atas objek hak tanah/bangunan berupa: ${objek}${harga ? ` dengan harga yang telah disepakati sebesar ${harga}` : ''}.

PASAL 2 — JAMINAN BEBAS SENGKETA
PIHAK PERTAMA menjamin penuh kepada PIHAK KEDUA bahwa objek jual beli tersebut di atas adalah benar milik sah PIHAK PERTAMA, bebas dari sitaan, tidak tersangkut dalam suatu sengketa hukum, dan tidak sedang dijaminkan kepada pihak lain.

PASAL 3 — PENYERAHAN & BIAYA
Penyerahan fisik objek jual beli dilakukan pada saat ditandatanganinya Akta Jual Beli ini. Segala biaya pembaliknamaan sertifikat, pajak BPHTB, dan PPH ditanggung oleh para pihak sesuai dengan ketentuan perundang-undangan yang berlaku.`;
  } else if (serviceType === 'AKT-PT') {
    clauseText = `PASAL 1 — NAMA & DOMISILI PERUSAHAAN
Perseroan Terbatas ini bernama PT ${objek || 'BINA SEJAHTERA'} berkedudukan dan berkantor pusat di wilayah Republik Indonesia.

PASAL 2 — MAKSUD & TUJUAN
Maksud dan tujuan Perseroan ini adalah menjalankan usaha di bidang Perdagangan Umum, Jasa Konsultasi, dan Pengadaan Barang/Jasa sesuai peraturan perundang-undangan.

PASAL 3 — MODAL & SAHAM
Modal dasar Perseroan adalah sebesar nominal yang terbagi atas saham-saham dengan nilai nominal tertera pada daftar pemegang saham. Para pendiri (${pihak1} dan ${pihak2}) telah menyetor penuh bagian saham masing-masing pada kas Perseroan.`;
  } else if (serviceType === 'HIBAH') {
    clauseText = `PASAL 1 — PERNYATAAN HIBAH
PIHAK PERTAMA (${pihak1}) dengan ini menyerahkan secara cuma-cuma dan tanpa syarat (Causa Hibah) kepada PIHAK KEDUA (${pihak2}), dan PIHAK KEDUA menyatakan menerima hibah dari PIHAK PERTAMA atas: ${objek}.

PASAL 2 — PERSETUJUAN AHLI WARIS
Pemberian hibah ini dilakukan dengan sepengetahuan dan persetujuan dari seluruh ahli waris PIHAK PERTAMA yang sah demi hukum.`;
  } else {
    clauseText = `PASAL 1 — KESEPAKATAN PARA PIHAK
PIHAK PERTAMA (${pihak1}) dan PIHAK KEDUA (${pihak2}) sepakat untuk mengikatkan diri dalam Perjanjian atas objek: ${objek}.

PASAL 2 — HAK DAN KEWAJIBAN
Masing-masing pihak wajib melaksanakan hak dan kewajiban sesuai dengan ketentuan perundang-undangan Notaris dan Kesepakatan Bersama yang dibuat secara sah.`;
  }

  return {
    success: true,
    clauseText,
    engine: 'Built-in Local Legal Clauses Engine',
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

  // Notary Rules Engine
  if (serviceType === 'AJB') {
    if (clientData && clientData.job && clientData.job.toLowerCase().includes('pns')) {
      suggestions.push('Klien adalah PNS/ASN. Pastikan tidak ada benturan kepentingan terkait tanah negara.');
    }
    const hasTax = checklist.some((i) => i.itemName.toLowerCase().includes('bphtb') || i.itemName.toLowerCase().includes('pph'));
    if (!hasTax || uncheckedItems.some((i) => i.itemName.toLowerCase().includes('bphtb'))) {
      warnings.push('🔴 RISIKO PAJAK: Bukti setor BPHTB & PPH belum diverifikasi. Validasi SSP & SSB sangat penting sebelum Akta TTD!');
    }
    suggestions.push('💡 SARAN AUDIT: Pastikan KTP Suami/Istri hadir saat TTD Akta Jual Beli untuk memenuhi syarat persetujuan harta bersama (Pasal 36 UU Perkawinan).');
  } else if (serviceType === 'WARIS') {
    warnings.push('🔴 RISIKO WARIS: Pastikan Bagan Silsilah Waris telah distempel oleh Lurah/Kepala Desa setempat.');
    suggestions.push('💡 SARAN AUDIT: Verifikasi Surat Kematian asli dari instansi resmi sebelum menerbitkan SKW.');
  } else if (serviceType === 'AKT-PT') {
    suggestions.push('💡 SARAN AUDIT: Lakukan pengecekan pemesanan nama PT di sistem AHU Kemenkumham.');
  }

  return {
    success: true,
    status: warnings.length === 0 ? 'AMAIN / SAFE' : 'PERLU PERHATIAN',
    warnings,
    suggestions,
    engine: 'Built-in Local Notary Auditor Engine',
  };
}

// 4. Noffice Copilot Chatbot Response
export async function generateCopilotResponse(userMessage, contextData = {}) {
  if (!userMessage || !userMessage.trim()) return 'Silakan ketik pertanyaan Anda.';

  const msgLower = userMessage.toLowerCase();

  // Try Ollama first
  const prompt = `Anda adalah Noffice Copilot, asisten AI lokal kantor notaris Indonesia. Jawab singkat dan profesional pertanyaan berikut:\n${userMessage}`;
  const ollamaResult = await queryOllama(prompt);

  if (ollamaResult) {
    return ollamaResult;
  }

  // Built-in Knowledge Base Fallback
  if (msgLower.includes('ajb') || msgLower.includes('jual beli')) {
    return `📋 **Persyaratan Akta Jual Beli (AJB):**
1. KTP & KK Penjual & Pembeli (beserta Suami/Istri)
2. Surat Nikah / Akta Cerai
3. Sertifikat Asli Tanah (SHM/SHGB)
4. PBB 5 Tahun Terakhir & STTS
5. Bukti Setor Pajak BPHTB (Pembeli) & PPH (Penjual)
6. Surat Persetujuan Suami/Istri`;
  }

  if (msgLower.includes('pt') || msgLower.includes('pendirian pt')) {
    return `🏢 **Persyaratan Pendirian PT:**
1. KTP & NPWP Para Pendiri (minimal 2 orang)
2. Persetujuan Nama PT dari Kemenkumham
3. Surat Domisili Usaha
4. Struktur Modal & Komposisi Saham
5. Susunan Direksi & Komisaris`;
  }

  if (msgLower.includes('nomor akta') || msgLower.includes('generate akta')) {
    return `⚡ **Fitur Penomoran Akta Otomatis:**
Anda dapat mengklik tombol **"⚡ Generate Nomor Akta Otomatis"** pada detail kasus. Format yang dihasilkan adalah \`No. [Urut]/[Bulan Romawi]/[Tahun]\` yang tersimpan terurut di database lokal SQLite!`;
  }

  if (msgLower.includes('klien') || msgLower.includes('tambah klien')) {
    return `👤 **Manajemen Klien:**
Buka menu **Klien Notaris** di sidebar untuk menambah data Klien baru (NIK, Nama, Alamat, No. HP). Anda juga bisa menggunakan fitur **AI Extract** untuk otomatis membaca data KTP!`;
  }

  return `🤖 **Noffice Copilot (Asisten Notaris Lokal):**
Saya siap membantu operasional kantor notaris Anda secara 100% offline! Anda dapat menanyakan tentang:
- Persyaratan Dokumen (AJB, PT, Hibah, Waris, Kuasa)
- Penomoran & Format Akta
- Panduan penggunaan Noffice

*Catatan: AI berjalan 100% lokal tanpa jaringan internet.*`;
}
