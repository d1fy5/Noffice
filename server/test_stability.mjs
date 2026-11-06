// ============================================================
// NOFFICE - STABILITY TEST SCRIPT
// Menjalankan ekstraksi 1 foto KTP sebanyak 3 kali berturut-turut,
// mengukur durasi, dan membandingkan konsistensi antar-run
// ============================================================

import fs from 'fs';
import path from 'path';
import { extractKtpWithVision } from './visionService.js';
import { validateAndNormalizeKtp } from './ktpValidator.js';

// Muat .env
if (fs.existsSync('.env')) {
  process.loadEnvFile();
}

// Gunakan gambar uji KTP Hasbi Takumi atau yang diberikan via argumen CLI
const defaultImagePath = 'C:/Users/smart-user/.gemini/antigravity/brain/4811f3b7-ca0e-4c8a-a507-bfb52bbc2769/.user_uploaded/media_1793918070284_c5c32907.jpg';
const targetImagePath = process.argv[2] || defaultImagePath;

if (!fs.existsSync(targetImagePath)) {
  console.error(`Berkas gambar tidak ditemukan di path: ${targetImagePath}`);
  process.exit(1);
}

const imageBuffer = fs.readFileSync(targetImagePath);
const ext = path.extname(targetImagePath).toLowerCase();
const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

console.log(`================================================================`);
console.log(`   UJI STABILITAS & AKURASI EKSTRAKSI KTP (3 RUNS)`);
console.log(`   Model: ${process.env.VISION_MODEL || 'gemini-3.5-flash'}`);
console.log(`   Ukuran Gambar: ${Math.round(imageBuffer.length / 1024)} KB`);
console.log(`================================================================\n`);

const runs = [];
const trackedFields = [
  'nik',
  'nama',
  'tempat_lahir',
  'tanggal_lahir',
  'jenis_kelamin',
  'alamat',
  'rt_rw',
  'kelurahan',
  'kecamatan',
  'agama',
  'status_perkawinan',
  'pekerjaan',
  'kewarganegaraan',
];

async function runTest() {
  for (let i = 1; i <= 3; i++) {
    console.log(`--- Menjalankan Run #${i} ---`);
    const start = Date.now();
    const result = await extractKtpWithVision(imageBuffer, mimeType);
    const duration = Date.now() - start;

    if (!result.success) {
      console.error(`Run #${i} Gagal:`, result.message);
      runs.push({ runNumber: i, success: false, duration, data: null, error: result.message });
      continue;
    }

    const validated = validateAndNormalizeKtp(result.rawVisionData);
    console.log(`Run #${i} Selesai dalam ${duration}ms | NIK Status: [${validated.fieldStatus.nik}] Nama: ${validated.data.nama}`);
    runs.push({
      runNumber: i,
      success: true,
      duration,
      resizeMs: result.resizeDurationMs,
      apiMs: result.apiDurationMs,
      data: validated.data,
      fieldStatus: validated.fieldStatus,
    });

    // Jeda 1 detik antar request
    if (i < 3) await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n================================================================`);
  console.log(`                 HASIL PERBANDINGAN ANTAR RUN`);
  console.log(`================================================================`);

  // Tabel Kecepatan
  console.log('\n📊 Waktu Eksekusi:');
  runs.forEach((r) => {
    console.log(` - Run #${r.runNumber}: Total ${r.duration}ms (Resize: ${r.resizeMs || 0}ms, API: ${r.apiMs || 0}ms)`);
  });
  const avgTotal = Math.round(runs.reduce((a, b) => a + b.duration, 0) / runs.length);
  console.log(` >> Waktu Rata-Rata: ${avgTotal}ms\n`);

  // Perbandingan Field-by-Field
  console.log('🔍 Konsistensi Data Antar-Run:');
  let hasDiscrepancy = false;

  for (const field of trackedFields) {
    const val1 = runs[0]?.data?.[field];
    const val2 = runs[1]?.data?.[field];
    const val3 = runs[2]?.data?.[field];

    const isIdentical = val1 === val2 && val2 === val3;
    const icon = isIdentical ? '✅' : '⚠️';
    if (!isIdentical) hasDiscrepancy = true;

    console.log(
      `${icon} ${field.padEnd(18)} : Run1="${val1 || '-'}" | Run2="${val2 || '-'}" | Run3="${val3 || '-'}"`
    );
  }

  console.log(`\n================================================================`);
  if (!hasDiscrepancy) {
    console.log(`🎉 KONSISTENSI 100%: Semua field identik sempurna pada ketiga run!`);
  } else {
    console.log(`⚠️ PERHATIAN: Terdapat perbedaan data antar run pada beberapa field.`);
  }
  console.log(`================================================================\n`);
}

runTest();

