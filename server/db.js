import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');

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

    // Tabel Documents
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
      dept TEXT
    )`);

    // Seed dummy user jika belum ada admin
    db.get("SELECT count(*) as count FROM users", (err, row) => {
      if (row.count === 0) {
        const insertUser = db.prepare("INSERT INTO users (id, email, password, role, name, department) VALUES (?, ?, ?, ?, ?, ?)");
        insertUser.run('u-1', 'admin@noffice.com', 'admin', 'admin', 'Super Admin', 'Management');
        insertUser.run('u-2', 'karyawan@noffice.com', 'user', 'employee', 'Karyawan Biasa', 'Operations');
        insertUser.finalize();
        console.log('Dummy users inserted.');
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
