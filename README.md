# 🏢 Noffice — Sistem Manajemen Terpadu Kantor Notaris & PPAT (Offline-First + Local AI + LAN Ready)

> **Solusi Manajemen Digital 100% Offline & Aman untuk Kantor Notaris & PPAT. Dilengkapi Penyimpanan Berkas Fisik, Penomoran Akta Otomatis, Cetak Tanda Terima Resmi, Local AI Engine, dan Dukungan Akses Jaringan Lokal (LAN).**

---

## 📋 Daftar Isi
1. [Tentang Noffice](#-tentang-noffice)
2. [Keunggulan Utama](#-keunggulan-utama)
3. [Fitur-Fitur Lengkap Aplikasi](#-fitur-fitur-lengkap-aplikasi)
4. [Arsitektur & Keamanan Data](#-arsitektur--keamanan-data)
5. [Diagram Alur Kerja Notaris & PPAT](#-diagram-alur-kerja-notaris--ppat)
6. [Akun Demo Uji Coba](#-akun-demo-uji-coba)
7. [Panduan Langkah demi Langkah Cara Menggunakan](#-panduan-langkah-demi-langkah-cara-menggunakan)
8. [Panduan Konfigurasi & Kustomisasi (Settings)](#-panduan-konfigurasi--kustomisasi-settings)
9. [Panduan Penggunaan di Jaringan Lokal (LAN / Wi-Fi Kantor)](#-panduan-penggunaan-di-jaringan-lokal-lan--wi-fi-kantor)
10. [Rekomendasi Spesifikasi Hardware](#-rekomendasi-spesifikasi-hardware)
11. [Teknologi yang Digunakan (Tech Stack)](#-teknologi-yang-digunakan-tech-stack)

---

## 💡 Tentang Noffice

Kantor Notaris dan PPAT sering kali menghadapi berbagai tantangan operasional harian:
* **Tumpukan Berkas Fisik & Risiko Kehilangan**: Kesulitan melacak keberadaan sertifikat tanah asli, KTP klien, atau bukti pajak.
* **Kesalahan Ketik Data Klien (Human Error)**: Kesalahan input 16-digit NIK KTP atau nama pihak pada minuta akta.
* **Penomoran Akta Ganda atau Meloncat**: Risiko penomoran akta yang tidak terurut saat proses penandatanganan tertunda.
* **Kekhawatiran Kebocoran Data (Privasi Notaris)**: Dokumen hukum dan rahasia klien yang sensitif berisiko jika diunggah ke cloud/internet pihak ketiga.

**Noffice** hadir sebagai **Platform Manajemen Kantor Notaris & PPAT Terpadu** yang dirancang dengan filosofi **100% Offline-First (On-Premise)**. Seluruh data identitas klien, permohonan akta, billing honorarium, dan file dokumen fisik tersimpan secara lokal di komputer kantor Anda tanpa bergantung pada koneksi internet.

---

## ⭐ Keunggulan Utama

1. 🔒 **100% Offline & Jaminan Kerahasiaan Jabatan Notaris**:
   - Seluruh database SQLite dan file dokumen tersimpan di disk lokal kantor. Tidak ada data yang terkirim ke server luar/cloud.
2. 🌐 **Dukungan Akses Jaringan Lokal (LAN / Wi-Fi Multi-Device)**:
   - Cukup jalankan backend di 1 komputer utama (server kantor), seluruh laptop/komputer staf dapat mengakses aplikasi secara bersamaan via Wi-Fi kantor.
3. 📂 **Penyimpanan Berkas Fisik Asli (Real File Storage)**:
   - Staf dapat mengunggah dokumen fisik asli (PDF, DOCX, JPG/PNG KTP/Sertifikat) yang langsung tersimpan secara aman di disk server kantor (`server/uploads/`) dan dapat diunduh kapan saja oleh staf berwenang.
4. 🤖 **Local Notary AI Assistant (Kecerdasan Buatan 100% Lokal)**:
   - Dilengkapi AI lokal (menggunakan Ollama / Smart NLP Engine bawaan) untuk ekstraksi KTP otomatis, pembuat draf pasal akta, dan auditor risiko kasus tanpa memerlukan internet.
5. 📜 **Penomoran Akta Otomatis Anti-Ganda & Kustom**:
   - Sistem menerbitkan nomor akta otomatis terurut (`No. [Urut]/[Bulan Romawi]/[Tahun]`) saat akta ditandatangani, sehingga nomor akta tidak ganda atau loncat.
6. 🖨️ **Cetak Tanda Terima Resmi Ber-Kop Surat**:
   - Cetak bukti **Penerimaan Berkas** (awal) dan **Penyerahan Salinan Akta** (akhir) dengan 1 klik lengkap dengan rincian dokumen dan TTD.

---

## 🛠️ Fitur-Fitur Lengkap Aplikasi

### 1. 📂 Manajemen Permohonan & Kasus Notaris / PPAT (`/cases` & `/ppat-cases`)
* **Dukungan Berbagai Jenis Layanan Legal**:
  * **Notaris**: Akta Jual Beli (AJB), Pendirian PT / CV / Yayasan, Hibah, Waris, Kuasa Memasang Hak Tanggungan (SKMHT), Akta Pendirian Firma, dll.
  * **PPAT**: Peralihan Hak Tanah, Akta Pemberian Hak Tanggungan (APHT), Akta Pembagian Hak Bersama (APHB), Tukar Menukar, dll.
* **Workflow 3-Tahap Terstruktur**:
  1. *Penerimaan Berkas & Verifikasi* (`berkas_masuk`, `draf_akta`, `ttd`)
  2. *Proses Instansi / Pajak* (`proses_npwp`, `pendaftaran_ahu`, `siup_nib`, `bphtb`, `pph`, `cek_plot`, `znt`)
  3. *Penyelesaian & Arsip* (`sk_jadi`, `akta_jadi`, `pendaftaran_bpn`, `diambil`, `arsip`)
* **Checklist Persyaratan Dokumen Interaktif**: Menampilkan daftar dokumen yang wajib dipenuhi sesuai jenis akta (misal AJB membutuhkan KTP, Sertifikat SHM, PBB, BPHTB, PPH).
* **Log Riwayat Status Transparan**: Mencatat setiap perubahan status permohonan beserta nama staf yang mengubah dan stempel waktu (*timestamp*).

### 2. 👥 Manajemen Data Klien (`/clients`)
* **Database Identitas Klien Lengkap**: Menyimpan NIK, Nama Lengkap, Tanggal Lahir, Alamat, No. Telepon/WA, Email, dan Pekerjaan.
* **AI Data Extractor (KTP OCR)**: Fitur pembaca teks KTP. Cukup salin teks hasil scan KTP, AI otomatis mengekstrak NIK 16-digit, Nama, dan Alamat ke dalam formulir secara otomatis.
* **Pencarian Cepat Klien**: Cari data klien berdasarkan NIK atau Nama dengan respons instan.

### 3. 📄 Pengelolaan Berkas & Dokumen Fisik (`/documents`)
* **Penyimpanan Berkas Asli (Upload & Download Real File)**: Unggah dokumen fisik (PDF, Word, Gambar) hingga 50MB yang langsung disimpan secara aman di folder `server/uploads/`.
* **Sistem Kategori & Folder**: Pengelompokan dokumen berdasarkan kategori (*Akta Notaris, Berkas PPAT, Sertifikat, Identitas Klien, Pajak & PBB, Lainnya*).
* **Tempat Sampah & Pemulihan (Trash Bin)**: Fitur *Soft Delete* untuk mengamankan dokumen yang tidak sengaja terhapus, serta fitur *Permanent Delete* yang khusus hanya bisa dilakukan oleh Admin/Notaris Utama.
* **Approval Status Dokumen**: Status persetujuan dokumen (*Pending, Approved, Rejected*) oleh Notaris Utama.

### 4. 💰 Financial Billing & Penjadwalan Penjualan/Appointment
* **Rincian Komponen Biaya**:
  * *Honorarium Notaris / PPAT*
  * *Pajak BPHTB & PPH*
  * *PNBP / Biaya PNBP AHU/BPN*
* **Status Pembayaran**: Pelacakan status bayar (*Belum Bayar / Unpaid, DP / Partial, Lunas / Paid*).
* **Penjadwalan Temu Klien**: Tanggal dan jam janji temu penandatanganan akta dengan klien.

### 5. 🖨️ Cetak Tanda Terima Resmi
* **Tanda Terima Penerimaan Berkas (Awal)**: Bukti sah bahwa Notaris/PPAT telah menerima dokumen asli klien (Sertifikat, KTP, PBB).
* **Tanda Terima Penyerahan Salinan Akta (Akhir)**: Bukti sah penyerahan Salinan Akta / Sertifikat yang sudah dibaliknama kepada klien.
* **Kop Surat Kustom**: Tanda terima tercetak rapi lengkap dengan Kop Surat Kantor, Alamat, Kontak, dan kolom TTD Pihak Klien & Notaris.

### 6. 🤖 Local Notary AI Engine & Copilot (`/ai`)
* **Noffice Copilot Chatbot**: Asisten AI tanya-jawab seputar hukum notaris, syarat akta, dan prosedur pengurusan AHU/BPN yang dapat diakses dari sidebar.
* **AI Data Extractor (KTP)**: Otomatis membaca struktur teks KTP tanpa perlu mengetik manual.
* **AI Draft Generator Pasal**: Membuat draf klausa/pasal hukum akta resmi sesuai parameter pihak dan objek perjanjian.
* **AI Case Auditor & Risk Assister**: Menganalisis berkas kasus dan memberikan peringatan risiko hukum (misal: syarat persetujuan suami/wife pada AJB, validasi BPHTB, silsilah waris).

### 7. ⚙️ Pengaturan & Kustomisasi Sistem (`/settings`)
* **Format Nomor Akta Kustom**: Pengaturan pola nomor akta kantor menggunakan variabel dinamis (`{no}`, `{bulanRomawi}`, `{tahun}`, `{jenisAkta}`).
* **Kustomisasi Kop Surat Tanda Terima**: Mengubah Nama Perusahaan/Kantor, Subtitle Kop Surat, Alamat, dan Kontak Telepon/Email.
* **Manajemen Staf & Pengguna**: Mengelola akun staf dan hak akses role.
* **1-Click Backup Database**: Mengunduh salinan file database SQLite `database.sqlite` secara instan.

---

## 🔒 Arsitektur & Keamanan Data

```
+-----------------------------------------------------------------------+
|                       JARINGAN LOKAL KANTOR (LAN)                     |
|                                                                       |
|  [Laptop Staf 1]       [Laptop Staf 2]       [PC Notaris Utama]       |
|  http://192.168.1.10:5173  http://192.168.1.10:5173  http://localhost:5173|
+-----------------------------------+-----------------------------------+
                                    | (Request via HTTP LAN)
                                    v
+-----------------------------------------------------------------------+
|                      KOMPUTER SERVER KANTOR (HOST)                    |
|                                                                       |
|   +---------------------------------------------------------------+   |
|   | Frontend Server: Vite (Host: 0.0.0.0:5173)                    |   |
|   +---------------------------------------------------------------+   |
|                                   |                                   |
|   +---------------------------------------------------------------+   |
|   | Backend API: Express.js (Host: 0.0.0.0:3001)                  |   |
|   |  - Token Session Authenticator (Bearer Token)                 |   |
|   |  - RBAC (Role-Based Access Control: Admin vs Employee)        |   |
|   +-------------------------------+-------------------------------+   |
|                                   |                                   |
|        +--------------------------+--------------------------+        |
|        |                                                     |        |
|        v                                                     v        |
|  +---------------------------+             +-----------------------+  |
|  | Database SQLite           |             | File Storage Server   |  |
|  | (server/database.sqlite)  |             | (server/uploads/)     |  |
|  |  - Users & Sessions       |             |  - File PDF Akta      |  |
|  |  - Data Klien & NIK       |             |  - Scan KTP & SHM     |  |
|  |  - Data Kasus & Billing   |             |  - Bukti Setor Pajak  |  |
|  +---------------------------+             +-----------------------+  |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | Local AI Engine (Offline Ollama / Smart NLP)                    |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

* **Session Token Cryptography**: Setiap login menghasilkan 256-bit token session acak yang disimpan di database `sessions` dan di-passing via header `Authorization: Bearer <token>`.
* **Proteksi Endpoint Admin**: API sensitif seperti `GET /api/system/backup` dan `DELETE /api/documents/:id/permanent` dilindungi validasi sesi Admin.
* **Zero Cloud Transmission**: Tidak ada data yang pernah keluar dari PC Server kantor.

---

## 🎨 Diagram Alur Kerja Notaris & PPAT

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
```

---

## 🔑 Akun Demo Uji Coba

Gunakan akun demo terdaftar berikut untuk menguji aplikasi:

| Peran (Role) | Email | Password | Hak Akses Utama |
|---|---|---|---|
| 🏛️ **Notaris Utama (Admin)** | `admin@noffice.com` | `admin123` | **Akses Penuh**: Approval dokumen, penomoran akta, hapus permanen, billing, backup database, pengaturan kop & format akta. |
| 👩‍💼 **Staf Notaris (Employee)** | `dewi@noffice.com` | `dewi123` | **Akses Operasional**: Input klien, OCR KTP, buat kasus, checklist dokumen, upload berkas, cetak tanda terima. |
| 👨‍💼 **Staf PPAT (Employee)** | `andi@noffice.com` | `andi123` | **Akses Operasional**: Input kasus PPAT/AJB/APHT, update status instansi BPN, cetak tanda terima. |

---

## 📖 Panduan Langkah demi Langkah Cara Menggunakan

### 1️⃣ Langkah 1: Membuka Aplikasi & Login
1. Jalankan aplikasi melalui file `start-noffice.bat` atau perintah `npm run start`.
2. Buka browser di URL `http://localhost:5173` (atau IP Server kantor).
3. Masukkan Email & Password sesuai tabel akun demo di atas, lalu klik **Login**.

### 2️⃣ Langkah 2: Registrasi Klien Baru & OCR KTP (`/clients`)
1. Klik menu **Klien Notaris** pada sidebar ➔ Klik tombol **+ Tambah Klien**.
2. Jika Anda memiliki hasil *scan/copy-paste* teks KTP:
   - Tempel teks KTP pada kotak **AI OCR Extractor** ➔ Klik **Jalankan AI Extract**.
   - Form NIK (16 digit), Nama, Tanggal Lahir, Alamat, dan Pekerjaan akan otomatis terisi.
3. Periksa kembali kelengkapan data ➔ Klik **Simpan Data Klien**.

### 3️⃣ Langkah 3: Membuat Permohonan / Kasus Akta Baru (`/cases` atau `/ppat-cases`)
1. Buka menu **Kasus Notaris** atau **Kasus PPAT** ➔ Klik **+ Buat Permohonan Baru**.
2. Pilih nama **Klien**, tentukan **Jenis Layanan** (misal *AJB*, *Pendirian PT*, *Warisan*, *APHT*), dan tentukan **Staf Penanggung Jawab**.
3. Sistem akan otomatis mengisi **Nomor Permohonan** dan **Checklist Dokumen Wajib**.
4. Klik **Simpan Permohonan**.

### 4️⃣ Langkah 4: Pengelolaan Checklist Dokumen & Upload Berkas Fisik
1. Klik permohonan yang telah dibuat untuk melihat **Detail Kasus**.
2. Saat klien menyerahkan dokumen fisik (KTP, Sertifikat Tanah SHM, PBB):
   - Centang item pada **Checklist Persyaratan Dokumen**.
3. Buka menu **Dokumen** ➔ Klik **Upload Dokumen**.
4. Pilih file PDF/DOCX/Gambar dokumen fisik (maksimal 50MB) ➔ Beri Nama & Kategori ➔ Klik **Upload**.
5. Berkas fisik kini tersimpan aman di server dan dapat diunduh kapan saja dengan mengklik tombol **Download** di modal dokumen.

### 5️⃣ Langkah 5: Cetak Surat Tanda Terima Penerimaan Berkas
1. Di dalam halaman detail kasus, klik tombol **🖨️ Cetak Tanda Terima**.
2. Pilih jenis tanda terima: **Tanda Terima Penerimaan Berkas (Awal)**.
3. Modal pratinjau tanda terima ber-Kop Surat Notaris akan tampil lengkap dengan daftar dokumen fisik yang diterima.
4. Klik **Cetak Document** untuk mencetak ke printer kantor atau menyimpan sebagai PDF.

### 6️⃣ Langkah 6: Audit AI Risiko, Draft Pasal Akta, & Billing Keuangan
1. **Audit AI**: Klik **🤖 Audit Risiko Kasus**. AI akan menganalisis kelengkapan berkas dan memberi catatan penting (misal: verifikasi pajak BPHTB/PPH, persetujuan pasangan).
2. **Drafting Pasal**: Gunakan **⚡ AI Draft Generator** untuk menghasilkan draf klausa pasal akta resmi.
3. **Billing Biaya**: Masukkan nilai *Honorarium Notaris*, *Pajak BPHTB/PPH*, dan *PNBP* pada modul Biaya & Billing ➔ Tentukan Status Pembayaran (*Lunas / DP / Belum Bayar*).

### 7️⃣ Langkah 7: Penandatanganan Minuta Akta & Penerbitan Nomor Akta Resmi
1. Saat para pihak/klien hadir di kantor untuk penandatanganan fisik basah minuta akta:
   - Ubah status permohonan menjadi `Siap TTD` atau `TTD`.
2. Klik tombol **⚡ Generate Nomor Akta Otomatis** (Hanya dapat dilakukan oleh Notaris / Admin).
3. Sistem akan menerbitkan nomor akta resmi terurut (contoh: `No. 15/IX/2026`) yang tersimpan permanen di database SQLite.

### 8️⃣ Langkah 8: Pengurusan Instansi (AHU/BPN) & Cetak Penyerahan Salinan Akta
1. Ubah status kasus sesuai alur pengurusan instansi (misal: `pendaftaran_ahu`, `pendaftaran_bpn`).
2. Setelah salinan akta / sertifikat baliknama selesai:
   - Klik **🖨️ Cetak Tanda Terima** ➔ Pilih **Tanda Terima Penyerahan Salinan Akta (Akhir)**.
3. Cetak dan minta tanda tangan klien sebagai bukti sah penyerahan dokumen hasil.
4. Ubah status permohonan menjadi `diambil` / `arsip`. Minuta akta asli ber-TTD basah tersimpan aman di lemari arsip kantor.

---

## ⚙️ Panduan Konfigurasi & Kustomisasi (Settings)

Buka menu **Settings** pada sidebar untuk melakukan kustomisasi berikut:

### 🔢 1. Mengubah Format Nomor Akta Otomatis (`Settings → General`)
Anda dapat menyesuaikan format nomor akta agar sesuai dengan standar kantor Notaris Anda:
* Variabel dinamis yang dapat digunakan:
  * `{no}` — Nomor urut akta (otomatis dihitung per tahun, misal: `1`, `2`, `3`)
  * `{bulanRomawi}` — Bulan dalam angka Romawi (misal: `I`, `II`, `IX`, `XII`)
  * `{bulan}` — Bulan 2-digit (misal: `01`, `09`, `12`)
  * `{tahun}` — Tahun 4-digit (misal: `2026`)
  * `{tahunPendek}` — Tahun 2-digit (misal: `26`)
  * `{jenisAkta}` — Singkatan jenis layanan akta (misal: `AJB`, `PT`)
* **Contoh Format**:
  * `No. {no}/{bulanRomawi}/{tahun}` ➔ **No. 5/IX/2026**
  * `AKT-{no}/{tahun}/{bulanRomawi}` ➔ **AKT-5/2026/IX**
  * `{no}/{jenisAkta}/{tahun}` ➔ **5/PT/2026**

### 🖨️ 2. Mengubah Kop Surat & Template Tanda Terima (`Settings → General`)
* **Nama Perusahaan / Kantor**: Diubah di field *Nama Perusahaan* (misal: `KANTOR NOTARIS & PPAT SILVIA SH., M.KN.`).
* **Subtitle Kop Surat**: Diubah di field *Subtitle Tanda Terima* (misal: `Pejabat Pembuat Akta Tanah (PPAT) & Notaris Kota Semarang`).
* **Alamat & Kontak Kantor**: Diubah di field *Alamat & Kontak* (misal: `Jln. Diponegoro No. 10 | Telp: (024) 555-8899 | Email: info@notarissilvia.id`).
* **Pratinjau Langsung**: Hasil perubahan kop surat dapat dilihat secara *real-time* di pratinjau halaman Settings sebelum disimpan.

---

## 🌐 Panduan Penggunaan di Jaringan Lokal (LAN / Wi-Fi Kantor)

Agar aplikasi dapat diakses oleh beberapa komputer staf secara bersamaan di kantor:

1. **Pastikan Komputer Server & Komputer Staf Terhubung ke Wi-Fi / Router Kantor yang Sama**.
2. **Jalankan Aplikasi di Komputer Server Utama**:
   - Klik 2x file `start-noffice.bat` atau jalankan `npm run start` di terminal server.
   - Konsol server akan menampilkan alamat IP LAN komputer server, contoh:
     ```
     ====================================================
      Noffice Backend Server Running Successfully!
      - Akses Lokal:   http://localhost:3001
      - Akses LAN Wi-Fi: http://192.168.1.10:3001
     ====================================================
     ```
3. **Akses dari Laptop / Komputer Staf**:
   - Buka browser di komputer staf (misal PC Dewi).
   - Ketik alamat IP server dengan port `5173`, contoh: `http://192.168.1.10:5173`.
   - Staf dapat login menggunakan akun masing-masing (`dewi@noffice.com`), mengunggah berkas, dan mengunduh dokumen secara lancar!

---

## 💻 Rekomendasi Spesifikasi Hardware

| Komponen | Spesifikasi Minimum | Spesifikasi Direkomendasikan |
|---|---|---|
| **Sistem Operasi** | Windows 10 / 11 (64-bit), macOS, Linux | Windows 11 Pro 64-bit |
| **Processor (CPU)** | Intel Core i3 (Gen 10+) / AMD Ryzen 3 | Intel Core i5 / Core i7 / AMD Ryzen 5 |
| **Memory (RAM)** | 8 GB RAM | 16 GB RAM (Performa AI Terbaik) |
| **Penyimpanan (SSD)** | 256 GB SSD | 512 GB NVMe SSD |
| **Koneksi Internet** | Tidak Diperlukan (100% Offline) | Tidak Diperlukan (100% Offline) |

---

## 🛠️ Teknologi yang Digunakan (Tech Stack)

* **Frontend UI**: React 18, Vite, React Router v6, Vanilla CSS Kustom (Glassmorphism & Dark/Light Mode).
* **Backend Engine**: Node.js, Express.js.
* **Database & Memory**: SQLite 3 (`better-sqlite3` & `sqlite3`), Journal Mode WAL untuk performa tinggi.
* **Storage Layer**: Physical Disk File Storage (`server/uploads/`) dengan pengaliran stream file.
* **Security & Auth**: Crypto PBKDF2 Password Hashing, Session Bearer Token Cryptography, Role-Based Access Control (RBAC).
* **AI Notary Engine**: Built-in Local Smart NLP Extractor + Dukungan integrasi local Ollama LLM API (`localhost:11434`).

---

*Didesain dan dikembangkan khusus untuk meningkatkan efisiensi, kerapihan administrasi, dan keamanan data kerahasiaan kantor Notaris & PPAT di seluruh Indonesia.*
