export const DEPARTMENTS = [
  'Administrasi',
  'Notaris',
  'PPAT',
  'Legal',
  'Keuangan',
  'Pelayanan Klien',
  'Operasional',
];
export const RECIPIENT_STATUSES = ['Approved', 'Pending', 'Rejected'];
export const EMPLOYEE_STATUSES = ['Active', 'Inactive'];

// Document categories for a notary office. The `id` is the value stored on
// each document (its `category`/`dept`) and also the folder id on the
// Documents page. Labels are resolved through i18n using `labelKey`.
export const DOC_CATEGORIES = [
  { id: 'Akta', labelKey: 'doc.cat.akta' },
  { id: 'Perjanjian', labelKey: 'doc.cat.perjanjian' },
  { id: 'Sertifikat & Dokumen Tanah', labelKey: 'doc.cat.tanah' },
  { id: 'Dokumen Klien', labelKey: 'doc.cat.klien' },
  { id: 'Surat & Legalitas', labelKey: 'doc.cat.sah' },
  { id: 'Dokumen Perusahaan', labelKey: 'doc.cat.perusahaan' },
  { id: 'Administrasi', labelKey: 'doc.cat.administrasi' },
  { id: 'Lainnya', labelKey: 'doc.cat.lainnya' },
];

// Kept for the Upload modal category dropdown.
export const UPLOAD_CATEGORIES = DOC_CATEGORIES.map((c) => c.id);

// Layanan Notaris sesuai flow klien
export const NOTARY_SERVICES = [
  {
    id: 'PT',
    name: 'Pendirian PT (Perseroan Terbatas)',
    defaultChecklist: [
      'KTP Para Pendiri & Pengurus (min. 2 orang)',
      'NPWP Para Pendiri & Pengurus',
      'Persetujuan Nama PT dari Kemenkumham (AHU)',
      'Surat Keterangan Domisili Usaha',
      'Rincian Modal Dasar & Modal Disetor',
      'Komposisi Saham & Susunan Direksi / Komisaris',
    ]
  },
  {
    id: 'YAYASAN',
    name: 'Pendirian Yayasan',
    defaultChecklist: [
      'KTP Para Pendiri & Pengurus Yayasan',
      'NPWP Para Pendiri',
      'Surat Keterangan Domisili Yayasan',
      'Rincian Tujuan & Program Yayasan',
      'Bukti Kekayaan Awal Yayasan',
    ]
  },
  {
    id: 'PERKUMPULAN',
    name: 'Pendirian Perkumpulan',
    defaultChecklist: [
      'KTP Para Pendiri Perkumpulan (min. 3 orang)',
      'Surat Keterangan Domisili Perkumpulan',
      'Anggaran Dasar Perkumpulan',
      'Daftar Susunan Pengurus Perkumpulan',
    ]
  },
  {
    id: 'CV',
    name: 'Pendirian CV (Commanditaire Vennootschap)',
    defaultChecklist: [
      'KTP Para Sekutu (Aktif & Pasif)',
      'NPWP Para Sekutu',
      'Surat Keterangan Domisili Usaha',
      'Rincian Modal & Jenis Usaha',
    ]
  },
  {
    id: 'PERJANJIAN',
    name: 'Akta Perjanjian / Kontrak / Kredit',
    defaultChecklist: [
      'KTP Para Pihak',
      'Draft Pokok Perjanjian / Term Sheet',
      'Dokumen Jaminan (jika ada)',
    ]
  },
  {
    id: 'KUASA',
    name: 'Surat Kuasa / Akta Kuasa',
    defaultChecklist: [
      'KTP Pemberi Kuasa',
      'KTP Penerima Kuasa',
      'Dokumen Objek Kuasa (Sertifikat / BPKB / dll)',
    ]
  },
  {
    id: 'SEWA_MENYEWA',
    name: 'Akta Sewa Menyewa',
    defaultChecklist: [
      'KTP Pihak Penyewa & Yang Menyewakan',
      'Sertifikat / Bukti Kepemilikan Objek Sewa',
      'IMB / PBG (jika objek berupa bangunan)',
      'Draft Pokok Perjanjian Sewa',
    ]
  },
  {
    id: 'FIDUSIA',
    name: 'Akta Jaminan Fidusia',
    defaultChecklist: [
      'KTP Pemberi & Penerima Fidusia',
      'BPKB / Dokumen Objek Fidusia',
      'Perjanjian Kredit / Pembiayaan',
      'Bukti Kepemilikan Objek Fidusia',
    ]
  },
  {
    id: 'CESSIE',
    name: 'Akta Cessie (Pengalihan Piutang)',
    defaultChecklist: [
      'KTP Cedent (Pengalih) & Cessionaris (Penerima)',
      'Dokumen Piutang yang Dialihkan',
      'Perjanjian Kredit Asal',
      'Bukti Pemberitahuan ke Debitor',
    ]
  },
  {
    id: 'WARIS',
    name: 'Surat Keterangan Waris (SKW)',
    defaultChecklist: [
      'Surat Kematian dari Kelurahan / Rumah Sakit',
      'KTP & KK Seluruh Ahli Waris',
      'Surat Nikah Almarhum / Almarhumah',
      'Silsilah / Bagan Ahli Waris dari Desa / Kelurahan',
    ]
  },
  {
    id: 'LAINNYA',
    name: 'Layanan Notaris Lainnya',
    defaultChecklist: [
      'KTP Pemohon',
      'Kartu Keluarga (KK)',
      'Dokumen Pendukung Utama',
    ]
  },
  // Legacy ID — tetap ada agar data lama di database tidak rusak
  {
    id: 'AKT-PT',
    name: 'Pendirian PT (Data Lama)',
    defaultChecklist: [
      'KTP Para Pendiri & Pengurus',
      'NPWP Para Pendiri & Pengurus',
      'Persetujuan Nama Perusahaan dari Kemenkumham',
      'Surat Keterangan Domisili Usaha',
      'Rincian Modal & Komposisi Saham',
    ]
  },
];

