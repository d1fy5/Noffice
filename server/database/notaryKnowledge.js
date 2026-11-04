// ----------------------------------------------------------------------
// notaryKnowledge.js — Comprehensive Notaris & PPAT Knowledge Base & NLP Engine
//
// Meliputi seluruh ranah hukum kenotariatan (UUJN No. 30/2004 jo UU No. 2/2014),
// ke-PPAT-an (PP No. 37/1998 jo PP No. 24/2016 & PP No. 24/1997), hukum perdata,
// pertanahan (UUPA), perpajakan transaksi (PPh, BPHTB), dan operasional kantor.
// ----------------------------------------------------------------------

export const NOTARY_TOPICS = [
  // --------------------------------------------------------------------
  // 1. DASAR HUKUM & WEWENANG NOTARIS
  // --------------------------------------------------------------------
  {
    id: 'wewenang_notaris',
    title: 'Wewenang & Tugas Notaris',
    keywords: [
      /\b(wewenang|kewenangan|tugas|fungsi|peran)\s+(notaris|seorang notaris)\b/i,
      /\b(notaris\s+(bisa|boleh|berwenang|tugasnya|kerjanya)\s+apa)\b/i,
      /\bapa\s+saja\s+kewenangan\s+notaris\b/i,
      /\bpasal\s+15\s+uujn\b/i,
    ],
    answer: `📜 **Kewenangan & Tugas Notaris (Berdasarkan Pasal 15 UU No. 30/2004 jo UU No. 2/2014):**

Notaris adalah pejabat umum yang berwenang membuat akta autentik mengenai semua perbuatan, perjanjian, dan penetapan yang diharuskan oleh peraturan perundang-undangan atau yang dikehendaki oleh para pihak.

**Kewenangan Utama Notaris:**
1. **Membuat Akta Autentik:** Menjamin kepastian tanggal pembuatan akta, menyimpan Minuta Akta, dan memberikan Grosse, Salinan, serta Kutipan Akta.
2. **Mengesahkan Tanda Tangan (Legalisasi):** Menyaksikan langsung penandatanganan surat di bawah tangan dan mencatatnya dalam Buku Khusus.
3. **Membukukan Surat di Bawah Tangan (Waarmerking):** Mendaftarkan surat di bawah tangan dalam buku khusus tanpa menyaksikan penandatanganan.
4. **Membuat Kopi Sesuai Asli (Copy Colationee):** Mencocokkan fotokopi dokumen dengan surat aslinya.
5. **Memberikan Penyuluhan Hukum:** Terkait pembuatan akta dan keperdataan umum.
6. **Membuat Akta Pertanahan:** Khusus bagi Notaris yang juga telah diangkat sebagai PPAT (Pejabat Pembuat Akta Tanah).
7. **Membuat Akta Risalah Lelang:** Sesuai peraturan perundang-undangan lelang.`,
  },
  {
    id: 'beda_notaris_ppat',
    title: 'Perbedaan Notaris vs PPAT',
    keywords: [
      /\b(beda|bedanya|perbedaan|perbandingan)\s+(notaris|notary)\s+(dan|sama|dengan|vs)\s+ppat\b/i,
      /\b(beda|bedanya|perbedaan)\s+ppat\s+(dan|sama|dengan|vs)\s+(notaris|notary)\b/i,
      /\bapakah\s+notaris\s+sama\s+dengan\s+ppat\b/i,
    ],
    answer: `⚖️ **Perbedaan Esensial Notaris vs PPAT:**

Meskipun banyak praktisi menyandang kedua jabatan tersebut sekaligus, keduanya memiliki dasar hukum, kementerian pembina, dan kewenangan yang berbeda:

1. **Notaris:**
   • **Dasar Hukum:** UU No. 30/2004 jo UU No. 2/2014 (UU Jabatan Notaris / UUJN).
   • **Instansi Pembina:** Kementerian Hukum dan HAM RI (Kemenkumham - Ditjen AHU).
   • **Ranah Kewenangan:** Keperdataan umum (Pendirian PT/CV/Yayasan/Koperasi, Perjanjian Kawin, Akta Kuasa, Surat Wasiat, Jaminan Fidusia, Legalisasi, Waarmerking).
   • **Wilayah Jabatan:** Meliputi seluruh wilayah provinsi tempat kedudukannya.

2. **PPAT (Pejabat Pembuat Akta Tanah):**
   • **Dasar Hukum:** PP No. 37/1998 jo PP No. 24/2016 tentang Peraturan Jabatan PPAT.
   • **Instansi Pembina:** Kementerian Agraria dan Tata Ruang / Badan Pertanahan Nasional (ATR/BPN).
   • **Ranah Kewenangan:** Khusus perbuatan hukum mengenai hak atas tanah dan Hak Milik Atas Satuan Rumah Susun (8 Akta PPAT: AJB, Hibah, APHT, APHB, Ruislag, Inbreng, Pemberian Hak Pakai/HGB di atas HM, SKMHT).
   • **Wilayah Kerja:** Satu wilayah kerja Kantor Pertanahan (Kabupaten/Kota).`,
  },
  {
    id: 'dasar_hukum_notaris',
    title: 'Dasar Hukum Jabatan Notaris',
    keywords: [
      /\bdasar\s+hukum\s+(notaris|jabatan notaris|kenotariatan)\b/i,
      /\bundang\s*undang\s+(jabatan\s+)?notaris\b/i,
      /\buujn\b/i,
      /\buu\s+notaris\b/i,
    ],
    answer: `📚 **Dasar Hukum Jabatan Notaris di Indonesia:**

1. **UU No. 30 Tahun 2004** tentang Jabatan Notaris (UUJN).
2. **UU No. 2 Tahun 2014** tentang Perubahan atas Undang-Undang Nomor 30 Tahun 2004 tentang Jabatan Notaris.
3. **Peraturan Menteri Hukum dan HAM RI No. 19 Tahun 2019** tentang Syarat dan Tata Cara Pengangkatan, Cuti, Perpindahan, Pemberhentian, dan Perpanjangan Masa Jabatan Notaris.
4. **Kode Etik Notaris** yang ditetapkan oleh organisasi profesi Ikatan Notaris Indonesia (INI).
5. **Kitab Undang-Undang Hukum Perdata (KUHPerdata / Burgerlijk Wetboek)** khususnya Buku II (Benda), Buku III (Perikatan), dan Buku IV (Pembuktian & Daluwarsa, Pasal 1868 mengenai Akta Otentik).`,
  },
  {
    id: 'dasar_hukum_ppat',
    title: 'Dasar Hukum Jabatan PPAT',
    keywords: [
      /\bdasar\s+hukum\s+(ppat|jabatan ppat)\b/i,
      /\bperaturan\s+(jabatan\s+)?ppat\b/i,
      /\bpp\s*37\s*\/?\s*1998\b/i,
      /\bpp\s*24\s*\/?\s*2016\b/i,
    ],
    answer: `📚 **Dasar Hukum Jabatan PPAT di Indonesia:**

1. **UU No. 5 Tahun 1960** tentang Peraturan Dasar Pokok-Pokok Agraria (UUPA).
2. **PP No. 24 Tahun 1997** tentang Pendaftaran Tanah (Pasal 37 menyatakan peralihan hak atas tanah harus dibuktikan dengan akta yang dibuat oleh PPAT).
3. **PP No. 37 Tahun 1998** tentang Peraturan Jabatan Pejabat Pembuat Akta Tanah.
4. **PP No. 24 Tahun 2016** tentang Perubahan atas PP No. 37 Tahun 1998 (mengatur antara lain formasi PPAT, wilayah kerja Kabupaten/Kota, dan syarat pengangkatan).
5. **Permen ATR/Kepala BPN No. 33 Tahun 2021** tentang Uang Jasa (Honorarium) PPAT.
6. **Kode Etik PPAT** yang ditetapkan oleh Ikatan Pejabat Pembuat Akta Tanah (IPPAT).`,
  },
  {
    id: 'wilayah_jabatan',
    title: 'Wilayah Jabatan Notaris & PPAT',
    keywords: [
      /\bwilayah\s+(jabatan|kerja)\s+(notaris|ppat)\b/i,
      /\bdaerah\s+(kerja|jabatan)\s+(notaris|ppat)\b/i,
      /\bapakah\s+(notaris|ppat)\s+bisa\s+(bikin|buat)\s+akta\s+di\s+luar\s+(wilayah|kota|provinsi)\b/i,
    ],
    answer: `🌐 **Wilayah Jabatan Notaris & Wilayah Kerja PPAT:**

1. **Wilayah Jabatan Notaris (Pasal 18 UUJN):**
   • Notaris mempunyai tempat kedudukan di daerah Kabupaten/Kota.
   • Wilayah jabatan Notaris meliputi **seluruh wilayah provinsi** dari tempat kedudukannya.
   • *Contoh:* Notaris berkedudukan di Kota Tangerang Selatan berwenang membuat akta untuk seluruh wilayah Provinsi Banten. Akta harus ditandatangani di dalam wilayah jabatannya.

2. **Wilayah Kerja PPAT (Pasal 12 PP 37/1998 jo PP 24/2016):**
   • Wilayah kerja PPAT adalah **satu daerah kerja Kantor Pertanahan (Kabupaten/Kota)**.
   • PPAT tidak berwenang membuat akta tanah untuk objek tanah yang terletak di luar wilayah kerja Kabupaten/Kotanya.
   • Pelanggaran wilayah kerja mengakibatkan akta PPAT batal demi hukum dan menjadi akta di bawah tangan.`,
  },
  {
    id: 'larangan_notaris',
    title: 'Larangan Rangkap Jabatan & Etik Notaris',
    keywords: [
      /\blarangan\s+(notaris|jabatan notaris)\b/i,
      /\brangkap\s+jabatan\s+notaris\b/i,
      /\bapakah\s+notaris\s+boleh\s+(jadi|rangkap)\s+(pengacara|advokat|pns|dpr|pejabat)\b/i,
      /\bpasal\s+17\s+uujn\b/i,
    ],
    answer: `🚫 **Larangan bagi Notaris (Pasal 17 UU No. 30/2004 jo UU No. 2/2014):**

Notaris dilarang keras untuk:
1. Menjalankan jabatan di luar wilayah jabatannya.
2. Meninggalkan wilayah jabatannya lebih dari 7 (tujuh) hari kerja berturut-turut tanpa alasan yang sah.
3. **Merangkap jabatan sebagai:**
   • Advokat / Pengacara;
   • Pegawai Negeri Sipil (PNS / ASN);
   • Pejabat Negara (Menteri, DPR, DPD, Kepala Daerah, dll.);
   • Pemimpin atau pegawai BUMN, BUMD, atau badan swasta;
   • Pejabat Pembuat Akta Tanah (PPAT) di luar wilayah jabatan Notarisnya.
4. Mempunyai lebih dari 1 (satu) kantor Notaris.
5. Memasang papan nama atau publikasi iklan yang bertentangan dengan ketentuan Kode Etik Profesi.

*Sanksi:* Peringatan tertulis, pemberhentian sementara, hingga pemberhentian dengan tidak hormat.`,
  },
  {
    id: 'majelis_pengawas',
    title: 'Majelis Pengawas & Majelis Kehormatan Notaris',
    keywords: [
      /\b(mpd|mpw|mpp|mkn)\b/i,
      /\bmajelis\s+pengawas\s+(notaris|daerah|wilayah|pusat)\b/i,
      /\bmajelis\s+kehormatan\s+notaris\b/i,
      /\bpemeriksaan\s+notaris\s+oleh\s+(polisi|jaksa|penyidik)\b/i,
    ],
    answer: `🏛️ **Pengawasan Notaris: Majelis Pengawas (MPN) & Majelis Kehormatan (MKN):**

1. **Majelis Pengawas Notaris (MPN):**
   Badan yang berwenang mengawasi perilaku dan pelaksanaan jabatan Notaris (Pasal 67 UUJN). Terdiri dari 9 anggota (unsur pemerintah 3, ahli/akademisi 3, dan organisasi notaris 3).
   • **MPD (Daerah):** Tingkat Kabupaten/Kota. Berwenang memeriksa protokol notaris berkala (minimal 1 kali setahun) dan menerima laporan masyarakat.
   • **MPW (Wilayah):** Tingkat Provinsi. Berwenang menyidangkan banding atas putusan MPD dan menjatuhkan sanksi teguran/pemberhentian sementara.
   • **MPP (Pusat):** Tingkat Nasional di Kemenkumham. Memutus permohonan banding dari MPW.

2. **Majelis Kehormatan Notaris (MKN):**
   Berdasarkan Pasal 66 UUJN jo Permenkumham No. 7/2016, pemanggilan Notaris oleh penyidik (Polisi, Jaksa, KPK) untuk pemeriksaan perkara pidana terkait akta, atau pengambilan fotokopi Minuta Akta, **wajib mendapatkan persetujuan terlebih dahulu dari Majelis Kehormatan Notaris (MKN)**.`,
  },
  {
    id: 'cuti_pensiun_notaris',
    title: 'Cuti Notaris, Notaris Pengganti, & Pensiun',
    keywords: [
      /\bcuti\s+notaris\b/i,
      /\bnotaris\s+pengganti\b/i,
      /\b(umur|usia|batas usia)\s+pensiun\s+notaris\b/i,
      /\bkapan\s+notaris\s+pensiun\b/i,
    ],
    answer: `🏖️ **Ketentuan Cuti, Notaris Pengganti, & Masa Jabatan/Pensiun:**

1. **Cuti Notaris (Pasal 25 - 32 UUJN):**
   • Notaris berhak atas cuti yang dapat diambil setiap tahun atau sekaligus untuk beberapa tahun.
   • Permohonan cuti diajukan ke MPD (s/d 6 bulan), MPW (6 bulan - 1 tahun), atau Menteri Hukum dan HAM (> 1 tahun).
   • Selama menjalankan cuti, Notaris **wajib menunjuk Notaris Pengganti** yang disumpah untuk menjalankan jabatannya.

2. **Syarat Notaris Pengganti:**
   • WNI, berijazah Sarjana Hukum (S.H.), dan telah bekerja pada kantor Notaris paling singkat 2 tahun berturut-turut.
   • Bertanggung jawab penuh secara perdata dan pidana atas akta yang dibuatnya selama masa penggantian.

3. **Batas Usia Pensiun Notaris (Pasal 8 UUJN):**
   • Usia pensiun umum: **65 (enam puluh lima) tahun**.
   • Dapat diperpanjang hingga usia **67 (enam puluh tujuh) tahun** dengan syarat sehat jasmani dan rohani serta mengajukan permohonan ke Kemenkumham.
   • Setelah pensiun, Protokol Notaris wajib diserahkan kepada Notaris lain yang ditunjuk MPD.`,
  },

  // --------------------------------------------------------------------
  // 2. ANATOMI & TEKNIS PEMBUATAN AKTA NOTARIS
  // --------------------------------------------------------------------
  {
    id: 'anatomi_akta',
    title: 'Struktur & Anatomi Akta Notaris',
    keywords: [
      /\b(anatomi|struktur|bagian|unsur)\s+akta(\s+notaris)?\b/i,
      /\bformat\s+akta\s+notaris\b/i,
      /\bpasal\s+38\s+uujn\b/i,
      /\bsyarat\s+sahnya\s+akta\s+notaris\b/i,
    ],
    answer: `📐 **Struktur & Anatomi Akta Notaris (Pasal 38 UUJN):**

Setiap Akta Notaris terdiri atas 3 (tiga) bagian pokok:

1. **Awal Akta / Kepala Akta:**
   • Judul akta (misal: "AKTA PENDIRIAN PERSEROAN TERBATAS");
   • Nomor akta;
   • Jam, hari, tanggal, bulan, dan tahun pembuatan akta;
   • Nama lengkap dan tempat kedudukan Notaris.

2. **Badan Akta:**
   • **Komparisi:** Identitas lengkap para penghadap/pihak (Nama, NIK, Tempat/Tgl Lahir, Kewarganegaraan, Pekerjaan, Alamat), dasar kedudukan bertindak (bertindak untuk diri sendiri, mewakili PT, sebagai kuasa, dll), serta kepastian identitas penghadap.
   • **Premisse:** Uraian singkat/latar belakang kesepakatan para pihak.
   • **Isi / Klausul Akta:** Pasal-pasal kesepakatan, hak dan kewajiban, jangka waktu, domisili hukum, penyelesaian sengketa.

3. **Akhir Akta / Penutup Akta:**
   • Uraian pembacaan akta oleh Notaris kepada para penghadap dan saksi;
   • Keterangan identitas minimal 2 (dua) orang saksi instrumenter;
   • Penandatanganan akta oleh para penghadap, saksi-saksi, dan Notaris;
   • Catatan renvooi (bila ada coretan/tambahan kata).`,
  },
  {
    id: 'komparisi_akta',
    title: 'Komparisi Akta Notaris',
    keywords: [
      /\bkomparisi\b/i,
      /\bapa\s+itu\s+komparisi\b/i,
      /\bkedudukan\s+bertindak\s+penghadap\b/i,
    ],
    answer: `👥 **Pengertian & Ketentuan Komparisi Akta:**

Komparisi adalah bagian badan akta yang memuat identitas para pihak (penghadap) dan dasar hukum kewenangan bertindak mereka dalam membuat akta otentik.

**Komponen Penting dalam Komparisi:**
1. **Identitas Diri:** Nama lengkap, NIK, tempat & tanggal lahir, kewarganegaraan, pekerjaan, tempat tinggal, status perkawinan.
2. **Kapasitas / Legal Standing (Kewenangan Bertindak):**
   • **Pribadi:** Bertindak untuk dan atas nama diri sendiri.
   • **Persetujuan Pasangan:** Suami/istri yang hadir memberikan persetujuan (Pasal 36 UU No. 1/1974 tentang Perkawinan).
   • **Badan Hukum (PT):** Direktur Utama yang sah berdasarkan Akta Pendirian/Perubahan terakhir dan SK Kemenkumham, serta persetujuan Dewan Komisaris/RUPS bila diwajibkan anggaran dasar.
   • **Kuasa:** Penerima kuasa berdasarkan Surat Kuasa Otentik atau Surat Kuasa di Bawah Tangan.
   • **Perwalian:** Orang tua/wali yang bertindak mewakili anak di bawah umur (memerlukan penetapan Pengadilan Negeri bila mengalihkan harta tak bergerak).`,
  },
  {
    id: 'saksi_akta',
    title: 'Syarat Saksi Akta Notaris',
    keywords: [
      /\bsaksi\s+akta(\s+notaris)?\b/i,
      /\bsyarat\s+saksi\s+akta\b/i,
      /\bkenapa\s+akta\s+butuh\s+2\s+saksi\b/i,
      /\bpasal\s+40\s+uujn\b/i,
    ],
    answer: `👁️ **Syarat Saksi Instrumenter Akta Notaris (Pasal 40 UUJN):**

Setiap akta yang dibacakan oleh Notaris wajib dihadiri oleh paling sedikit **2 (dua) orang saksi** instrumenter.

**Syarat Sah Saksi:**
1. Paling rendah berumur **18 (delapan belas) tahun** atau telah menikah.
2. Cakap melakukan perbuatan hukum (sehat akal, tidak di bawah pengampuan).
3. Mengerti bahasa yang digunakan dalam akta.
4. Mampu membubuhkan tanda tangan dan paraf.
5. **Bukan:**
   • Suami/istri atau keluarga sedarah/semenda dalam garis lurus tanpa batas derajat dan dalam garis ke samping sampai derajat ketiga dari Notaris maupun para penghadap;
   • Orang yang tidak mampu menandatangani akta.

*Penting:* Jika syarat 2 saksi tidak dipenuhi, akta tersebut hanya mempunyai kekuatan pembuktian sebagai **akta di bawah tangan** (terdegradasi).`,
  },
  {
    id: 'renvooi',
    title: 'Renvooi pada Akta Notaris',
    keywords: [
      /\brenvooi\b/i,
      /\bapa\s+itu\s+renvooi\b/i,
      /\bcoretan\s+pada\s+akta\b/i,
      /\brangkap\s+coret\s+akta\b/i,
      /\b(tip-ex|tipex|cairan\s+kimia|dikerik)\b/i,
      /\bsalah\s+tulis\s+(di|pada)?\s*akta\b/i,
      /\bpasal\s+54\s+uujn\b/i,
    ],
    answer: `✍️ **Pengertian & Aturan Renvooi (Pasal 54 UUJN):**

Renvooi adalah pembetulan kesalahan tulisan, penambahan, atau pencoretan kata/kalimat pada Minuta Akta yang dilakukan saat pembacaan dan penandatanganan akta.

**Ketentuan Hukum Renvooi:**
1. **Dilarang Menindih / Menghapus:** Kesalahan tulis tidak boleh dihapus dengan tip-ex, cairan kimia, atau dikerik.
2. **Cara Pembetulan:**
   • Kata yang salah dicoret dengan garis tipis lurus sehingga tulisan asli tetap dapat dibaca.
   • Kata pembetulan ditulis di margin kiri atau kanan halaman akta.
3. **Pengesahan Paraf:**
   • Setiap pembetulan/coretan wajib diparaf oleh para penghadap, saksi-saksi, dan Notaris di samping catatan renvooi.
4. **Catatan Penutup Renvooi:**
   • Pada akhir penutup akta dicantumkan rekapitulasi, misalnya: *"dibuat dengan 2 (dua) coretan dan 1 (satu) tambahan"*.
   • Renvooi tanpa paraf dan catatan rekapitulasi dinyatakan **batal dan tidak berlaku**.`,
  },
  {
    id: 'minuta_salinan_grosse',
    title: 'Minuta Akta, Salinan Akta, & Grosse Akta',
    keywords: [
      /\b(minuta|salinan|grosse)\s+akta\b/i,
      /\bbeda(nya)?\s+minuta\s+(dan|sama|dengan)\s+salinan\b/i,
      /\bapa\s+itu\s+minuta\s+akta\b/i,
      /\bapa\s+itu\s+grosse\s+akta\b/i,
      /\birah\s*irah\b/i,
    ],
    answer: `📜 **Perbedaan Minuta Akta, Salinan Akta, & Grosse Akta:**

1. **Minuta Akta (Asli):**
   • Naskah asli akta yang mencantumkan tanda tangan basah para penghadap, saksi-saksi, dan Notaris.
   • Wajib disimpan selamanya oleh Notaris sebagai bagian dari Protokol Notaris dan **tidak boleh diserahkan kepada pihak mana pun** (kecuali diperintahkan pengadilan/undang-undang).

2. **Salinan Akta (Copy Resmi):**
   • Salinan kata demi kata dari seluruh minuta akta yang diterbitkan oleh Notaris untuk para pihak.
   • Pada bagian bawah tercantum tulisan *"Diberikan sebagai SALINAN yang sama bunyinya"* serta ditandatangani dan dicap stempel dinas Notaris.

3. **Grosse Akta:**
   • Salinan akta pengakuan utang atau hipotik/hak tanggungan yang pada kepalanya memuat irah-irah:
     **"DEMI KEADILAN BERDASARKAN KETUHANAN YANG MAHA ESA"**.
   • Memiliki **kekuatan eksekutorial** yang sama dengan putusan pengadilan yang telah berkekuatan hukum tetap (dapat langsung dimohonkan sita eksekusi ke Pengadilan Negeri tanpa perlu gugatan perdata).`,
  },
  {
    id: 'legalisasi_waarmerking',
    title: 'Perbedaan Legalisasi vs Waarmerking vs Copy Colationee',
    keywords: [
      /\b(legalisasi|waarmerking|waarmerk|copy colationee|legalisir)\b/i,
      /\bbeda(nya)?\s+legalisasi\s+(dan|sama|dengan)\s+waarmerking\b/i,
      /\bapa\s+itu\s+waarmerking\b/i,
      /\bapa\s+itu\s+legalisasi\b/i,
    ],
    answer: `🔍 **Perbedaan Legalisasi, Waarmerking, & Copy Colationee (Pasal 15 UUJN):**

1. **Legalisasi (Pengesahan Tanda Tangan):**
   • Notaris menyaksikan **secara langsung** penandatanganan surat di bawah tangan oleh para pihak.
   • Notaris menjamin kepastian tanggal pembuatan, kepastian identitas para pihak, dan keaslian tanda tangan.
   • Nilai pembuktiannya sangat kuat di pengadilan.

2. **Waarmerking (Pencatatan / Registrasi):**
   • Notaris **hanya membukukan/mendaftarkan** surat di bawah tangan yang sudah ditandatangani sebelumnya ke dalam Buku Khusus.
   • Notaris **tidak menyaksikan** penandatanganan dan tidak menjamin kebenaran isi maupun keaslian tanda tangan.
   • Hanya memberi kepastian bahwa surat tersebut pernah ada dan didaftarkan pada tanggal tertentu.

3. **Copy Colationee (Pencocokan Fotokopi):**
   • Notaris mengesahkan bahwa salinan/fotokopi suatu dokumen cocok dan sama persis dengan surat aslinya yang diperlihatkan kepada Notaris.`,
  },
  {
    id: 'protokol_notaris',
    title: 'Protokol Notaris & Tata Kelola Penyimpanan',
    keywords: [
      /\bprotokol\s+notaris\b/i,
      /\bapa\s+saja\s+isi\s+protokol\s+notaris\b/i,
      /\bpenyimpanan\s+akta\s+notaris\b/i,
      /\bpasal\s+61\s+uujn\b/i,
    ],
    answer: `📚 **Protokol Notaris (Pasal 61 - 65 UUJN):**

Protokol Notaris adalah kumpulan dokumen yang merupakan arsip negara yang harus disimpan dan dipelihara oleh Notaris.

**Isi Protokol Notaris:**
1. **Buku Repertorium:** Daftar seluruh akta yang dibuat Notaris secara berurutan.
2. **Minuta Akta:** Naskah asli seluruh akta yang dijilid per bulan (bundel akta).
3. **Buku Klapper Repertorium:** Buku indeks abjad nama para penghadap.
4. **Buku Daftar Legalisasi:** Daftar surat di bawah tangan yang disahkan tanda tangannya.
5. **Buku Daftar Waarmerking:** Daftar surat di bawah tangan yang dibukukan.
6. **Buku Daftar Protes:** Terkait penolakan pembayaran surat wesel/cek.
7. **Buku Daftar Wasiat:** Catatan akta wasiat yang wajib dilaporkan setiap bulan ke Ditjen AHU.

*Masa Penyimpanan:* Minuta akta wajib disimpan Notaris selama 25 tahun, kemudian diserahkan kepada Majelis Pengawas Daerah (MPD) untuk disimpan sebagai arsip permanen negara.`,
  },
  {
    id: 'repertorium',
    title: 'Buku Repertorium Notaris',
    keywords: [
      /\brepertorium\b/i,
      /\bbuku\s+repertorium\b/i,
      /\bapa\s+itu\s+repertorium\b/i,
    ],
    answer: `📖 **Buku Repertorium Notaris (Pasal 58 UUJN):**

Buku Repertorium adalah buku register wajib yang mencatat seluruh akta yang dibuat oleh Notaris secara kronologis setiap hari.

**Kolom-kolom dalam Buku Repertorium:**
1. Nomor urut akta (dimulai dari No. 1 setiap awal bulan).
2. Tanggal dan jam pembuatan akta.
3. Sifat/judul akta (misal: Jual Beli, Pendirian PT, Kuasa).
4. Nama lengkap, pekerjaan, dan tempat tinggal para penghadap atau orang yang mereka wakili.
5. Keterangan mengenai dokumen pendukung atau bea meterai.

*Ketentuan:* Setiap akhir bulan, Buku Repertorium ditutup dengan garis merah dan ditandatangani oleh Notaris, mencantumkan jumlah akta yang dibuat pada bulan tersebut.`,
  },
  {
    id: 'klapper',
    title: 'Buku Klapper Notaris',
    keywords: [
      /\bklapper\b/i,
      /\bbuku\s+klapper\b/i,
      /\bapa\s+itu\s+klapper\b/i,
    ],
    answer: `📑 **Buku Klapper Notaris (Pasal 59 UUJN):**

Buku Klapper adalah buku daftar abjad (indeks alfabetis) yang disusun berdasarkan nama para penghadap dari akta-akta yang dicatat dalam Buku Repertorium.

**Fungsi Utama Klapper:**
• Memudahkan penelusuran akta ketika klien atau ahli waris mencari berkas di masa mendatang.
• Mencocokkan nama penghadap dengan nomor urut akta, tanggal akta, dan sifat akta.
• Wajib dibuat dan ditutup setiap akhir bulan bersamaan dengan penutupan Buku Repertorium.`,
  },

  // --------------------------------------------------------------------
  // 3. BADAN HUKUM & BADAN USAHA (AHU ONLINE KEMENKUMHAM)
  // --------------------------------------------------------------------
  {
    id: 'pt_perorangan',
    title: 'Syarat & Alur PT Perorangan (UMK)',
    keywords: [
      /\bpt\s+perorangan\b/i,
      /\bperseroan\s+perorangan\b/i,
      /\bpt\s+satu\s+orang\b/i,
      /\bpt\s+umkm\b/i,
      /\b(syarat|alur|cara|bikin)\s+(pt\s+perorangan|perseroan\s+perorangan)\b/i,
    ],
    answer: `👤 **Ketentuan & Syarat PT Perorangan (Perseroan Perorangan UMK):**

Berdasarkan UU Cipta Kerja jo PP No. 8 Tahun 2021:

**Karakteristik PT Perorangan:**
• Didirikan oleh **1 (satu) orang WNI** berusia minimal 21 tahun atau sudah menikah.
• Khusus untuk kriteria Usaha Mikro dan Kecil (UMK):
  - Usaha Mikro: Modal usaha maksimal Rp 1 Miliar (di luar tanah/bangunan) atau omzet s/d Rp 2 Miliar.
  - Usaha Kecil: Modal usaha > Rp 1 Miliar s/d Rp 5 Miliar atau omzet > Rp 2 Miliar s/d Rp 15 Miliar.
• Pemegang saham tunggal merangkap sekaligus sebagai Direktur (tidak ada Dewan Komisaris).
• Memiliki status badan hukum terpisah (tanggung jawab pemegang saham terbatas pada modal).

**Tata Cara Pendaftaran:**
1. Didaftarkan secara mandiri atau melalui pendampingan hukum di portal AHU PT Perorangan (*ptp.ahu.go.id*).
2. Mengisi Surat Pernyataan Pendirian Elektronik (tanpa perlu akta notaris).
3. Membayar PNBP Rp 50.000,-.
4. Terbit Sertifikat Pernyataan Pendirian dari Kemenkumham.
5. Wajib membuat laporan keuangan tahunan elektronik via portal AHU.`,
  },
  {
    id: 'pendirian_pt',
    title: 'Syarat & Alur Pendirian PT Biasa',
    keywords: [
      /\b(syarat|cara|alur|biaya|bikin|buat|mendirikan)\s+(pendirian\s+)?pt(?!\s*perorangan)\b/i,
      /\bperseroan\s+terbatas(?!\s*perorangan)\b/i,
      /\bpendirian\s+pt\s+biasa\b/i,
      /\buu\s*40\s*\/?\s*2007\b/i,
    ],
    answer: `🏢 **Persyaratan & Alur Pendirian PT (Perseroan Terbatas):**

Berdasarkan UU No. 40/2007 tentang PT jo UU Cipta Kerja:

**Persyaratan Dokumen:**
1. **Para Pendiri:** KTP & NPWP minimal **2 (dua) orang** (bisa orang perorangan atau badan hukum).
2. **Nama PT:** Terdiri dari minimal **3 (tiga) kata** dalam Bahasa Indonesia, tidak boleh menggunakan angka atau huruf asing jika seluruh saham dimiliki WNI.
3. **Maksud & Tujuan:** Bidang usaha yang dipilih mengacu pada Klasifikasi Baku Lapangan Usaha Indonesia (**KBLI 2020** 5 digit).
4. **Modal:**
   • Modal Dasar: Ditentukan berdasarkan kesepakatan para pendiri.
   • Modal Ditempatkan & Disetor: Minimal **25%** dari Modal Dasar, wajib disetor penuh ke kas perseroan.
5. **Pengurus:** Minimal 1 orang Direktur dan 1 orang Komisaris.
6. **Alamat Kantor:** Domisili lengkap PT (jalan, nomor, RT/RW, kelurahan, kecamatan, kota).

**Alur Proses Melalui Notaris & AHU:**
1. Notaris melakukan pengecekan dan pemesanan nama PT di sistem AHU Online Kemenkumham.
2. Penandatanganan Minuta Akta Pendirian PT di hadapan Notaris oleh seluruh pendiri.
3. Notaris mendaftarkan dan mengajukan pengesahan SK Badan Hukum ke Kemenkumham.
4. Terbit **Surat Keputusan (SK) Pengesahan Menkumham**.
5. Pendaftaran NPWP Badan di Kantor Pajak (KPP) dan penerbitan NIB (Nomor Induk Berusaha) via OSS RBA.`,
  },
  {
    id: 'pendirian_cv',
    title: 'Syarat & Ketentuan Pendirian CV',
    keywords: [
      /\b(syarat|cara|alur|bikin|buat|mendirikan)\s+(pendirian\s+)?cv\b/i,
      /\bcommanditaire\s+vennootschap\b/i,
      /\bpersekutuan\s+komanditer\b/i,
    ],
    answer: `🏬 **Persyaratan & Alur Pendirian CV (Commanditaire Vennootschap):**

CV adalah persekutuan modal dan usaha yang didirikan oleh minimal 2 (dua) orang:

**Komposisi Sekutu CV:**
1. **Sekutu Aktif (Komplementer):** Sekutu yang mengurus dan menjalankan operasional perusahaan sehari-hari. Bertanggung jawab penuh hingga ke harta pribadinya secara tanggung renteng.
2. **Sekutu Pasif (Komanditer / Pelepas Uang):** Sekutu yang hanya menyetorkan modal. Tanggung jawabnya terbatas hanya sebesar modal yang disetorkan.

**Persyaratan Dokumen:**
• KTP & NPWP minimal 2 orang sekutu.
• Nama CV (dicek dan didaftarkan melalui Sistem SABU Kemenkumham).
• Maksud dan tujuan bidang usaha (KBLI 2020).
• Alamat domisili usaha.
• Besaran modal yang disetorkan.

**Alur Proses:**
1. Notaris memesan nama CV di SABU (Sistem Administrasi Badan Usaha) AHU Online.
2. Pembuatan dan penandatanganan Akta Pendirian CV di hadapan Notaris.
3. Notaris mendaftarkan akta tersebut ke Kemenkumham untuk memperoleh **Surat Keterangan Terdaftar (SKT) CV**.
4. Pendaftaran NPWP CV dan penerbitan NIB via OSS RBA.`,
  },
  {
    id: 'pendirian_yayasan',
    title: 'Syarat & Alur Pendirian Yayasan',
    keywords: [
      /\b(syarat|cara|alur|bikin|buat|mendirikan)\s+(pendirian\s+)?yayasan\b/i,
      /\buu\s*16\s*\/?\s*2001\b/i,
      /\buu\s*yayasan\b/i,
    ],
    answer: `🕊️ **Persyaratan & Alur Pendirian Yayasan (UU No. 16/2001 jo UU No. 28/2004):**

Yayasan adalah badan hukum yang terdiri atas kekayaan yang dipisahkan dan diperuntukkan untuk mencapai tujuan tertentu di bidang **sosial, keagamaan, dan kemanusiaan**, tanpa mempunyai anggota.

**Struktur Organ Yayasan:**
1. **Pembina:** Organ tertinggi yang berwenang mengubah AD, mengangkat & memberhentikan Pengurus/Pengawas.
2. **Pengurus:** Melaksanakan kepengurusan harian (Ketua, Sekretaris, Bendahara).
3. **Pengawas:** Mengawasi dan memberi nasihat kepada Pengurus.
*(Catatan: Anggota Pembina, Pengurus, dan Pengawas tidak boleh saling merangkap jabatan).*

**Persyaratan Pendirian:**
• KTP & NPWP para pendiri dan organ yayasan.
• Surat Keterangan Pemisahan Kekayaan Pribadi sebagai modal awal yayasan (minimal Rp 10 Juta untuk WNI).
• Nama yayasan (minimal 3 kata, diawali kata "Yayasan").
• Domisili dan maksud/tujuan kegiatan yayasan.

**Alur:** Pengecekan nama yayasan di AHU -> Penandatanganan Akta Notaris -> Pengesahan SK Menkumham -> NPWP & NIB.`,
  },
  {
    id: 'pendirian_koperasi',
    title: 'Syarat & Ketentuan Pendirian Koperasi',
    keywords: [
      /\b(syarat|cara|alur|bikin|buat|mendirikan)\s+(pendirian\s+)?koperasi\b/i,
      /\buu\s*25\s*\/?\s*1992\b/i,
      /\bnpak\b/i,
    ],
    answer: `🤝 **Persyaratan & Alur Pendirian Koperasi (UU No. 25/1992 jo UU Cipta Kerja):**

Berdasarkan UU Cipta Kerja, pendirian Koperasi Primer kini dipermudah:
• **Jumlah Pendiri Koperasi Primer:** Minimal **9 (sembilan) orang** (sebelumnya 20 orang).
• **Koperasi Sekunder:** Minimal didirikan oleh 3 (tiga) koperasi.

**Tahapan Pendirian:**
1. **Rapat Pembentukan:** Dihadiri para pendiri, dihadiri Pejabat Dinas Koperasi setempat dan Notaris Pembuat Akta Koperasi (NPAK). Membahas AD/ART, Simpanan Pokok, Simpanan Wajib, Pengurus, dan Pengawas.
2. **Pengecekan Nama Koperasi:** Melalui SISMINBOPHK (Sistem Administrasi Badan Hukum Koperasi) Kemenkumham.
3. **Pembuatan Akta Notaris (NPAK):** Akta dibuat oleh Notaris yang memiliki sertifikasi NPAK terdaftar di Kemenkop UKM.
4. **Pengesahan Badan Hukum:** Diajukan ke Ditjen AHU Kemenkumham hingga terbit SK Pengesahan Badan Hukum Koperasi.`,
  },
  {
    id: 'rups_perubahan_ad',
    title: 'RUPS, Akta PKR, & Perubahan Anggaran Dasar PT',
    keywords: [
      /\brups\b/i,
      /\bpkr\b/i,
      /\bperubahan\s+anggaran\s+dasar\b/i,
      /\bpernyataan\s+keputusan\s+rapat\b/i,
      /\bperubahan\s+direksi\b/i,
      /\bperubahan\s+saham\b/i,
    ],
    answer: `📊 **RUPS & Perubahan Anggaran Dasar PT (UU No. 40/2007):**

Segala perubahan penting dalam perseroan wajib diputuskan melalui RUPS (Rapat Umum Pemegang Saham), dituangkan dalam Notulensi RUPS, dan dibuatkan **Akta Pernyataan Keputusan Rapat (PKR)** atau Akta Berita Acara RUPS oleh Notaris.

**2 Jenis Perubahan Data PT di Kemenkumham:**
1. **Perubahan Anggaran Dasar yang Memerlukan PERSETUJUAN Menkumham (Pasal 21 ayat 2 UU PT):**
   • Perubahan Nama Perseroan dan/atau tempat kedudukan perseroan;
   • Maksud dan tujuan serta kegiatan usaha perseroan;
   • Jangka waktu berdirinya perseroan;
   • Besarnya Modal Dasar;
   • Pengurangan modal ditempatkan dan disetor.
   *(Berlaku efektif sejak tanggal terbitnya Surat Keputusan / SK Menkumham).*

2. **Perubahan yang Cukup DIBERITAHUKAN ke Menkumham (Pasal 21 ayat 3 UU PT):**
   • Perubahan susunan Direksi dan/atau Dewan Komisaris;
   • Pemindahan hak atas saham / peralihan saham;
   • Peningkatan modal ditempatkan dan disetor.
   *(Berlaku efektif sejak tanggal penerimaan Surat Penerimaan Pemberitahuan).*`,
  },

  // --------------------------------------------------------------------
  // 4. PERJANJIAN KEPERDATAAN & HUKUM KELUARGA
  // --------------------------------------------------------------------
  {
    id: 'perjanjian_kawin',
    title: 'Perjanjian Perkawinan (Prenup & Postnup)',
    keywords: [
      /\bperjanjian\s+(kawin|nikah|perkawinan)\b/i,
      /\bprenup(tial)?\b/i,
      /\bpostnup(tial)?\b/i,
      /\bpisah\s+harta\b/i,
      /\bputusan\s+mk\s*69\b/i,
      /\bnikah\s+campur\s+beli\s+tanah\b/i,
    ],
    answer: `💍 **Ketentuan Perjanjian Perkawinan (Prenup & Postnup):**

Berdasarkan Pasal 29 UU No. 1/1974 jo **Putusan Mahkamah Konstitusi No. 69/PUU-XIII/2015**:
Perjanjian perkawinan kini dapat dibuat **sebelum perkawinan berlangsung (Prenuptial)** MAUPUN **selama ikatan perkawinan berlangsung (Postnuptial)** dengan Akta Notaris.

**Tujuan & Manfaat Utama:**
1. **Pemisahan Harta:** Memisahkan harta bawaan dan harta perolehan suami dan istri, sehingga tidak bercampur menjadi harta bersama.
2. **Perlindungan Utang & Bisnis:** Jika salah satu pihak terlilit utang/pailit, aset pihak lainnya terlindungi dari sita jaminan kreditur.
3. **Pernikahan Campur (WNI dengan WNA):** Sangat krusial agar pihak WNI **tetap dapat memiliki tanah Hak Milik (SHM) dan HGB di Indonesia** tanpa melanggar Pasal 21 ayat (3) UUPA.

**Syarat & Legalitas:**
• KTP & KK kedua belah pihak.
• Buku Nikah / Akta Perkawinan (untuk Postnup).
• Dibuat dengan Akta Notaris, kemudian **wajib dicatatkan** di KUA (bagi yang beragama Islam) atau Dinas Kependudukan dan Pencatatan Sipil (bagi non-Muslim).`,
  },
  {
    id: 'akta_kuasa',
    title: 'Akta Kuasa & Larangan Kuasa Mutlak',
    keywords: [
      /\b(surat|akta)\s+kuasa\b/i,
      /\bkuasa\s+menjual\b/i,
      /\bkuasa\s+mutlak\b/i,
      /\blarangan\s+kuasa\s+mutlak\b/i,
      /\binstruksi\s+mendagri\s*14\s*\/?\s*1982\b/i,
    ],
    answer: `📜 **Akta Surat Kuasa & Larangan Kuasa Mutlak:**

Surat Kuasa adalah persetujuan di mana seseorang memberikan kekuasaan kepada orang lain untuk menyelenggarakan suatu urusan (Pasal 1792 KUHPerdata).

**Macam Akta Kuasa:**
1. **Kuasa Umum:** Untuk pengurusan hal-hal biasa/administrasi.
2. **Kuasa Khusus:** Untuk tindakan kepemilikan tertentu (misal: menjual, menggadaikan, menghibahkan). Harus menyebutkan objek secara terperinci.
3. **Kuasa Substitusi:** Hak penerima kuasa untuk menunjuk pihak lain sebagai penggantinya.

⛔ **Larangan Tegas Kuasa Mutlak atas Tanah:**
Berdasarkan **Instruksi Menteri Dalam Negeri No. 14 Tahun 1982** jo Pasal 39 PP 24/1997:
• Dilarang membuat Surat Kuasa Mutlak yang tidak dapat dicabut kembali yang pada hakikatnya merupakan pemindahan hak atas tanah terselubung.
• PPAT **wajib menolak** pembuatan akta tanah yang didasarkan pada Surat Kuasa Mutlak.`,
  },
  {
    id: 'surat_wasiat',
    title: 'Surat Wasiat (Testament) & Pelaporan ke AHU',
    keywords: [
      /\b(surat\s+)?wasiat\b/i,
      /\btestament\b/i,
      /\blapor(an)?\s+wasiat\b/i,
      /\bdaftar\s+pusat\s+wasiat\b/i,
      /\blegitieme\s+portie\b/i,
    ],
    answer: `📜 **Ketentuan Surat Wasiat (Testament) & Pelaporan Notaris:**

Surat Wasiat adalah akta yang memuat pernyataan seseorang tentang apa yang dikehendakinya terjadi setelah ia meninggal dunia (Pasal 875 KUHPerdata).

**Bentuk-Bentuk Wasiat:**
1. **Wasiat Terbuka (Openbaar Testament):** Dibuat langsung di hadapan Notaris dan 2 orang saksi.
2. **Wasiat Olografis:** Ditulis tangan sendiri oleh pewaris, lalu diserahkan dan dititipkan kepada Notaris untuk dibuatkan Akta Penyimpanan.
3. **Wasiat Rahasia/Tertutup:** Ditulis sendiri atau oleh orang lain, disegel, dan diserahkan kepada Notaris di hadapan 4 orang saksi.

**Kewajiban Pelaporan Notaris (Pasal 16 ayat 1 huruf h UUJN):**
• Setiap Notaris **wajib melaporkan daftar akta wasiat** yang dibuatnya (atau laporan nihil) ke **Daftar Pusat Wasiat Ditjen AHU Kemenkumham**.
• Dilaporkan secara elektronik paling lambat **tanggal 5 setiap bulannya**.

*Legitieme Portie:* Bagian mutlak dari harta peninggalan yang menurut undang-undang tidak dapat dikesampingkan oleh pewaris kepada ahli waris dalam garis lurus (anak/orang tua).`,
  },
  {
    id: 'waris_skw',
    title: 'Hukum Waris & Surat Keterangan Waris (SKW)',
    keywords: [
      /\b(surat\s+keterangan\s+waris|skw|ahli\s+waris|akta\s+waris|turun\s+waris)\b/i,
      /\bsilsilah\s+waris\b/i,
      /\bpembagian\s+waris\b/i,
      /\b(warisan|harta\s+warisan|tentang\s+waris|soal\s+waris)\b/i,
      /\bhukum\s+waris\b/i,
    ],
    answer: `👨‍👩‍👧‍👦 **Surat Keterangan Waris (SKW) & Ketentuan Hukum Waris:**

Surat Keterangan Hak Mewaris membuktikan siapa saja ahli waris yang berhak atas harta peninggalan almarhum/almarhumah:

**Regulasi Pembuatan SKW di Indonesia:**
Berdasarkan SE Mahkamah Agung & Permen ATR/BPN No. 16 Tahun 2021:
1. **Warga Pribumi / WNI Asal:** Surat Keterangan Ahli Waris dibuat oleh para ahli waris, ditandatangani 2 orang saksi, serta disahkan oleh Lurah/Kepala Desa dan diketahui Camat.
2. **WNI Keturunan Tionghoa / Eropa:** Akta Keterangan Hak Mewaris dibuat dalam bentuk **Akta Notaris**.
3. **WNI Keturunan Timur Asing (Arab/India):** Surat Keterangan Waris diterbitkan oleh Balai Harta Peninggalan (BHP).
*(Saat ini Notaris dapat membuat Akta Keterangan Waris untuk seluruh golongan penduduk).*

**Persyaratan Dokumen Turun Waris:**
1. Akta Kematian Asli Disdukcapil almarhum/almarhumah.
2. Buku Nikah / Akta Perkawinan orang tua.
3. Kartu Keluarga dan KTP seluruh ahli waris.
4. Bagan Silsilah Keluarga Ahli Waris.
5. Sertifikat Asli tanah yang akan dibaliknama turun waris.`,
  },
  {
    id: 'jaminan_fidusia',
    title: 'Akta Jaminan Fidusia (UU No. 42/1999)',
    keywords: [
      /\bfidusia\b/i,
      /\bjaminan\s+fidusia\b/i,
      /\bakta\s+fidusia\b/i,
      /\buu\s*42\s*\/?\s*1999\b/i,
      /\bpendaftaran\s+fidusia\b/i,
    ],
    answer: `🚗 **Ketentuan Akta Jaminan Fidusia (UU No. 42 Tahun 1999):**

Jaminan Fidusia adalah hak jaminan atas benda bergerak baik yang berwujud (seperti kendaraan bermotor, mesin pabrik, stok inventaris) maupun tidak berwujud (piutang), di mana penguasaan benda tetap berada pada debitur (pemberi fidusia).

**Aturan Pembuatan & Pendaftaran:**
1. **Wajib Akta Notaris:** Pembebanan benda dengan jaminan fidusia wajib dibuat dengan Akta Notaris dalam Bahasa Indonesia (Pasal 5).
2. **Batas Waktu Pendaftaran:**
   • Wajib didaftarkan oleh penerima kuasa/Notaris ke Kantor Pendaftaran Fidusia Ditjen AHU Online.
   • Batas waktu pendaftaran paling lama **30 (tiga puluh) hari kalender** sejak tanggal pembuatan akta fidusia.
3. **Sertifikat Jaminan Fidusia:**
   • Diterbitkan elektronik dengan kepala bersirah: **"DEMI KEADILAN BERDASARKAN KETUHANAN YANG MAHA ESA"**.
   • Memiliki kekuatan eksekutorial yang sama dengan putusan pengadilan yang berkekuatan hukum tetap.`,
  },

  // --------------------------------------------------------------------
  // 5. 8 AKTA RESMI PPAT & PROSEDUR PERTANAHAN
  // --------------------------------------------------------------------
  {
    id: 'akta_ppat_lengkap',
    title: '8 Akta Resmi PPAT (Pasal 2 PP 37/1998)',
    keywords: [
      /\b(8|delapan)\s+akta\s+(resmi\s+)?ppat\b/i,
      /\bakta\s+apa\s+saja\s+(yang\s+dibuat|kewenangan)\s+ppat\b/i,
      /\bakta\s+(yang\s+bisa\s+dibuat\s+)?ppat\s+apa\s+saja\b/i,
      /\bapa\s+saja\s+akta\s+(yang\s+bisa\s+dibuat\s+)?ppat\b/i,
      /\bjenis\s+akta\s+ppat\b/i,
      /\bmacam\s+akta\s+ppat\b/i,
    ],
    answer: `📜 **8 (Delapan) Akta Resmi Kewenangan PPAT (Pasal 2 PP No. 37/1998):**

PPAT bertugas pokok membuat akta autentik mengenai perbuatan hukum pemindahan dan pembebanan hak atas tanah:

1. **Akta Jual Beli (AJB):** Pemindahan hak atas tanah karena transaksi jual beli.
2. **Akta Tukar Menukar (Ruislag):** Pemindahan hak karena saling menukar objek tanah/properti.
3. **Akta Hibah:** Penyerahan tanah secara cuma-cuma tanpa kompensasi materi.
4. **Akta Pemasukan ke Dalam Perusahaan (Inbreng):** Memasukkan tanah sebagai penyertaan modal saham ke dalam perseroan.
5. **Akta Pembagian Hak Bersama (APHB):** Pembagian pemilikan tanah bersama (misal: warisan bersama) kepada satu atau sebagian pemilik.
6. **Akta Pemberian Hak Tanggungan (APHT):** Pembebanan hak tanggungan atas tanah sebagai jaminan pelunasan utang/kredit bank.
7. **Akta Pemberian Hak Pakai / Hak Guna Bangunan di atas Tanah Hak Milik:** Memberikan hak pakai atau HGB di atas tanah hak milik orang lain.
8. **Surat Kuasa Membebankan Hak Tanggungan (SKMHT):** Kuasa khusus kepada kreditur untuk menandatangani APHT bila debitur berhalangan.`,
  },
  {
    id: 'syarat_ajb',
    title: 'Syarat & Alur Akta Jual Beli (AJB) PPAT',
    keywords: [
      /\b(syarat|persyaratan|dokumen|alur|prosedur)\s+(ajb|akta\s+jual\s+beli)\b/i,
      /\b(syarat|proses|alur|prosedur|berkas|dokumen|pengurusan)\s+jual\s+beli\s+(rumah|tanah|bangunan|properti)\b/i,
      /\bakta\s+jual\s+beli\s+(tanah|rumah|bangunan)\b/i,
    ],
    answer: `📋 **Persyaratan Lengkap Akta Jual Beli (AJB) PPAT:**

**1. Pihak Penjual:**
• Fotokopi KTP suami & istri serta Kartu Keluarga (KK).
• Buku Nikah / Akta Perkawinan (atau Surat Kematian/Akta Cerai bila duda/janda).
• Surat Persetujuan Suami/Istri (wajib hadir menandatangani AJB, kecuali ada Perjanjian Kawin Pisah Harta).
• NPWP Penjual.
• Bukti Setor & Validasi Pajak Penghasilan (**PPh Final 2,5%**).

**2. Pihak Pembeli:**
• Fotokopi KTP suami & istri serta Kartu Keluarga (KK).
• NPWP Pembeli.
• Bukti Setor & Validasi BPHTB (**5% x [Harga - NOPTKP]**).

**3. Objek Tanah:**
• **Sertifikat Asli Tanah:** SHM / SHGB / SHP.
• SPPT PBB 5 Tahun Terakhir beserta bukti lunas (STTS).
• Hasil **Pengecekan Sertifikat Asli di BPN** (Checking BPN) yang masih berlaku.
• Surat Keterangan Pendaftaran Tanah (SKPT) bila diminta.
• Surat Pernyataan Bebas Sengketa & Penguasaan Fisik Tanah.`,
  },
  {
    id: 'akta_hibah',
    title: 'Syarat & Alur Akta Hibah PPAT',
    keywords: [
      /\b(syarat|persyaratan|cara|alur)\s+(hibah|akta\s+hibah)\b/i,
      /\bhibah\s+tanah\b/i,
      /\bpemberian\s+hibah\b/i,
      /\bhibah\s+ke\s+anak\b/i,
    ],
    answer: `🎁 **Persyaratan & Alur Akta Hibah Tanah (PPAT):**

Hibah adalah pemberian cuma-cuma tanah dan/atau bangunan kepada pihak lain (umumnya hubungan keluarga sedarah):

**Persyaratan Dokumen:**
1. KTP, KK, dan NPWP Pemberi Hibah dan Penerima Hibah.
2. Sertifikat Asli Tanah (SHM/SHGB).
3. **Persetujuan Seluruh Ahli Waris Sah:** Seluruh anak kandung dan suami/istri pemberi hibah wajib hadir menyetujui agar tidak melanggar bagian mutlak waris (*Legitieme Portie*).
4. SPPT PBB 5 tahun terakhir beserta bukti lunas.
5. Hasil Pengecekan Sertifikat di Kantor Pertanahan (BPN).
6. **Ketentuan Pajak Hibah:**
   • **PPh Hibah:** Bebas PPh (Tarif 0%) khusus untuk hibah kepada keluarga sedarah garis lurus satu derajat (orang tua ke anak atau anak ke orang tua), dibuktikan dengan **Surat Keterangan Bebas (SKB) PPh** dari KPP Pratama.
   • **BPHTB Hibah:** Dikenakan tarif 5% x (Nilai Hibah - NOPTKP).`,
  },
  {
    id: 'tukar_menukar_ruislag',
    title: 'Akta Tukar Menukar (Ruislag)',
    keywords: [
      /\b(ruislag|tukar\s+menukar)\b/i,
      /\bakta\s+tukar\s+menukar\b/i,
    ],
    answer: `🔄 **Ketentuan Akta Tukar Menukar (Ruislag) PPAT:**

Ruislag adalah perbuatan hukum saling menukar sebidang tanah dengan tanah lain, baik yang nilainya sama maupun terdapat tambahan pembayaran selisih uang.

**Ketentuan Utama:**
• Kedua belah pihak saling menyerahkan dokumen kepemilikan sertifikat asli.
• PPAT melakukan pengecekan sertifikat di BPN untuk kedua objek tanah.
• **Pajak:** Masing-masing pihak dikenakan PPh (selaku pihak yang melepaskan hak) dan BPHTB (selaku pihak yang memperoleh hak baru).
• Dibuat 1 (satu) Akta Tukar Menukar oleh PPAT yang mencakup kedua objek tanah bila berada dalam satu wilayah kerja Kabupaten/Kota.`,
  },
  {
    id: 'inbreng',
    title: 'Akta Pemasukan ke Dalam Perusahaan (Inbreng)',
    keywords: [
      /\binbreng\b/i,
      /\bakta\s+inbreng\b/i,
      /\bpemasukan\s+tanah\s+ke\s+(pt|perusahaan)\b/i,
    ],
    answer: `🏭 **Pengertian & Alur Akta Inbreng:**

Inbreng adalah pemasukan aset non-tunai (dalam hal ini tanah dan/atau bangunan) oleh pemegang saham ke dalam perseroan sebagai setoran modal saham.

**Alur Pelaksanaan:**
1. **Penilaian Aset (Appraisal):** Objek tanah dinilai oleh penilai independen (KJPP) untuk menetapkan nilai pasar wajar yang dikonversi menjadi lembar saham.
2. **Akta PPAT (Inbreng):** PPAT membuat Akta Pemasukan ke Dalam Perusahaan untuk mengalihkan hak atas tanah dari nama pribadi ke nama PT.
3. **Akta Notaris (Peningkatan Modal):** Notaris membuat Akta Perubahan Anggaran Dasar / Peningkatan Modal Disetor PT yang dilaporkan ke Ditjen AHU Kemenkumham.
4. **Pajak:** Dikenakan PPh Final pengalihan hak dan BPHTB perolehan hak oleh PT.`,
  },
  {
    id: 'aphb',
    title: 'Akta Pembagian Hak Bersama (APHB)',
    keywords: [
      /\baphb\b/i,
      /\bakta\s+pembagian\s+hak\s+bersama\b/i,
      /\bpembagian\s+tanah\s+warisan\b/i,
    ],
    answer: `🤝 **Ketentuan Akta Pembagian Hak Bersama (APHB) PPAT:**

APHB digunakan apabila sebidang tanah dimiliki secara bersama oleh lebih dari satu orang (misal: para ahli waris atau mitra pembelian bersama) dan kepemilikan tersebut ingin diserahkan secara utuh kepada salah satu atau sebagian pemilik bersama saja.

**Contoh Kasus:**
Tiga orang anak (A, B, C) mewarisi sebidang tanah bersama. Ketiganya sepakat bahwa tanah tersebut akan dimiliki sepenuhnya oleh A, dengan atau tanpa kompensasi uang kepada B dan C. Maka dibuatlah APHB.

**Syarat:**
• Sertifikat asli yang sudah berstatus kepemilikan bersama.
• Kehadiran seluruh pemegang hak bersama untuk melepaskan bagiannya.
• Validasi BPHTB APHB di Bapenda dan PPh sesuai ketentuan pembebasan/kompensasi.`,
  },
  {
    id: 'hak_tanggungan_apht',
    title: 'Akta Pemberian Hak Tanggungan (APHT)',
    keywords: [
      /\b(apht|hak\s+tanggungan)\b/i,
      /\bakta\s+pemberian\s+hak\s+tanggungan\b/i,
      /\bjaminan\s+bank\s+tanah\b/i,
      /\buu\s*4\s*\/?\s*1996\b/i,
    ],
    answer: `🏦 **Ketentuan Akta Pemberian Hak Tanggungan (APHT) (UU No. 4/1996):**

Hak Tanggungan adalah hak jaminan yang dibebankan pada hak atas tanah untuk pelunasan utang tertentu kepada kreditur (Bank/Lembaga Keuangan).

**Ketentuan Pokok:**
1. Didahului dengan Perjanjian Pokok yaitu **Perjanjian Kredit (PK)** antara debitur dan bank.
2. Dibuat oleh PPAT dalam bentuk **Akta Pemberian Hak Tanggungan (APHT)**.
3. Dihadiri oleh Pemberi Hak Tanggungan (pemilik sertifikat & persetujuan pasangan) dan Kuasa Bank.
4. **Batas Waktu Pendaftaran Elektronik ke BPN (HT-el):**
   PPAT wajib mendaftarkan APHT ke Kantor Pertanahan paling lambat **7 (tujuh) hari kerja** sejak penandatanganan akta.
5. BPN menerbitkan **Sertifikat Hak Tanggungan (SHT)** elektronik yang berkepala irah-irah eksekutorial: *"DEMI KEADILAN BERDASARKAN KETUHANAN YANG MAHA ESA"*.`,
  },
  {
    id: 'skmht',
    title: 'Surat Kuasa Membebankan Hak Tanggungan (SKMHT) vs APHT',
    keywords: [
      /\bskmht\b/i,
      /\bsurat\s+kuasa\s+membebankan\s+hak\s+tanggungan\b/i,
      /\bbeda(nya)?\s+skmht\s+(dan|sama|dengan)\s+apht\b/i,
      /\bmasa\s+berlaku\s+skmht\b/i,
    ],
    answer: `📝 **Ketentuan SKMHT (Surat Kuasa Membebankan Hak Tanggungan) vs APHT:**

SKMHT adalah akta pemberian kuasa khusus dari debitur/pemberi hak tanggungan kepada kreditur untuk menandatangani APHT, apabila debitur tidak dapat hadir pada saat pembuatan APHT.

**Masa Berlaku SKMHT (Pasal 15 UU No. 4/1996):**
1. **Tanah yang Sudah Bersertifikat:**
   Masa berlaku SKMHT paling lama **1 (satu) bulan** sejak tanggal pembuatan akta.
2. **Tanah yang Belum Bersertifikat:**
   Masa berlaku SKMHT paling lama **3 (tiga) bulan** sejak tanggal pembuatan akta.
3. **Pengecualian Kredit Mikro / KPR Bersubsidi:**
   Berdasarkan Permen Agraria/BPN, SKMHT untuk kredit program pemerintah tertentu dapat berlaku sampai masa pinjaman lunas.

*Catatan:* SKMHT tidak dapat ditarik kembali atau dibatalkan oleh pemberi kuasa dengan alasan apa pun.`,
  },
  {
    id: 'roya_ht',
    title: 'Prosedur Roya Hak Tanggungan',
    keywords: [
      /\broya\b/i,
      /\bapa\s+itu\s+roya\b/i,
      /\bcoret\s+hak\s+tanggungan\b/i,
      /\bhapus\s+catatan\s+bank\s+di\s+sertifikat\b/i,
      /\bpencoretan\s+hak\s+tanggungan\b/i,
    ],
    answer: `🔓 **Pengertian & Prosedur Roya Hak Tanggungan (Pasal 22 UU No. 4/1996):**

Roya adalah pencoretan catatan beban Hak Tanggungan pada buku tanah dan sertifikat tanah di Kantor Pertanahan (BPN) karena utang/kredit telah lunas.

**Alur & Persyaratan Pengurusan Roya:**
1. **Dokumen dari Bank (Kreditur):**
   • Surat Keterangan Lunas dari Bank.
   • Surat Pengantar Roya / Permohonan Roya ke BPN.
   • Sertifikat Hak Tanggungan (SHT) asli.
   • Sertifikat Tanah Asli yang dijaminkan.
2. **Pengajuan ke BPN:**
   • Diajukan melalui Loket BPN atau Layanan Mitra PPAT (secara elektronik).
   • Membayar biaya PNBP Pelayanan Roya sebesar **Rp 50.000,-** per sertifikat.
3. BPN membubuhkan catatan coretan (roya) pada kolom catatan pendaftaran di buku tanah dan sertifikat bahwa Hak Tanggungan telah hapus.`,
  },
  {
    id: 'balik_nama',
    title: 'Prosedur Balik Nama Sertifikat Tanah di BPN',
    keywords: [
      /\b(balik\s+nama|peralihan\s+hak)\s+(sertifikat|tanah|rumah)\b/i,
      /\bcara\s+balik\s+nama\s+sertifikat\b/i,
      /\balur\s+balik\s+nama\b/i,
      /\bbrapa\s+lama\s+balik\s+nama\b/i,
    ],
    answer: `🔄 **Prosedur Balik Nama Sertifikat Tanah di Kantor Pertanahan (BPN):**

Peralihan hak atas tanah wajib didaftarkan ke BPN paling lambat **7 (tujuh) hari kerja** sejak akta PPAT ditandatangani (Pasal 40 PP 24/1997).

**Persyaratan Berkas Balik Nama:**
1. Surat Permohonan Balik Nama yang ditandatangani pemohon/kuasa.
2. **Sertifikat Asli Tanah** (SHM / SHGB).
3. **Akta Asli PPAT** (AJB, Hibah, Waris, atau APHB) beserta warkah pendukung.
4. Identitas diri pemohon (KTP & KK pihak penerima hak).
5. Bukti Setor PPh Final (telah divalidasi oleh Kantor Pelayanan Pajak / e-PHTB).
6. Bukti Setor BPHTB (telah divalidasi oleh Bapenda Dispenda setempat).
7. Bukti Lunas PBB tahun berjalan.
8. Bukti Pembayaran PNBP Pendaftaran Tanah.

*Waktu Penyelesaian:* Rata-rata 5 - 14 hari kerja di Kantor Pertanahan setempat.`,
  },
  {
    id: 'checking_bpn',
    title: 'Pengecekan Sertifikat di BPN (Checking BPN)',
    keywords: [
      /\b(cek|checking|pengecekan)\s+sertifikat(\s+di\s+bpn)?\b/i,
      /\bkenapa\s+harus\s+cek\s+sertifikat\b/i,
    ],
    answer: `🔍 **Pengecekan Sertifikat di Kantor Pertanahan (Checking BPN):**

Berdasarkan Pasal 97 Permen Agraria/BPN No. 3/1997:
Sebelum membuat akta pemindahan hak atas tanah, PPAT **wajib terlebih dahulu memeriksa kesesuaian sertifikat tanah** dengan buku tanah yang ada di Kantor Pertanahan.

**Tujuan Pemeriksaan:**
• Memastikan keaslian fisik sertifikat tanah.
• Memastikan tanah tidak sedang dalam status sengketa, sita jaminan pengadilan, atau catatan blokir kepolisian/kejaksaan.
• Memastikan tidak ada Hak Tanggungan aktif yang belum diroya.
• Biaya PNBP Pengecekan Sertifikat: **Rp 50.000,-** per sertifikat.
*(Saat ini checking sertifikat dilakukan secara elektronik melalui sistem Mitra Kerja PPAT BPN).*`,
  },
  {
    id: 'pecah_gabung_sertifikat',
    title: 'Pemecahan (Splitsing) & Penggabungan Sertifikat',
    keywords: [
      /\b(pecah|pemecahan|splitsing|gabung|penggabungan)\s+sertifikat\b/i,
      /\bcara\s+pecah\s+sertifikat\b/i,
    ],
    answer: `📐 **Pemecahan Sertifikat (Splitsing) & Penggabungan Sertifikat Tanah:**

1. **Pemecahan Sertifikat (Splitsing):**
   • Pemecahan sebidang tanah yang sudah bersertifikat menjadi beberapa bidang tanah baru atas nama pemilik yang sama.
   • **Syarat:** Sertifikat asli, KTP/KK pemohon, site plan (izin tapak dari Dinas Tata Ruang jika lebih dari 5 bidang), SPPT PBB, permohonan pengukuran ulang oleh petugas ukur BPN.
   • Setiap bidang hasil pemecahan diterbitkan sertifikat baru dengan nomor hak dan surat ukur tersendiri, sedangkan sertifikat induk dimatikan.

2. **Penggabungan Sertifikat:**
   • Menggabungkan dua atau lebih bidang tanah yang berbatasan langsung dan atas nama pemilik yang sama menjadi satu sertifikat baru.
   • Syarat: Jenis hak harus sama (misal sesama SHM) dan tidak sedang dalam jaminan perbankan.`,
  },
  {
    id: 'peningkatan_hak',
    title: 'Peningkatan Hak (SHGB ke SHM)',
    keywords: [
      /\b(peningkatan\s+hak|ubah\s+hgb\s+ke\s+shm|shgb\s+ke\s+shm|ganti\s+hgb\s+jadi\s+shm|hgb\s+ke\s+hak\s+milik)\b/i,
    ],
    answer: `📈 **Peningkatan Hak Atas Tanah (SHGB Menjadi SHM):**

Pemegang Sertifikat Hak Guna Bangunan (SHGB) perorangan WNI untuk rumah tinggal dapat meningkatkan haknya menjadi Sertifikat Hak Milik (SHM) berdasarkan Keputusan Menteri Negara Agraria/Kepala BPN No. 6 Tahun 1998.

**Persyaratan Dokumen:**
1. Sertifikat Asli SHGB yang masih berlaku atau sudah habis masa berlakunya.
2. Fotokopi Izin Mendirikan Bangunan (IMB) atau Persetujuan Bangunan Gedung (PBG) yang menyatakan peruntukan rumah tinggal.
3. Fotokopi SPPT PBB tahun berjalan dan bukti lunas.
4. KTP dan KK pemohon (WNI).
5. Surat Pernyataan bahwa tanah dipergunakan untuk rumah tinggal dan luas tanah perorangan tidak melebihi 5.000 m².
6. Membayar biaya PNBP dan pemasukan kas negara (bila ada selisih nilai).`,
  },
  {
    id: 'jenis_hak_tanah',
    title: 'Perbedaan Jenis Hak Atas Tanah (SHM, SHGB, SHP, HGU, HPL)',
    keywords: [
      /\b(beda(nya)?\s+shm\s+(dan|sama|dengan)\s+shgb|jenis\s+hak\s+tanah|shm|shgb|shp|hgu|hpl)\b/i,
      /\bapa\s+itu\s+shm\b/i,
      /\bapa\s+itu\s+shgb\b/i,
    ],
    answer: `📜 **Perbedaan Jenis Hak Atas Tanah di Indonesia (UUPA No. 5/1960):**

1. **Hak Milik (SHM):**
   • Hak turun-temurun, terkuat, dan terpenuh yang dapat dipunyai orang atas tanah.
   • **Subjek:** Hanya Warga Negara Indonesia (WNI) tunggal dan badan hukum tertentu yang ditetapkan pemerintah (misal bank pemerintah). WNA dan PT swasta tidak boleh memiliki SHM.
   • Tidak memiliki batas jangka waktu.

2. **Hak Guna Bangunan (SHGB):**
   • Hak untuk mendirikan dan mempunyai bangunan di atas tanah yang bukan miliknya.
   • **Jangka Waktu:** Paling lama 30 tahun, dapat diperpanjang 20 tahun, dan diperbarui 30 tahun.
   • **Subjek:** WNI dan Badan Hukum yang didirikan di Indonesia (PT, CV, Koperasi).

3. **Hak Pakai (SHP):**
   • Hak untuk menggunakan dan/atau memungut hasil dari tanah negara atau tanah hak milik.
   • **Subjek:** WNI, WNA yang berkedudukan di Indonesia, Badan Usaha Indonesia, dan Perwakilan Negara Asing.

4. **Hak Guna Usaha (HGU):**
   • Hak untuk mengusahakan tanah yang dikuasai langsung oleh negara untuk usaha pertanian, perikanan, atau peternakan (luas minimal 5 hektar). Maksimal 35 tahun + perpanjangan 25 tahun.

5. **Hak Pengelolaan (HPL):**
   • Hak menguasai dari negara yang kewenangan pelaksanaannya sebagian dilimpahkan kepada pemegang haknya (BUMN, BUMD, Pemda, Badan Otorita).`,
  },
  {
    id: 'tanah_girik_adat',
    title: 'Tanah Girik, Petok D, Letter C, & Sertifikasi Pertama Kali',
    keywords: [
      /\b(girik|petok\s*d|letter\s*c|eigendom|tanah\s+adat)\b/i,
      /\b(sertifikasi\s+tanah\s+girik|cara\s+ubah\s+girik\s+ke\s+shm|ptsl)\b/i,
    ],
    answer: `📜 **Tanah Girik / Letter C & Alur Sertifikasi Pertama Kali:**

Girik, Petok D, Letter C, atau Kekitir **bukanlah bukti kepemilikan hak atas tanah**, melainkan bukti pembayaran pajak tanah adat pada masa lalu.

**Alur Pendaftaran Tanah Pertama Kali (Konversi Girik ke SHM):**
1. **Surat Riwayat Tanah:** Diterbitkan oleh Kepala Desa/Lurah setempat menerangkan asal-usul tanah sejak tahun 1960.
2. **Surat Keterangan Tidak Sengketa:** Ditandatangani Kades/Lurah disaksikan tokoh masyarakat.
3. **Surat Pernyataan Penguasaan Fisik Bidang Tanah (Sporadik):** Bahwa pemohon telah menguasai fisik tanah secara beritikad baik selama 20 tahun berturut-turut atau lebih.
4. **Pendaftaran di BPN:**
   • Melalui permohonan rutin ke Kantor Pertanahan atau melalui Program PTSL (Pendaftaran Tanah Sistematis Lengkap).
   • Pengukuran lokasi oleh petugas ukur BPN dan penerbitan Surat Ukur.
   • Pengumuman data fisik & yuridis selama 14 - 30 hari di kantor kelurahan dan BPN.
   • Pengesahan SK Hak dan Penerbitan Buku Tanah & Sertifikat Hak Milik (SHM).`,
  },
  {
    id: 'blokir_sertifikat',
    title: 'Catatan Blokir & Sita Sertifikat di BPN',
    keywords: [
      /\b(blokir|sita|sengketa)\s+sertifikat\b/i,
      /\bcara\s+blokir\s+sertifikat\s+tanah\b/i,
      /\bpermen\s+agraria\s*13\s*\/?\s*2017\b/i,
    ],
    answer: `🛑 **Ketentuan Blokir & Sita Sertifikat Tanah di BPN:**

Berdasarkan Permen Agraria/BPN No. 13 Tahun 2017 tentang Tata Cara Blokir dan Sita:

1. **Pencatatan Blokir Perorangan:**
   • Diajukan oleh pihak yang berkepentingan langsung atas sengketa hak tanah (misal: ahli waris yang tidak dilibatkan, sengketa jual beli).
   • Melampirkan bukti gugatan perdata di pengadilan atau laporan polisi.
   • **Jangka Waktu:** Blokir perorangan berlaku selama **30 (tiga puluh) hari kalender** dan tidak dapat diperpanjang kecuali ada penetapan sita dari pengadilan.

2. **Catatan Sita Pengadilan / Penyidik:**
   • Diletakkan atas dasar Berita Acara Sita Jaminan (CB) atau Sita Eksekusi dari Pengadilan Negeri, atau Surat Perintah Penyitaan dari Kepolisian/Kejaksaan/KPK.
   • Selama catatan blokir/sita aktif di buku tanah BPN, **PPAT dilarang membuat akta pengalihan hak apa pun** atas tanah tersebut.`,
  },

  // --------------------------------------------------------------------
  // 6. PERPAJAKAN & BIAYA TRANSAKSI
  // --------------------------------------------------------------------
  {
    id: 'pajak_pph',
    title: 'Pajak Penghasilan (PPh) Final Pengalihan Hak Tanah',
    keywords: [
      /\bpph(\s+final)?(\s+penjual|\s+tanah|\s+ajb)?\b/i,
      /\bpajak\s+penjual\b/i,
      /\btarif\s+pph\s+tanah\b/i,
      /\bpp\s*34\s*\/?\s*2016\b/i,
      /\be-phtb\b/i,
    ],
    answer: `💰 **Pajak Penghasilan (PPh) Final Penjual / Pengalihan Tanah:**

Berdasarkan **PP No. 34 Tahun 2016**, penghasilan dari pengalihan hak atas tanah dan/atau bangunan dikenai PPh yang bersifat Final:

**Tarif PPh Final:**
• **2,5% (dua setengah persen):** Dari jumlah bruto nilai pengalihan (nilai transaksi atau Nilai Jual Objek Pajak / NJOP, mana yang lebih tinggi). Berlaku untuk transaksi umum jual beli.
• **1% (satu persen):** Untuk pengalihan Rumah Sederhana dan Rumah Susun Sederhana oleh pengembang.
• **0% (bebas pajak):** Untuk pengalihan kepada pemerintah untuk kepentingan umum, atau hibah kepada keluarga sedarah garis lurus satu derajat dengan SKB PPh.

**Validasi Pajak (e-PHTB):**
Bukti setoran PPh (Surat Setoran Pajak / SSP) wajib **divalidasi secara elektronik di DJP Online (e-PHTB)** sebelum akta AJB ditandatangani oleh PPAT.`,
  },
  {
    id: 'pajak_bphtb',
    title: 'Bea Perolehan Hak atas Tanah dan Bangunan (BPHTB)',
    keywords: [
      /\bbphtb\b/i,
      /\bpajak\s+pembeli\b/i,
      /\brumus\s+bphtb\b/i,
      /\bhitung\s+bphtb\b/i,
      /\bnoptkp\b/i,
    ],
    answer: `🏛️ **Bea Perolehan Hak atas Tanah dan Bangunan (BPHTB) Pembeli:**

BPHTB adalah pajak daerah yang dikenakan atas perolehan hak atas tanah dan/atau bangunan oleh pembeli/penerima hak (UU HKPD No. 1 Tahun 2022).

**Rumus Perhitungan BPHTB:**
\`BPHTB = 5% × (Nilai Perolehan Objek Pajak [NPOP] - NPOP Tidak Kena Pajak [NOPTKP])\`

**Keterangan:**
• **NPOP:** Harga transaksi riil atau NJOP PBB (diambil mana nilai yang lebih tinggi).
• **NOPTKP:** Nilai Tidak Kena Pajak yang ditetapkan Perda masing-masing daerah (umumnya berkisar Rp 60.000.000,- s/d Rp 80.000.000,-; khusus perolehan waris/hibah wasiat minimal Rp 300.000.000,-).
• **Validasi BPHTB:** SSPD BPHTB wajib diteliti dan divalidasi keabsahannya oleh Bapenda/Dispenda Kabupaten/Kota setempat sebelum berkas balik nama diproses BPN.`,
  },
  {
    id: 'simulasi_pajak_tanah',
    title: 'Simulasi Perhitungan Pajak Jual Beli Tanah (PPh & BPHTB)',
    keywords: [
      /\b(simulasi|hitung|perhitungan)\s+pajak\b/i,
      /\b(cara\s+hitung|hitung\s+pajak|rumus\s+pajak|simulasi\s+pajak)\s+(jual\s+beli|tanah|rumah|ajb)?\b/i,
      /\bpajak\s+jual\s+beli(\s+tanah|\s+rumah|\s+ajb)?\b/i,
      /\bcontoh\s+(hitung|perhitungan)\s+pajak\s+(tanah|rumah|ajb)\b/i,
      /\bberapa\s+pajak\s+(jual\s+beli|beli\s+tanah|penjual\s+dan\s+pembeli)\b/i,
    ],
    answer: `🧮 **Simulasi Perhitungan Pajak Transaksi Tanah & Bangunan (AJB):**

*Contoh Kasus:*
Sebuah rumah dijual dengan harga transaksi sepakat **Rp 500.000.000,-** (NJOP Rp 450.000.000,-). Nilai NOPTKP daerah setempat adalah **Rp 80.000.000,-**.

**1. PPh Final Penjual (2,5%):**
\`PPh = 2,5% × Rp 500.000.000 = Rp 12.500.000,-\`
*(Disetor ke Kas Negara via Bank Persepsi / e-Billing DJP).*

**2. BPHTB Pembeli (5%):**
\`Dasar Pengenaan = Rp 500.000.000 - Rp 80.000.000 = Rp 420.000.000,-\`
\`BPHTB = 5% × Rp 420.000.000 = Rp 21.000.000,-\`
*(Disetor ke Rekening Kas Daerah / Bapenda).*

**3. PNBP Balik Nama BPN:**
\`PNBP = (1‰ × Rp 500.000.000) + Rp 50.000 = Rp 500.000 + Rp 50.000 = Rp 550.000,-\`

*Total Biaya Pajak & PNBP:*
Penjual membayar PPh **Rp 12.500.000,-**
Pembeli membayar BPHTB **Rp 21.000.000,-** + PNBP BPN **Rp 550.000,-** (di luar jasa PPAT).`,
  },
  {
    id: 'pnbp_bpn',
    title: 'Tarif PNBP Pelayanan Kantor Pertanahan (PP No. 128/2015)',
    keywords: [
      /\bpnbp(\s+bpn)?\b/i,
      /\bbiaya\s+(resmi\s+)?bpn\b/i,
      /\btarif\s+bpn\b/i,
      /\bpp\s*128\s*\/?\s*2015\b/i,
    ],
    answer: `📋 **Tarif Resmi PNBP Pelayanan Pertanahan (PP No. 128 Tahun 2015):**

1. **Pengecekan Sertifikat:** Rp 50.000,- per sertifikat.
2. **Pencatatan Roya Hak Tanggungan:** Rp 50.000,- per sertifikat.
3. **Surat Keterangan Pendaftaran Tanah (SKPT):** Rp 50.000,- per permohonan.
4. **Pendaftaran Peralihan Hak (Balik Nama AJB/Hibah/Waris):**
   \`Tarif = (1 / 1000 × Nilai Tanah) + Rp 50.000,-\`
   *(1 permil dihitung berdasarkan Nilai Zona Nilai Tanah / ZNT BPN).*
5. **Pendaftaran Hak Tanggungan Elektronik:**
   • Nilai Tanggungan s/d Rp 250 Juta: Rp 50.000,-.
   • Nilai Tanggungan > Rp 250 Jt s/d Rp 1 Miliar: Rp 200.000,-.
   • Nilai Tanggungan > Rp 1 Miliar s/d Rp 10 Miliar: Rp 2.500.000,-.
   • Nilai Tanggungan > Rp 10 Miliar s/d Rp 1 Triliun: Rp 25.000.000,-.`,
  },
  {
    id: 'honorarium_notaris_ppat',
    title: 'Standar Honorarium Notaris & PPAT',
    keywords: [
      /\b(honor|honorarium|biaya\s+jasa|tarif|fee)\s+(notaris|ppat)\b/i,
      /\bberapa\s+biaya\s+(jasa\s+)?(notaris|ppat)\b/i,
      /\bpasal\s+36\s+uujn\b/i,
    ],
    answer: `⚖️ **Ketentuan Honorarium Notaris & PPAT:**

**1. Honorarium Notaris (Pasal 36 UU No. 30/2004 jo UU No. 2/2014):**
Ditetapkan berdasarkan nilai ekonomis objek akta:
• Nilai s/d **Rp 100.000.000,-**: Honorarium paling banyak **2,5%**.
• Nilai > **Rp 100.000.000,- s/d Rp 1 Miliar**: Honorarium paling banyak **1,5%**.
• Nilai > **Rp 1 Miliar**: Honorarium paling banyak **1%**.
• *Nilai Sosiologis (kemanusiaan/sosial):* Honorarium paling banyak Rp 5.000.000,- atau cuma-cuma untuk warga tidak mampu.

**2. Honorarium PPAT (Permen ATR/BPN No. 33 Tahun 2021):**
• Honorarium pembuatan akta PPAT paling banyak **1% (satu persen)** dari nilai transaksi yang tercantum dalam akta.
• Sudah termasuk biaya pembuatan akta, saksi, dan pelaporan, di luar pungutan resmi negara (pajak PPh, BPHTB, PNBP BPN).`,
  },

  // --------------------------------------------------------------------
  // 7. KAMUS ISTILAH & PANDUAN UMUM
  // --------------------------------------------------------------------
  {
    id: 'kamus_istilah',
    title: 'Kamus Istilah Populer Notaris & PPAT',
    keywords: [
      /\b(kamus|istilah|istilah-istilah|daftar istilah)\s+(notaris|ppat|hukum)\b/i,
      /\bapa\s+arti\s+(istilah|kata)\b/i,
    ],
    answer: `📖 **Kamus Singkat Istilah Hukum Notaris & PPAT:**

• **Minuta Akta:** Naskah asli akta yang memuat tanda tangan basah para penghadap, saksi, dan Notaris; disimpan selamanya oleh Notaris.
• **Grosse Akta:** Salinan akta pengakuan utang berkepala "Demi Keadilan Berdasarkan Ketuhanan YME" yang memiliki kekuatan eksekutorial.
• **Komparisi:** Uraian identitas dan dasar kewenangan bertindak para pihak dalam akta.
• **Premisse:** Uraian pertimbangan/latar belakang kesepakatan sebelum pasal-pasal akta.
• **Renvooi:** Perubahan, penambahan, atau pencoretan kata pada minuta akta yang diparaf para pihak.
• **Waarmerking:** Pendaftaran surat di bawah tangan ke buku register khusus tanpa disaksikan penandatanganannya.
• **Legalisasi:** Pengesahan tanda tangan surat di bawah tangan yang disaksikan langsung oleh Notaris.
• **APHB:** Akta Pembagian Hak Bersama atas tanah milik bersama/warisan.
• **APHT:** Akta Pemberian Hak Tanggungan sebagai jaminan utang bank.
• **SKMHT:** Surat Kuasa Membebankan Hak Tanggungan.
• **Roya:** Pencoretan catatan beban utang hak tanggungan di BPN setelah kredit lunas.
• **Inbreng:** Pemasukan aset tanah/bangunan sebagai setoran modal saham ke perseroan.
• **Splitsing:** Pemecahan sebidang tanah menjadi beberapa sertifikat baru.
• **Repertorium:** Buku register harian akta yang wajib ditutup setiap akhir bulan.
• **Klapper:** Buku indeks abjad nama para penghadap akta.`,
  },
  {
    id: 'bantuan_umum_notaris',
    title: 'Panduan Konsultasi Notaris & PPAT Noffice',
    keywords: [
      /\b(apa\s+saja\s+yang\s+bisa\s+kamu\s+(jawab|bantu)|kamu\s+tahu\s+apa\s+saja|cakupan\s+hukum|bisa\s+tanya\s+apa)\b/i,
      /\bbisa\s+konsultasi\s+apa\s+saja\b/i,
      /\bkemampuan\s+ai\s+notaris\b/i,
    ],
    answer: `🤝 **Cakupan Pengetahuan Hukum Notaris & PPAT Noffice:**

Saya siap membantu menjawab seluruh pertanyaan terkait operasional, regulasi, dan prosedur hukum Notaris & PPAT di Indonesia:

1. **Kenotariatan (UUJN):** Wewenang notaris, anatomi akta, komparisi, saksi akta, renvooi, minuta vs salinan, legalisasi vs waarmerking, buku repertorium & klapper, cuti, MPD/MKN.
2. **Badan Usaha & Legalitas (AHU):** Pendirian PT biasa, PT Perorangan, CV, Yayasan, Koperasi, perubahan anggaran dasar, RUPS, Akta PKR, NIB OSS KBLI 2020.
3. **Keperdataan & Hukum Keluarga:** Perjanjian perkawinan (prenup/postnup), akta kuasa, wasiat, pembagian waris & SKW, jaminan fidusia.
4. **Ke-PPAT-an & Pertanahan (BPN):** 8 Akta PPAT (AJB, Hibah, APHT, APHB, Ruislag, Inbreng, dll), pengecekan sertifikat BPN, roya hak tanggungan, SKMHT, balik nama, pemecahan sertifikat, peningkatan SHGB ke SHM, jenis hak tanah (SHM, SHGB, SHP).
5. **Perpajakan Transaksi:** Rumus dan simulasi PPh Final 2,5%, validasi BPHTB 5%, tarif PNBP BPN, dan standar honorarium.
6. **Operasional Noffice:** Pencarian database kasus/klien, rekap laporan, auto generate nomor akta, ekstrak data KTP, dan backup SQLite.

Silakan ajukan pertanyaan Anda dengan bahasa santai maupun formal!`,
  },
];

