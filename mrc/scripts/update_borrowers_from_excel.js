// Load .env manually if exists
try {
  const envPath = require('path').join(__dirname, '..', '.env');
  if (require('fs').existsSync(envPath)) {
    const lines = require('fs').readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
    }
  }
} catch (e) {}
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const XLSX = require('../node_modules/xlsx');

// 1. Pemetaan Jabatan dari SK Operasional
const skPositions = [
  // Halaman 1
  { name: 'Walyati Retnoningsih, S.Si.,M.AP.', position: 'Kepala Sekolah' },
  { name: 'Lisna Nurjanah, SE., M.M.Pd.', position: 'Arsiparis dan Koordinator Tata Usaha' },
  { name: 'Kosasih, ST.', position: 'Bendahara Pengeluaran Pembantu (BPP)' },
  { name: 'Rony Saputra Rajali, S.Tr.T.', position: 'Operator Urusan Keuangan dan Aset' },
  { name: 'Anih, S.Pd.SD.', position: 'Operator Urusan Kepegawaian dan Belanja Pegawai' },
  { name: 'Rismawati', position: 'Operator Urusan Kepegawaian' },
  { name: 'Linda Cahyati, S.S.', position: 'Operator Urusan Sarana Prasarana' },
  { name: 'Eva Nia Meilinda R., S.Pd.', position: 'Operator Urusan Kesiswaan' },
  { name: 'Ade Rusmini, S.Sos.', position: 'Operator Urusan Surat dan Kearsipan' },
  { name: 'Riska Komalasari, S.Kom.', position: 'Operator Dapodik' },
  { name: 'Aldy Agustiansyah', position: 'Operator Dapodik' },
  { name: 'Retti Sulistiawati, S.Si.', position: 'Wakil Kepala Sekolah Bidang Kurikulum' },
  { name: 'Ela Nurlela, S.Pd.', position: 'Staf Wakil Kepala Sekolah Bidang Pengembangan Kurikulum dan MGMP' },
  { name: 'Dani Nur Muhamad, S.E.', position: 'Staf Wakil Kepala Sekolah Bidang KBM dan Evaluasi Pendidikan' },
  { name: 'Siti Hasti, S.Pd.', position: 'Staf Wakil Kepala Sekolah Bidang SPMI dan PKG' },
  { name: 'Hj. Ismiyanti, S.Pd.', position: 'Kepala Program Keahlian Akuntansi dan Keuangan' },
  { name: 'Heni Ariska, S.Pd.', position: 'Sekretaris Program Keahlian Akuntansi dan Keuangan Lembaga' },
  { name: 'Heni Juwita Santosa, S.Pd.', position: 'Kepala Program Keahlian Pemasaran' },
  { name: 'Reni Ika Wijayanti, M.Pd.', position: 'Sekretaris Program Keahlian Pemasaran' },
  { name: 'Hj. Herlinawati, S.Pd.', position: 'Kepala Program Keahlian Manajemen Perkantoran dan Layanan Bisnis' },
  { name: 'Wida Widianingsih, S.Pd.', position: 'Sekretaris Program Keahlian Manajemen Perkantoran dan Layanan Bisnis' },

  // Halaman 2
  { name: 'Annia Devalusiani NJ, M.Pd.', position: 'Kepala Program Keahlian Teknologi Informasi PPLG' },
  { name: 'Taufik Dzikri Pangestu, S.Pd', position: 'Sekretaris Program Keahlian Teknologi Informasi PPLG' },
  { name: 'Injter Kurnia Syukur, S.T.', position: 'Kepala Program Keahlian Teknologi Informasi TJKT' },
  { name: 'Sri Andani, S.Pd.', position: 'Sekretaris Program Keahlian Teknologi Informasi TJKT' },
  { name: 'Eko Agus Prasetiyo, S.Pd.', position: 'Kepala Program Keahlian Teknik Otomotif' },
  { name: 'Muhamad Abdul Hadi, S.Pd.', position: 'Sekretaris Program Keahlian Teknik Otomotif' },
  { name: 'H. Johan Suhendi, S.T.', position: 'Kepala Program Keahlian Teknik Mesin' },
  { name: 'Ajat Sutiawan, S.Pd.', position: 'Sekretaris Program Keahlian Teknik Mesin' },
  { name: 'Muhammad Usep.S, S.Ds.', position: 'Kepala Program Keahlian Desain Komunikasi Visual' },
  { name: 'Yusuf Ramdhani, S.Pd.', position: 'Sekretaris Program Keahlian Desain Komunikasi Visual' },
  { name: 'Ihat, S.Pd.', position: 'Kepala Program Keahlian Kuliner' },
  { name: 'Arija Fitriyah, S.Pd.', position: 'Kepala Program Keahlian Teknik Logistik' },
  { name: 'Aam Amalia, S.Pd.', position: 'Kepala Laboratorium Program Keahlian AKL/Bank Mini' },
  { name: 'Puteri Amelia, S.Pd.', position: 'Operator Administrasi Keuangan' },
  { name: 'Nana Anggraeni, S.Pd.', position: 'Kepala Laboratorium Program Keahlian Pemasaran/Mimake Mart' },
  { name: 'Tina Mulayyinatun Nisa, S.Pd.', position: 'Laboran Program Keahlian Pemasaran/Mimake Mart bidang Keuangan dan Pembelian' },
  { name: 'Methi Agustine, S.Tr.Log.', position: 'Operator Urusan Keuangan dan EDP Lab. Pemasaran' },
  { name: 'Reza Pratama Putra, S.Pd.', position: 'Laboran Program Keahlian Pemasaran/Mimake Mart Bidang Display dan Cash Register' },
  { name: 'Yola Himayanti', position: 'Operator Bidang Display dan Cash Register Laboratorium Pemasaran' },
  { name: 'Gigin Ginanjar', position: 'Operator Bidang aset dan gudang Laboratorium Pemasaran' },
  { name: 'Firman Ali Budiansyah', position: 'Operator Urusan Aset dan Gudang Laboratorium Pemasaran' },
  { name: 'Aji Wisnu Mulyana, S.AN.', position: 'Operator Urusan Pramuniaga Laboratorium Pemasaran' },
  { name: 'Anggi Widiawati, S.Pd.', position: 'Kepala Laboratorium Program Keahlian Desain Komunikasi Visual' },
  { name: 'Rizky Akbar Juliana', position: 'Operator Urusan Administrasi Unit Produksi Program Keahlian DKV' },
  { name: 'Dhea Anggita Dewi', position: 'Operator Urusan Administrasi Unit Produksi Program Keahlian DKV' },
  { name: 'Nurfitria Dewi, S.IP.', position: 'Kepala Perpustakaan' },
  { name: 'Wiwin Nursadiah, S.I.Kom.', position: 'Operator Perpustakaan' },

  // Halaman 3
  { name: 'Aca Supriatna, S.Pd.', position: 'Wakil Kepala Sekolah Bidang Kesiswaan' },
  { name: 'Iin Solihin, S.Pd., M.Pd', position: 'Staf Wakil Kepala Sekolah Bidang Pembinaan Osis dan Kokurikuler' },
  { name: 'Jelin, S.Pd.I', position: 'Staf Wakil Kepala Sekolah Bidang ISC dan Pembinaan IRMA' },
  { name: 'Wida Kurnia, S.Ds.', position: 'Staf Wakil Kepala Sekolah Bidang Ekstrakurikuler' },
  { name: 'Cahya Nurhaeni, S.Pd.', position: 'Staf Wakil Kepala Sekolah Bidang Kepramukaan dan PKK (Pembinaan Karakter Khusus)' },
  { name: 'Putik Bunga Karnina, S.Pd.', position: 'Staf Wakil Kepala Sekolah Bidang UKS dan Point Karakter Siswa (SIPOIN)' },
  { name: 'Dina Maryati, S.Pd.', position: 'Staf Kepala Sekolah Bidang Bimbingan Konseling (BK)' },
  { name: 'Lutfi Noviandi, S.Sos.', position: 'Koordinator BK Kelas X' },
  { name: 'Septi Mayang S, S.Pd.', position: 'Koordinator BK Kelas X' },
  { name: 'Fajar Harapan, S.Psi., M.Pd', position: 'Koordinator BK Kelas XI' },
  { name: 'Afifatunnisa, S.Sos.', position: 'Koordinator BK Kelas XI' },
  { name: 'Nunung N, S.Sos., M.AP', position: 'Koordinator BK Kelas XII' },
  { name: 'Ratinah, S.Pd.', position: 'Wakil Kepala Sekolah Bidang Hubungan Kerjasama Masyarakat dan Industri' },
  { name: 'Dian Maelani, S.Pd.', position: 'Staf Wakil Kepala Sekolah Bidang BKK dan Penelusuran Alumni' },
  { name: 'Giyan Ramdhani, S.Ds.', position: 'Koordinator Petugas Informasi Pasar Kerja' },
  { name: 'Fippa Insani, S.Pd', position: 'Koordinator Analisa Jabatan' },
  { name: 'Hari Suprayoga, S.T.', position: 'Staf Wakil Kepala Sekolah Bidang PKL' },
  { name: 'Dini Nurmaladewi, S.AN', position: 'Staf Wakil Kepala Sekolah Bidang PKL' },
  { name: 'Hj. Chairzawati, S.E.', position: 'Staf Wakil Kepala Sekolah Bidang Kerumahtanggaan' },
  { name: 'Melly Anggraeni, S.Pd.', position: 'Staf Wakil Kepala Sekolah Bidang Pengembang Media Sosial Instagram (IG)' },
  { name: 'Yayang Willy R, S.Ds', position: 'Staf Wakil Kepala Sekolah Bidang Pengembang Media Sosial FB, Tiktok, Foto, Video dan Editing' },
  { name: 'Guntur Widianto, S.T.', position: 'Staf Wakil Kepala Sekolah Bidang Pengembang Media Sosial Youtube, konten DIBA dan konten Simantap MBG' },
  { name: 'Deni Muliana, S.Pd.', position: 'Wakil Kepala Sekolah Bidang Sarana dan Prasarana' },
  { name: 'Dian Murdiana, S.Pd.', position: 'Staf Wakil Kepala Sekolah Bidang Penanganan Bangunan, Listrik, Air, Keamanan dan Ketertiban' },
  { name: 'Hendra Cipta', position: 'Operator Urusan Bangunan, Listrik, dan Air' },

  // Halaman 4
  { name: 'Apud Mahpudin', position: 'Operator Urusan Layanan Khusus Ketertiban dan Keamanan' },
  { name: 'Beni Margani', position: 'Operator Urusan Layanan Khusus Ketertiban dan Keamanan' },
  { name: 'Budi Budiman', position: 'Operator Urusan Layanan Khusus Ketertiban dan Keamanan' },
  { name: 'Angga Maulana. H', position: 'Operator Urusan Layanan Khusus Ketertiban dan Keamanan' },
  { name: 'Wawan Hermawan', position: 'Operator Urusan Layanan Khusus Ketertiban dan Keamanan' },
  { name: 'Wiharna Febrian', position: 'Operator Urusan Layanan Khusus Ketertiban dan Keamanan' },
  { name: 'Deni Ariyanto, S.Pd.', position: 'Staf Wakil Kepala Sekolah Bidang Lingkungan Hidup (Kebersihan, Penghijauan, Keindahan dan Taman)' },
  { name: 'Tasdim', position: 'Operator Lingkungan Hidup' },
  { name: 'Endang Taufik', position: 'Operator Lingkungan Hidup' },
  { name: 'Yani Suryani', position: 'Operator Lingkungan Hidup' },
  { name: 'Muhamad Dian Maulana', position: 'Operator Lingkungan Hidup' },
  { name: 'Agus Sodikin', position: 'Operator Lingkungan Hidup' },
  { name: 'Ahmad Hakim Makarim', position: 'Staf Wakil Kepala Sekolah Bidang MR, Calibration, SIM dan Pengembang Aplikasi Sekolah' },
  { name: 'Wildan Firmansyah, S.T', position: 'Operator MR, Calibration, SIM dan Pengembang Aplikasi' },
  { name: 'H. Saepul Palah, M.Ag.', position: 'Ketua Lembaga Sertifikasi Profesi' },
  { name: 'Regina Srinita CP, S.Pd', position: 'Koordinator Bidang Manajemen Mutu LSP' },
  { name: 'Isep Rahmanto, S.T', position: 'Koordinator Bidang Sertifikasi LSP' },
  { name: 'Asep Zainal Arifin, S.Pd.I', position: 'Koordinator Bidang Administrasi LSP' },
  { name: 'Putri Maulida Hutami, S.Pd.', position: 'Koordinator Bidang Keuangan LSP' },
];

