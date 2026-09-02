# 🏢 Noffice — Sistem Manajemen Terpadu Kantor Notaris & PPAT (Offline-First + Local AI)

**Noffice** adalah sistem manajemen perkantoran (*Office Management System*) komprehensif yang dirancang khusus untuk **Kantor Notaris & PPAT**. Beroperasi 100% secara **Offline-First (On-Premise)** di jaringan lokal komputer kantor, sehingga seluruh data identitas klien, berkas transaksi tanah/akta, dan dokumen kerahasiaan negara tersimpan dengan **keamanan maksimal tanpa bergantung pada koneksi internet/cloud**.

Aplikasi ini dilengkapi dengan **Local Notary AI Engine** (100% offline), **Penerbitan Nomor Akta Otomatis**, **Pencetakan Surat Tanda Terima Berkas**, **Sistem Biaya & Billing**, **Kalender Agenda TTD Klien**, serta **Enkripsi Keamanan**.

---

## 🎨 Visual Alur Kerja Utama Notaris (End-to-End Notary Flow Diagram)

```
====================================================================================================================
                                      FLOW WORKFLOW KANTOR NOTARIS & PPAT
====================================================================================================================

 ┌────────────────┐        ┌──────────────────────────────────┐        ┌──────────────────────────────────┐
 │ 1. KLIEN DATANG│ ───►   │  2. PENERIMAAN BERKAS (STAFF)    │ ───►   │  3. VERIFIKASI & AUDIT NOTARIS   │
 │                │        │  • Registrasi Klien & NIK KTP    │        │  • 🤖 AI Case Auditor (Risiko)   │
 │ • Membawa KTP, │        │  • 🤖 AI Data Extractor (KTP/OCR)│        │  • Pengecekan Pajak BPHTB & PPH  │
 │   Sertifikat,  │        │  • Pilih Layanan (AJB, PT, dll)  │        │  • Verifikasi Checklist Berkas   │
 │   PBB & KK     │        │  • Auto-Checklist Persyaratan    │        │  • Status: "Peninjauan / Lengkap"│
 └────────────────┘        │  • 🖨️ Cetak Tanda Terima Berkas │        └──────────────────────────────────┘
                           └──────────────────────────────────┘                         │
                                                                                        ▼
 ┌────────────────┐        ┌──────────────────────────────────┐        ┌──────────────────────────────────┐
 │ 6. ARSIP RESMI │ ◄───   │   5. PENANDATANGANAN & AKTA      │ ◄───   │     4. DRAFTING & BILLING        │
 │                │        │  • 📅 Agenda TTD Hari Ini/Minggu │        │  • ⚡ AI Draft Generator Pasal    │
 │ • Status:      │        │  • Penandatanganan Fisik Klien   │        │  • 💰 Biaya Honorarium & Pajak   │
 │   "Diarsipkan" │        │  • ⚡ Generate Nomor Akta Resm   │        │  • Status Bayar (DP / Lunas)     │
 │ • Export CSV   │        │    Format: "No. 1/IX/2026"       │        │  • Status: "Drafting Akta / TTD" │
 └────────────────┘        └──────────────────────────────────┘        └──────────────────────────────────┘

====================================================================================================================
                                    🤖 ENGINE AI LOKAL (100% OFFLINE / OLLAMA)
  [Noffice Copilot Chatbot]  │  [AI Extractor KTP]  │  [AI Draft Generator Pasal]  │  [AI Case Auditor Risiko]
====================================================================================================================
```

---

## 🌟 Fitur Utama & Modul Sistem

### 1. 👥 Manajemen Klien Notaris (`/clients`)
- Database Klien lengkap: NIK 16-digit, Nama KTP, Tanggal Lahir, Telepon/WA, Email, Pekerjaan, dan Alamat.
- **🤖 AI Data Extractor**: Cukup paste hasil scan/OCR KTP, AI otomatis mengisi NIK, Nama, dan Alamat ke dalam form secara instan.
- Modal Profil Klien yang menampilkan seluruh riwayat permohonan akta terkait.

### 2. 📋 Manajemen Permohonan / Kasus Notaris (`/cases`)
- **8 Layanan Notaris Standardized**: Akta Jual Beli (AJB), Pendirian PT/CV/Yayasan, Hibah, Surat Keterangan Waris (SKW), Akta Kuasa, Akta Perjanjian, Roya, dll.
- **Checklist Persyaratan Berkas Interaktif**: Setiap permohonan memiliki checklist berkas otomatis dengan perhitungan persentase kelengkapan real-time (0-100%).
- **Alur Status Workflow 9-Langkah**: `Baru` ➔ `Peninjauan Notaris` ➔ `Berkas Belum Lengkap` ➔ `Berkas Lengkap` ➔ `Drafting Akta` ➔ `Siap TTD` ➔ `Akta Selesai` ➔ `Diarsipkan` (atau `Dibatalkan`).

### 3. ⚡ Generasi Nomor Akta Otomatis
- Penomoran resmi terurut nasional: `No. [Urut]/[Bulan Romawi]/[Tahun]` (contoh: `No. 1/IX/2026`).
- Menggunakan counter `akta_counter` di SQLite agar penomoran tidak pernah lompat atau ganda.

