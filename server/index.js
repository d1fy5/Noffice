import express from 'express';
import cors from 'cors';
import { dbGet, dbQuery, dbRun } from './db.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- ROUTES AUTH ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    
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

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});
