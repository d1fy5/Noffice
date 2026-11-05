# 📘 BUKU PANDUAN PENGGUNA NOFFICE (NOTARY & PPAT MANAGEMENT SYSTEM)
> **Sistem Manajemen Kantor Notaris & PPAT 100% Offline-First, Aman, Terstruktur, dan Berbasis AI Lokal.**

Dokumen ini memuat panduan komprehensif pengoperasian sistem **Noffice** yang ditujukan khusus bagi **Administrator (Notaris Utama)** dan seluruh jajaran **Karyawan (Staf Notaris, Staf PPAT, Administrasi, & Keuangan)**.

---

## 📑 DAFTAR ISI
1. [Ikhtisar Sistem & Kredensial Akun Pengguna](#1-ikhtisar-sistem--kredensial-akun-pengguna)
2. [BAGIAN I: PANDUAN ADMINISTRATOR (NOTARIS UTAMA)](#bagian-i-panduan-administrator-notaris-utama)
   - [1.1 Peran, Wewenang, & Dashboard Notaris Utama](#11-peran-wewenang--dashboard-notaris-utama)
   - [1.2 Manajemen Karyawan & Penugasan Staf](#12-manajemen-karyawan--penugasan-staf)
   - [1.3 Review & Persetujuan Dokumen / Minuta Akta (Approval System)](#13-review--persetujuan-dokumen--minuta-akta-approval-system)
   - [1.4 Sistem Penomoran Otomatis Akta & Buku Klapper](#14-sistem-penomoran-otomatis-akta--buku-klapper)
   - [1.5 Pengawasan Finansial, Honorarium, Titipan Pajak & PNBP](#15-pengawasan-finansial-honorarium-titipan-pajak--pnbp)
   - [1.6 Pengelolaan Tempat Sampah (Trash), Restore, & Hapus Permanen](#16-pengelolaan-tempat-sampah-trash-restore--hapus-permanen)
   - [1.7 Konfigurasi Kop Surat, Pengaturan Sistem, & Backup Database](#17-konfigurasi-kop-surat-pengaturan-sistem--backup-database)
   - [1.8 Panduan Akses Bersama di Jaringan LAN Kantor](#18-panduan-akses-bersama-di-jaringan-lan-kantor)
3. [BAGIAN II: PANDUAN KARYAWAN (STAF NOTARIS & STAF PPAT)](#bagian-ii-panduan-karyawan-staf-notaris--staf-ppat)
   - [2.1 Pendaftaran Klien Baru & Fitur Smart KTP Scanner (AI & OCR)](#21-pendaftaran-klien-baru--fitur-smart-ktp-scanner-ai--ocr)
   - [2.2 Pengelolaan Permohonan Akta Notaris (Cases)](#22-pengelolaan-permohonan-akta-notaris-cases)
   - [2.3 Pengelolaan Permohonan Akta PPAT (Ppat Cases)](#23-pengelolaan-permohonan-akta-ppat-ppat-cases)
   - [2.4 Verifikasi Dokumen & Penggunaan Checklist Persyaratan](#24-verifikasi-dokumen--penggunaan-checklist-persyaratan)
   - [2.5 Penjadwalan Tanggal & Jam Tanda Tangan Akta (Minuta)](#25-penjadwalan-tanggal--jam-tanda-tangan-akta-minuta)
   - [2.6 Cetak Tanda Terima Berkas & Penyerahan Salinan Akta](#26-cetak-tanda-terima-berkas--penyerahan-salinan-akta)
   - [2.7 Manajemen Arsip & Upload Dokumen Fisik](#27-manajemen-arsip--upload-dokumen-fisik)
   - [2.8 Pemanfaatan Noffice AI Copilot (100% Offline)](#28-pemanfaatan-noffice-ai-copilot-100-offline)
   - [2.9 Menggunakan Kotak Masuk (Inbox) & Notifikasi](#29-menggunakan-kotak-masuk-inbox--notifikasi)
4. [FAQ & Solusi Masalah Teknis (Troubleshooting)](#faq--solusi-masalah-teknis-troubleshooting)

---

## 1. Ikhtisar Sistem & Kredensial Akun Pengguna

Noffice dirancang khusus dengan filosofi **Offline-First & On-Premise**. Artinya:
* Seluruh database identitas klien, NIK, minuta akta, dan riwayat kasus tersimpan di server lokal kantor Anda (SQLite).
* Tidak ada data rahasia klien yang diunggah ke cloud publik pihak ketiga.
* Pemrosesan AI dan OCR KTP dijalankan secara lokal di komputer server.

### Daftar Akun Demo Resmi:

| No | Nama Pegawai | Peran (Role) | Departemen | Email Login | Password Default |
|:--:|:---|:---|:---|:---|:---|
| 1 | **Notaris Utama, S.H., M.Kn.** | `admin` (Super Admin) | Management | `admin@noffice.com` | `admin123` |
| 2 | **Dewi Rahayu, S.H.** | `employee` (Staf Notaris) | Notaris | `dewi@noffice.com` | `dewi123` |
| 3 | **Andi Prasetyo, S.H.** | `employee` (Staf PPAT) | PPAT | `andi@noffice.com` | `andi123` |
| 4 | **Bambang Haryanto** | `employee` (Staf Admin) | Administrasi | `bambang@noffice.com` | `bambang123` |
| 5 | **Rina Anggraini, S.E.** | `employee` (Staf Finance) | Keuangan | `rina@noffice.com` | `rina123` |
| 6 | **Fajar Nugroho, S.H.** | `employee` (Legal Auditor) | Legal | `fajar@noffice.com` | `fajar123` |

> 💡 **Tip:** Untuk beralih pengguna saat pengujian, klik avatar di pojok kanan atas, pilih **Keluar**, lalu masuk kembali menggunakan akun yang diinginkan.

---

## BAGIAN I: PANDUAN ADMINISTRATOR (NOTARIS UTAMA)

Panduan ini ditujukan bagi **Notaris Utama / Notaris Pemegang Protokol** yang memiliki wewenang hukum tertinggi dalam kantor.

### 1.1 Peran, Wewenang, & Dashboard Notaris Utama
Sebagai Administrator, Anda memiliki akses penuh ke seluruh modul sistem:
* **Statistik Utama di Dashboard:** Memantau jumlah kasus aktif yang sedang berjalan, total klien terdaftar, total berkas arsip, serta jumlah berkas yang **Menunggu Persetujuan Anda**.
* **Jadwal Penandatanganan (Appointments):** Menampilkan daftar klien yang dijadwalkan hadir ke kantor untuk penandatanganan akta hari ini dan hari berikutnya.
* **Permohonan Akta Terbaru:** Ringkasan progres terkini permohonan akta, lengkap dengan PIC staf dan status tahapan akta.

---

### 1.2 Manajemen Karyawan & Penugasan Staf
Buka menu **Kelola Staff** (`/employees`) di navigasi samping:
1. **Melihat Daftar Staf:** Memantau nama lengkap, departemen (Notaris, PPAT, Legal, Keuangan, dsb.), jabatan fungsional, email, dan status keaktifan.
2. **Menambahkan Karyawan Baru:**
   - Klik tombol **+ Tambah Karyawan** di kanan atas.
   - Isi Nama Depan, Nama Belakang, Departemen, Peran (contoh: *Legal Drafter*), Email, dan Status *Active*.
   - Klik Simpan. Staf akan langsung muncul di daftar dropdown penugasan kasus.
3. **Mengubah Status atau Menghapus:**
   - Gunakan checkbox untuk aksi massal (*Bulk Actions*), atau klik ikon pensil pada baris staf untuk mengubah data.
   - Klik tombol **Ekspor** untuk mengunduh daftar pegawai ke format spreadsheet CSV.

---

### 1.3 Review & Persetujuan Dokumen / Minuta Akta (Approval System)
Sebelum akta resmi dicetak menjadi minuta untuk ditandatangani penghadap:
1. Masuk ke halaman **Dokumen** (`/documents`) atau tabel verifikasi di **Tabel Data** (`/data-tables`).
2. Filter status berdasarkan **Menunggu (Pending)**.
3. Klik pada judul dokumen untuk membaca deskripsi dan mengunduh berkas fisik via tombol **Unduh File**.
4. Di bilah pratinjau samping:
   - Klik tombol hijau **Setujui (Approve)** jika isi draf akta sudah sesuai dengan ketentuan hukum dan peraturan perundang-undangan (UUJN).
   - Klik tombol merah **Tolak (Reject)** jika masih ada klausul atau lampiran yang perlu diperbaiki oleh staf drafter. Dokumen yang ditolak akan otomatis diberi status *Rejected* dan dicatat dalam audit trail.

---

### 1.4 Sistem Penomoran Otomatis Akta & Buku Klapper
Noffice dilengkapi dengan penghitung nomor akta otomatis (*Automatic Akta Counter*) berbasis tahun berjalan:
1. Pada halaman detail kasus di menu **Kasus Notaris** atau **Kasus PPAT**, Notaris Utama dapat menekan tombol **Generate No. Akta Resmi**.
2. Sistem akan memeriksa nomor urut terakhir pada buku register tahun berjalan (misal tahun 2026) dan menghasilkan nomor resmi, misalnya: `No. 08/X/2026` atau `No. 18/AJB/2026`.
3. Nomor ini otomatis terkunci ke dalam database kasus dan dapat dicari di masa mendatang untuk keperluan pendaftaran buku klapper atau laporan berkala ke Pengda INI/IPPAT.

---

### 1.5 Pengawasan Finansial, Honorarium, Titipan Pajak & PNBP
Setiap permohonan akta membedakan tiga pos keuangan krusial bagi kantor Notaris & PPAT:
1. **Honorarium Notaris/PPAT (Notary Fee):** Jasa hukum kantor Notaris sesuai ketentuan batas tarif Pasal 36 UUJN.
2. **Titipan Pajak (Tax Fee):**
   - Kasus Notaris: PPh Final (bila ada).
   - Kasus PPAT: PPh Pengalihan Hak (2.5% Penjual) dan BPHTB (5% Pembeli setelah dikurangi NPOPTKP).
3. **Biaya PNBP (PNBP Fee):** Pembayaran Pendapatan Negara Bukan Pajak ke rekening kas negara via Simponi (Kemenkumham) atau Loket BPN.
4. **Status Pembayaran:** Notaris dapat menetapkan status transaksi:
   - `unpaid` (Belum Bayar)
   - `partial` (Uang Muka / Titipan Berkas)
   - `paid` (Lunas Seluruhnya)
Status ini langsung terhubung dengan pembuatan kuitansi tanda terima resmi.

---

### 1.6 Pengelolaan Tempat Sampah (Trash), Restore, & Hapus Permanen
Untuk mencegah kehilangan data minuta yang fatal akibat kelalaian staf:
1. Dokumen yang dihapus oleh staf **tidak langsung lenyap**, melainkan dipindahkan ke folder **Tong Sampah (Trash)** dengan metadata tanggal pembuangan dan nama staf yang menghapusnya.
2. **Memulihkan Dokumen (Restore):** Buka folder *Tong Sampah* di halaman Dokumen, pilih berkas, lalu klik **Pulihkan (Restore)**. Dokumen akan langsung kembali ke kategori asalnya.
3. **Hapus Permanen & Kosongkan Sampah:** Hanya akun Administrator (`admin@noffice.com`) yang memiliki izin mengeksekusi tombol merah **Kosongkan Tempat Sampah (Empty Trash)** untuk membersihkan penyimpanan harddisk server secara permanen.

---

### 1.7 Konfigurasi Kop Surat, Pengaturan Sistem, & Backup Database
Buka menu **Pengaturan** (`/settings`):
1. **Profil Kantor:** Atur Nama Notaris & PPAT, SK Pengangkatan, Wilayah Kerja, Alamat Kantor, Nomor Telepon, dan Email resmi kantor. Data ini otomatis tampil pada *header* Tanda Terima Cetak.
2. **Keamanan & Sandi:** Ganti sandi akun admin secara berkala.
3. **Backup Database Lokal:**
   - File database SQLite tersimpan di path `server/database.sqlite`.
   - File fisik dokumen yang diunggah tersimpan di `server/uploads/`.
   - Lakukan salinan backup berkala ke harddisk eksternal kantor atau flashdisk terenkripsi untuk antisipasi kerusakan perangkat keras.

---

### 1.8 Panduan Akses Bersama di Jaringan LAN Kantor
Noffice dapat diakses oleh seluruh laptop dan PC karyawan di kantor Anda tanpa koneksi internet luar:
1. Pastikan PC server kantor menyala dan menjalankan backend server.
2. Saat server dijalankan, terminal akan menampilkan alamat IP LAN, misalnya:
   `http://192.168.1.100:3005` (Backend) dan `http://192.168.1.100:5180` (Frontend).
3. Laptop staf yang terhubung pada Wi-Fi/kabel LAN kantor yang sama cukup membuka browser dan mengetik alamat IP tersebut untuk mulai bekerja secara simultan.

---

## BAGIAN II: PANDUAN KARYAWAN (STAF NOTARIS & STAF PPAT)

Panduan ini wajib dipelajari oleh seluruh staf operasional kantor agar proses pengerjaan berkas rapi, cepat, dan akurat.

### 2.1 Pendaftaran Klien Baru & Fitur Smart KTP Scanner (AI & OCR)
Setiap permohonan akta wajib diawali dengan pendataan identitas para penghadap / pemohon di menu **Klien** (`/clients`).

Noffice menyediakan fitur mutakhir **Scan KTP Pintar (AI & OCR)** yang bekerja 100% lokal tanpa mengirim foto KTP ke internet:

```
[ Buka Menu Klien ] ➔ [ Klik + Tambah Klien ] ➔ [ Pilih Mode Input KTP ]
```

Tersedia 3 Mode Fleksibel:

#### Mode 1: 📷 Kamera KTP (Webcam Laptop)
* Arahkan KTP klien tepat di tengah bingkai cutout persegi panjang (rasio standar KTP 1.58 : 1).
* Jaga kartu tetap stabil, pastikan pencahayaan ruangan cukup terang dan tidak ada pantulan cahaya lampu yang menyilaukan.
* Klik tombol biru **Ambil Foto KTP**.
* Sistem secara otomatis memotong (*crop*) KTP dan memindai teks NIK, Nama, Tempat Tanggal Lahir, Alamat, dsb.

#### Mode 2: 📤 Unggah Foto (Rekomendasi Terbaik untuk Hasil Paling Tajam)
* Foto KTP klien menggunakan kamera smartphone beresolusi tinggi, lalu kirim ke komputer (atau buka web Noffice langsung dari browser smartphone di jaringan kantor).
* Klik tab **Unggah Foto**, seret (*drag & drop*) foto KTP klien atau pilih dari folder.
* Mesin AI OCR akan membaca foto beresolusi tinggi tersebut dengan akurasi maksimal.

#### Mode 3: 📋 Paste Teks (Input Cepat)
* Jika Anda sudah memiliki teks KTP dari scanner kantor atau pesan WhatsApp klien, cukup tempel teks tersebut ke kotak, lalu klik **Ekstrak ke Form**.

#### Auto-Fill & Verifikasi:
* Setelah ekstraksi selesai, formulir NIK, Nama Lengkap, Tanggal Lahir, Nomor Telepon, dan Alamat akan terisi otomatis.
* Periksa kesesuaian data dengan fisik KTP asli, lalu klik **Simpan Data Klien**.

---

### 2.2 Pengelolaan Permohonan Akta Notaris (Cases)
Buka menu **Kasus Notaris** (`/cases`):
1. **Membuat Permohonan Baru:**
   - Klik **+ Permohonan Baru**.
   - Pilih Klien pemohon dari daftar pencarian.
   - Pilih **Jenis Layanan Notaris**:
     - *Pendirian PT (Perseroan Terbatas)*
     - *Pendirian CV (Commanditaire Vennootschap)*
     - *Pendirian Yayasan / Perkumpulan*
     - *Akta Perjanjian / Kontrak Kredit*
     - *Surat Kuasa / Akta Kuasa Menjual*
     - *Akta Sewa Menyewa*
     - *Akta Jaminan Fidusia / Cessie*
     - *Surat Keterangan Waris (SKW)*
   - Pilih staf penanggungjawab (PIC) dan masukkan catatan pokok transaksi.
   - Klik **Simpan Permohonan**.
2. **Mengubah Tahapan Status Workflow:**
   Pilih kasus pada tabel, lalu klik tombol **Ubah Status**:
   - `Tahap 1`: **Berkas Masuk** ➔ **Pembuatan Draf Akta** ➔ **Penandatanganan Akta**
   - `Tahap 2 (Khusus Badan Usaha)`: **Pembuatan NPWP** ➔ **Pendaftaran AHU Kemenkumham** ➔ **Pembuatan SIUP + NIB (OSS)**
   - `Tahap 3 & Selesai`: **SK Jadi** / **Akta Jadi** ➔ **Belum Diambil Klien** ➔ **Sudah Diambil Klien (Arsip)**

---

### 2.3 Pengelolaan Permohonan Akta PPAT (Ppat Cases)
Buka menu **Kasus PPAT** (`/ppat-cases`):
Menu ini dirancang khusus untuk memenuhi kepatuhan 8 Jenis Akta PPAT dan urusan pertanahan ke Kantor Pertanahan (BPN):
1. **Pilihan Layanan PPAT:**
   - **AJB (Akta Jual Beli):** Wajib melengkapi data NOP PBB, validasi BPHTB Pembeli dan PPh Penjual.
   - **APHT (Akta Pemberian Hak Tanggungan):** Untuk pengikatan jaminan kredit perbankan.
   - **Hibah:** Peralihan hak atas tanah cuma-cuma antar keluarga/ahli waris.
   - **Roya:** Pencoretan hak tanggungan setelah kredit bank lunas.
   - **APHB (Akta Pembagian Hak Bersama):** Pembagian harta bersama warisan tanah.
   - **Pecah / Splitsing:** Pemecahan sertifikat induk menjadi beberapa kavling.
   - **Konversi Hak:** Peningkatan Girik / Letter C menjadi Sertipikat Hak Milik (SHM).
2. **Pencatatan Objek Tanah:**
   Pastikan mengisi kolom **Alamat & Letak Tanah (SHM/SHGB)** secara lengkap, mencakup nomor sertipikat, nama kelurahan, kecamatan, dan luas bidang tanah.
3. **Workflow Spesifik PPAT:**
   - Cek Plot / Lokasi Fisik BPN ➔ Pengecekan ZNT ➔ Verifikasi PPh & BPHTB ➔ Penandatanganan Minuta ➔ Pendaftaran Berkas ke Loket BPN ➔ Penyerahan Sertipikat Baru ke Pemilik.

---

### 2.4 Verifikasi Dokumen & Penggunaan Checklist Persyaratan
Setiap kasus di Noffice secara otomatis dilengkapi dengan **Checklist Dokumen Standar Hukum**:
1. Buka detail kasus yang sedang dikerjakan.
2. Di panel sebelah kanan, lihat daftar checklist (misalnya: *KTP Suami-Istri*, *Sertifikat Asli*, *PBB 5 Tahun Terakhir*, *Persetujuan Nama AHU*).
3. Setiap kali klien menyerahkan dokumen fisik asli atau fotokopi:
   - Beri tanda centang pada item yang telah diterima.
   - Persentase kelengkapan berkas akan otomatis bertambah (misal: `4 / 6 Terpenuhi`).
4. Staf juga dapat menambahkan persyaratan khusus tambahan melalui kolom *Tambah Persyaratan Khusus*.

---

### 2.5 Penjadwalan Tanggal & Jam Tanda Tangan Akta (Minuta)
Untuk memastikan pihak penghadap dan Notaris bertemu pada waktu yang disepakati:
1. Pada detail kasus, buka tab **Billing & Jadwal**.
2. Masukkan **Tanggal Pertemuan** dan **Jam**.
3. Klik **Simpan Detail**.
4. Jadwal ini akan otomatis muncul pada kartu pengingat di **Dashboard Utama**, sehingga seluruh staf kantor mengetahui kedatangan klien hari ini.

---

### 2.6 Cetak Tanda Terima Berkas & Penyerahan Salinan Akta
Sesuai standar pelayanan kantor Notaris profesional:
1. Pada panel detail kasus, klik tombol biru **Cetak Tanda Terima**.
2. Pilih mode dokumen yang ingin dicetak:
   - **Tanda Terima Berkas:** Diberikan saat klien menyerahkan dokumen asli (sertifikat tanah, KTP, KK) sebagai bukti aman penitipan di kantor Notaris.
   - **Tanda Terima Penyerahan Salinan Akta:** Ditandatangani klien saat mengambil salinan akta resmi dan sertifikat tanah yang telah selesai diproses.
3. Dialog pratinjau cetak akan muncul lengkap dengan kop surat kantor, rincian biaya honorarium, status pembayaran, serta kolom tanda tangan Notaris dan Klien. Klik **Cetak / Simpan ke PDF**.

---

### 2.7 Manajemen Arsip & Upload Dokumen Fisik
Buka menu **Dokumen** (`/documents`):
1. **Mengunggah Dokumen:**
   - Klik tombol **Upload Dokumen**.
   - Pilih berkas digital (PDF, Word, Excel, atau Foto JPG/PNG).
   - Tentukan kategori dokumen (*Akta, Perjanjian, Sertifikat & Tanah, Dokumen Klien, Dokumen Perusahaan, Administrasi*).
   - Tulis deskripsi singkat peruntukan berkas.
   - Klik **Unggah**.
2. **Mengunduh Berkas Fisik:**
   Setiap berkas yang pernah diunggah dapat diunduh kembali kapan saja dengan menekan tombol **Unduh File**.

---

### 2.8 Pemanfaatan Noffice AI Copilot (100% Offline)
Di bilah pencarian atau asisten interaktif, staf dapat memanfaatkan AI lokal untuk:
* Mencari data klien atau nomor akta dengan cepat menggunakan bahasa sehari-hari (contoh: *"tampilkan kasus jual beli kemang"* atau *"kasus atas nama budi santoso"*).
* Memeriksa checklist persyaratan dokumen hukum secara instan tanpa perlu membuka buku panduan manual.
* Merangkum status penagihan biaya honorarium per klien.

---

### 2.9 Menggunakan Kotak Masuk (Inbox) & Notifikasi
* **Inbox (`/inbox`):** Tempat menerima dan menyimpan korespondensi elektronik resmi, seperti pemberitahuan pengesahan dari Ditjen AHU Kemenkumham, konfirmasi status pengecekan dari Kantor Pertanahan (BPN), validasi e-BPHTB dari Bapenda, dan surat pengantar roya dari Bank.
* **Notifikasi (`/notifications`):** Memberikan sinyal visual atas berkas baru yang diunggah staf, permohonan yang mendekati batas waktu estimasi penyelesaian, dan dokumen yang menunggu persetujuan Notaris.

---

## FAQ & Solusi Masalah Teknis (Troubleshooting)

### Q1: Hasil kamera KTP terlihat buram saat menggunakan webcam laptop, bagaimana solusinya?
> **Jawaban:** Webcam laptop umumnya memiliki lensa *fixed-focus* jarak jauh dan resolusi terbatas (720p). 
> 1. Posisikan KTP sekitar 15–20 cm dari kamera tepat di dalam bingkai putih.
> 2. Pastikan lampu ruangan terang dan tidak memantul pada permukaan plastik KTP.
> 3. **Solusi Terbaik:** Gunakan opsi tab **Unggah Foto**. Ambil foto KTP menggunakan kamera HP yang tajam dan beresolusi tinggi, lalu unggah ke form. Ekstraksi AI akan berjalan 100% presisi.

### Q2: Apakah data di Noffice aman jika internet kantor tiba-tiba terputus?
> **Jawaban:** **Sangat aman.** Seluruh core system Noffice (database SQLite, model OCR lokal, file storage) berjalan di komputer lokal kantor Anda. Sistem tetap dapat digunakan 100% secara normal tanpa sambungan internet.

### Q3: Dokumen salah terhapus oleh staf, apakah masih bisa diselamatkan?
> **Jawaban:** Ya. Buka menu **Dokumen** ➔ klik folder **Tong Sampah (Trash)** ➔ temukan dokumen yang terhapus ➔ klik tombol **Pulihkan (Restore)**. Berkas akan kembali ke status aktif tanpa kehilangan isi file.

### Q4: Bagaimana cara mencadangkan (backup) seluruh data kantor ke harddisk eksternal?
> **Jawaban:** Cukup salin 2 komponen utama berikut dari komputer server Anda:
> 1. File database: `c:\Hasboy\All_Project\Noffice\server\database.sqlite`
> 2. Folder penyimpanan berkas fisik: `c:\Hasboy\All_Project\Noffice\server\uploads\`
> Simpan salinan tersebut di flashdisk atau harddisk eksternal secara berkala (misal setiap akhir pekan).

---

*Buku Panduan Operasional Resmi Noffice — Dirancang untuk Efisiensi & Kepatuhan Hukum Kantor Notaris & PPAT Indonesia.*