### 4. 🖨️ Cetak Surat Tanda Terima Berkas Klien
- Tombol **🖨️ Cetak Tanda Terima** pada detail kasus.
- Otomatis mencetak naskah resmi ber-Kop Notaris, daftar berkas fisik yang diserahkan, serta kolom TTD Klien & Staff Notaris (`window.print` / Simpan ke PDF).

### 5. 💰 Financial & Billing System (Manajemen Biaya)
- Pencatatan komponen biaya per kasus:
  - **Honorarium Notaris** (Rp)
  - **Pajak (BPHTB / PPH)** (Rp)
  - **Biaya PNBP / BPN / Kemenkumham** (Rp)
- **Status Pembayaran**: `BELUM LUNAS` (Merah), `DP (SEBAGIAN)` (Kuning), dan `LUNAS` (Hijau).

### 6. 📅 Kalender Penjadwalan Tanda Tangan (Appointment Agenda)
- Pengaturan tanggal & jam kehadiran Klien untuk penandatanganan akta fisik.
- Widget **"📅 Agenda Penandatanganan Akta Hari Ini / Minggu Ini"** di Dashboard utama.

### 7. 🤖 Local Notary AI Engine (100% Offline)
- **Noffice Copilot Chatbot**: Widget chat melayang di sudut kanan bawah aplikasi.
- **AI Data Extractor**: Ekstraksi otomatis data NIK/KTP.
- **AI Legal Clause Generator**: Pembuat draf pasal-pasal akta (AJB, PT, Hibah, Kuasa) 1-klik copy.
- **AI Case Auditor**: Peringatan otomatis kelengkapan pajak & risiko hukum persetujuan suami/istri.
- **Ollama Integration & Auto Fallback**: Menggunakan Ollama (`qwen2.5` / `llama3.2`) jika ada, atau beralih ke *Built-in Local Smart NLP Engine* bawaan jika offline.

### 8. 🔒 Security & Persistent Storage
- **Password Hashing**: Menggunakan `crypto.pbkdf2Sync` di SQLite (password tidak lagi plain text).
- **Persistent Trash**: Sampah dokumen (`isTrashed`, `trashedAt`, `trashedBy`) tersimpan permanen di DB.

---

## 👥 Alur Kerja Berdasarkan Peran (User Roles)

### 1. 👨‍💼 Karyawan / Staff Operasional
1. **Registrasi Klien**: Input NIK & data klien (atau gunakan AI Extract dari teks KTP).
2. **Buat Kasus**: Pilih jenis permohonan akta & centang berkas fisik yang diserahkan.
3. **Cetak Tanda Terima**: Klik tombol **🖨️ Cetak Tanda Terima Berkas** untuk diberikan ke klien sebagai bukti penyerahan.
4. **Upload Berkas**: Unggah hasil scan sertifikat/KTP di modul Dokumen.

### 2. 🏛️ Notaris / Administrator (Super Admin)
1. **Pantau Dashboard**: Cek statistik permohonan aktif, agenda TTD hari ini, dan dokumen pending.
2. **Review & AI Audit**: Membuka kasus, meninjau analisis risiko AI, dan mengubah status workflow.
3. **Drafting Pasal AI**: Menggunakan AI Draft Generator untuk merancang pasal-pasal akta resmi.
4. **Penerbitan Nomor Akta & Billing**: Mengesahkan akta dengan mengklik **Generate Nomor Akta Otomatis** dan mengatur status pelunasan biaya.
5. **Ekspor Laporan**: Mengunduh seluruh data permohonan & klien ke **CSV / Excel**.

---

## 🔑 Akun Demo Login

| Role | Email | Password | Hak Akses |
|---|---|---|---|
| **Notaris (Admin)** | `admin@noffice.com` | `admin` | Akses Penuh (Approve, Draft AI, Generate Akta, Billing, Karyawan, CSV) |
| **Karyawan (Staff)** | `karyawan@noffice.com` | `user` | Akses Operasional (Input Klien, Buat Kasus, Checklist Berkas, Upload) |

---

## 🚀 Panduan Instalasi & Penggunaan

### Persyaratan Sistem
- Sistem Operasi: Windows 10/11, macOS, atau Linux
- Sudah menginstal [Node.js](https://nodejs.org/) (Versi 18 LTS atau lebih baru)

### Langkah Instalasi
```bash
# 1. Buka terminal di folder proyek Noffice
# 2. Install dependensi
npm install
```

### Menjalankan Aplikasi
- **Windows (1-Klik):** Klik 2x pada file **`start-noffice.bat`**.
- **Terminal (Developer):**
  ```bash
  npm run start
  ```
- Buka browser di: **👉 http://localhost:5173/**

---

## 🛠️ Arsitektur & Teknologi (Tech Stack)

- **Frontend / UI:** React 18, Vite, React Router DOM v6
- **Backend / API:** Node.js, Express.js, CORS
- **Database:** SQLite 3 (`server/database.sqlite`) — Database file lokal permanen
- **AI Engine:** Local Notary AI Engine (Ollama API + Built-in Local Smart NLP Engine)
- **Security:** Node.js Crypto PBKDF2 Password Hashing
- **Styling:** Custom Vanilla CSS Design System Premium (Dark/Light Mode)

---

*Didesain dan dikembangkan khusus untuk solusi manajemen perkantoran Notaris & PPAT lokal (On-Premise).*