export const PPAT_SERVICES = [
  {
    id: 'AJB',
    name: 'Jual Beli (AJB)',
    defaultChecklist: [
      'KTP Penjual & Pembeli (beserta Suami/Istri)',
      'Kartu Keluarga (KK) Penjual & Pembeli',
      'Surat Nikah / Akta Cerai',
      'Sertifikat Asli Tanah (SHM/SHGB)',
      'PBB 5 Tahun Terakhir & STTS Baru',
      'Bukti Setor BPHTB (Pembeli) & PPH (Penjual)',
      'Surat Persetujuan Suami/Istri',
      'CEK PLOT — Cek Lokasi Fisik Tanah',
      'ZNT — Zona Nilai Tanah',
    ]
  },
  {
    id: 'HIBAH',
    name: 'Hibah',
    defaultChecklist: [
      'KTP Pemberi & Penerima Hibah',
      'Kartu Keluarga (KK) Kedua Pihak',
      'Sertifikat Asli Tanah/Bangunan',
      'Surat Persetujuan Ahli Waris',
      'PBB 5 Tahun Terakhir',
      'Bukti Setor BPHTB (jika kena pajak)',
    ]
  },
  {
    id: 'ROYA',
    name: 'Roya / Pelunasan Hak Tanggungan',
    defaultChecklist: [
      'Surat Lunas / Pengantar Roya dari Bank',
      'Sertifikat Asli Tanah',
      'Sertifikat Hak Tanggungan (SHT) Asli',
      'KTP Pemilik Tanah',
    ]
  },
  {
    id: 'APHT',
    name: 'Akta Pemberian Hak Tanggungan (APHT)',
    defaultChecklist: [
      'KTP Pemberi & Penerima Hak Tanggungan',
      'Sertifikat Asli Tanah/Bangunan',
      'Perjanjian Kredit dari Bank',
      'PBB Terakhir',
      'CEK PLOT — Cek Lokasi Fisik Tanah',
    ]
  },
  {
    id: 'APHB',
    name: 'Akta Pembagian Hak Bersama (APHB)',
    defaultChecklist: [
      'KTP Para Pihak',
      'Kartu Keluarga',
      'Sertifikat Asli',
      'PBB Terakhir',
    ]
  },
  {
    id: 'WARIS',
    name: 'Peralihan Hak Waris (BPN)',
    defaultChecklist: [
      'Surat Keterangan Waris (SKW / Akta Waris)',
      'KTP & KK Seluruh Ahli Waris',
      'Sertifikat Asli Tanah',
      'Surat Kematian Pemilik',
      'PBB Terakhir',
      'Surat Pernyataan Pembagian Waris',
    ]
  },
  {
    id: 'PECAH',
    name: 'Pemecahan Sertifikat (Pecah)',
    defaultChecklist: [
      'Sertifikat Asli Tanah yang akan dipecah',
      'KTP Pemilik Tanah',
      'Gambar Situasi / Peta Bidang Tanah',
      'PBB Terakhir',
      'Izin Pemecahan dari Dinas terkait (jika diperlukan)',
    ]
  },
  {
    id: 'KONVERSI',
    name: 'Konversi Hak (Girik/Letter C → SHM)',
    defaultChecklist: [
      'Surat Girik / Letter C / Petuk D',
      'Surat Keterangan Tidak Sengketa dari Desa/Kelurahan',
      'KTP Pemilik Tanah',
      'PBB Terakhir',
      'Gambar Situasi / Peta Bidang Tanah',
      'Surat Pernyataan Penguasaan Fisik Bidang Tanah',
    ]
  },
  // Legacy
  {
    id: 'SKMHT',
    name: 'Surat Kuasa Membebankan Hak Tanggungan (SKMHT)',
    defaultChecklist: [
      'KTP Pemberi & Penerima Kuasa',
      'Sertifikat Asli Tanah/Bangunan',
      'Perjanjian Kredit dari Bank',
    ]
  },
];

