# Noffice - Sistem Manajemen Perkantoran Offline

Noffice adalah aplikasi manajemen perkantoran (Office Management System) komprehensif yang dirancang untuk beroperasi secara **Offline-First** di jaringan lokal (On-Premise). Aplikasi ini sangat cocok untuk perusahaan atau kantor yang mengutamakan keamanan dan kerahasiaan data tanpa bergantung pada penyimpanan *cloud* internet.

---

## 🌟 Fitur Utama

- **Penyimpanan Database Lokal Permanen:** Menggunakan SQLite, semua data tersimpan secara fisik dan aman di komputer tempat aplikasi diinstal.
- **Role-Based Access Control (RBAC):** Pemisahan hak akses cerdas antara tingkat **Administrator** (Super Admin) dan tingkat **Karyawan Biasa**.
- **Manajemen Karyawan:** Menambah, mengubah, menonaktifkan, dan melacak data karyawan beserta departemen mereka.
- **Pusat Dokumen (Document Center):** Sistem pelacakan dokumen internal antar departemen dengan status (Pending/Approved/Rejected).
- **Export to CSV / Excel:** Admin dapat mengunduh seluruh tabel data Karyawan dan riwayat Dokumen ke dalam format `.csv` dengan 1-klik untuk bahan laporan.
- **Sistem Jalankan Satu Klik:** Hadir dengan file `start-noffice.bat` khusus Windows, memudahkan pengguna awam untuk menjalankan *server database* dan *interface* sekaligus.
- **Desain UI/UX Premium:** Antarmuka modern, interaktif, responsif, dilengkapi dukungan mode gelap (Dark Mode).

---

## 👥 Hak Akses (User Roles)

Sistem Noffice memiliki dua jenis pengguna. Berikut adalah **Akun Demo** yang bisa digunakan untuk mencoba aplikasi ini:

### 1. Administrator
Mampu mengakses seluruh menu dan mengelola seluruh isi data kantor.
- **Email:** `admin@noffice.com`
- **Password:** `admin`

### 2. Karyawan Biasa
Hanya bisa melihat dasbor terbatas, melihat dokumen miliknya, dan tidak memiliki akses untuk menambah karyawan atau melihat tabel laporan lengkap.
- **Email:** `karyawan@noffice.com`
- **Password:** `user`

---

## 🚀 Panduan Instalasi & Penggunaan (Untuk Admin/IT)

Aplikasi ini menggunakan ekosistem Node.js (Vite React untuk Frontend, Express untuk Backend).

### Persyaratan Sistem
- Sistem Operasi: Windows 10/11 (Direkomendasikan), macOS, atau Linux
- Sudah menginstal [Node.js](https://nodejs.org/) (Versi 18 LTS atau lebih baru)

### Langkah Instalasi
1. Ekstrak atau *Clone* folder proyek `Noffice` ke komputer Anda.
2. Buka Terminal / Command Prompt (CMD) di dalam folder proyek tersebut.
3. Jalankan perintah berikut untuk mengunduh semua sistem yang dibutuhkan:
   ```bash
   npm install
   ```

### Cara Menjalankan Aplikasi (Windows Klien)
Bagi pengguna awam / klien di sistem operasi Windows, Anda tidak perlu repot mengetik kode apa pun:
1. Buka folder proyek **Noffice**.
2. Klik 2x pada file **`start-noffice.bat`**.
3. Sebuah jendela CMD hitam akan muncul (Biarkan jendela ini tetap terbuka karena ini adalah mesin databasenya).
4. Buka Browser (Chrome / Edge / Firefox) dan kunjungi:
   👉 **http://localhost:5173/**
5. Selamat, Anda sudah bisa Login!

*(Catatan untuk Developer: Jika tidak menggunakan Windows, Anda bisa menjalankannya via terminal dengan perintah `npm run start`).*

---

## 🛠️ Arsitektur & Teknologi (Tech Stack)

Aplikasi Noffice memadukan teknologi web modern untuk performa terbaik:
- **Frontend / UI:** React 18, Vite, React Router DOM
- **Backend / API:** Node.js, Express.js, CORS
- **Database:** SQLite 3 (Database Relasional Berbasis File)
- **Styling:** CSS Vanilla (Custom Design System Premium)
- **State Management:** React Context API & Custom Hooks

---

## 📂 Struktur Menu (Sitemap)

- **Dashboard:** Ringkasan statistik, aktivitas pengunggahan dokumen, dan pintasan cepat.
- **Documents:** Daftar kartu pintar untuk seluruh dokumen internal.
- **Inbox:** Pusat pesan atau notifikasi (Placeholder/Tahap Pengembangan).
- **Data Tables (Hanya Admin):** Tabel lengkap seluruh riwayat dokumen untuk keperluan pemantauan dan persetujuan (Approve/Reject), dilengkapi fitur **Export CSV**.
- **Employees (Hanya Admin):** Manajemen seluruh data karyawan (Tambah, Hapus, Edit), dilengkapi fitur **Export CSV**.
- **Settings:** Pengaturan profil, kata sandi, hingga *Dark/Light Theme* (Tema Gelap).

---
*Didesain dan dikembangkan khusus untuk solusi manajemen perkantoran lokal (On-Premise).*
