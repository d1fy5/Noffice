// ============================================================
// UNIT TEST UNTUK KTP VALIDATOR & NORMALIZER (Langkah 2)
// ============================================================

import assert from 'assert';
import { parseNik, validateAndNormalizeKtp, normalizeIsoDate } from './ktpValidator.js';

console.log('🧪 Memulai Unit Test KTP Validator...\n');

// 1. Test parseNik: NIK Laki-Laki Valid
{
  const result = parseNik('3302061502090002');
  assert.strictEqual(result.valid, true, 'NIK 3302061502090002 harusnya valid');
  assert.strictEqual(result.provinceCode, '33');
  assert.strictEqual(result.provinceName, 'JAWA TENGAH');
  assert.strictEqual(result.gender, 'LAKI-LAKI');
  assert.strictEqual(result.day, 15);
  assert.strictEqual(result.month, 2);
  assert.strictEqual(result.year2d, 9);
  assert.strictEqual(result.derivedBirthDate, '2009-02-15');
  console.log('✅ Test 1: NIK Laki-laki valid (3302061502090002) - Berhasil');
}

// 2. Test parseNik: NIK Perempuan Valid (+40 pada tanggal)
{
  // Tanggal 18 Februari 1986 -> 18 + 40 = 58
  const result = parseNik('3171235802860123');
  assert.strictEqual(result.valid, true, 'NIK 3171235802860123 harusnya valid');
  assert.strictEqual(result.provinceCode, '31');
  assert.strictEqual(result.provinceName, 'DKI JAKARTA');
  assert.strictEqual(result.gender, 'PEREMPUAN');
  assert.strictEqual(result.isFemale, true);
  assert.strictEqual(result.day, 18);
  assert.strictEqual(result.month, 2);
  assert.strictEqual(result.year2d, 86);
  assert.strictEqual(result.derivedBirthDate, '1986-02-18');
  console.log('✅ Test 2: NIK Perempuan valid (+40) (3171235802860123) - Berhasil');
}

// 3. Test parseNik: NIK 15 Digit (Kurang 1 digit)
{
  const result = parseNik('317123580286012');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('16 digit'), 'Harus menolak NIK dengan panjang != 16 digit');
  console.log('✅ Test 3: NIK 15 digit ditolak dengan pesan yang sesuai - Berhasil');
}

// 4. Test parseNik: Kode Provinsi Tidak Terdaftar (misal: 99)
{
  const result = parseNik('9901011502090001');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('Kode provinsi NIK (99) tidak terdaftar'), 'Harus menolak kode provinsi fiktif');
  console.log('✅ Test 4: Kode provinsi salah (99) ditolak - Berhasil');
}

// 5. Test validateAndNormalizeKtp: Mismatch Tanggal Lahir NIK vs Tanggal Fisik KTP
{
  const rawVision = {
    nik: '3302061502090002', // NIK tgl 15 Feb 2009
    tanggal_lahir: '1995-10-20', // Beda jauh
    nama: 'Budi Santoso',
    uncertain_fields: [],
  };
  const result = validateAndNormalizeKtp(rawVision);
  assert.strictEqual(result.fieldStatus.nik, 'invalid', 'NIK harus ditandai invalid jika tanggal lahir tidak sinkron');
  assert.ok(result.message.includes('tidak cocok'), 'Pesan error harus menjelaskan ketidakcocokan tanggal');
  console.log('✅ Test 5: Tanggal lahir tidak cocok menandai NIK invalid - Berhasil');
}

// 6. Test validateAndNormalizeKtp: Tanggal Lahir AI Kosong tapi NIK Valid (Auto-fill dari NIK)
{
  const rawVision = {
    nik: '3171235802860123', // Perempuan 18 Feb 1986
    tanggal_lahir: null, // AI gagal baca tanggal fisik
    nama: 'Mira Setiawan',
    uncertain_fields: ['tanggal_lahir'],
  };
  const result = validateAndNormalizeKtp(rawVision);
  assert.strictEqual(result.data.tanggal_lahir, '1986-02-18', 'Tanggal lahir harus diisi otomatis dari NIK');
  assert.strictEqual(result.fieldStatus.tanggal_lahir, 'ok');
  assert.strictEqual(result.data.jenis_kelamin, 'PEREMPUAN');
  console.log('✅ Test 6: Auto-fill tanggal lahir dari NIK jika AI kosong - Berhasil');
}

// 7. Test validateAndNormalizeKtp: uncertain_fields dari AI dipetakan ke fieldStatus "uncertain"
{
  const rawVision = {
    nik: '3302061502090002',
    nama: 'Hasbi Takumi',
    alamat: 'Tanjung',
    rt_rw: '002/006',
    pekerjaan: 'Pelajar',
    agama: null,
    uncertain_fields: ['agama', 'pekerjaan'],
  };
  const result = validateAndNormalizeKtp(rawVision);
  assert.strictEqual(result.fieldStatus.nik, 'ok');
  assert.strictEqual(result.fieldStatus.nama, 'ok');
  assert.strictEqual(result.fieldStatus.pekerjaan, 'uncertain', 'Pekerjaan ada di uncertain_fields harus uncertain');
  assert.strictEqual(result.fieldStatus.agama, 'uncertain', 'Agama bernilai null harus uncertain');
  console.log('✅ Test 7: uncertain_fields dari Vision AI otomatis berstatus uncertain - Berhasil');
}

// 8. Test normalizeIsoDate
{
  assert.strictEqual(normalizeIsoDate('18-02-1986'), '1986-02-18');
  assert.strictEqual(normalizeIsoDate('18/02/1986'), '1986-02-18');
  assert.strictEqual(normalizeIsoDate('1986-02-18'), '1986-02-18');
  assert.strictEqual(normalizeIsoDate('invalid-date'), null);
  console.log('✅ Test 8: Normalisasi format tanggal - Berhasil');
}

console.log('\n🎉 SEMUA UNIT TEST KTP VALIDATOR LOLOS 100%!\n');

