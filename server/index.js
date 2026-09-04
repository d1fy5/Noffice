import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { dbGet, dbQuery, dbRun, hashPassword } from './db.js';
import { checkAiStatus, extractDocumentData, generateLegalClause, auditCaseData, generateCopilotResponse } from './aiEngine.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- ROUTES AUTH ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashed = hashPassword(password);
    // Support both hashed password and legacy plain text
    let user = await dbGet('SELECT * FROM users WHERE email = ? AND (password = ? OR password = ?)', [email, hashed, password]);
    
    if (user) {
      const { password, ...safeUser } = user;
      res.json({ success: true, user: safeUser });
    } else {
      res.status(401).json({ success: false, message: 'Email atau password salah' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- ROUTES EMPLOYEES ---
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await dbQuery('SELECT * FROM employees');
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/employees', async (req, res) => {
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

// --- ROUTES DOCUMENTS ---
app.get('/api/documents', async (req, res) => {
  try {
    const documents = await dbQuery('SELECT * FROM documents ORDER BY dateTs DESC');
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/documents', async (req, res) => {
  try {
    const { id, title, description, category, author, size, sizeBytes, date, dateTs, status, type, dept } = req.body;
    await dbRun(
      'INSERT INTO documents (id, title, description, category, author, size, sizeBytes, date, dateTs, status, type, dept) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, description, category, author, size, sizeBytes, date, dateTs, status, type, dept]
    );
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update dokumen status (approve/decline). Hanya admin yang boleh mengubah
// status, dan nilai status dibatasi ke convention yang sudah dipakai project
// (pending / approved / rejected).
app.patch('/api/documents/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, userId } = req.body;

    const VALID_STATUSES = ['pending', 'approved', 'rejected'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }

    const document = await dbGet('SELECT id FROM documents WHERE id = ?', [id]);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan' });
    }

    const user = userId ? await dbGet('SELECT role FROM users WHERE id = ?', [userId]) : null;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengubah status dokumen' });
    }

    await dbRun('UPDATE documents SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, id, status });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- ROUTES CLIENTS (Klien Notaris) ---
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await dbQuery('SELECT * FROM clients ORDER BY createdAt DESC');
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clients', async (req, res) => {
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

app.put('/api/clients/:id', async (req, res) => {
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

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM clients WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ROUTES CASES (Permohonan / Kasus Notaris) ---
app.get('/api/cases', async (req, res) => {
  try {
    const cases = await dbQuery('SELECT * FROM cases ORDER BY createdAt DESC');
    const items = await dbQuery('SELECT * FROM checklist_items');
    
    // Attach checklist items to each case
    const result = cases.map(c => ({
      ...c,
      checklist: items.filter(i => i.caseId === c.id)
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cases', async (req, res) => {
  try {
    const { id, caseNumber, clientId, serviceType, status, assignedTo, notes, createdAt, estimatedAt, checklist } = req.body;
    await dbRun(
      'INSERT INTO cases (id, caseNumber, clientId, serviceType, status, assignedTo, notes, createdAt, estimatedAt, aktaNumber) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, caseNumber, clientId, serviceType, status || 'pending', assignedTo, notes, createdAt || new Date().toISOString().split('T')[0], estimatedAt, '']
    );

    // Save checklist items if present
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

app.patch('/api/documents/:id/trash', async (req, res) => {
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

app.patch('/api/documents/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('UPDATE documents SET isTrashed = 0, trashedAt = NULL, trashedBy = NULL WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/documents/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params;
    const { userRole } = req.body || {};
    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya Admin yang berwenang menghapus dokumen secara permanen' });
    }
    await dbRun('DELETE FROM documents WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/documents/trash/empty', async (req, res) => {
  try {
    const { userRole } = req.body || {};
    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya Admin yang berwenang mengosongkan tempat sampah' });
    }
    await dbRun('DELETE FROM documents WHERE isTrashed = 1');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Case Status (dengan pembatasan role karyawan vs admin)
app.patch('/api/cases/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, userRole } = req.body;
    const VALID_STATUSES = ['kurang', 'lengkap', 'draft', 'ttd', 'selesai', 'ahu_bpn', 'salinan_selesai', 'arsip', 'rejected'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Status tidak valid' });
    }

    // Cek status kasus saat ini di database
    const existingCase = await dbGet('SELECT status FROM cases WHERE id = ?', [id]);
    if (!existingCase) {
      return res.status(404).json({ success: false, message: 'Kasus tidak ditemukan' });
    }

    // Jika kasus sudah selesai / salinan_selesai / arsip, hanya Notaris/Admin yang boleh mengubah status
    const FINISHED_STATUSES = ['selesai', 'salinan_selesai', 'arsip'];
    if (FINISHED_STATUSES.includes(existingCase.status) && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Permohonan yang telah selesai/diarsip hanya dapat diubah statusnya oleh Notaris / Admin' });
    }

    // Karyawan (non-admin) hanya boleh mengubah status kelengkapan berkas awal
    if (userRole !== 'admin' && status !== 'kurang' && status !== 'lengkap') {
      return res.status(403).json({ success: false, message: 'Karyawan hanya berwenang mengubah status kelengkapan berkas' });
    }
    await dbRun('UPDATE cases SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, id, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Case Details (Billing & Appointment)
app.put('/api/cases/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const { notaryFee, taxFee, pnbpFee, paymentStatus, appointmentDate, appointmentTime, notes, userRole } = req.body;
    
    // Karyawan (non-admin) hanya boleh mengubah jadwal appointment dan catatan, tidak boleh mengubah honorarium/pajak/status bayar
    if (userRole !== 'admin') {
      await dbRun(
        'UPDATE cases SET appointmentDate = ?, appointmentTime = ?, notes = ? WHERE id = ?',
        [appointmentDate || '', appointmentTime || '', notes || '', id]
      );
    } else {
      await dbRun(
        'UPDATE cases SET notaryFee = ?, taxFee = ?, pnbpFee = ?, paymentStatus = ?, appointmentDate = ?, appointmentTime = ?, notes = ? WHERE id = ?',
        [notaryFee || 0, taxFee || 0, pnbpFee || 0, paymentStatus || 'unpaid', appointmentDate || '', appointmentTime || '', notes || '', id]
      );
    }
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/cases/:id/checklist', async (req, res) => {
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

// Helper Romawi Bulan
function toRomanMonth(monthZeroIndexed) {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return roman[monthZeroIndexed] || 'I';
}

// Generate Nomor Akta Otomatis (No. [Urut]/[Bulan Romawi]/[Tahun])
app.post('/api/cases/:id/generate-akta', async (req, res) => {
  try {
    const { id } = req.params;
    const { userRole } = req.body || {};

    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya Notaris / Admin yang berwenang menerbitkan Nomor Akta' });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const romanMonth = toRomanMonth(now.getMonth());

    // Cek last number di akta_counter
    let row = await dbGet('SELECT lastNumber FROM akta_counter WHERE year = ?', [currentYear]);
    let nextNum = 1;
    if (row) {
      nextNum = row.lastNumber + 1;
      await dbRun('UPDATE akta_counter SET lastNumber = ? WHERE year = ?', [nextNum, currentYear]);
    } else {
      await dbRun('INSERT INTO akta_counter (year, lastNumber) VALUES (?, ?)', [currentYear, nextNum]);
    }

    const aktaNumber = `No. ${nextNum}/${romanMonth}/${currentYear}`;

    // Update di tabel cases
    await dbRun('UPDATE cases SET aktaNumber = ? WHERE id = ?', [aktaNumber, id]);

    res.json({ success: true, aktaNumber });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ROUTES LOCAL AI NOTARY ENGINE ---
app.get('/api/ai/status', async (req, res) => {
  try {
    const status = await checkAiStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/extract', async (req, res) => {
  try {
    const { text } = req.body;
    const result = await extractDocumentData(text);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/draft-clause', async (req, res) => {
  try {
    const { serviceType, parameters } = req.body;
    const result = await generateLegalClause(serviceType, parameters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/audit-case', async (req, res) => {
  try {
    const { caseData, clientData } = req.body;
    const result = await auditCaseData(caseData, clientData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, contextData } = req.body;
    const reply = await generateCopilotResponse(message, contextData);
    res.json({ success: true, reply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ROUTES SYSTEM BACKUP ---
app.get('/api/system/backup', (req, res) => {
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

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});


