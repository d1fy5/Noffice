// ============================================================
// NOFFICE - KTP VALIDATOR & NORMALIZER (Langkah 2)
// Memvalidasi NIK, kode provinsi, kesesuaian tanggal lahir,
// inferensi gender, dan normalisasi field KTP Indonesia
// ============================================================

/**
 * Daftar resmi kode 2-digit provinsi di Indonesia (Kemendagri / BPS)
 */
export const PROVINCE_CODES = {
  '11': 'ACEH',
  '12': 'SUMATERA UTARA',
  '13': 'SUMATERA BARAT',
  '14': 'RIAU',
  '15': 'JAMBI',
  '16': 'SUMATERA SELATAN',
  '17': 'BENGKULU',
  '18': 'LAMPUNG',
  '19': 'KEPULAUAN BANGKA BELITUNG',
  '21': 'KEPULAUAN RIAU',
  '31': 'DKI JAKARTA',
  '32': 'JAWA BARAT',
  '33': 'JAWA TENGAH',
  '34': 'DI YOGYAKARTA',
  '35': 'JAWA TIMUR',
  '36': 'BANTEN',
  '51': 'BALI',
  '52': 'NUSA TENGGARA BARAT',
  '53': 'NUSA TENGGARA TIMUR',
  '61': 'KALIMANTAN BARAT',
  '62': 'KALIMANTAN TENGAH',
  '63': 'KALIMANTAN SELATAN',
  '64': 'KALIMANTAN TIMUR',
  '65': 'KALIMANTAN UTARA',
  '71': 'SULAWESI UTARA',
  '72': 'SULAWESI TENGAH',
  '73': 'SULAWESI SELATAN',
  '74': 'SULAWESI TENGGARA',
  '75': 'GORONTALO',
  '76': 'SULAWESI BARAT',
  '81': 'MALUKU',
  '82': 'MALUKU UTARA',
  '91': 'PAPUA',
  '92': 'PAPUA BARAT',
  '93': 'PAPUA SELATAN',
  '94': 'PAPUA TENGAH',
  '95': 'PAPUA PEGUNUNGAN',
  '96': 'PAPUA BARAT DAYA',
};

/**
 * Normalisasi string tanggal bebas ke format ISO "YYYY-MM-DD"
 * @param {string|null} rawDate
 * @returns {string|null}
 */
