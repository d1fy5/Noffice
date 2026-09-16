import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');

// Password Hashing Helper using Node.js Crypto (PBKDF2)
export function hashPassword(password) {
  if (!password) return '';
  // Fixed salt for local demo consistency
  const salt = 'noffice_notary_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Buka koneksi ke SQLite (better-sqlite3 synchronous API)
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
console.log('Connected to SQLite database.');

// Inisialisasi Tabel
function initDb() {
  // Tabel Users
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT,
    name TEXT,
    department TEXT
  )`);

  // Tabel Employees
  db.exec(`CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    department TEXT,
    role TEXT,
    status TEXT,
    joinDate TEXT
  )`);

  // Tabel Documents (dengan persisitas Trash)
  db.exec(`CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    category TEXT,
    author TEXT,
    size TEXT,
    sizeBytes INTEGER,
    date TEXT,
    dateTs INTEGER,
    status TEXT,
    type TEXT,
    dept TEXT,
    caseId TEXT,
    clientId TEXT,
    aktaNumber TEXT,
    isTrashed INTEGER DEFAULT 0,
    trashedAt TEXT,
    trashedBy TEXT
  )`);

  // Tabel Clients (Klien Notaris)
  db.exec(`CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    nik TEXT UNIQUE,
    name TEXT,
    birthdate TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    job TEXT,
    createdAt TEXT
  )`);

  // Tabel Cases (dengan Financial Billing & Appointment Penjualan)
  db.exec(`CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    caseNumber TEXT UNIQUE,
    clientId TEXT,
    serviceType TEXT,
    status TEXT,
    assignedTo TEXT,
    notes TEXT,
    createdAt TEXT,
    estimatedAt TEXT,
    aktaNumber TEXT,
    landAddress TEXT,
    notaryFee INTEGER DEFAULT 0,
    taxFee INTEGER DEFAULT 0,
    pnbpFee INTEGER DEFAULT 0,
    paymentStatus TEXT DEFAULT 'unpaid',
    appointmentDate TEXT,
    appointmentTime TEXT
  )`);

  // Tabel Checklist Items (Persyaratan Dokumen Per Kasus)
  db.exec(`CREATE TABLE IF NOT EXISTS checklist_items (
    id TEXT PRIMARY KEY,
    caseId TEXT,
    itemName TEXT,
    isChecked INTEGER,
    checkedAt TEXT
  )`);

  // Tabel Counter Nomor Akta
  db.exec(`CREATE TABLE IF NOT EXISTS akta_counter (
    year INTEGER PRIMARY KEY,
    lastNumber INTEGER
  )`);

  // Tabel Log Riwayat Perubahan Status Kasus
  db.exec(`CREATE TABLE IF NOT EXISTS case_logs (
    id TEXT PRIMARY KEY,
    caseId TEXT NOT NULL,
    action TEXT NOT NULL,
    changedBy TEXT NOT NULL,
    oldStatus TEXT,
    newStatus TEXT,
    timestamp TEXT NOT NULL
  )`);

  // Tabel Sessions (Token Autentikasi Pengguna)
  db.exec(`CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    userRole TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`);

  // Migration safe check for legacy DBs
  try { db.exec(`ALTER TABLE cases ADD COLUMN notaryFee INTEGER DEFAULT 0`); } catch(e) {}
  try { db.exec(`ALTER TABLE cases ADD COLUMN taxFee INTEGER DEFAULT 0`); } catch(e) {}
  try { db.exec(`ALTER TABLE cases ADD COLUMN pnbpFee INTEGER DEFAULT 0`); } catch(e) {}
  try { db.exec(`ALTER TABLE cases ADD COLUMN paymentStatus TEXT DEFAULT 'unpaid'`); } catch(e) {}
  try { db.exec(`ALTER TABLE cases ADD COLUMN appointmentDate TEXT`); } catch(e) {}
  try { db.exec(`ALTER TABLE cases ADD COLUMN appointmentTime TEXT`); } catch(e) {}
  try { db.exec(`ALTER TABLE cases ADD COLUMN landAddress TEXT`); } catch(e) {} // kolom baru

  try { db.exec(`ALTER TABLE documents ADD COLUMN isTrashed INTEGER DEFAULT 0`); } catch(e) {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN trashedAt TEXT`); } catch(e) {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN trashedBy TEXT`); } catch(e) {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN storedFilename TEXT`); } catch(e) {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN originalFilename TEXT`); } catch(e) {}
  try { db.exec(`ALTER TABLE documents ADD COLUMN mimeType TEXT`); } catch(e) {}
  // Migration untuk case_logs (jika DB lama tidak punya)
  try { db.exec(`CREATE TABLE IF NOT EXISTS case_logs (id TEXT PRIMARY KEY, caseId TEXT NOT NULL, action TEXT NOT NULL, changedBy TEXT NOT NULL, oldStatus TEXT, newStatus TEXT, timestamp TEXT NOT NULL)`); } catch(e) {}

  // Seed 3 akun demo dengan hashed password jika belum ada
  const userCount = db.prepare("SELECT count(*) as count FROM users").get();
  if (userCount && userCount.count === 0) {
    const insertUser = db.prepare("INSERT INTO users (id, email, password, role, name, department) VALUES (?, ?, ?, ?, ?, ?)");
    // Akun 1: Super Admin / Notaris (admin)
    insertUser.run('u-1', 'admin@noffice.com', hashPassword('admin123'), 'admin', 'Notaris Utama', 'Management');
    // Akun 2: Staf Notaris (employee)
    insertUser.run('u-2', 'dewi@noffice.com', hashPassword('dewi123'), 'employee', 'Dewi Rahayu', 'Notaris');
    // Akun 3: Staf PPAT (employee)
    insertUser.run('u-3', 'andi@noffice.com', hashPassword('andi123'), 'employee', 'Andi Prasetyo', 'PPAT');
    console.log('[DB] 3 demo accounts seeded with hashed passwords.');
  }

  // Seed employee records (for dropdown staf) jika belum ada
  const empCount = db.prepare("SELECT count(*) as count FROM employees").get();
  if (empCount && empCount.count === 0) {
    const insertEmp = db.prepare("INSERT INTO employees (id, name, email, department, role, status, joinDate) VALUES (?, ?, ?, ?, ?, ?, ?)");
    insertEmp.run('emp-1', 'Notaris Utama', 'admin@noffice.com', 'Management', 'admin', 'active', '2024-01-01');
    insertEmp.run('emp-2', 'Dewi Rahayu', 'dewi@noffice.com', 'Notaris', 'employee', 'active', '2024-03-15');
    insertEmp.run('emp-3', 'Andi Prasetyo', 'andi@noffice.com', 'PPAT', 'employee', 'active', '2024-06-01');
    console.log('[DB] 3 employee records seeded.');
  }

  // Seed dummy clients & cases jika belum ada
  const clientCount = db.prepare("SELECT count(*) as count FROM clients").get();
  if (clientCount && clientCount.count === 0) {
    const c1 = 'c-101', c2 = 'c-102';
    db.exec(`INSERT INTO clients (id, nik, name, birthdate, address, phone, email, job, createdAt) 
      VALUES ('${c1}', '3171012304850001', 'Budi Santoso', '1985-04-23', 'Jl. Merdeka No. 12, Jakarta Selatan', '081298765432', 'budi.santoso@gmail.com', 'Wiraswasta', '2026-08-15')`);
    db.exec(`INSERT INTO clients (id, nik, name, birthdate, address, phone, email, job, createdAt) 
      VALUES ('${c2}', '3172021509900003', 'Siti Rahmawati', '1990-09-15', 'Jl. Sudirman No. 45, Jakarta Pusat', '085712345678', 'siti.rahma@yahoo.com', 'PNS', '2026-08-20')`);

    const k1 = 'kasus-2026-001', k2 = 'kasus-2026-002';
    const todayStr = new Date().toISOString().split('T')[0];

    db.exec(`INSERT INTO cases (id, caseNumber, clientId, serviceType, status, assignedTo, notes, createdAt, estimatedAt, aktaNumber, notaryFee, taxFee, pnbpFee, paymentStatus, appointmentDate, appointmentTime)
      VALUES ('${k1}', 'KASUS/2026/08/001', '${c1}', 'AJB', 'draft', 'Karyawan Biasa', 'Proses Jual Beli tanah seluas 250m2 di Jaksel', '2026-08-16', '2026-09-10', 'No. 14/VIII/2026', 7500000, 15000000, 500000, 'paid', '${todayStr}', '10:00')`);
    db.exec(`INSERT INTO cases (id, caseNumber, clientId, serviceType, status, assignedTo, notes, createdAt, estimatedAt, aktaNumber, notaryFee, taxFee, pnbpFee, paymentStatus, appointmentDate, appointmentTime)
      VALUES ('${k2}', 'KASUS/2026/08/002', '${c2}', 'AKT-PT', 'review', 'Super Admin / Notaris', 'Pendirian PT Bina Sejahtera Nusantara', '2026-08-21', '2026-09-15', '', 5000000, 0, 1000000, 'partial', '${todayStr}', '14:30')`);

    // Checklist items
    db.exec(`INSERT INTO checklist_items (id, caseId, itemName, isChecked) VALUES ('chk-1', '${k1}', 'KTP Penjual & Pembeli', 1)`);
    db.exec(`INSERT INTO checklist_items (id, caseId, itemName, isChecked) VALUES ('chk-2', '${k1}', 'Sertifikat Tanah / HGB', 1)`);
    db.exec(`INSERT INTO checklist_items (id, caseId, itemName, isChecked) VALUES ('chk-3', '${k1}', 'PBB 5 Tahun Terakhir', 1)`);
    db.exec(`INSERT INTO checklist_items (id, caseId, itemName, isChecked) VALUES ('chk-4', '${k1}', 'BPHTB & PPH', 1)`);
    db.exec(`INSERT INTO checklist_items (id, caseId, itemName, isChecked) VALUES ('chk-5', '${k2}', 'KTP Para Pendiri PT', 1)`);
    db.exec(`INSERT INTO checklist_items (id, caseId, itemName, isChecked) VALUES ('chk-6', '${k2}', 'NPWP Para Pendiri', 1)`);
    db.exec(`INSERT INTO checklist_items (id, caseId, itemName, isChecked) VALUES ('chk-7', '${k2}', 'Surat Keterangan Domisili', 0)`);

    console.log('Dummy clients & cases with billing & appointments inserted.');
  }
}

initDb();

// Wrapper untuk Promise (agar kompatibel dengan kode async/await yang sudah ada di server/index.js)
export const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params);
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
};

export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      resolve({ id: result.lastInsertRowid, changes: result.changes });
    } catch (err) {
      reject(err);
    }
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const row = stmt.get(...params);
      resolve(row);
    } catch (err) {
      reject(err);
    }
  });
};

export default db;
