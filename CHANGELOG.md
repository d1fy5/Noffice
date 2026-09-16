# 📝 Noffice — Log Detail Perubahan (Changelog)

**Versi:** `v0.2.0 - LAN Ready, Real File Storage & Security Hardening`  
**Tanggal:** `15 September 2026`  
**Status:** `Selesai & Terverifikasi`

---

## 📌 Ringkasan Perubahan

Pembaruan besar ini mengubah **Noffice** dari sistem prototype lokal menjadi aplikasi manajemen kantor notaris/PPAT yang **siap digunakan di jaringan lokal (LAN/Wi-Fi Kantor)**, dilengkapi dengan **penyimpanan fisik dokumen (PDF/DOCX/Gambar)** di server, serta **proteksi keamanan API backend**.

---

## 📂 Rincian Perubahan per Berkas (File-by-File Log)

### 1. `vite.config.js`
* **Perubahan:** Menambahkan opsi `host: true` pada konfigurasi server Vite.
* **Tujuan:** Mengizinkan server dev Vite mendengarkan pada alamat IP `0.0.0.0`, sehingga komputer lain di jaringan LAN kantor dapat membuka antarmuka web melalui browser (`http://[IP-Server]:5173`).

---

### 2. `server/db.js`
* **Perubahan:**
  * Menambahkan pembuatan tabel `sessions` (`token`, `userId`, `userRole`, `createdAt`) untuk menyimpan token autentikasi aktif.
  * Menambahkan migrasi otomatis kolom baru di tabel `documents`:
    * `storedFilename TEXT` — Nama file unik fisik yang disimpan di disk server.
    * `originalFilename TEXT` — Nama asli file saat diunggah staf.
    * `mimeType TEXT` — Tipe dokumen (`application/pdf`, `image/png`, dsb.).
* **Tujuan:** Menyediakan struktur basis data untuk melacak berkas fisik asli dan sesi login pengguna.

---

### 3. `server/index.js`
* **Perubahan:**
  * **Inisialisasi Folder Storage:** Otomatis membuat folder `server/uploads/` saat server dinyalakan.
  * **Middleware Security (`requireAuth` & `requireAdmin`):** Memeriksa header `Authorization: Bearer <token>` atau query parameter `token` terhadap tabel `sessions`.
  * **Autentikasi Login (`POST /api/auth/login`):** Menghasilkan token acak kriptografi `crypto.randomBytes(32)` dan mengembalikannya ke client saat login sukses.
  * **Upload File Fisik (`POST /api/documents`):** Mengubah handler dokumen agar dapat menerima data berkas Base64, mengubahnya kembali menjadi buffer binary, dan menyimpannya di folder `server/uploads/<timestamp>-<filename>`.
  * **Download File Fisik (`GET /api/documents/:id/download`):** Endpoint baru untuk mengalirkan (*stream*) berkas fisik asli ke browser dengan header `Content-Disposition` dan `Content-Type` yang tepat.
  * **Proteksi Backup Database (`GET /api/system/backup`):** Memasang `requireAdmin` sehingga request tanpa token admin ditolak dengan status `403 Forbidden`.
  * **Pembersihan Disk:** Pada endpoint `DELETE /api/documents/:id/permanent` dan `DELETE /api/documents/trash/empty`, file fisik di disk `server/uploads/` ikut dihapus secara otomatis.
  * **Host Binding LAN (`0.0.0.0`):** Mengubah `app.listen(PORT)` menjadi `app.listen(PORT, '0.0.0.0')` dan menampilkan daftar IP LAN aktif dari `os.networkInterfaces()` di konsol.

---

### 4. `src/services/api.js`
* **Perubahan:**
  * **Dynamic API URL:** Mengubah `const API_URL = 'http://localhost:3001/api'` menjadi `http://${window.location.hostname}:3001/api`. Komputer staf kini otomatis menghubungi IP server tempat web aplikasi di-load.
  * **Helper `getAuthHeaders()`:** Otomatis menambahkan header `Authorization: Bearer <token>` dari `localStorage` pada seluruh panggilan API (`DocumentAPI`, `ClientAPI`, `CaseAPI`, `EmployeeAPI`, `AiAPI`).
  * **Helper Download (`DocumentAPI.getDownloadUrl`):** Menghasilkan URL unduhan berkas lengkap dengan token autentikasi.

---

### 5. `src/store/AuthContext.jsx`
* **Perubahan:**
  * Memperbarui fungsi `logout()` agar membersihkan `noffice_auth_token` dari `localStorage` saat pengguna keluar dari aplikasi.

---

### 6. `src/store/StoreProvider.jsx`
* **Perubahan:**
  * Memperbarui fungsi `addDocuments` agar membaca file yang dipilih staf menggunakan `FileReader.readAsDataURL()` dan mengirimkan payload Base64 `fileData`, `originalFilename`, dan `mimeType` ke backend.
  * Menghapus string Base64 dari state React lokal setelah pengiriman sukses untuk menghemat memori browser.

---

### 7. `src/pages/Documents.jsx`
* **Perubahan:**
  * Mengimpor `DocumentAPI` dari layer layanan.
  * Mengubah aksi tombol **Download** pada modal detail dokumen agar memeriksa keberadaan `storedFilename` dan memicu pengunduhan berkas fisik asli menggunakan `DocumentAPI.getDownloadUrl()`.

---

## 🧪 Catatan Hasil Uji Coba

| Pengujian | Status | Rincian |
|---|---|---|
| **Authentikasi Sesi** | PASSED ✅ | Token tergenerasi & tersimpan di `sessions` table |
| **Keamanan Backup DB** | PASSED ✅ | Menerima `403 Access Denied` jika diakses tanpa token admin |
| **Penyimpanan Upload File** | PASSED ✅ | File `1789430642732-Dokumen_Test.txt` tersimpan di `server/uploads/` |
| **Unduhan Dokumen Asli** | PASSED ✅ | File diunduh sempurna via `GET /api/documents/:id/download` |
