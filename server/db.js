import sqlite3 from 'sqlite3';
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

// Buka koneksi ke SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initDb();
  }
});

// Inisialisasi Tabel
function initDb() {
  db.serialize(() => {
    // Tabel Users
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT,
      name TEXT,
      department TEXT
    )`);

    // Tabel Employees
    db.run(`CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      department TEXT,
      role TEXT,
      status TEXT,
      joinDate TEXT
    )`);

    // Tabel Documents (dengan persisitas Trash)
    db.run(`CREATE TABLE IF NOT EXISTS documents (
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
    db.run(`CREATE TABLE IF NOT EXISTS clients (
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
    db.run(`CREATE TABLE IF NOT EXISTS cases (
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
      notaryFee INTEGER DEFAULT 0,
      taxFee INTEGER DEFAULT 0,
      pnbpFee INTEGER DEFAULT 0,
      paymentStatus TEXT DEFAULT 'unpaid',
      appointmentDate TEXT,
      appointmentTime TEXT
    )`);

    // Tabel Checklist Items (Persyaratan Dokumen Per Kasus)
    db.run(`CREATE TABLE IF NOT EXISTS checklist_items (
      id TEXT PRIMARY KEY,
      caseId TEXT,
      itemName TEXT,
      isChecked INTEGER,
      checkedAt TEXT
    )`);

    // Tabel Counter Nomor Akta
    db.run(`CREATE TABLE IF NOT EXISTS akta_counter (
      year INTEGER PRIMARY KEY,
      lastNumber INTEGER
    )`);

    // Migration safe check for legacy DBs
    db.run(`ALTER TABLE cases ADD COLUMN notaryFee INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE cases ADD COLUMN taxFee INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE cases ADD COLUMN pnbpFee INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE cases ADD COLUMN paymentStatus TEXT DEFAULT 'unpaid'`, () => {});
    db.run(`ALTER TABLE cases ADD COLUMN appointmentDate TEXT`, () => {});
    db.run(`ALTER TABLE cases ADD COLUMN appointmentTime TEXT`, () => {});

    db.run(`ALTER TABLE documents ADD COLUMN isTrashed INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE documents ADD COLUMN trashedAt TEXT`, () => {});
    db.run(`ALTER TABLE documents ADD COLUMN trashedBy TEXT`, () => {});

    // Seed dummy user dengan hashed password jika belum ada admin
    db.get("SELECT count(*) as count FROM users", (err, row) => {
      if (row && row.count === 0) {
        const insertUser = db.prepare("INSERT INTO users (id, email, password, role, name, department) VALUES (?, ?, ?, ?, ?, ?)");
        insertUser.run('u-1', 'admin@noffice.com', hashPassword('admin'), 'admin', 'Super Admin / Notaris', 'Management');
        insertUser.run('u-2', 'karyawan@noffice.com', hashPassword('user'), 'employee', 'Karyawan Biasa', 'Operations');
        insertUser.finalize();
        console.log('Dummy users with secure password hashes inserted.');
      }
    });

    // Seed dummy clients & cases jika belum ada
    db.get("SELECT count(*) as count FROM clients", (err, row) => {
      if (row && row.count === 0) {
        const c1 = 'c-101', c2 = 'c-102';
        db.run(`INSERT INTO clients (id, nik, name, birthdate, address, phone, email, job, createdAt) 
          VALUES ('${c1}', '3171012304850001', 'Budi Santoso', '1985-04-23', 'Jl. Merdeka No. 12, Jakarta Selatan', '081298765432', 'budi.santoso@gmail.com', 'Wiraswasta', '2026-08-15')`);
        db.run(`INSERT INTO clients (id, nik, name, birthdate, address, phone, email, job, createdAt) 
          VALUES ('${c2}', '3172021509900003', 'Siti Rahmawati', '1990-09-15', 'Jl. Sudirman No. 45, Jakarta Pusat', '085712345678', 'siti.rahma@yahoo.com', 'PNS', '2026-08-20')`);

        const k1 = 'kasus-2026-001', k2 = 'kasus-2026-002';
        const todayStr = new Date().toISOString().split('T')[0];

        db.run(`INSERT INTO cases (id, caseNumber, clientId, serviceType, status, assignedTo, notes, createdAt, estimatedAt, aktaNumber, notaryFee, taxFee, pnbpFee, paymentStatus, appointmentDate, appointmentTime)
          VALUES ('${k1}', 'KASUS/2026/08/001', '${c1}', 'AJB', 'draft', 'Karyawan Biasa', 'Proses Jual Beli tanah seluas 250m2 di Jaksel', '2026-08-16', '2026-09-10', 'No. 14/VIII/2026', 7500000, 15000000, 500000, 'paid', '${todayStr}', '10:00')`);
        db.run(`INSERT INTO cases (id, caseNumber, clientId, serviceType, status, assignedTo, notes, createdAt, estimatedAt, aktaNumber, notaryFee, taxFee, pnbpFee, paymentStatus, appointmentDate, appointmentTime)
          VALUES ('${k2}', 'KASUS/2026/08/002', '${c2}', 'AKT-PT', 'review', 'Super Admin / Notaris', 'Pendirian PT Bina Sejahtera Nusantara', '2026-08-21', '2026-09-15', '', 5000000, 0, 1000000, 'partial', '${todayStr}', '14:30')`);

        // Checklist items
        db.run(`INSERT INTO checklist_items (id, caseId, itemName, isChecked) VALUES ('chk-1', '${k1}', 'KTP Penjual & Pembeli', 1)`);
        db.run(`INSERT INTO checklist_items (id, caseId, itemName, isChecked) VALUES ('chk-2', '${k1}', 'Sertifikat Tanah / HGB', 1)`);
        db.run(`INSERT INTO checklist_items (id, caseId, itemName, isChecked) VALUES ('chk-3', '${k1}', 'PBB 5 Tahun Terakhir', 1)`);
        db.run(`INSERT INTO checklist_items (id, caseId, itemName, isChecked) VALUES ('chk-4', '${k1}', 'BPHTB & PPH', 1)`);
        db.run(`INSERT INTO checklist_items (id, caseId, itemName, isChecked) VALUES ('chk-5', '${k2}', 'KTP Para Pendiri PT', 1)`);
        db.run(`INSERT INTO checklist_items (id, caseId, itemName, isChecked) VALUES ('chk-6', '${k2}', 'NPWP Para Pendiri', 1)`);
        db.run(`INSERT INTO checklist_items (id, caseId, itemName, isChecked) VALUES ('chk-7', '${k2}', 'Surat Keterangan Domisili', 0)`);

        console.log('Dummy clients & cases with billing & appointments inserted.');
      }
    });
  });
}

// Wrapper untuk Promise
export const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export default db;
