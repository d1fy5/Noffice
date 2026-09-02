# 🏢 Noffice — Sistem Manajemen Terpadu Kantor Notaris & PPAT (Offline-First + Local AI)

> **Solusi Cerdas & Aman 100% Offline untuk Otomatisasi Administrasi, Pembuatan Akta, Pengurusan Instansi (AHU/BPN), dan Manajemen Minuta Akta Kantor Notaris & PPAT.**

---

## 💡 Apa Itu Noffice & Mengapa Anda Membutuhkannya?

Banyak kantor Notaris & PPAT menghadapi kendala seperti **tumpukan berkas fisik**, **kesalahan ketik 16 digit NIK KTP**, **proses perancangan draf akta yang memakan waktu**, **pelacakan berkas di BPN/AHU Kemenkumham**, serta **kekhawatiran data kerahasiaan klien bocor jika disimpan di server cloud/internet**.

**Noffice** hadir sebagai solusi sistem manajemen kantor terpadu yang beroperasi **100% Offline-First (On-Premise)** di komputer kantor Anda. Seluruh database, identitas klien, dan naskah akta tersimpan **100% aman di jaringan lokal tanpa bergantung pada koneksi internet/cloud**.

---

## ⭐ 6 Keunggulan Utama Noffice (Killer Features)

1. 🔒 **100% Offline & Keamanan Kerahasiaan Jabatan Notaris**:
   - Berkas dan identitas KTP/Sertifikat klien tidak pernah terkirim ke server luar/cloud. Bebas dari risiko peretasan data online.
2. 🤖 **Local Notary AI Assistant (Kecerdasan Buatan Offline)**:
   - Dilengkapi AI khusus Notaris yang bekerja tanpa internet! Bebas biaya token bulanan API.
3. ⚡ **AI Data Extractor (KTP/OCR Otomatis)**:
   - Cukup salin teks hasil scan KTP, AI otomatis mengisi NIK 16-digit, Nama, dan Alamat ke dalam formulir secara instan dalam 1 detik (mencegah kesalahan ketik fatal).
4. 📜 **Penomoran Akta Otomatis & Terurut Anti-Ganda**:
   - Penomoran resmi (`No. [Urut]/[Bulan Romawi]/[Tahun]`) digenerate **setelah penandatanganan akta**, sehingga nomor tidak akan pernah lompat atau ganda jika penandatanganan ditunda.
5. 🖨️ **Dua Jenis Tanda Terima Cetak 1-Klik**:
   - **Tanda Terima Penerimaan Berkas**: Bukti penerimaan sertifikat/KTP asli di awal.
   - **Tanda Terima Penyerahan Salinan Akta**: Bukti sah penyerahan dokumen hasil ke klien di akhir.
6. 💾 **1-Click Local Database Backup**:
   - Fitur 1-klik unduh backup file database SQLite (`database.sqlite`) ke Flashdisk/Harddisk Eksternal setiap sore hari.

---

## 🎨 Diagram Alur Kerja Otentik Notaris & PPAT (End-to-End Workflow)

```
====================================================================================================================
                                FLOW WORKFLOW REALISTIS KANTOR NOTARIS & PPAT
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
  │  6. PENGARSIPAN│ ◄───   │  5.5 PENDAFTARAN AHU / BPN       │ ◄───   │     4. DRAFTING & BILLING        │
  │     MINUTA     │        │  • 🏛️ Pengurusan Kemenkumham (PT)│        │  • ⚡ AI Draft Generator Pasal    │
  │                │        │  • 🏛️ Balik Nama BPN / Bapenda   │        │  • 💰 Biaya Honorarium & Pajak   │
  │ • Minuta Akta  │        │  • Status: "Pengurusan AHU/BPN"  │        │  • Status Bayar (DP / Lunas)     │
  │   Tersimpan    │        │  • 🖨️ Cetak Penyerahan Salinan   │        │  • Status: "Drafting Akta / TTD" │
  │ • Salinan Akta │        └──────────────────────────────────┘        └──────────────────────────────────┘
  │   Diserahkan   │                                                             │
  └────────────────┘                                                             ▼
                                                                        ┌──────────────────────────────────┐
                                                                        │  5. PENANDATANGANAN MINUTA AKTA  │
                                                                        │  • 📅 Agenda TTD Hari Ini/Minggu │
                                                                        │  • TTD Fisik Basah Klien         │
                                                                        │  • ⚡ Generate Nomor Akta Resmi   │
                                                                        │    Format: "No. 1/IX/2026"       │
                                                                        └──────────────────────────────────┘

====================================================================================================================
                                    🤖 ENGINE AI LOKAL (100% OFFLINE / OLLAMA)
  [Noffice Copilot Chatbot]  │  [AI Extractor KTP]  │  [AI Draft Generator Pasal]  │  [AI Case Auditor Risiko]
====================================================================================================================
```

---

