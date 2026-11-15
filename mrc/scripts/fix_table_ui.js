const fs = require('fs');
const path = require('path');

// 1. Update peminjam/page.tsx
const peminjamPath = path.join(__dirname, '..', 'app', 'peminjam', 'page.tsx');
let peminjam = fs.readFileSync(peminjamPath, 'utf-8');

// Replace label & placeholder
peminjam = peminjam.replace('ID Pegawai</label>', 'Jabatan</label>');
peminjam = peminjam.replace('placeholder="12345"', 'placeholder="Contoh: Guru / WKS / Ka. Bengkel"');

// Replace table head
peminjam = peminjam.replace('<TableHead>ID Pegawai</TableHead>', '<TableHead className="min-w-[180px]">Jabatan</TableHead>');

// Replace card overflow
peminjam = peminjam.replace('<div className="card overflow-hidden">', '<div className="card overflow-x-auto">');

// Replace TableCell for borrower.officerId
peminjam = peminjam.replace(
  '<TableCell>{borrower.officerId}</TableCell>',
  `<TableCell className="max-w-[260px]">
                      <span className={cn(
                        "inline-block text-xs font-medium px-2.5 py-1 rounded-md leading-relaxed",
                        borrower.officerId && borrower.officerId !== "Guru"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      )}>
                        {borrower.officerId || "Guru"}
                      </span>
                    </TableCell>`
);

peminjam = peminjam.replace(
  '<TableCell className="font-medium text-gray-900 dark:text-white">{borrower.name}</TableCell>',
  '<TableCell className="font-medium text-gray-900 dark:text-white whitespace-nowrap">{borrower.name}</TableCell>'
);

peminjam = peminjam.replace(
  '<TableCell>{borrower.nip}</TableCell>',
  '<TableCell className="whitespace-nowrap font-mono text-xs">{borrower.nip || "-"}</TableCell>'
);

peminjam = peminjam.replace(
  '<TableCell>{borrower.phone}</TableCell>',
  '<TableCell className="whitespace-nowrap">{borrower.phone || "-"}</TableCell>'
);

peminjam = peminjam.replace(
  '<TableCell>{formatDate(borrower.createdAt)}</TableCell>',
  '<TableCell className="whitespace-nowrap">{formatDate(borrower.createdAt)}</TableCell>'
);

fs.writeFileSync(peminjamPath, peminjam, 'utf-8');
console.log('Fixed mrc/app/peminjam/page.tsx');

// 2. Update booking/page.tsx
const bookingPath = path.join(__dirname, '..', 'app', 'booking', 'page.tsx');
if (fs.existsSync(bookingPath)) {
  let booking = fs.readFileSync(bookingPath, 'utf-8');
  booking = booking.replace(/ID Pegawai: \{borrower\?\.officerId \|\| "-"}/g, 'Jabatan: {borrower?.officerId || "-"}');
  fs.writeFileSync(bookingPath, booking, 'utf-8');
  console.log('Fixed mrc/app/booking/page.tsx');
}

// 3. Update peminjaman/page.tsx
const peminjamanPath = path.join(__dirname, '..', 'app', 'peminjaman', 'page.tsx');
if (fs.existsSync(peminjamanPath)) {
  let peminjaman = fs.readFileSync(peminjamanPath, 'utf-8');
  peminjaman = peminjaman.replace(/<strong>ID Pegawai:<\/strong>/g, '<strong>Jabatan:</strong>');
  peminjaman = peminjaman.replace(/ID Pegawai: \{selectedBorrowerData\.officerId}/g, 'Jabatan: {selectedBorrowerData.officerId}');
  fs.writeFileSync(peminjamanPath, peminjaman, 'utf-8');
  console.log('Fixed mrc/app/peminjaman/page.tsx');
}

// 4. Update pengembalian/page.tsx
const pengembalianPath = path.join(__dirname, '..', 'app', 'pengembalian', 'page.tsx');
if (fs.existsSync(pengembalianPath)) {
  let pengembalian = fs.readFileSync(pengembalianPath, 'utf-8');
  pengembalian = pengembalian.replace(/ID Pegawai: \{detailLoan\.borrower\?\.officerId}/g, 'Jabatan: {detailLoan.borrower?.officerId}');
  fs.writeFileSync(pengembalianPath, pengembalian, 'utf-8');
  console.log('Fixed mrc/app/pengembalian/page.tsx');
}

// 5. Update riwayat/page.tsx
const riwayatPath = path.join(__dirname, '..', 'app', 'riwayat', 'page.tsx');
if (fs.existsSync(riwayatPath)) {
  let riwayat = fs.readFileSync(riwayatPath, 'utf-8');
  riwayat = riwayat.replace(/"ID Pegawai": loan\.borrower\?\.officerId/g, '"Jabatan": loan.borrower?.officerId');
  riwayat = riwayat.replace(/ID Pegawai: \{detailLoan\.borrower\?\.officerId}/g, 'Jabatan: {detailLoan.borrower?.officerId}');
  fs.writeFileSync(riwayatPath, riwayat, 'utf-8');
  console.log('Fixed mrc/app/riwayat/page.tsx');
}

console.log('All UI references successfully aligned to Jabatan!');