// ----------------------------------------------------------------------
// HELPER: Normalizer & Keyword Matcher
// ----------------------------------------------------------------------

function cleanLegalQuery(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[?!.,;:()"'“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Checks if the user's message is asking for live database counts/records
// rather than legal concept/guidance (e.g., "berapa kasus ajb di kantor").
export function isSpecificOfficeDataQuery(norm) {
  // If explicitly asking for stored clients, employees, documents, or running case counts in the app
  const isCount = /\b(berapa|jumlah|total|rekap|statistik)\b/i.test(norm);
  const isOfficeData = /\b(kasus\s+aktif|kasus\s+berjalan|klien\s+kami|klien\s+saya|karyawan|staf|pegawai|dokumen\s+saya|di\s+kantor|di\s+database|di\s+aplikasi|di\s+sistem)\b/i.test(norm);
  const isWhoHas = /\b(siapa\s+saja\s+yang\s+punya|siapa\s+klien|cari\s+berkas|cari\s+klien|cari\s+kasus)\b/i.test(norm);
  
  if (isWhoHas) return true;
  if (isCount && isOfficeData) return true;
  return false;
}

/**
 * Searches the rich Notaris & PPAT Knowledge Base for a matching topic.
 * Returns { match: true, id, title, reply } or null.
 */
export function getNotaryLegalAnswer(rawMsg, msgLower) {
  if (!rawMsg || !rawMsg.trim()) return null;
  const norm = cleanLegalQuery(msgLower || rawMsg);

  // If this is clearly a query for office database statistics or entity lookup, let the DB engine handle it.
  if (isSpecificOfficeDataQuery(norm)) {
    return null;
  }

  // 1. Direct regex/keyword matches
  for (const topic of NOTARY_TOPICS) {
    for (const kw of topic.keywords) {
      if (kw.test(norm)) {
        return {
          match: true,
          id: topic.id,
          title: topic.title,
          reply: topic.answer,
        };
      }
    }
  }

  // 2. Semantic fallback matching based on legal core concepts
  const conceptMatches = [
    {
      pattern: /\b(roya|coret\s+ht)\b/i,
      topicId: 'roya_ht',
    },
    {
      pattern: /\b(skmht)\b/i,
      topicId: 'skmht',
    },
    {
      pattern: /\b(apht|hak\s+tanggungan)\b/i,
      topicId: 'hak_tanggungan_apht',
    },
    {
      pattern: /\b(aphb|hak\s+bersama)\b/i,
      topicId: 'aphb',
    },
    {
      pattern: /\b(inbreng)\b/i,
      topicId: 'inbreng',
    },
    {
      pattern: /\b(ruislag|tukar\s+menukar)\b/i,
      topicId: 'tukar_menukar_ruislag',
    },
    {
      pattern: /\b(renvooi)\b/i,
      topicId: 'renvooi',
    },
    {
      pattern: /\b(komparisi)\b/i,
      topicId: 'komparisi_akta',
    },
    {
      pattern: /\b(repertorium)\b/i,
      topicId: 'repertorium',
    },
    {
      pattern: /\b(klapper)\b/i,
      topicId: 'klapper',
    },
    {
      pattern: /\b(protokol\s+notaris)\b/i,
      topicId: 'protokol_notaris',
    },
    {
      pattern: /\b(fidusia)\b/i,
      topicId: 'jaminan_fidusia',
    },
    {
      pattern: /\b(wasiat|testament)\b/i,
      topicId: 'surat_wasiat',
    },
    {
      pattern: /\b(perjanjian\s+kawin|prenup|postnup|pisah\s+harta)\b/i,
      topicId: 'perjanjian_kawin',
    },
    {
      pattern: /\b(kuasa\s+mutlak)\b/i,
      topicId: 'akta_kuasa',
    },
    {
      pattern: /\b(waris|skw|silsilah\s+waris|keterangan\s+waris)\b/i,
      topicId: 'waris_skw',
    },
    {
      pattern: /\b(pt\s+perorangan)\b/i,
      topicId: 'pt_perorangan',
    },
    {
      pattern: /\b(yayasan)\b/i,
      topicId: 'pendirian_yayasan',
    },
    {
      pattern: /\b(koperasi)\b/i,
      topicId: 'pendirian_koperasi',
    },
    {
      pattern: /\b(cv)\b/i,
      topicId: 'pendirian_cv',
    },
    {
      pattern: /\b(pt\s+perorangan)\b/i,
      topicId: 'pt_perorangan',
    },
    {
      pattern: /\b(pt|perseroan)\b/i,
      topicId: 'pendirian_pt',
    },
    {
      pattern: /\b(hibah)\b/i,
      topicId: 'akta_hibah',
    },
    {
      pattern: /\b(hitung\s+pajak|simulasi\s+pajak|pajak\s+jual\s+beli)\b/i,
      topicId: 'simulasi_pajak_tanah',
    },
    {
      pattern: /\b(ajb|jual\s+beli)\b/i,
      topicId: 'syarat_ajb',
    },
    {
      pattern: /\b(balik\s+nama)\b/i,
      topicId: 'balik_nama',
    },
    {
      pattern: /\b(checking\s+bpn|cek\s+sertifikat)\b/i,
      topicId: 'checking_bpn',
    },
    {
      pattern: /\b(bphtb)\b/i,
      topicId: 'pajak_bphtb',
    },
    {
      pattern: /\b(pph)\b/i,
      topicId: 'pajak_pph',
    },
    {
      pattern: /\b(shm|shgb|shp|hgu|hpl)\b/i,
      topicId: 'jenis_hak_tanah',
    },
    {
      pattern: /\b(girik|letter\s*c|petok)\b/i,
      topicId: 'tanah_girik_adat',
    },
    {
      pattern: /\b(pensiun\s+notaris|cuti\s+notaris|notaris\s+pengganti)\b/i,
      topicId: 'cuti_pensiun_notaris',
    },
    {
      pattern: /\b(mpd|mpw|mpp|mkn|pengawas\s+notaris)\b/i,
      topicId: 'majelis_pengawas',
    },
    {
      pattern: /\b(larangan\s+notaris|rangkap\s+jabatan)\b/i,
      topicId: 'larangan_notaris',
    },
    {
      pattern: /\b(honor|honorarium|biaya\s+notaris|biaya\s+ppat)\b/i,
      topicId: 'honorarium_notaris_ppat',
    },
  ];

  for (const cm of conceptMatches) {
    if (cm.pattern.test(norm)) {
      const found = NOTARY_TOPICS.find((t) => t.id === cm.topicId);
      if (found) {
        return {
          match: true,
          id: found.id,
          title: found.title,
          reply: found.answer,
        };
      }
    }
  }

  return null;
}
