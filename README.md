# 🏢 Noffice — Sistem Manajemen Terpadu Kantor Notaris & PPAT (Offline-First + Local AI)

> **Solusi Cerdas & Aman 100% Offline untuk Otomatisasi Administrasi, Pembuatan Akta, dan Manajemen Berkas Kantor Notaris & PPAT.**

---

## 💡 Apa Itu Noffice & Mengapa Anda Membutuhkannya?

Banyak kantor Notaris & PPAT menghadapi kendala seperti **tumpukan berkas fisik**, **kesalahan ketik 16 digit NIK KTP**, **proses perancangan draf akta yang memakan waktu**, serta **kekhawatiran data kerahasiaan klien bocor jika disimpan di server cloud/internet**.

**Noffice** hadir sebagai solusi sistem manajemen kantor terpadu yang beroperasi **100% Offline-First (On-Premise)** di komputer kantor Anda. Seluruh database, identitas klien, dan naskah akta tersimpan **100% aman di jaringan lokal tanpa bergantung pada koneksi internet/cloud**.

---

## ⭐ 5 Keunggulan Utama Noffice (Mengapa Notaris Menyukai Aplikasi Ini)

1. 🔒 **100% Offline & Keamanan Data Maksimal**:
   - Berkas dan identitas klien tidak pernah terkirim ke server luar/cloud. Bebas dari risiko peretasan data online.
2. 🤖 **Local Notary AI Assistant (Kecerdasan Buatan Offline)**:
   - Dilengkapi AI khusus Notaris yang bekerja tanpa internet! Bebas biaya token bulanan API.
3. ⚡ **AI Data Extractor (KTP/OCR Otomatis)**:
   - Cukup salin teks hasil scan KTP, AI otomatis mengisi NIK, Nama, dan Alamat ke dalam formulir secara instan dalam 1 detik.
4. 🖨️ **Surat Tanda Terima Berkas Cetak 1-Klik**:
   - Bukti penyerahan dokumen fisik resmi ber-Kop Notaris yang siap dicetak dan ditandatangani oleh klien & staf.
5. 📜 **Penomoran Akta Otomatis & Terurut Anti-Ganda**:
   - Format penomoran akta nasional (`No. [Urut]/[Bulan Romawi]/[Tahun]`) teratur secara otomatis tanpa khawatir lompat atau ganda.

---

## 🎨 Diagram Alur Kerja Utama (Workflow Kantor Notaris)

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

## 📖 Panduan Penggunaan Mudah 5-Langkah (User Guide)

### 1️⃣ Langkah 1: Pendaftaran Klien Baru (`/clients`)
- Buka menu **Klien** ➔ Klik **+ Tambah Klien**.
- Salin teks hasil scan KTP ➔ Klik **🤖 AI Data Extractor** ➔ NIK, Nama, dan Alamat terisi otomatis.

### 2️⃣ Langkah 2: Pembuatan Permohonan / Kasus Akta (`/cases`)
- Buka menu **Permohonan** ➔ Pilih Klien dan jenis permohonan (*Akta Jual Beli / Pendirian PT / Hibah / dll.*).
- Centang dokumen fisik yang diserahkan pada **Checklist Berkas Interaktif**.

### 3️⃣ Langkah 3: Cetak Surat Tanda Terima Berkas (`/cases`)
- Klik tombol **🖨️ Cetak Tanda Terima Berkas** untuk mencetak bukti resmi ber-Kop Notaris yang akan ditandatangani oleh Klien & Staf.

### 4️⃣ Langkah 4: Audit AI, Drafting Pasal, & Billing (`/cases`)
- Gunakan **🤖 AI Case Auditor** untuk meninjau potensi risiko legal dan kewajiban pajak.
- Gunakan **⚡ AI Draft Generator** untuk menyusun naskah pasal-pasal akta resmi.
- Isi rincian biaya honorarium & pajak di modul **Biaya & Billing**.

### 5️⃣ Langkah 5: Penerbitan Nomor Akta & Penandatanganan
- Ubah status menjadi `Siap TTD` ➔ Klik **Generate Nomor Akta Otomatis** (Contoh: `No. 1/IX/2026`).
- Pantau jadwal kehadiran klien di widget **📅 Agenda Penandatanganan Akta**.

---

## 🔑 Akun Demo untuk Uji Coba

| Peran (Role) | Email | Password | Hak Akses Utama |
|---|---|---|---|
| 🏛️ **Notaris (Admin)** | `admin@noffice.com` | `admin` | Akses Penuh (Approval, AI Drafting, Penomoran Akta, Billing, Ekspor CSV) |
| 👨‍💼 **Karyawan (Staff)** | `karyawan@noffice.com` | `user` | Akses Operasional (Input Klien, AI OCR KTP, Checklist Berkas, Cetak Tanda Terima) |

---

## 🚀 Cara Menjalankan Aplikasi

### Persyaratan Sistem
- Laptop/PC dengan **Windows 10/11**, macOS, atau Linux.
- Sudah terinstal [Node.js](https://nodejs.org/) (Versi 18 LTS atau lebih baru).

### Cara Menjalankan (1-Klik)
- **Windows (Paling Mudah)**: Klik 2x pada file **`start-noffice.bat`**.
- **Terminal (Developer)**:
  ```bash
  npm run start
  ```
- Buka browser Anda di alamat: **👉 http://localhost:5173/**

---

## 🛠️ Teknologi yang Digunakan (Tech Stack)

- **Frontend UI**: React 18, Vite, Custom Premium CSS (Plus Jakarta Sans Font, Glassmorphic Design).
- **Backend Server**: Node.js, Express.js.
- **Database Lokal**: SQLite 3 (`server/database.sqlite`) — Database permanen aman di PC kantor.
- **AI Engine**: Local Notary AI Engine (Built-in Local Smart NLP + Dukungan Ollama API).
- **Security**: Node.js Crypto PBKDF2 Password Hashing.

---

*Didesain dan dikembangkan khusus untuk meningkatkan efisiensi dan keamanan kantor Notaris & PPAT di seluruh Indonesia.*