// Status workflow permohonan / kasus — mengikuti flow Tahap 1 → 2 → 3 → Selesai
// Field 'group' digunakan untuk pengelompokan <optgroup> di UI
export const CASE_STATUSES = [
  // === TAHAP 1: Penerimaan Berkas & Akta (Semua Layanan) ===
  { id: 'berkas_masuk', label: 'Berkas Masuk', variant: 'pending', group: 'Tahap 1 — Penerimaan Berkas' },
  { id: 'draf_akta', label: 'Pembuatan Draf Akta', variant: 'draft', group: 'Tahap 1 — Penerimaan Berkas' },
  { id: 'ttd', label: 'Penandatanganan Akta', variant: 'ttd', group: 'Tahap 1 — Penerimaan Berkas' },

  // === TAHAP 2: Proses Notaris (PT / Yayasan / Perkumpulan / CV) ===
  { id: 'proses_npwp', label: 'Pembuatan NPWP', variant: 'review', group: 'Tahap 2 — Proses Notaris (PT/CV)' },
  { id: 'pendaftaran_ahu', label: 'Pendaftaran AHU Kemenkumham', variant: 'ahu_bpn', group: 'Tahap 2 — Proses Notaris (PT/CV)' },
  { id: 'siup_nib', label: 'Pembuatan SIUP + NIB', variant: 'ahu_bpn', group: 'Tahap 2 — Proses Notaris (PT/CV)' },

  // === TAHAP 2: Proses PPAT (Jual Beli / Hibah / APHT / APHB) ===
  { id: 'bphtb', label: 'Pembayaran BPHTB', variant: 'review', group: 'Tahap 2 — Proses PPAT' },
  { id: 'pph', label: 'Pembayaran PPH', variant: 'review', group: 'Tahap 2 — Proses PPAT' },
  { id: 'cek_plot', label: 'Cek Plot (Lokasi Fisik)', variant: 'review', group: 'Tahap 2 — Proses PPAT' },
  { id: 'znt', label: 'ZNT (Zona Nilai Tanah)', variant: 'review', group: 'Tahap 2 — Proses PPAT' },

  // === TAHAP 3: Finalisasi ===
  { id: 'sk_jadi', label: 'SK Jadi', variant: 'selesai', group: 'Tahap 3 — Finalisasi' },
  { id: 'akta_jadi', label: 'Akta Jadi', variant: 'selesai', group: 'Tahap 3 — Finalisasi' },
  { id: 'pendaftaran_bpn', label: 'Pendaftaran BPN', variant: 'ahu_bpn', group: 'Tahap 3 — Finalisasi' },

  // === SELESAI ===
  { id: 'diambil', label: 'Sudah Diambil Klien', variant: 'arsip', group: 'Selesai' },
  { id: 'belum_diambil', label: 'Belum Diambil Klien', variant: 'salinan_selesai', group: 'Selesai' },
  { id: 'rejected', label: 'Dibatalkan', variant: 'rejected', group: 'Selesai' },

  // === LEGACY: Status lama — tetap ada agar data lama di DB tidak tampil error ===
  { id: 'pending', label: 'Baru (Pending)', variant: 'pending', group: 'Legacy' },
  { id: 'review', label: 'Peninjauan', variant: 'review', group: 'Legacy' },
  { id: 'kurang', label: 'Berkas Belum Lengkap', variant: 'kurang', group: 'Legacy' },
  { id: 'lengkap', label: 'Berkas Lengkap', variant: 'lengkap', group: 'Legacy' },
  { id: 'draft', label: 'Drafting', variant: 'draft', group: 'Legacy' },
  { id: 'selesai', label: 'Selesai', variant: 'selesai', group: 'Legacy' },
  { id: 'ahu_bpn', label: 'AHU / BPN', variant: 'ahu_bpn', group: 'Legacy' },
  { id: 'salinan_selesai', label: 'Salinan Diserahkan', variant: 'salinan_selesai', group: 'Legacy' },
  { id: 'arsip', label: 'Arsip', variant: 'arsip', group: 'Legacy' },
];


