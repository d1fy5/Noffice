const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('Opened database at:', dbPath);

const updates = [
  {
    id: 'doc-01',
    ocr: `REPUBLIK INDONESIA - KEMENTERIAN HUKUM DAN HAM
SURAT KEPUTUSAN PENGESAHAN BADAN HUKUM
Nomor: AHU-0019283.AH.01.01.TAHUN 2026
PT DIGITAL NIAGA NUSANTARA
KODE ARSIP: 0902 - KODE TRANSAKSI 0902
Akta Pendirian Notaris Nomor: 08 Tanggal: 20 Oktober 2026
Dibuat di hadapan Notaris Utama, S.H., M.Kn. di Jakarta Selatan.
Modal Dasar: Rp 2.000.000.000 (Dua Miliar Rupiah).
Direktur Utama: Budi Santoso, S.E. (NIK: 3171012304850001).
Komisaris: Siti Rahmawati.
KBLI Usaha: 62019 - Aktivitas Pemrograman Komputer Lainnya & Perdagangan Besar Komputer.`
  },
  {
    id: 'doc-02',
    ocr: `MINUTA AKTA JUAL BELI
Nomor: 18/AJB/2026 - KODE DOKUMEN: 0902
Pada hari ini, Rabu tanggal 28 Oktober 2026, berhadapan dengan saya, Andi Prasetyo, S.H., Pejabat Pembuat Akta Tanah (PPAT).
Pihak Pertama (Penjual): Budi Santoso, S.E., bertempat tinggal di Menteng, Jakarta Pusat.
Pihak Kedua (Pembeli): Hj. Siti Rahmawati, M.M., bertempat tinggal di Kebayoran Baru, Jakarta Selatan.
Objek Jual Beli: Sebidang tanah Hak Milik Nomor 4321/Bangka seluas 320 m2 berikut bangunan rumah tinggal di atasnya, terletak di Jalan Kemang Timur Nomor 42.
Harga Transaksi: Rp 900.000.000,- (Sembilan Ratus Juta Rupiah). Kode Berkas BPN: 0902/AJB/2026.
Pajak: PPh Penjual telah disetor ke kas negara dan BPHTB Pembeli telah divalidasi Bapenda DKI Jakarta.`
  },
  {
    id: 'doc-03',
    ocr: `DRAF AKTA PEMBERIAN HAK TANGGUNGAN (APHT)
Nomor: 24/APHT/2026
Pemberi Hak Tanggungan: Ir. Hendra Gunawan.
Penerima Hak Tanggungan: PT BANK MANDIRI (PERSERO) TBK.
Nilai Tanggungan: Rp 3.000.000.000,- (Tiga Miliar Rupiah) peringkat pertama.
Jaminan: Sertipikat Hak Milik No. 1290/Pancoran Komplek Permata Hijau Blok C-5.
Kode Fasilitas Kredit Bank Mandiri: KPR-MDR-2026-902.`
  },
  {
    id: 'doc-04',
    ocr: `PERJANJIAN SEWA MENYEWA RUKO KOMERSIAL
Nomor: 22/XI/2026
Pihak Yang Menyewakan: Ir. Hendra Gunawan.
Pihak Penyewa: PT Logistik Prima Nusantara.
Objek Sewa: Ruko 3 Lantai di Jl. RS Fatmawati Kavling 18, Jakarta Selatan.
Jangka Waktu Sewa: 5 (lima) tahun terhitung sejak tanggal 01 Desember 2026.
Uang Sewa: Rp 150.000.000,- per tahun.`
  },
  {
    id: 'doc-05',
    ocr: `BADAN PERTANAHAN NASIONAL REPUBLIK INDONESIA
SERTIPIKAT HAK MILIK NO. 4321
Kelurahan: BANGKA, Kecamatan: MAMPANG PRAPATAN, Kota: JAKARTA SELATAN.
Surat Ukur Nomor: 00192/Bangka/2015, Luas: 320 M2.
Pemegang Hak: BUDI SANTOSO.
Catatan Pendaftaran Peralihan: Bebas sengketa, tidak ada sita jaminan pengadilan, clean and clear.`
  },
  {
    id: 'doc-06',
    ocr: `BADAN PENDAPATAN DAERAH PROVINSI DKI JAKARTA
SURAT SETORAN PAJAK DAERAH (SSPD) BPHTB ELEKTRONIK
Nomor Transaksi Pembayaran Daerah (NTPD): 202611029831
Wajib Pajak: Hj. Siti Rahmawati
NOP: 31.74.020.005.012-0045.0
Alamat: Jl. Kemang Timur No. 42
Jumlah Setor: Rp 35.000.000,- (LUNAS / TERVALIDASI SISTEM HOST-TO-HOST)`
  },
  {
    id: 'doc-07',
    ocr: `REPUBLIK INDONESIA - KARTU TANDA PENDUDUK
NIK: 3171012304850001
Nama: BUDI SANTOSO, S.E.
Tempat/Tgl Lahir: JAKARTA, 23-04-1985
Alamat: JL. MERDEKA NO. 12 RT 002/RW 005 Kel. Gambir, Kec. Gambir, Jakarta Pusat
Pekerjaan: WIRASWASTA / DIREKTUR UTAMA
NPWP: 09.234.567.8-012.000`
  },
  {
    id: 'doc-08',
    ocr: `KEPUTUSAN MENTERI HUKUM DAN HAM RI
NOMOR: AHU-0019283.AH.01.01.TAHUN 2026
TENTANG PENGESAHAN PENDIRIAN BADAN HUKUM PERSEROAN TERBATAS
PT DIGITAL NIAGA NUSANTARA
Mengesahkan Anggaran Dasar Perseroan Terbatas yang dibuat di hadapan Notaris Utama, S.H., M.Kn.`
  },
  {
    id: 'doc-09',
    ocr: `PT BANK CENTRAL ASIA TBK (BCA)
CONSUMER LOAN DIVISION
Nomor: 882/CLD/ROYA/X/2026
Hal: Keterangan Lunas & Permohonan Roya Sertifikat
Debitur: Budi Santoso
Fasilitas Kredit: KPR-BCA-981023
Objek: Sertipikat Hak Milik No. 2871/Cilandak
Dengan ini kami nyatakan fasilitas pinjaman telah lunas seluruhnya.`
  },
  {
    id: 'doc-10',
    ocr: `BUKU KLAPPER REGISTER AKTA NOTARIS
Bulan: Oktober 2026
Kantor Notaris Utama, S.H., M.Kn.
Daftar Akta:
Akta No. 01 s/d No. 29
Sesuai Ketentuan Pasal 61 Undang-Undang Jabatan Notaris (UUJN).`
  },
  {
    id: 'doc-11',
    ocr: `LAPORAN BULANAN AKTA PPAT
Bulan: Oktober 2026
Diserahkan kepada: Kepala Kantor Pertanahan Kota Administrasi Jakarta Selatan & Kepala Kantor Bapenda DKI Jakarta.
Daftar Akta PPAT:
Akta No. 18/AJB/2026, Akta No. 24/APHT/2026, Akta No. 05/ROYA/2026.`
  },
  {
    id: 'doc-12',
    ocr: `DRAFT PERJANJIAN KERJASAMA INVESTASI LOGISTIK
Pihak Pertama: Michael Chandra (Direktur PT Logistik Prima)
Pihak Kedua: Investor Mitra Niaga Nusantara
Objek Kerjasama: Pengadaan 15 unit armada pendingin rantai dingin Jakarta-Surabaya.
Nilai Investasi: Rp 5.000.000.000,-`
  },
  {
    id: 'doc-13',
    ocr: `DRAF USANG REVISI AWAL AKTA AJB NO. 18
(Dokumen dibatalkan karena revisi klausul pasal pembayaran bertahap).
Penjual: Budi Santoso, Pembeli: Siti Rahmawati.`
  },
  {
    id: 'doc-14',
    ocr: `FOTO KTP BURAM PEMOHON (GAGAL SCAN)
NIK: 3204121006760005
Nama: Raden Ahmad Fauzi
(Foto buram webcam lama yang sudah digantikan foto baru).`
  }
];

const updateStmt = db.prepare('UPDATE documents SET ocrContent = ? WHERE id = ?');
for (const u of updates) {
  updateStmt.run(u.ocr, u.id);
}
console.log('Successfully updated 14 documents with full OCR text content!');

const matches = db.prepare("SELECT id, title, ocrContent FROM documents WHERE ocrContent LIKE '%0902%'").all();
console.log('Search test for 0902 found:', matches.length, 'docs:');
for (const m of matches) {
  console.log(' - ' + m.title);
}

db.close();

