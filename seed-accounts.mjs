import Database from 'better-sqlite3';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'server', 'database.sqlite');

function hashPassword(password) {
  const salt = 'noffice_notary_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

const db = new Database(dbPath);

// Update existing admin password to admin123
const updAdmin = db.prepare("UPDATE users SET password = ?, name = ? WHERE email = ?");
updAdmin.run(hashPassword('admin123'), 'Notaris Utama', 'admin@noffice.com');
console.log('[SEED] Updated admin@noffice.com -> password: admin123, name: Notaris Utama');

// Upsert akun Dewi (staf Notaris)
const existDewi = db.prepare("SELECT id FROM users WHERE email = ?").get('dewi@noffice.com');
if (!existDewi) {
  db.prepare("INSERT INTO users (id, email, password, role, name, department) VALUES (?, ?, ?, ?, ?, ?)").run('u-dewi-2024', 'dewi@noffice.com', hashPassword('dewi123'), 'employee', 'Dewi Rahayu', 'Notaris');
  console.log('[SEED] Created dewi@noffice.com -> password: dewi123');
} else {
  db.prepare("UPDATE users SET password = ?, name = ?, department = ? WHERE email = ?").run(hashPassword('dewi123'), 'Dewi Rahayu', 'Notaris', 'dewi@noffice.com');
  console.log('[SEED] Updated dewi@noffice.com -> password: dewi123');
}

// Upsert akun Andi (staf PPAT)
const existAndi = db.prepare("SELECT id FROM users WHERE email = ?").get('andi@noffice.com');
if (!existAndi) {
  db.prepare("INSERT INTO users (id, email, password, role, name, department) VALUES (?, ?, ?, ?, ?, ?)").run('u-andi-2024', 'andi@noffice.com', hashPassword('andi123'), 'employee', 'Andi Prasetyo', 'PPAT');
  console.log('[SEED] Created andi@noffice.com -> password: andi123');
} else {
  db.prepare("UPDATE users SET password = ?, name = ?, department = ? WHERE email = ?").run(hashPassword('andi123'), 'Andi Prasetyo', 'PPAT', 'andi@noffice.com');
  console.log('[SEED] Updated andi@noffice.com -> password: andi123');
}

console.log('\n✅ 3 akun demo siap:');
console.log('  Admin     | admin@noffice.com    | password: admin123');
console.log('  Staf      | dewi@noffice.com     | password: dewi123');
console.log('  Staf PPAT | andi@noffice.com     | password: andi123');

db.close();