## 📖 Panduan Penggunaan 6-Langkah (User Guide)

### 1️⃣ Langkah 1: Pendaftaran Klien Baru (`/clients`)
- Buka menu **Klien** ➔ Klik **+ Tambah Klien**.
- Salin teks hasil scan KTP ➔ Klik **🤖 AI Data Extractor** ➔ NIK 16-digit, Nama, dan Alamat terisi otomatis.

### 2️⃣ Langkah 2: Pembuatan Permohonan & Checklist Berkas (`/cases`)
- Buka menu **Permohonan** ➔ Pilih Klien dan jenis permohonan (*Akta Jual Beli / Pendirian PT / Hibah / dll.*).
- Centang dokumen fisik yang diserahkan pada **Checklist Berkas Interaktif**.

### 3️⃣ Langkah 3: Cetak Surat Tanda Terima Berkas (`/cases`)
- Klik **🖨️ Cetak Tanda Terima** ➔ Pilih **Penerimaan Berkas** untuk mencetak bukti fisik penerimaan sertifikat/KTP asli ber-Kop Notaris.

### 4️⃣ Langkah 4: Audit AI, Drafting Pasal, & Billing (`/cases`)
- Gunakan **🤖 AI Case Auditor** untuk meninjau potensi risiko legal dan kewajiban pajak.
- Gunakan **⚡ AI Draft Generator** untuk menyusun naskah pasal-pasal akta resmi.
- Isi rincian biaya honorarium & pajak di modul **Biaya & Billing**.

### 5️⃣ Langkah 5: Penandatanganan Minuta Akta & Penerbitan Nomor Akta
- Saat klien hadir TTD fisik, ubah status menjadi `Siap TTD` ➔ Klik **Generate Nomor Akta Otomatis** (Contoh: `No. 1/IX/2026`).

### 6️⃣ Langkah 6: Pendaftaran AHU/BPN, Penyerahan Salinan, & Arsip Minuta
- Ubah status ke `Pengurusan AHU / BPN` untuk melacak pendaftaran instansi.
- Setelah selesai, klik **🖨️ Cetak Tanda Terima** ➔ Pilih **Penyerahan Salinan Akta** sebagai bukti klien menerima hasil akta.
- Akta asli (Minuta Akta) ber-TTD basah otomatis berstatus `Minuta Tersimpan di Arsip`.

---

## 💻 Rekomendasi Spesifikasi Hardware Komputer Kantor

Untuk memastikan aplikasi dan **Local Notary AI Engine** berjalan lancar tanpa hambatan:

| Komponen | Spesifikasi Minimum | Spesifikasi Direkomendasikan |
|---|---|---|
| **Sistem Operasi** | Windows 10 / 11 (64-bit), macOS, Linux | Windows 11 Pro 64-bit |
| **Processor (CPU)** | Intel Core i3 (Gen 10+) / AMD Ryzen 3 | Intel Core i5 / Core i7 / AMD Ryzen 5 |
| **Memory (RAM)** | 8 GB RAM | 16 GB RAM (Pengalaman AI Terbaik) |
| **Penyimpanan (SSD)** | 256 GB SSD | 512 GB NVMe SSD |
| **Koneksi Internet** | Tidak Diperlukan (100% Offline) | Tidak Diperlukan (100% Offline) |

---

## 🔑 Akun Demo untuk Uji Coba

| Peran (Role) | Email | Password | Hak Akses Utama |
|---|---|---|---|
| 🏛️ **Notaris (Admin)** | `admin@noffice.com` | `admin` | Akses Penuh (Approval, AI Drafting, Penomoran Akta, Billing, Backup, Ekspor CSV) |
| 👨‍💼 **Karyawan (Staff)** | `karyawan@noffice.com` | `user` | Akses Operasional (Input Klien, AI OCR KTP, Checklist Berkas, Cetak Tanda Terima) |

---

## 🚀 Cara Menjalankan Aplikasi

1. **Windows (1-Klik Paling Mudah)**: Klik 2x pada file **`start-noffice.bat`**.
2. **Terminal (Developer)**:
   ```bash
   npm run start
   ```
3. Buka browser Anda di alamat: **👉 http://localhost:5173/**

---

## 🛠️ Teknologi yang Digunakan (Tech Stack)

- **Frontend UI**: React 18, Vite, Custom Premium CSS (Plus Jakarta Sans Font, Glassmorphic Design).
- **Backend Server**: Node.js, Express.js.
- **Database Lokal**: SQLite 3 (`server/database.sqlite`) — File database permanen dengan **API 1-Click Backup**.
- **AI Engine**: Local Notary AI Engine (Built-in Local Smart NLP + Dukungan Ollama API).
- **Security**: Node.js Crypto PBKDF2 Password Hashing.

---

*Didesain dan dikembangkan khusus untuk meningkatkan efisiensi dan keamanan kantor Notaris & PPAT di seluruh Indonesia.*
