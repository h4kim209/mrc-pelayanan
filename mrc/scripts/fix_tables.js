const fs = require('fs');
const path = require('path');

// 1. Fix mrc/app/peminjam/page.tsx
const peminjamPath = path.join(__dirname, '..', 'app', 'peminjam', 'page.tsx');
let peminjamContent = fs.readFileSync(peminjamPath, 'utf-8');

// Replace Table header & body in peminjam
const oldPeminjamTable = `<div className="card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead className="min-w-[180px]">Jabatan</TableHead>
                <TableHead>L/P</TableHead>
                <TableHead>No. HP</TableHead>
                <TableHead>Terdaftar</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>`;

const newPeminjamTable = `<div className="card overflow-hidden">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Nama & NIP</TableHead>
                <TableHead className="w-[28%]">Jabatan</TableHead>
                <TableHead className="w-[6%] text-center">L/P</TableHead>
                <TableHead className="w-[16%]">No. HP</TableHead>
                <TableHead className="w-[12%]">Terdaftar</TableHead>
                <TableHead className="w-[8%] text-right pr-4">Aksi</TableHead>
              </TableRow>
            </TableHeader>`;

peminjamContent = peminjamContent.replace(
  /<div className="card overflow-x-auto">\s*<Table>\s*<TableHeader>[\s\S]*?<\/TableHeader>/m,
  newPeminjamTable
);

// Update table colSpan from 7 to 6
peminjamContent = peminjamContent.replace(
  /<TableCell colSpan=\{7\}/g,
  '<TableCell colSpan={6}'
);

// Update table row cells
const oldRowPattern = /<TableCell className="font-medium text-gray-900 dark:text-white whitespace-nowrap">\{borrower\.name\}<\/TableCell>\s*<TableCell className="whitespace-nowrap font-mono text-xs">\{borrower\.nip \|\| "-"\}<\/TableCell>\s*<TableCell className="max-w-\[260px\]">[\s\S]*?<\/TableCell>\s*<TableCell>\{borrower\.gender === "L" \? "L" : "P"\}<\/TableCell>\s*<TableCell className="whitespace-nowrap">\{borrower\.phone \|\| "-"\}<\/TableCell>\s*<TableCell className="whitespace-nowrap">\{formatDate\(borrower\.createdAt\)\}<\/TableCell>\s*<TableCell>[\s\S]*?<\/TableCell>/m;

const newRowReplacement = `<TableCell className="py-2.5">
                      <div className="font-semibold text-gray-900 dark:text-white leading-tight truncate">{borrower.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{borrower.nip || "-"}</div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className={cn(
                        "inline-block text-xs font-medium px-2 py-0.5 rounded leading-relaxed truncate max-w-full",
                        borrower.officerId && borrower.officerId !== "Guru"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      )}>
                        {borrower.officerId || "Guru"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-center text-xs font-semibold">{borrower.gender === "L" ? "L" : "P"}</TableCell>
                    <TableCell className="py-2.5 text-xs text-gray-700 dark:text-gray-300 font-mono truncate">{borrower.phone || "-"}</TableCell>
                    <TableCell className="py-2.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(borrower.createdAt)}</TableCell>
                    <TableCell className="py-2.5 text-right pr-3">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleEdit(borrower)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingBorrower(borrower)
                            setIsDeleteDialogOpen(true)
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>`;

peminjamContent = peminjamContent.replace(oldRowPattern, newRowReplacement);
fs.writeFileSync(peminjamPath, peminjamContent, 'utf-8');
console.log('Fixed peminjam table layout.');

// 2. Fix mrc/app/pengembalian/page.tsx
const pengembalianPath = path.join(__dirname, '..', 'app', 'pengembalian', 'page.tsx');
let pengContent = fs.readFileSync(pengembalianPath, 'utf-8');

// Update Table headers in pengembalian
pengContent = pengContent.replace(
  /<TableHeader>\s*<TableRow>\s*<TableHead className="min-w-\[170px\]">Peminjam<\/TableHead>[\s\S]*?<\/TableRow>\s*<\/TableHeader>/m,
  `<TableHeader>
              <TableRow>
                <TableHead className="w-[24%]">Peminjam</TableHead>
                <TableHead className="w-[26%]">Barang</TableHead>
                <TableHead className="w-[13%]">Tgl Pinjam</TableHead>
                <TableHead className="w-[13%]">Jatuh Tempo</TableHead>
                <TableHead className="w-[10%]">Status</TableHead>
                <TableHead className="w-[14%] text-right pr-4">Aksi</TableHead>
              </TableRow>
            </TableHeader>`
);

// Update action buttons in pengembalian
const oldActionPattern = /<TableCell className="whitespace-nowrap text-right pr-4">\s*<div className="flex items-center justify-end gap-2 whitespace-nowrap">[\s\S]*?<\/TableCell>/m;

const newActionReplacement = `<TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(\`/print/bast?id=\${loan.id}\`, '_blank');
                          }}
                          variant="outline"
                          size="sm"
                          className="border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs px-2 py-1 h-7 flex items-center font-medium shadow-sm"
                          title="Cetak BAST"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-blue-400" />
                          BAST
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReturningLoan(loan);
                            setIsConfirmOpen(true);
                            setReturningSerials((prev) => ({
                              ...prev,
                              [loan.id]: new Set(
                                loan.itemDetails
                                  .filter((d: any) => d.status === 1 && typeof d.rfidCode === 'string')
                                  .map((d: any) => d.rfidCode as string)
                              ),
                            }));
                          }}
                          className="btn-success text-xs px-2.5 py-1 h-7 flex items-center"
                          title="Tandai Pengembalian"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Kembalikan
                        </Button>
                      </div>
                    </TableCell>`;

pengContent = pengContent.replace(oldActionPattern, newActionReplacement);
fs.writeFileSync(pengembalianPath, pengContent, 'utf-8');
console.log('Fixed pengembalian table layout.');