export const STORAGE_KEYS = {
  documents: 'noffice.documents',
  employees: 'noffice.employees',
  messages: 'noffice.messages',
  account: 'noffice.account',
  notifications: 'noffice.notifications',
  notificationItems: 'noffice.notificationItems',
  general: 'noffice.general',
  security: 'noffice.security',
  appearance: 'noffice.appearance',
  language: 'noffice.language',
};

export const TIMEZONES = [
  { value: 'UTC', label: '(UTC+00:00) Coordinated Universal Time' },
  { value: 'Asia/Jakarta', label: '(UTC+07:00) Jakarta, Indonesia' },
  { value: 'Asia/Makassar', label: '(UTC+08:00) Makassar, Indonesia' },
  { value: 'Asia/Jayapura', label: '(UTC+09:00) Jayapura, Indonesia' },
  { value: 'Asia/Singapore', label: '(UTC+08:00) Singapore' },
  { value: 'Asia/Tokyo', label: '(UTC+09:00) Tokyo, Japan' },
  { value: 'Europe/London', label: '(UTC+00:00) London, United Kingdom' },
  { value: 'Europe/Paris', label: '(UTC+01:00) Paris, France' },
  { value: 'America/New_York', label: '(UTC-05:00) New York' },
  { value: 'America/Los_Angeles', label: '(UTC-08:00) Los Angeles' },
  { value: 'Australia/Sydney', label: '(UTC+10:00) Sydney, Australia' },
  { value: 'Pacific/Auckland', label: '(UTC+12:00) Auckland, New Zealand' },
];

export const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY' },
  { value: 'MMM D, YYYY', label: 'MMM D, YYYY' },
];

export const MAX_STORAGE_GB = 100;