export function normalizeIsoDate(rawDate) {
  if (!rawDate || typeof rawDate !== 'string') return null;
  const str = rawDate.trim();

  // Pola YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Pola DD-MM-YYYY atau DD/MM/YYYY
  const idMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (idMatch) {
    const [, day, month, year] = idMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

/**
 * Parsing informasi yang terkandung di dalam 16 digit NIK
 * Digit 1-2: Kode Provinsi
 * Digit 3-4: Kode Kabupaten/Kota
 * Digit 5-6: Kode Kecamatan
 * Digit 7-8: Tanggal Lahir (perempuan: tanggal + 40)
 * Digit 9-10: Bulan Lahir
 * Digit 11-12: 2 Digit Terakhir Tahun Lahir
 * Digit 13-16: Nomor Urut
 */
export function parseNik(rawNik) {
  if (!rawNik || typeof rawNik !== 'string') {
    return { valid: false, error: 'NIK tidak boleh kosong' };
  }

  // Bersihkan spasi dan karakter non-digit
  const cleanNik = rawNik.replace(/\D/g, '');

  if (cleanNik.length !== 16) {
    return {
      valid: false,
      cleanNik,
      error: `NIK harus tepat 16 digit angka (terdeteksi ${cleanNik.length} digit)`,
    };
  }

  const provCode = cleanNik.slice(0, 2);
  const provName = PROVINCE_CODES[provCode];
  if (!provName) {
    return {
      valid: false,
      cleanNik,
      error: `Kode provinsi NIK (${provCode}) tidak terdaftar di Indonesia`,
    };
  }

  const rawDay = parseInt(cleanNik.slice(6, 8), 10);
  const month = parseInt(cleanNik.slice(8, 10), 10);
  const year2d = parseInt(cleanNik.slice(10, 12), 10);

  const isFemale = rawDay > 40;
  const day = isFemale ? rawDay - 40 : rawDay;
  const gender = isFemale ? 'PEREMPUAN' : 'LAKI-LAKI';

  if (day < 1 || day > 31) {
    return {
      valid: false,
      cleanNik,
      error: `Tanggal lahir pada NIK tidak valid (${day})`,
    };
  }

  if (month < 1 || month > 12) {
    return {
      valid: false,
      cleanNik,
      error: `Bulan lahir pada NIK tidak valid (${month})`,
    };
  }

  // Tentukan perkiraan tahun 4 digit (KTP dimiliki usia >= 17 tahun, tahun berjalan ~2026)
  const current2dYear = new Date().getFullYear() % 100;
  const fullYear = year2d > current2dYear ? 1900 + year2d : 2000 + year2d;

  return {
    valid: true,
    cleanNik,
    provinceCode: provCode,
    provinceName: provName,
    isFemale,
    gender,
    day,
    month,
    year2d,
    fullYear,
    derivedBirthDate: `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

/**
 * Bersihkan string teks umum (hapus whitespace berlebih, strip garis anomali OCR)
 */
function cleanText(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str
    .trim()
    .replace(/[\u2014\u2013\u2500\u2501—–_-]+$/, '') // Hapus trailing dashes/lines dari OCR
    .trim();
  return trimmed || null;
}

/**
 * Normalisasi format RT/RW (misal: "002/006" atau "7/8" -> "007/008")
 */
function normalizeRtRw(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.trim().replace(/\s+/g, '');
  const match = cleaned.match(/^(\d{1,3})[/.-](\d{1,3})$/);
  if (match) {
    return `${match[1].padStart(3, '0')}/${match[2].padStart(3, '0')}`;
  }
  return cleanText(raw);
}

/**
 * Normalisasi kelurahan / kecamatan (hapus prefix berulang seperti "KEL.", "DESA")
 */
function normalizeAreaName(raw) {
  const text = cleanText(raw);
  if (!text) return null;
  return text
    .toUpperCase()
    .replace(/^(?:KELURAHAN|KEL\.?|DESA)\s+/i, '')
    .replace(/^(?:KECAMATAN|KEC\.?)\s+/i, '')
    .trim();
}

/**
 * Normalisasi status perkawinan ke standar KTP
 */
function normalizeStatusPerkawinan(raw) {
  const text = cleanText(raw);
  if (!text) return null;
  const upper = text.toUpperCase();
  if (upper.includes('BELUM') || upper.includes('TIDAK')) return 'BELUM KAWIN';
  if (upper.includes('CERAI HIDUP')) return 'CERAI HIDUP';
  if (upper.includes('CERAI MATI')) return 'CERAI MATI';
  if (upper.includes('KAWIN') || upper.includes('MENIKAH')) return 'KAWIN';
  return upper;
}

/**
 * Normalisasi jenis kelamin
 */
function normalizeGender(raw) {
  const text = cleanText(raw);
  if (!text) return null;
  const upper = text.toUpperCase();
  if (upper.includes('PEREMPUAN') || upper.includes('WANITA')) return 'PEREMPUAN';
  if (upper.includes('LAKI') || upper.includes('PRIA')) return 'LAKI-LAKI';
  return null;
}

/**
 * Validasi dan Normalisasi lengkap data KTP hasil ekstraksi Vision AI
 * @param {object} rawVisionData - Output JSON dari Vision AI
 * @returns {object} { data, fieldStatus, imageQuality, message }
 */
export function validateAndNormalizeKtp(rawVisionData) {
  const raw = rawVisionData || {};
  const uncertainList = Array.isArray(raw.uncertain_fields)
    ? raw.uncertain_fields.map((f) => String(f).toLowerCase().trim())
    : [];

  const data = {};
  const fieldStatus = {};
  const messages = [];

  // 1. Validasi & Parsing NIK
  const parsedNik = parseNik(raw.nik);
  if (parsedNik.valid) {
    data.nik = parsedNik.cleanNik;
    fieldStatus.nik = 'ok';
  } else {
    data.nik = parsedNik.cleanNik || raw.nik || null;
    fieldStatus.nik = 'invalid';
    if (parsedNik.error) messages.push(parsedNik.error);
  }

  // 2. Normalisasi & Validasi Tanggal Lahir
  let normalizedAiDate = normalizeIsoDate(raw.tanggal_lahir);
  let birthDateMismatch = false;

  if (parsedNik.valid) {
    if (normalizedAiDate) {
      // Cocokkan tanggal, bulan, dan 2 digit tahun NIK dengan tanggal lahir AI
      const [, aiYear, aiMonth, aiDay] = normalizedAiDate.match(/^(\d{4})-(\d{2})-(\d{2})$/) || [];
      const aiDayNum = parseInt(aiDay, 10);
      const aiMonthNum = parseInt(aiMonth, 10);
      const aiYear2d = parseInt(aiYear.slice(-2), 10);

      const isMatch =
        aiDayNum === parsedNik.day &&
        aiMonthNum === parsedNik.month &&
        aiYear2d === parsedNik.year2d;

      if (!isMatch) {
        birthDateMismatch = true;
        // Tandai NIK sebagai invalid karena tidak sinkron dengan visual tanggal lahir di KTP
        fieldStatus.nik = 'invalid';
        messages.push(
          `Tanggal lahir NIK (${String(parsedNik.day).padStart(2, '0')}/${String(parsedNik.month).padStart(2, '0')}/${parsedNik.year2d}) tidak cocok dengan tanggal lahir pada fisik KTP (${normalizedAiDate})`
        );
      }
      data.tanggal_lahir = normalizedAiDate;
      fieldStatus.tanggal_lahir = 'ok';
    } else {
      // Jika AI tidak membaca tanggal lahir tetapi NIK valid, isi dari NIK!
      data.tanggal_lahir = parsedNik.derivedBirthDate;
      fieldStatus.tanggal_lahir = 'ok';
      // Karena berhasil diisi dari NIK yang valid, jangan ditimpa status uncertain
      const idx = uncertainList.indexOf('tanggal_lahir');
      if (idx !== -1) uncertainList.splice(idx, 1);
    }
  } else {
    data.tanggal_lahir = normalizedAiDate;
    fieldStatus.tanggal_lahir = normalizedAiDate ? 'ok' : 'uncertain';
  }

  // 3. Normalisasi & Sinkronisasi Jenis Kelamin
  const normalizedGender = normalizeGender(raw.jenis_kelamin);
  if (parsedNik.valid && !birthDateMismatch) {
    // Sinkronkan dengan tanggal di NIK (jika >40 = PEREMPUAN)
    data.jenis_kelamin = parsedNik.gender;
    fieldStatus.jenis_kelamin = 'ok';
  } else {
    data.jenis_kelamin = normalizedGender;
    fieldStatus.jenis_kelamin = normalizedGender ? 'ok' : 'uncertain';
  }

  // 4. Normalisasi Nama Lengkap
  const cleanNama = cleanText(raw.nama);
  data.nama = cleanNama ? cleanNama.toUpperCase() : null;
  fieldStatus.nama = data.nama ? 'ok' : 'uncertain';

  // 5. Tempat Lahir
  const cleanTempat = cleanText(raw.tempat_lahir);
  data.tempat_lahir = cleanTempat ? cleanTempat.toUpperCase().replace(/,([^\s])/g, ', $1') : null;
  fieldStatus.tempat_lahir = data.tempat_lahir ? 'ok' : 'uncertain';

  // 6. Alamat & Komponen Wilayah
  const cleanAlamat = cleanText(raw.alamat);
  data.alamat = cleanAlamat ? cleanAlamat.toUpperCase() : null;
  fieldStatus.alamat = data.alamat ? 'ok' : 'uncertain';

  data.rt_rw = normalizeRtRw(raw.rt_rw);
  fieldStatus.rt_rw = data.rt_rw ? 'ok' : 'uncertain';

  data.kelurahan = normalizeAreaName(raw.kelurahan);
  fieldStatus.kelurahan = data.kelurahan ? 'ok' : 'uncertain';

  data.kecamatan = normalizeAreaName(raw.kecamatan);
  fieldStatus.kecamatan = data.kecamatan ? 'ok' : 'uncertain';

  // 7. Data Tambahan (Agama, Status, Pekerjaan, Kewarganegaraan)
  const cleanAgama = cleanText(raw.agama);
  data.agama = cleanAgama ? cleanAgama.toUpperCase() : null;
  fieldStatus.agama = data.agama ? 'ok' : 'uncertain';

  data.status_perkawinan = normalizeStatusPerkawinan(raw.status_perkawinan);
  fieldStatus.status_perkawinan = data.status_perkawinan ? 'ok' : 'uncertain';

  const cleanPekerjaan = cleanText(raw.pekerjaan);
  data.pekerjaan = cleanPekerjaan ? cleanPekerjaan.toUpperCase() : null;
  fieldStatus.pekerjaan = data.pekerjaan ? 'ok' : 'uncertain';

  const cleanKewarganegaraan = cleanText(raw.kewarganegaraan);
  data.kewarganegaraan = cleanKewarganegaraan ? cleanKewarganegaraan.toUpperCase() : 'WNI';
  fieldStatus.kewarganegaraan = 'ok';

  // 8. Terapkan flag uncertain_fields dari Vision AI
  for (const field of uncertainList) {
    if (field in fieldStatus && fieldStatus[field] !== 'invalid') {
      fieldStatus[field] = 'uncertain';
    }
  }

  // Jika field nilainya null, ubah statusnya menjadi 'uncertain'
  for (const [key, val] of Object.entries(data)) {
    if ((val === null || val === undefined || val === '') && fieldStatus[key] !== 'invalid') {
      fieldStatus[key] = 'uncertain';
    }
  }

  // Ringkasan image quality
  const imageQuality = raw.image_quality === 'poor' ? 'poor' : 'good';

  let message = 'Data KTP berhasil diekstraksi dan divalidasi.';
  if (messages.length > 0) {
    message = messages.join('; ');
  } else if (imageQuality === 'poor') {
    message = 'Kualitas gambar KTP kurang jelas, beberapa field perlu diperiksa manual.';
  }

  return {
    success: true,
    data,
    fieldStatus,
    imageQuality,
    message,
  };
}
