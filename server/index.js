import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { dbGet, dbQuery, dbRun, hashPassword } from './db.js';
import { checkAiStatus, extractDocumentData, generateLegalClause, auditCaseData, generateCopilotResponse } from './aiEngine.js';

const app = express();
const PORT = 3001;

// Pastikan folder uploads ada di disk server
const UPLOADS_DIR = path.resolve('server/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- HELPER AUTHENTICATION MIDDLEWARE ---
async function getSessionFromReq(req) {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }
  if (!token) return null;
  return await dbGet('SELECT * FROM sessions WHERE token = ?', [token]);
}

async function requireAuth(req, res, next) {
  const session = await getSessionFromReq(req);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Sesi tidak valid atau belum login' });
  }
  req.sessionUser = session;
  next();
}

async function requireAdmin(req, res, next) {
  const session = await getSessionFromReq(req);
  if (!session || session.userRole !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak: Hanya Notaris/Admin yang diizinkan' });
  }
  req.sessionUser = session;
  next();
}

// --- ROUTES AUTH ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashed = hashPassword(password);
    let user = await dbGet('SELECT * FROM users WHERE email = ? AND password = ?', [email, hashed]);
    
    if (user) {
      const { password, ...safeUser } = user;
      // Buat session token baru
      const token = crypto.randomBytes(32).toString('hex');
      const createdAt = new Date().toISOString();
      await dbRun('INSERT INTO sessions (token, userId, userRole, createdAt) VALUES (?, ?, ?, ?)', [token, user.id, user.role, createdAt]);

      res.json({ success: true, user: safeUser, token });
    } else {
      res.status(401).json({ success: false, message: 'Email atau password salah' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// --- ROUTES EMPLOYEES ---
app.get('/api/employees', requireAuth, async (req, res) => {
  try {
    const employees = await dbQuery('SELECT * FROM employees');
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/employees', requireAdmin, async (req, res) => {
  try {
    const { id, name, email, department, role, status, joinDate } = req.body;
    await dbRun(
      'INSERT INTO employees (id, name, email, department, role, status, joinDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, email, department, role, status, joinDate]
    );
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ROUTES DOCUMENTS (DENGAN REAL UPLOAD & DOWNLOAD FILE) ---
app.get('/api/documents', requireAuth, async (req, res) => {
  try {
    const documents = await dbQuery('SELECT * FROM documents ORDER BY dateTs DESC');
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Document metadata + Simpan file fisik (base64)
app.post('/api/documents', requireAuth, async (req, res) => {
  try {
    const { id, title, description, category, author, size, sizeBytes, date, dateTs, status, type, dept, fileData, originalFilename, mimeType } = req.body;
    
    let storedFilename = null;

    // Simpan file fisik ke folder server/uploads/ jika fileData disertakan
    if (fileData) {
      const cleanBase64 = fileData.replace(/^data:.*?;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const safeName = (originalFilename || title || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
      storedFilename = `${Date.now()}-${safeName}`;
      const fullPath = path.join(UPLOADS_DIR, storedFilename);
      fs.writeFileSync(fullPath, buffer);
    }

    await dbRun(
      'INSERT INTO documents (id, title, description, category, author, size, sizeBytes, date, dateTs, status, type, dept, storedFilename, originalFilename, mimeType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, description, category, author, size, sizeBytes, date, dateTs, status || 'pending', type, dept, storedFilename, originalFilename || title, mimeType || 'application/octet-stream']
    );

    res.json({ success: true, id, storedFilename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download File Fisik Dokumen
app.get('/api/documents/:id/download', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await dbGet('SELECT * FROM documents WHERE id = ?', [id]);

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan di database' });
    }

    if (!doc.storedFilename) {
      return res.status(404).json({ success: false, message: 'File fisik belum pernah diunggah untuk dokumen ini (metadata saja).' });
    }

    const filePath = path.resolve(UPLOADS_DIR, doc.storedFilename);
    if (!filePath.startsWith(UPLOADS_DIR)) {
      return res.status(400).json({ success: false, message: 'Akses path dokumen tidak valid' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File tidak ditemukan di storage server.' });
    }

    const filename = doc.originalFilename || doc.title || 'dokumen.pdf';
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update dokumen status (approve/decline) - Menggunakan requireAdmin
app.patch('/api/documents/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const VALID_STATUSES = ['pending', 'approved', 'rejected'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }

    const document = await dbGet('SELECT id FROM documents WHERE id = ?', [id]);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan' });
    }

    await dbRun('UPDATE documents SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, id, status });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.patch('/api/documents/:id/trash', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { trashedBy } = req.body;
    await dbRun('UPDATE documents SET isTrashed = 1, trashedAt = ?, trashedBy = ? WHERE id = ?', [
      new Date().toISOString(),
      trashedBy || 'User',
      id
    ]);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/documents/:id/restore', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('UPDATE documents SET isTrashed = 0, trashedAt = NULL, trashedBy = NULL WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/documents/:id/permanent', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await dbGet('SELECT storedFilename FROM documents WHERE id = ?', [id]);
    if (doc && doc.storedFilename) {
      const filePath = path.resolve(UPLOADS_DIR, doc.storedFilename);
      if (filePath.startsWith(UPLOADS_DIR) && fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    await dbRun('DELETE FROM documents WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/documents/trash/empty', requireAdmin, async (req, res) => {
  try {
    const trashedDocs = await dbQuery('SELECT storedFilename FROM documents WHERE isTrashed = 1');
    for (const doc of trashedDocs) {
      if (doc.storedFilename) {
        const filePath = path.resolve(UPLOADS_DIR, doc.storedFilename);
        if (filePath.startsWith(UPLOADS_DIR) && fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) {}
        }
      }
    }

    await dbRun('DELETE FROM documents WHERE isTrashed = 1');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ROUTES CLIENTS (Klien Notaris) ---
app.get('/api/clients', requireAuth, async (req, res) => {
  try {
    const clients = await dbQuery('SELECT * FROM clients ORDER BY createdAt DESC');
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clients', requireAuth, async (req, res) => {
  try {
    const { id, nik, name, birthdate, address, phone, email, job, createdAt } = req.body;
    await dbRun(
      'INSERT INTO clients (id, nik, name, birthdate, address, phone, email, job, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, nik, name, birthdate, address, phone, email, job, createdAt || new Date().toISOString().split('T')[0]]
    );
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/clients/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nik, name, birthdate, address, phone, email, job } = req.body;
    await dbRun(
      'UPDATE clients SET nik = ?, name = ?, birthdate = ?, address = ?, phone = ?, email = ?, job = ? WHERE id = ?',
      [nik, name, birthdate, address, phone, email, job, id]
    );
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/clients/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM clients WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ROUTES CASES (Permohonan / Kasus Notaris) ---
app.get('/api/cases', requireAuth, async (req, res) => {
  try {
    const cases = await dbQuery('SELECT * FROM cases ORDER BY createdAt DESC');
    const items = await dbQuery('SELECT * FROM checklist_items');
    
    const result = cases.map(c => ({
      ...c,
      checklist: items.filter(i => i.caseId === c.id)
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cases', requireAuth, async (req, res) => {
  try {
    const { id, caseNumber, clientId, serviceType, status, assignedTo, notes, createdAt, estimatedAt, checklist, aktaNumber, landAddress } = req.body;
    await dbRun(
      'INSERT INTO cases (id, caseNumber, clientId, serviceType, status, assignedTo, notes, createdAt, estimatedAt, aktaNumber, landAddress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, caseNumber, clientId, serviceType, status || 'berkas_masuk', assignedTo, notes, createdAt || new Date().toISOString().split('T')[0], estimatedAt, aktaNumber || '', landAddress || '']
    );

    if (checklist && Array.isArray(checklist)) {
      for (const item of checklist) {
        await dbRun(
          'INSERT INTO checklist_items (id, caseId, itemName, isChecked) VALUES (?, ?, ?, ?)',
          [item.id || 'chk-' + Date.now() + Math.random().toString(36).substring(2, 6), id, item.itemName || item, item.isChecked ? 1 : 0]
        );
      }
    }

    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Case Status
app.patch('/api/cases/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, changedBy } = req.body;

    const VALID_STATUSES = [
      'berkas_masuk', 'draf_akta', 'ttd',
      'proses_npwp', 'pendaftaran_ahu', 'siup_nib',
      'bphtb', 'pph', 'cek_plot', 'znt',
      'sk_jadi', 'akta_jadi', 'pendaftaran_bpn',
      'diambil', 'belum_diambil', 'rejected',
      'kurang', 'lengkap', 'draft', 'selesai', 'ahu_bpn', 'salinan_selesai', 'arsip',
      'pending', 'review',
    ];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }

    const existingCase = await dbGet('SELECT status, caseNumber FROM cases WHERE id = ?', [id]);
    if (!existingCase) {
      return res.status(404).json({ success: false, message: 'Kasus tidak ditemukan' });
    }

    const oldStatus = existingCase.status;
    await dbRun('UPDATE cases SET status = ? WHERE id = ?', [status, id]);

    const logId = 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const timestamp = new Date().toISOString();
    const actor = changedBy || 'Sistem';
    const action = `Status diubah dari "${oldStatus}" menjadi "${status}" oleh ${actor}`;
    await dbRun(
      'INSERT INTO case_logs (id, caseId, action, changedBy, oldStatus, newStatus, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [logId, id, action, actor, oldStatus, status, timestamp]
    );

    res.json({ success: true, id, status, logId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET Log Riwayat Perubahan Status Kasus
app.get('/api/cases/:id/logs', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await dbQuery(
      'SELECT * FROM case_logs WHERE caseId = ? ORDER BY timestamp DESC',
      [id]
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Case Details
app.put('/api/cases/:id/details', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { notaryFee, taxFee, pnbpFee, paymentStatus, appointmentDate, appointmentTime, notes } = req.body;
    await dbRun(
      'UPDATE cases SET notaryFee = ?, taxFee = ?, pnbpFee = ?, paymentStatus = ?, appointmentDate = ?, appointmentTime = ?, notes = ? WHERE id = ?',
      [notaryFee || 0, taxFee || 0, pnbpFee || 0, paymentStatus || 'unpaid', appointmentDate || '', appointmentTime || '', notes || '', id]
    );
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/cases/:id/checklist', requireAuth, async (req, res) => {
  try {
    const { itemId, isChecked } = req.body;
    await dbRun('UPDATE checklist_items SET isChecked = ?, checkedAt = ? WHERE id = ?', [
      isChecked ? 1 : 0,
      isChecked ? new Date().toISOString() : null,
      itemId
    ]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function toRomanMonth(monthZeroIndexed) {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return roman[monthZeroIndexed] || 'I';
}

// Generate Nomor Akta Otomatis - Menggunakan requireAdmin
app.post('/api/cases/:id/generate-akta', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { aktaFormat, serviceType } = req.body || {};

    const now = new Date();
    const currentYear = now.getFullYear();
    const romanMonth = toRomanMonth(now.getMonth());
    const paddedMonth = String(now.getMonth() + 1).padStart(2, '0');
    const shortYear = String(currentYear).slice(-2);

    let row = await dbGet('SELECT lastNumber FROM akta_counter WHERE year = ?', [currentYear]);
    let nextNum = 1;
    if (row) {
      nextNum = row.lastNumber + 1;
      await dbRun('UPDATE akta_counter SET lastNumber = ? WHERE year = ?', [nextNum, currentYear]);
    } else {
      await dbRun('INSERT INTO akta_counter (year, lastNumber) VALUES (?, ?)', [currentYear, nextNum]);
    }

    const format = aktaFormat || 'No. {no}/{bulanRomawi}/{tahun}';
    const aktaNumber = format
      .replace(/\{no\}/g, nextNum)
      .replace(/\{bulanRomawi\}/g, romanMonth)
      .replace(/\{bulan\}/g, paddedMonth)
      .replace(/\{tahun\}/g, currentYear)
      .replace(/\{tahunPendek\}/g, shortYear)
      .replace(/\{jenisAkta\}/g, serviceType || '');

    await dbRun('UPDATE cases SET aktaNumber = ? WHERE id = ?', [aktaNumber, id]);

    res.json({ success: true, aktaNumber });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ROUTES LOCAL AI NOTARY ENGINE ---
app.get('/api/ai/status', requireAuth, async (req, res) => {
  try {
    const status = await checkAiStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/extract', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    const result = await extractDocumentData(text);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/draft-clause', requireAuth, async (req, res) => {
  try {
    const { serviceType, parameters } = req.body;
    const result = await generateLegalClause(serviceType, parameters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/audit-case', requireAuth, async (req, res) => {
  try {
    const { caseData, clientData } = req.body;
    const result = await auditCaseData(caseData, clientData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/chat', requireAuth, async (req, res) => {
  try {
    const { message, contextData } = req.body;
    const reply = await generateCopilotResponse(message, contextData);
    res.json({ success: true, reply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ROUTES SYSTEM BACKUP (DENGAN AUTENTIKASI ADMIN) ---
app.get('/api/system/backup', requireAdmin, (req, res) => {
  try {
    const dbPath = path.resolve('server/database.sqlite');
    if (fs.existsSync(dbPath)) {
      const filename = `noffice-backup-${new Date().toISOString().slice(0, 10)}.sqlite`;
      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      fs.createReadStream(dbPath).pipe(res);
    } else {
      res.status(404).json({ error: 'Database file not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- START SERVER (BIND KE 0.0.0.0 UNTUK AKSES LAN) ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` Noffice Backend Server Running Successfully!`);
  console.log(` - Akses Lokal:   http://localhost:${PORT}`);
  
  // Dapatkan IP LAN lokal
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName of Object.keys(networkInterfaces)) {
    for (const iface of networkInterfaces[interfaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(` - Akses LAN Wi-Fi: http://${iface.address}:${PORT}`);
      }
    }
  }
  console.log(`====================================================`);
});