function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\b(dra|drs|hj|h|ir|s\.si|s\.pd|s\.kom|s\.e|s\.t|s\.ds|s\.sos|m\.pd|m\.m\.pd|m\.ap|m\.ag|m\.si|s\.psi|s\.tr\.t|s\.tr\.log|s\.an|s\.ip|s\.i\.kom|s\.pd\.sd|s\.pd\.i)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findPosition(guruName) {
  const normGuru = normalizeName(guruName);
  for (const sk of skPositions) {
    const normSk = normalizeName(sk.name);
    if (normGuru === normSk || normGuru.includes(normSk) || normSk.includes(normGuru)) {
      return sk.position;
    }
  }
  return 'Guru';
}

async function run() {
  console.log('Loading Excel DAFTARGURUTENDIK2027.xlsx...');
  const excelPath = path.join(__dirname, '..', '..', 'DAFTARGURUTENDIK2027.xlsx');
  const wb = XLSX.readFile(excelPath);
  const ws = wb.Sheets['JUNI'];
  const excelRows = XLSX.utils.sheet_to_json(ws);
  console.log(`Excel loaded: ${excelRows.length} guru/tendik.`);

  // Load existing borrowers from JSON
  const jsonPath = path.join(__dirname, '..', 'database', 'borrowers.json');
  let currentBorrowers = [];
  if (fs.existsSync(jsonPath)) {
    currentBorrowers = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  }
  console.log(`Current borrowers in database/borrowers.json: ${currentBorrowers.length}`);

  // Create lookup by normalized name
  const existingByNormName = new Map();
  for (const b of currentBorrowers) {
    existingByNormName.set(normalizeName(b.name), b);
  }

  const updatedBorrowers = [];
  const processedExistingIds = new Set();

  for (let idx = 0; idx < excelRows.length; idx++) {
    const row = excelRows[idx];
    const rawName = String(row['NAMA GURU'] || '').trim();
    const rawNip = String(row['NIP'] || '').trim();
    const position = findPosition(rawName);
    const normName = normalizeName(rawName);

    const existing = existingByNormName.get(normName);

    let borrowerItem;
    if (existing) {
      processedExistingIds.add(String(existing.id));
      borrowerItem = {
        ...existing,
        name: rawName,
        nip: rawNip,
        officerId: position,
        updatedAt: new Date().toISOString(),
      };
    } else {
      const newId = String(row['NO'] || (Date.now() + idx));
      borrowerItem = {
        id: newId,
        name: rawName,
        nip: rawNip,
        officerId: position,
        rfid: '',
        phone: '',
        gender: 'L',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    updatedBorrowers.push(borrowerItem);
  }

  // Also retain any other borrowers in current list that were not in Excel (e.g. students/other staff)
  for (const b of currentBorrowers) {
    if (!processedExistingIds.has(String(b.id))) {
      // update officerId to Guru if empty
      updatedBorrowers.push({
        ...b,
        officerId: b.officerId || 'Guru',
      });
    }
  }

  console.log(`Total final borrowers: ${updatedBorrowers.length}`);

  // 1. Save to JSON
  fs.writeFileSync(jsonPath, JSON.stringify(updatedBorrowers, null, 2), 'utf-8');
  console.log('Saved updated borrowers to mrc/database/borrowers.json');

  // 2. Save to MySQL
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mrc_db',
  });

  try {
    console.log('Syncing borrowers to MySQL database...');
    for (const b of updatedBorrowers) {
      await pool.query(
        `INSERT INTO borrowers (id, name, nip, officerId, rfid, phone, gender, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           nip = VALUES(nip),
           officerId = VALUES(officerId),
           updatedAt = VALUES(updatedAt)`,
        [
          String(b.id),
          b.name,
          b.nip,
          b.officerId || 'Guru',
          b.rfid || '',
          b.phone || '',
          b.gender || 'L',
          b.createdAt,
          b.updatedAt,
        ]
      );
    }
    console.log('MySQL borrowers table successfully updated!');
  } catch (dbErr) {
    console.error('Failed to sync to MySQL:', dbErr.message);
  } finally {
    await pool.end();
  }

  // 3. Regenerate mrc_database.sql dump
  try {
    const generateScript = path.join(__dirname, 'generate_sql_dump.js');
    if (fs.existsSync(generateScript)) {
      console.log('Regenerating mrc_database.sql with fresh borrowers data...');
      require('./generate_sql_dump.js');
    }
  } catch (genErr) {
    console.error('Failed to regenerate sql dump:', genErr.message);
  }

  console.log('=== All Done Successfully! ===');
}

run().catch(console.error);
