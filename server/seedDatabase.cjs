const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'database.sqlite');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function hashPassword(password) {
  if (!password) return '';
  const salt = 'noffice_notary_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
console.log('[SEED] Connected to SQLite database:', dbPath);

// 1. CLEAR OLD DATA
db.exec(`
  DELETE FROM case_logs;
  DELETE FROM checklist_items;
  DELETE FROM cases;
  DELETE FROM clients;
  DELETE FROM documents;
  DELETE FROM employees;
  DELETE FROM users;
  DELETE FROM akta_counter;
`);

console.log('[SEED] Cleared existing tables.');

// 2. SEED USERS
const insertUser = db.prepare(`
  INSERT INTO users (id, email, password, role, name, department)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const usersData = [
  ['u-1', 'admin@noffice.com', hashPassword('admin123'), 'admin', 'Notaris Utama, S.H., M.Kn.', 'Management'],
  ['u-2', 'dewi@noffice.com', hashPassword('dewi123'), 'employee', 'Dewi Rahayu, S.H.', 'Notaris'],
  ['u-3', 'andi@noffice.com', hashPassword('andi123'), 'employee', 'Andi Prasetyo, S.H.', 'PPAT'],
  ['u-4', 'bambang@noffice.com', hashPassword('bambang123'), 'employee', 'Bambang Haryanto', 'Administrasi'],
  ['u-5', 'rina@noffice.com', hashPassword('rina123'), 'employee', 'Rina Anggraini, S.E.', 'Keuangan'],
  ['u-6', 'fajar@noffice.com', hashPassword('fajar123'), 'employee', 'Fajar Nugroho, S.H.', 'Legal'],
  // Legacy alias untuk kompatibilitas
  ['u-karyawan-legacy', 'karyawan@noffice.com', hashPassword('karyawan123'), 'employee', 'Karyawan Biasa', 'Operations']
];

for (const u of usersData) {
  insertUser.run(...u);
}
console.log(`[SEED] Seeded ${usersData.length} users.`);

// 3. SEED EMPLOYEES
const insertEmp = db.prepare(`
  INSERT INTO employees (id, name, firstName, lastName, email, department, role, status, joinDate)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const employeesData = [
  ['emp-1', 'Notaris Utama, S.H., M.Kn.', 'Notaris', 'Utama, S.H., M.Kn.', 'admin@noffice.com', 'Management', 'Notaris & PPAT Utama (Super Admin)', 'Active', '2024-01-01'],
  ['emp-2', 'Dewi Rahayu, S.H.', 'Dewi', 'Rahayu, S.H.', 'dewi@noffice.com', 'Notaris', 'Staf Notaris & Legal Drafter', 'Active', '2024-03-15'],
  ['emp-3', 'Andi Prasetyo, S.H.', 'Andi', 'Prasetyo, S.H.', 'andi@noffice.com', 'PPAT', 'Staf PPAT & Koordinator BPN', 'Active', '2024-06-01'],
  ['emp-4', 'Bambang Haryanto', 'Bambang', 'Haryanto', 'bambang@noffice.com', 'Administrasi', 'Staf Administrasi & Resepsionis', 'Active', '2024-08-10'],
  ['emp-5', 'Rina Anggraini, S.E.', 'Rina', 'Anggraini, S.E.', 'rina@noffice.com', 'Keuangan', 'Staf Keuangan, Kasir & Pajak', 'Active', '2024-09-01'],
  ['emp-6', 'Fajar Nugroho, S.H.', 'Fajar', 'Nugroho, S.H.', 'fajar@noffice.com', 'Legal', 'Legal Auditor & Pengarsipan Minuta', 'Active', '2024-10-15'],
];

for (const e of employeesData) {
  insertEmp.run(...e);
}
console.log(`[SEED] Seeded ${employeesData.length} employees.`);

// 4. SEED CLIENTS
const insertClient = db.prepare(`
  INSERT INTO clients (id, nik, name, birthdate, address, phone, email, job, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const clientsData = [
  [
    'c-101',
    '3171012304850001',
    'Budi Santoso, S.E.',
    '1985-04-23',
    'Jl. Merdeka No. 12, RT 002/RW 005, Kel. Gambir, Kec. Gambir, Jakarta Pusat',
    '081298765432',
    'budi.santoso@gmail.com',
    'Pengusaha / Direktur Utama',
    '2026-08-15'
  ],
  [
    'c-102',
    '3174055509820003',
    'Hj. Siti Rahmawati, M.M.',
    '1982-09-15',
    'Jl. Senopati Dalam No. 45, RT 003/RW 002, Kel. Senayan, Kec. Kebayoran Baru, Jakarta Selatan',
    '085712345678',
    'siti.rahma@yahoo.com',
    'PNS Bappenas RI',
    '2026-08-20'
  ],
  [
    'c-103',
    '3275021811880004',
    'Ir. Hendra Gunawan',
    '1988-11-18',
    'Jl. Metro Pondok Indah Blok TB-12, Kel. Pondok Pinang, Kec. Kebayoran Lama, Jakarta Selatan',
    '081388776655',
    'hendra.gunawan@ptdps.co.id',
    'Investor & Pengembang Properti',
    '2026-09-01'
  ],
  [
    'c-104',
    '3173024510790002',
    'dr. Maya Farida, Sp.A.',
    '1979-10-05',
    'Jl. Boulevard Raya Blok QJ No. 24, Kel. Kelapa Gading Barat, Jakarta Utara',
    '08119988776',
    'maya.farida@gmail.com',
    'Dokter Spesialis Anak RSPI',
    '2026-09-10'
  ],
  [
    'c-105',
    '3204121006760005',
    'Raden Ahmad Fauzi',
    '1976-06-10',
    'Jl. Cilandak Tengah No. 8, RT 001/RW 003, Kel. Cilandak Barat, Jakarta Selatan',
    '081822334455',
    'ahmad.fauzi@sinarrasa.com',
    'Wiraswasta / Pemilik Resto',
    '2026-09-18'
  ],
  [
    'c-106',
    '3172086203940001',
    'Clara Stephanie, S.H.',
    '1994-03-22',
    'Apartemen Kuningan City Tower D Lt. 18, Jl. Prof. Dr. Satrio, Jakarta Selatan',
    '081233445566',
    'clara.stephanie@multilaw.id',
    'Legal Counsel Korporasi',
    '2026-09-25'
  ],
  [
    'c-107',
    '3374011208600002',
    'Drs. H. Bambang Soeprapto',
    '1960-08-12',
    'Jl. Tebet Barat Dalam Raya No. 34, RT 005/RW 001, Tebet, Jakarta Selatan',
    '08161122334',
    'bambang.soeprapto@gmail.com',
    'Pensiunan BUMN / Tokoh Masyarakat',
    '2026-10-01'
  ],
  [
    'c-108',
    '5171032807950004',
    'I Wayan Kevin Pratama',
    '1995-07-28',
    'Cluster Foresta Allevare No. 8, BSD City, Serpong, Tangerang Selatan',
    '085299001122',
    'kevin.pratama@techventure.id',
    'Founder & CEO Startup Teknologi',
    '2026-10-10'
  ],
  [
    'c-109',
    '3276015502910006',
    'Anisa Permata Sari, S.Kom.',
    '1991-02-15',
    'Pesona Khayangan Blok AB-3, Margonda Raya, Beji, Depok',
    '087788990011',
    'anisa.permata@gmail.com',
    'Konsultan IT & Analis Sistem',
    '2026-10-18'
  ],
  [
    'c-110',
    '3175061908870003',
    'Michael Chandra',
    '1987-08-19',
    'Jl. Pejaten Barat No. 77, RT 004/RW 007, Pasar Minggu, Jakarta Selatan',
    '081900112233',
    'm.chandra@logistikprima.com',
    'Direktur Keuangan PT Logistik Prima',
    '2026-10-25'
  ]
];

for (const c of clientsData) {
  insertClient.run(...c);
}
console.log(`[SEED] Seeded ${clientsData.length} clients.`);

// 5. SEED CASES (7 NOTARIS & 6 PPAT)
const insertCase = db.prepare(`
  INSERT INTO cases (
    id, caseNumber, clientId, serviceType, status, assignedTo, notes,
    createdAt, estimatedAt, aktaNumber, landAddress,
    notaryFee, taxFee, pnbpFee, paymentStatus, appointmentDate, appointmentTime
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const now = new Date();
const todayStr = now.toISOString().split('T')[0];
const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
const next2DaysStr = new Date(now.getTime() + 2 * 86400000).toISOString().split('T')[0];

const casesData = [
  // --- KASUS NOTARIS ---
  [
    'kasus-not-01',
    'NOT/2026/10/001',
    'c-101',
    'PT',
    'sk_jadi',
    'Dewi Rahayu, S.H.',
    'Pendirian PT Digital Niaga Nusantara. Modal dasar Rp 2 Miliar. KBLI: Perdagangan Besar & IT.',
    '2026-10-05',
    '2026-10-28',
    'No. 08/X/2026',
    null,
    7500000,
    0,
    1000000,
    'paid',
    '2026-10-20',
    '10:00'
  ],
  [
    'kasus-not-02',
    'NOT/2026/10/002',
    'c-106',
    'PT',
    'pendaftaran_ahu',
    'Dewi Rahayu, S.H.',
    'Pendirian PT Artha Cipta Propertindo. Draft anggaran dasar sudah disetujui para pemegang saham.',
    '2026-10-18',
    '2026-11-12',
    'No. 14/XI/2026',
    null,
    8500000,
    0,
    1000000,
    'partial',
    todayStr,
    '13:30'
  ],
  [
    'kasus-not-03',
    'NOT/2026/10/003',
    'c-105',
    'CV',
    'proses_npwp',
    'Dewi Rahayu, S.H.',
    'Pendirian CV Sinar Rasa Kuliner. Sekutu komplementer dan sekutu komanditer lengkap.',
    '2026-10-22',
    '2026-11-15',
    'No. 19/XI/2026',
    null,
    3500000,
    0,
    300000,
    'paid',
    null,
    null
  ],
  [
    'kasus-not-04',
    'NOT/2026/11/004',
    'c-107',
    'YAYASAN',
    'draf_akta',
    'Notaris Utama, S.H., M.Kn.',
    'Pendirian Yayasan Bakti Insan Cendekia untuk sarana pendidikan yatim dhuafa.',
    '2026-11-01',
    '2026-11-25',
    '',
    null,
    5000000,
    0,
    500000,
    'unpaid',
    tomorrowStr,
    '10:00'
  ],
  [
    'kasus-not-05',
    'NOT/2026/11/005',
    'c-103',
    'SEWA_MENYEWA',
    'ttd',
    'Dewi Rahayu, S.H.',
    'Akta Sewa Menyewa Ruko Komersial 3 Lantai di Jl. RS Fatmawati selama jangka waktu 5 tahun.',
    '2026-11-02',
    '2026-11-10',
    'No. 22/XI/2026',
    null,
    4500000,
    0,
    0,
    'paid',
    todayStr,
    '15:00'
  ],
  [
    'kasus-not-06',
    'NOT/2026/10/006',
    'c-108',
    'KUASA',
    'akta_jadi',
    'Dewi Rahayu, S.H.',
    'Akta Kuasa Khusus Menjual & Pengalihan Saham Seri B dalam perseroan tertutup.',
    '2026-10-25',
    '2026-11-03',
    'No. 29/XI/2026',
    null,
    2000000,
    0,
    0,
    'paid',
    null,
    null
  ],
  [
    'kasus-not-07',
    'NOT/2026/11/007',
    'c-110',
    'PERJANJIAN',
    'berkas_masuk',
    'Notaris Utama, S.H., M.Kn.',
    'Perjanjian Kerjasama Investasi Logistik Rantai Dingin antar dua badan usaha.',
    '2026-11-03',
    '2026-11-20',
    '',
    null,
    6000000,
    0,
    0,
    'unpaid',
    next2DaysStr,
    '11:00'
  ],

  // --- KASUS PPAT ---
  [
    'kasus-ppat-01',
    'PPAT/2026/10/001',
    'c-102',
    'AJB',
    'pendaftaran_bpn',
    'Andi Prasetyo, S.H.',
    'Jual Beli Rumah Tinggal SHM 4321. Pajak PPh Penjual & BPHTB Pembeli sudah tervalidasi host-to-host.',
    '2026-10-10',
    '2026-11-15',
    'No. 18/AJB/2026',
    'Jl. Kemang Timur No. 42, RT 003/RW 002, Bangka, Mampang Prapatan, Jakarta Selatan (SHM No. 4321/Bangka, Luas 320 m²)',
    12000000,
    45000000,
    850000,
    'paid',
    '2026-10-28',
    '10:30'
  ],
  [
    'kasus-ppat-02',
    'PPAT/2026/10/002',
    'c-103',
    'APHT',
    'bphtb',
    'Andi Prasetyo, S.H.',
    'Akta Pemberian Hak Tanggungan atas pinjaman kredit investasi Bank Mandiri peringkat pertama Rp 3 Miliar.',
    '2026-10-15',
    '2026-11-18',
    'No. 24/APHT/2026',
    'Komplek Permata Hijau Blok C-5, Kebayoran Lama, Jakarta Selatan (SHM No. 1290/Pancoran)',
    8000000,
    18500000,
    500000,
    'partial',
    todayStr,
    '11:00'
  ],
  [
    'kasus-ppat-03',
    'PPAT/2026/11/003',
    'c-104',
    'HIBAH',
    'draf_akta',
    'Andi Prasetyo, S.H.',
    'Hibah Tanah & Bangunan dari Orang Tua Kandung kepada Anak Pertama. Surat persetujuan ahli waris lengkap.',
    '2026-11-01',
    '2026-11-20',
    '',
    'Jl. Tebet Barat Dalam No. 15, Tebet, Jakarta Selatan (SHM No. 0543/Tebet, Luas 210 m²)',
    5500000,
    12000000,
    400000,
    'unpaid',
    tomorrowStr,
    '14:00'
  ],
  [
    'kasus-ppat-04',
    'PPAT/2026/10/004',
    'c-101',
    'ROYA',
    'diambil',
    'Andi Prasetyo, S.H.',
    'Roya Sertifikat Hak Milik setelah pelunasan KPR di BCA. Sertifikat asli sudah diserahkan kembali ke pemilik.',
    '2026-10-02',
    '2026-10-24',
    'No. 05/ROYA/2026',
    'Jl. Cilandak Tengah No. 8, Cilandak, Jakarta Selatan (SHM No. 2871/Cilandak)',
    1500000,
    0,
    250000,
    'paid',
    null,
    null
  ],
  [
    'kasus-ppat-05',
    'PPAT/2026/11/005',
    'c-107',
    'APHB',
    'berkas_masuk',
    'Andi Prasetyo, S.H.',
    'Akta Pembagian Hak Bersama (APHB) harta warisan atas 1 bidang ruko kepada 3 orang ahli waris sah.',
    '2026-11-02',
    '2026-11-30',
    '',
    'Jl. Fatmawati Raya Kav. 12, Cilandak Barat, Jakarta Selatan (SHGB No. 0812/Gandaria)',
    7000000,
    15000000,
    600000,
    'unpaid',
    next2DaysStr,
    '14:30'
  ],
  [
    'kasus-ppat-06',
    'PPAT/2026/10/006',
    'c-110',
    'PECAH',
    'cek_plot',
    'Andi Prasetyo, S.H.',
    'Permohonan Pemecahan Sertifikat Tanah induk seluas 1.500 m² menjadi 3 bidang kavling komersial.',
    '2026-10-20',
    '2026-11-28',
    '',
    'Jl. TB Simatupang No. 102, Pasar Minggu, Jakarta Selatan (SHM No. 3319/Cilandak, Luas 1.500 m²)',
    9000000,
    0,
    1200000,
    'partial',
    null,
    null
  ]
];

for (const cs of casesData) {
  insertCase.run(...cs);
}
console.log(`[SEED] Seeded ${casesData.length} cases (Notaris & PPAT).`);

// 6. SEED CHECKLIST ITEMS
const insertChk = db.prepare(`
  INSERT INTO checklist_items (id, caseId, itemName, isChecked, checkedAt)
  VALUES (?, ?, ?, ?, ?)
`);

const checklistsMap = {
  'kasus-not-01': [ // PT - Selesai SK
    ['KTP Para Pendiri & Pengurus (min. 2 orang)', 1],
    ['NPWP Para Pendiri & Pengurus', 1],
    ['Persetujuan Nama PT dari Kemenkumham (AHU)', 1],
    ['Surat Keterangan Domisili Usaha', 1],
    ['Rincian Modal Dasar & Modal Disetor', 1],
    ['Komposisi Saham & Susunan Direksi / Komisaris', 1]
  ],
  'kasus-not-02': [ // PT - Pendaftaran AHU
    ['KTP Para Pendiri & Pengurus (min. 2 orang)', 1],
    ['NPWP Para Pendiri & Pengurus', 1],
    ['Persetujuan Nama PT dari Kemenkumham (AHU)', 1],
    ['Surat Keterangan Domisili Usaha', 1],
    ['Rincian Modal Dasar & Modal Disetor', 1],
    ['Komposisi Saham & Susunan Direksi / Komisaris', 0]
  ],
  'kasus-not-03': [ // CV - Proses NPWP
    ['KTP Para Sekutu (Aktif & Pasif)', 1],
    ['NPWP Para Sekutu', 1],
    ['Surat Keterangan Domisili Usaha', 1],
    ['Rincian Modal & Jenis Usaha', 1]
  ],
  'kasus-not-04': [ // YAYASAN - Draf
    ['KTP Para Pendiri & Pengurus Yayasan', 1],
    ['NPWP Para Pendiri', 1],
    ['Surat Keterangan Domisili Yayasan', 0],
    ['Rincian Tujuan & Program Yayasan', 1],
    ['Bukti Kekayaan Awal Yayasan', 0]
  ],
  'kasus-not-05': [ // SEWA MENYEWA - TTD
    ['KTP Pihak Penyewa & Yang Menyewakan', 1],
    ['Sertifikat / Bukti Kepemilikan Objek Sewa', 1],
    ['IMB / PBG Bangunan Ruko', 1],
    ['Draft Pokok Perjanjian Sewa', 1]
  ],
  'kasus-not-06': [ // KUASA - Selesai
    ['KTP Pemberi Kuasa', 1],
    ['KTP Penerima Kuasa', 1],
    ['Dokumen Objek Kuasa (Sertifikat / Saham)', 1]
  ],
  'kasus-not-07': [ // PERJANJIAN - Berkas Masuk
    ['KTP Para Pihak', 1],
    ['Draft Pokok Perjanjian / Term Sheet', 0],
    ['Dokumen Jaminan Tambahan', 0]
  ],
  'kasus-ppat-01': [ // AJB - BPN
    ['KTP Penjual & Pembeli (beserta Suami/Istri)', 1],
    ['Kartu Keluarga (KK) Penjual & Pembeli', 1],
    ['Surat Nikah / Akta Cerai', 1],
    ['Sertifikat Asli Tanah (SHM/SHGB)', 1],
    ['PBB 5 Tahun Terakhir & STTS Baru', 1],
    ['Bukti Setor BPHTB (Pembeli) & PPH (Penjual)', 1],
    ['Surat Persetujuan Suami/Istri', 1],
    ['CEK PLOT – Cek Lokasi Fisik Tanah', 1],
    ['ZNT – Zona Nilai Tanah', 1]
  ],
  'kasus-ppat-02': [ // APHT - BPHTB
    ['KTP Pemberi & Penerima Hak Tanggungan', 1],
    ['Sertifikat Asli Tanah/Bangunan', 1],
    ['Perjanjian Kredit dari Bank', 1],
    ['PBB Terakhir', 1],
    ['CEK PLOT – Cek Lokasi Fisik Tanah', 0]
  ],
  'kasus-ppat-03': [ // HIBAH - Draf
    ['KTP Pemberi & Penerima Hibah', 1],
    ['Kartu Keluarga (KK) Kedua Pihak', 1],
    ['Sertifikat Asli Tanah/Bangunan', 1],
    ['Surat Persetujuan Ahli Waris', 0],
    ['PBB 5 Tahun Terakhir', 1],
    ['Bukti Setor BPHTB', 0]
  ],
  'kasus-ppat-04': [ // ROYA - Selesai Diambil
    ['Surat Lunas / Pengantar Roya dari Bank', 1],
    ['Sertifikat Asli Tanah', 1],
    ['Sertifikat Hak Tanggungan (SHT) Asli', 1],
    ['KTP Pemilik Tanah', 1]
  ],
  'kasus-ppat-05': [ // APHB - Berkas Masuk
    ['KTP Para Pihak Ahli Waris', 1],
    ['Kartu Keluarga Lengkap', 0],
    ['Sertifikat Asli Ruko', 1],
    ['PBB Terakhir', 0]
  ],
  'kasus-ppat-06': [ // PECAH - Cek Plot
    ['Sertifikat Asli Tanah yang akan dipecah', 1],
    ['KTP Pemilik Tanah', 1],
    ['Gambar Situasi / Peta Bidang Tanah', 1],
    ['PBB Terakhir', 1],
    ['Izin Pemecahan dari Dinas Terkait', 0]
  ]
};

let chkCount = 0;
for (const [caseId, items] of Object.entries(checklistsMap)) {
  items.forEach(([itemName, isChecked], idx) => {
    chkCount++;
    insertChk.run(
      `chk-${caseId}-${idx + 1}`,
      caseId,
      itemName,
      isChecked,
      isChecked ? '2026-10-25 09:30:00' : null
    );
  });
}
console.log(`[SEED] Seeded ${chkCount} checklist items.`);

// 7. SEED CASE LOGS
const insertLog = db.prepare(`
  INSERT INTO case_logs (id, caseId, action, changedBy, oldStatus, newStatus, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const logsData = [
  ['log-01', 'kasus-not-01', 'STATUS_CHANGE', 'Dewi Rahayu, S.H.', 'berkas_masuk', 'draf_akta', '2026-10-06 10:15:00'],
  ['log-02', 'kasus-not-01', 'STATUS_CHANGE', 'Dewi Rahayu, S.H.', 'draf_akta', 'ttd', '2026-10-20 11:30:00'],
  ['log-03', 'kasus-not-01', 'STATUS_CHANGE', 'Dewi Rahayu, S.H.', 'ttd', 'sk_jadi', '2026-10-28 14:00:00'],
  ['log-04', 'kasus-ppat-01', 'STATUS_CHANGE', 'Andi Prasetyo, S.H.', 'berkas_masuk', 'draf_akta', '2026-10-12 09:00:00'],
  ['log-05', 'kasus-ppat-01', 'STATUS_CHANGE', 'Andi Prasetyo, S.H.', 'draf_akta', 'ttd', '2026-10-28 11:00:00'],
  ['log-06', 'kasus-ppat-01', 'STATUS_CHANGE', 'Andi Prasetyo, S.H.', 'ttd', 'pendaftaran_bpn', '2026-11-01 13:45:00']
];

for (const lg of logsData) {
  insertLog.run(...lg);
}
console.log(`[SEED] Seeded ${logsData.length} case logs.`);

// 8. SEED DOCUMENTS (METADATA + PHYSICAL DUMMY FILES)
function createDummyFile(filename, textContent) {
  const fullPath = path.join(uploadsDir, filename);
  fs.writeFileSync(fullPath, textContent, 'utf8');
  return filename;
}

const f1 = createDummyFile('1792944001-Salinan_Akta_PT_Digital_Niaga.pdf', '%PDF-1.4 Salinan Resmi Minuta Akta Pendirian PT Digital Niaga Nusantara No. 08/X/2026');
const f2 = createDummyFile('1792944002-Minuta_Akta_AJB_No_18.pdf', '%PDF-1.4 Minuta Akta Jual Beli No. 18/AJB/2026 Tanah & Bangunan Bangka');
const f3 = createDummyFile('1792944003-Akta_APHT_Bank_Mandiri.pdf', '%PDF-1.4 Draf Minuta APHT Fasilitas KPR Bank Mandiri Permata Hijau');
const f4 = createDummyFile('1792944004-Perjanjian_Sewa_Ruko_Kemang.docx', 'PK-Sewa: Perjanjian Sewa Ruko Fatmawati 3 Lantai - Pihak Pertama Hendra Gunawan');
const f5 = createDummyFile('1792944005-Sertipikat_SHM_4321_Bangka.pdf', '%PDF-1.4 Pengecekan Elektronik SHM No. 4321/Bangka - Kantor Pertanahan Jakarta Selatan');
const f6 = createDummyFile('1792944006-Validasi_BPHTB_Bapenda.pdf', '%PDF-1.4 Surat Setoran Pajak Daerah (SSPD) BPHTB Elektronik Valid NTPD: 202611029831');
const f7 = createDummyFile('1792944007-KTP_NPWP_Budi_Santoso.pdf', '%PDF-1.4 Berkas Verifikasi KTP NIK 3171012304850001 & NPWP Budi Santoso');
const f8 = createDummyFile('1792944008-SK_Kemenkumham_PT_DNN.pdf', '%PDF-1.4 SK Menkumham RI No. AHU-0019283.AH.01.01 PT DIGITAL NIAGA NUSANTARA');
const f9 = createDummyFile('1792944009-Surat_Lunas_Roya_BCA.pdf', '%PDF-1.4 Surat Keterangan Pelunasan Kredit & Pengantar Roya PT Bank Central Asia Tbk');
const f10 = createDummyFile('1792944010-Klapper_Akta_Notaris_Okt_2026.xlsx', 'Klapper Notaris Oktober 2026 - No Akta 01 s/d 29');
const f11 = createDummyFile('1792944011-Laporan_Bulanan_PPAT_BPN.xlsx', 'Laporan Bulanan Pembuatan Akta PPAT ke Kepala Kantor Pertanahan Jaksel');
const f12 = createDummyFile('1792944012-Draft_Kerjasama_Investasi.pdf', '%PDF-1.4 Draft Perjanjian Kerjasama Investasi Logistik Michael Chandra');
const f13 = createDummyFile('1792944013-Draf_Usang_Revisi_Awal.docx', 'Draf usang sebelum revisi pasal ganti rugi');
const f14 = createDummyFile('1792944014-Foto_KTP_Buram.jpg', 'Foto KTP tidak terbaca kamera lama');

const insertDoc = db.prepare(`
  INSERT INTO documents (
    id, title, description, category, author, size, sizeBytes,
    date, dateTs, status, type, dept, caseId, clientId, aktaNumber,
    isTrashed, trashedAt, trashedBy, storedFilename, originalFilename, mimeType
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const nowTs = Date.now();

const documentsData = [
  // 1. Akta - Approved
  [
    'doc-01',
    'Salinan Akta Pendirian PT Digital Niaga Nusantara.pdf',
    'Salinan resmi akta pendirian perseroan terbatas lengkap dengan pengesahan Menkumham.',
    'Akta',
    'Dewi Rahayu, S.H.',
    '3.2 MB',
    3355443,
    '2026-10-28',
    nowTs - 7 * 86400000,
    'approved',
    'pdf',
    'Notaris',
    'kasus-not-01',
    'c-101',
    'No. 08/X/2026',
    0, null, null,
    f1, 'Salinan Akta Pendirian PT Digital Niaga Nusantara.pdf', 'application/pdf'
  ],
  // 2. Akta - Approved
  [
    'doc-02',
    'Minuta Akta Jual Beli No 18 AJB 2026.pdf',
    'Minuta akta PPAT Jual Beli tanah & bangunan Bangka Mampang Prapatan.',
    'Akta',
    'Andi Prasetyo, S.H.',
    '4.1 MB',
    4299161,
    '2026-10-28',
    nowTs - 7 * 86400000 + 3600000,
    'approved',
    'pdf',
    'PPAT',
    'kasus-ppat-01',
    'c-102',
    'No. 18/AJB/2026',
    0, null, null,
    f2, 'Minuta Akta Jual Beli No 18 AJB 2026.pdf', 'application/pdf'
  ],
  // 3. Akta - Pending Review
  [
    'doc-03',
    'Draf Akta Pemberian Hak Tanggungan Bank Mandiri.pdf',
    'Draf APHT jaminan fasilitas kredit investasi Permata Hijau.',
    'Akta',
    'Andi Prasetyo, S.H.',
    '2.8 MB',
    2936012,
    '2026-11-01',
    nowTs - 3 * 86400000,
    'pending',
    'pdf',
    'PPAT',
    'kasus-ppat-02',
    'c-103',
    'No. 24/APHT/2026',
    0, null, null,
    f3, 'Draf Akta Pemberian Hak Tanggungan Bank Mandiri.pdf', 'application/pdf'
  ],
  // 4. Perjanjian - Approved
  [
    'doc-04',
    'Perjanjian Sewa Menyewa Ruko Kemang.docx',
    'Draf klausul pokok sewa menyewa ruko komersial 3 lantai Fatmawati 5 tahun.',
    'Perjanjian',
    'Dewi Rahayu, S.H.',
    '1.1 MB',
    1153433,
    '2026-11-02',
    nowTs - 2 * 86400000,
    'approved',
    'docx',
    'Notaris',
    'kasus-not-05',
    'c-103',
    'No. 22/XI/2026',
    0, null, null,
    f4, 'Perjanjian Sewa Menyewa Ruko Kemang.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  // 5. Sertifikat & Dokumen Tanah - Approved
  [
    'doc-05',
    'Sertipikat Hak Milik No 4321 Bangka (Scan Asli).pdf',
    'Scan halaman buku tanah & surat ukur SHM No. 4321/Bangka untuk pendaftaran BPN.',
    'Sertifikat & Dokumen Tanah',
    'Andi Prasetyo, S.H.',
    '8.4 MB',
    8808038,
    '2026-10-15',
    nowTs - 20 * 86400000,
    'approved',
    'pdf',
    'PPAT',
    'kasus-ppat-01',
    'c-102',
    null,
    0, null, null,
    f5, 'Sertipikat Hak Milik No 4321 Bangka (Scan Asli).pdf', 'application/pdf'
  ],
  // 6. Sertifikat & Dokumen Tanah - Approved
  [
    'doc-06',
    'Lembar Validasi SSPD BPHTB Elektronik Bapenda.pdf',
    'Bukti setor dan lembar verifikasi host-to-host BPHTB Badan Pendapatan Daerah DKI Jakarta.',
    'Sertifikat & Dokumen Tanah',
    'Rina Anggraini, S.E.',
    '720 KB',
    737280,
    '2026-11-02',
    nowTs - 2 * 86400000 + 7200000,
    'approved',
    'pdf',
    'Keuangan',
    'kasus-ppat-01',
    'c-102',
    null,
    0, null, null,
    f6, 'Lembar Validasi SSPD BPHTB Elektronik Bapenda.pdf', 'application/pdf'
  ],
  // 7. Dokumen Klien - Approved
  [
    'doc-07',
    'Scan KTP & NPWP Direktur Utama Budi Santoso.pdf',
    'Identitas kependudukan terverifikasi via Smart KTP Scanner untuk pendirian PT.',
    'Dokumen Klien',
    'Dewi Rahayu, S.H.',
    '980 KB',
    1003520,
    '2026-10-05',
    nowTs - 30 * 86400000,
    'approved',
    'pdf',
    'Notaris',
    'kasus-not-01',
    'c-101',
    null,
    0, null, null,
    f7, 'Scan KTP & NPWP Direktur Utama Budi Santoso.pdf', 'application/pdf'
  ],
  // 8. Surat & Legalitas - Approved
  [
    'doc-08',
    'SK Pengesahan Kemenkumham AHU-0019283.AH.01.01.pdf',
    'Keputusan Menkumham pengesahan badan hukum perseroan terbatas PT Digital Niaga Nusantara.',
    'Surat & Legalitas',
    'Notaris Utama, S.H., M.Kn.',
    '2.1 MB',
    2202009,
    '2026-10-28',
    nowTs - 7 * 86400000 + 14400000,
    'approved',
    'pdf',
    'Notaris',
    'kasus-not-01',
    'c-101',
    null,
    0, null, null,
    f8, 'SK Pengesahan Kemenkumham AHU-0019283.AH.01.01.pdf', 'application/pdf'
  ],
  // 9. Surat & Legalitas - Approved
  [
    'doc-09',
    'Surat Keterangan Lunas & Pengantar Roya Bank BCA.pdf',
    'Surat resmi perbankan pengantar pencoretan hak tanggungan (roya) di BPN.',
    'Surat & Legalitas',
    'Andi Prasetyo, S.H.',
    '890 KB',
    911360,
    '2026-10-02',
    nowTs - 33 * 86400000,
    'approved',
    'pdf',
    'PPAT',
    'kasus-ppat-04',
    'c-101',
    'No. 05/ROYA/2026',
    0, null, null,
    f9, 'Surat Keterangan Lunas & Pengantar Roya Bank BCA.pdf', 'application/pdf'
  ],
  // 10. Administrasi - Approved
  [
    'doc-10',
    'Buku Klapper Register Akta Notaris Bulan Oktober 2026.xlsx',
    'Daftar klapper abjad dan register akta notaris resmi sesuai ketentuan Pasal 61 UUJN.',
    'Administrasi',
    'Dewi Rahayu, S.H.',
    '650 KB',
    665600,
    '2026-10-31',
    nowTs - 4 * 86400000,
    'approved',
    'xlsx',
    'Notaris',
    null,
    null,
    null,
    0, null, null,
    f10, 'Buku Klapper Register Akta Notaris Bulan Oktober 2026.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  // 11. Administrasi - Pending Review
  [
    'doc-11',
    'Laporan Bulanan Akta PPAT ke BPN & Bapenda.xlsx',
    'Rekapitulasi berkas akta PPAT yang dibuat dalam bulan berjalan untuk diserahkan ke Kepala Kantor Pertanahan.',
    'Administrasi',
    'Andi Prasetyo, S.H.',
    '820 KB',
    839680,
    '2026-11-01',
    nowTs - 3 * 86400000 + 7200000,
    'pending',
    'xlsx',
    'PPAT',
    null,
    null,
    null,
    0, null, null,
    f11, 'Laporan Bulanan Akta PPAT ke BPN & Bapenda.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  // 12. Perjanjian - Pending Review
  [
    'doc-12',
    'Draft Perjanjian Kerjasama Investasi Logistik.pdf',
    'Draf perikatan modal ventura dan penyertaan armada rantai dingin PT Logistik Prima.',
    'Perjanjian',
    'Dewi Rahayu, S.H.',
    '1.8 MB',
    1887436,
    '2026-11-03',
    nowTs - 1 * 86400000,
    'pending',
    'pdf',
    'Notaris',
    'kasus-not-07',
    'c-110',
    null,
    0, null, null,
    f12, 'Draft Perjanjian Kerjasama Investasi Logistik.pdf', 'application/pdf'
  ],
  // 13. TRASH - Dokumen di Tong Sampah (Demonstrasi Fitur Restore / Hapus Permanen)
  [
    'doc-13',
    'Draft Draf Usang Revisi Awal AJB No 18.docx',
    'Draft revisi awal sebelum konfirmasi persetujuan pihak istri pembeli (arsip kadaluarsa).',
    'Akta',
    'Dewi Rahayu, S.H.',
    '450 KB',
    460800,
    '2026-10-20',
    nowTs - 15 * 86400000,
    'rejected',
    'docx',
    'Notaris',
    'kasus-ppat-01',
    'c-102',
    null,
    1, '2026-11-01 16:30:00', 'Dewi Rahayu, S.H.',
    f13, 'Draft Draf Usang Revisi Awal AJB No 18.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  // 14. TRASH - Dokumen di Tong Sampah 2
  [
    'doc-14',
    'Foto KTP Buram Pemohon (Gagal Scan).jpg',
    'Hasil jepretan kamera webcam yang buram dan telah digantikan hasil scan resolusi tinggi.',
    'Dokumen Klien',
    'Andi Prasetyo, S.H.',
    '1.2 MB',
    1258291,
    '2026-10-22',
    nowTs - 13 * 86400000,
    'rejected',
    'jpg',
    'PPAT',
    'kasus-not-03',
    'c-105',
    null,
    1, '2026-11-02 09:15:00', 'Andi Prasetyo, S.H.',
    f14, 'Foto KTP Buram Pemohon (Gagal Scan).jpg', 'image/jpeg'
  ]
];

for (const d of documentsData) {
  insertDoc.run(...d);
}
console.log(`[SEED] Seeded ${documentsData.length} documents (including 2 in Trash).`);

// 9. SEED AKTA COUNTER
db.prepare(`INSERT OR REPLACE INTO akta_counter (year, lastNumber) VALUES (?, ?)`).run(2026, 29);
console.log('[SEED] Seeded akta counter: 2026 -> 29.');

console.log('=== [SEED COMPLETE] All tables successfully populated with rich data! ===');
db.close();

