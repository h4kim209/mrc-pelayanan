const fs = require('fs');
const path = require('path');

// 1. Fix mrc/app/pengembalian/page.tsx
const pengembalianPath = path.join(__dirname, '..', 'app', 'pengembalian', 'page.tsx');
let pengembalian = fs.readFileSync(pengembalianPath, 'utf-8');

// Replace the borrower sub-text that concatenated NIP + officerId
const oldBorrowerBlock = `{loan.borrower?.nip && loan.borrower?.officerId
                              ? \`\${loan.borrower.nip} - \${loan.borrower.officerId}\`
                              : loan.borrower?.nip
                                ? loan.borrower.nip
                                : loan.borrower?.officerId
                                  ? loan.borrower.officerId
                                  : null}`;

pengembalian = pengembalian.replace(oldBorrowerBlock, '{loan.borrower?.nip || "-"}');

// Replace TableHeader to ensure clean sizing
pengembalian = pengembalian.replace(
  `<TableHead>Peminjam</TableHead>
                <TableHead>Barang</TableHead>
                <TableHead>Tanggal Pinjam</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>`,
  `<TableHead className="min-w-[170px]">Peminjam</TableHead>
                <TableHead className="min-w-[170px]">Barang</TableHead>
                <TableHead className="whitespace-nowrap">Tanggal Pinjam</TableHead>
                <TableHead className="whitespace-nowrap">Jatuh Tempo</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap text-right pr-4">Aksi</TableHead>`
);

// Make sure buttons don't wrap and align neatly
pengembalian = pengembalian.replace(
  '<div className="flex items-center gap-2">',
  '<div className="flex items-center justify-end gap-2 whitespace-nowrap">'
);

// Format date cells with whitespace-nowrap
pengembalian = pengembalian.replace(
  '<TableCell className="font-medium">{formatDate(loan.borrowDate)}</TableCell>',
  '<TableCell className="font-medium whitespace-nowrap text-sm">{formatDate(loan.borrowDate)}</TableCell>'
);

pengembalian = pengembalian.replace(
  '<TableCell className="font-medium">\r\n                      <div className={isOverdue(loan.dueDate) ? "text-red-600 dark:text-red-400" : ""}>',
  '<TableCell className="font-medium whitespace-nowrap text-sm">\r\n                      <div className={isOverdue(loan.dueDate) ? "text-red-600 dark:text-red-400" : ""}>'
);
pengembalian = pengembalian.replace(
  '<TableCell className="font-medium">\n                      <div className={isOverdue(loan.dueDate) ? "text-red-600 dark:text-red-400" : ""}>',
  '<TableCell className="font-medium whitespace-nowrap text-sm">\n                      <div className={isOverdue(loan.dueDate) ? "text-red-600 dark:text-red-400" : ""}>'
);

pengembalian = pengembalian.replace(
  '<TableCell>{getStatusBadge(loan)}</TableCell>',
  '<TableCell className="whitespace-nowrap">{getStatusBadge(loan)}</TableCell>'
);

pengembalian = pengembalian.replace(
  '<TableCell>\r\n                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">',
  '<TableCell className="whitespace-nowrap text-right pr-4">\r\n                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">'
);
pengembalian = pengembalian.replace(
  '<TableCell>\n                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">',
  '<TableCell className="whitespace-nowrap text-right pr-4">\n                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">'
);

fs.writeFileSync(pengembalianPath, pengembalian, 'utf-8');
console.log('Fixed pengembalian/page.tsx');

// 2. Fix mrc/app/riwayat/page.tsx
const riwayatPath = path.join(__dirname, '..', 'app', 'riwayat', 'page.tsx');
let riwayat = fs.readFileSync(riwayatPath, 'utf-8');

riwayat = riwayat.replace(oldBorrowerBlock, '{loan.borrower?.nip || "-"}');

riwayat = riwayat.replace(
  '<TableCell className="font-medium">\r\n                      {formatDate(loan.borrowDate)}\r\n                    </TableCell>',
  '<TableCell className="font-medium whitespace-nowrap text-sm">\r\n                      {formatDate(loan.borrowDate)}\r\n                    </TableCell>'
);
riwayat = riwayat.replace(
  '<TableCell className="font-medium">\n                      {formatDate(loan.borrowDate)}\n                    </TableCell>',
  '<TableCell className="font-medium whitespace-nowrap text-sm">\n                      {formatDate(loan.borrowDate)}\n                    </TableCell>'
);

riwayat = riwayat.replace(
  '<TableCell>{getStatusBadge(loan)}</TableCell>',
  '<TableCell className="whitespace-nowrap">{getStatusBadge(loan)}</TableCell>'
);

fs.writeFileSync(riwayatPath, riwayat, 'utf-8');
console.log('Fixed riwayat/page.tsx');
