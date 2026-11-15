const fs = require('fs');
const path = require('path');

// 1. Update mrc/app/peminjaman/page.tsx
const peminjamanPath = path.join(__dirname, '..', 'app', 'peminjaman', 'page.tsx');
let peminjaman = fs.readFileSync(peminjamanPath, 'utf-8');

if (!peminjaman.includes('WebcamCapture')) {
  // Add import
  peminjaman = peminjaman.replace(
    'import SerialAutocomplete from "./SerialAutocomplete";',
    'import SerialAutocomplete from "./SerialAutocomplete";\nimport WebcamCapture from "@/components/ui/webcam-capture";'
  );

  // Add state
  peminjaman = peminjaman.replace(
    '  const [notes, setNotes] = useState("");',
    '  const [notes, setNotes] = useState("");\n  const [borrowPhoto, setBorrowPhoto] = useState<string | null>(null);'
  );

  // Add borrowPhoto to loanData
  peminjaman = peminjaman.replace(
    '        notes: notes || undefined,\n      };',
    '        notes: notes || undefined,\n        borrowPhoto: borrowPhoto || undefined,\n      };'
  );

  // Add reset
  peminjaman = peminjaman.replace(
    '      setNotes("");\n      setBorrowerSearch("");',
    '      setNotes("");\n      setBorrowPhoto(null);\n      setBorrowerSearch("");'
  );

  // Add WebcamCapture component in JSX
  const webcamJSX = `                      {/* Foto Bukti Penyerahan Barang (Webcam) */}
                      <div className="pt-2">
                        <WebcamCapture
                          onPhotoCaptured={(url) => setBorrowPhoto(url)}
                          initialPhotoUrl={borrowPhoto}
                          captureType="borrow"
                          label="Foto Bukti Penyerahan Barang (Webcam)"
                          helperText="Ambil foto serah terima barang bersama peminjam sebagai dokumentasi BAST."
                        />
                      </div>
`;

  peminjaman = peminjaman.replace(
    '                      <div className="flex justify-end pt-2">\n                        {/* Submit Button */}',
    webcamJSX + '                      <div className="flex justify-end pt-2">\n                        {/* Submit Button */}'
  );

  fs.writeFileSync(peminjamanPath, peminjaman, 'utf-8');
  console.log('peminjaman/page.tsx updated with WebcamCapture');
}

// 2. Update mrc/app/pengembalian/page.tsx
const pengembalianPath = path.join(__dirname, '..', 'app', 'pengembalian', 'page.tsx');
let pengembalian = fs.readFileSync(pengembalianPath, 'utf-8');

if (!pengembalian.includes('WebcamCapture')) {
  // Add import
  pengembalian = pengembalian.replace(
    'import { CheckCircle, XCircle, Package, Clock, Laptop, Cable, Projector, HdmiPort, Plug, Mouse, Tablet, Printer, Monitor, Keyboard, Speaker, Presentation, MicVocal, X, Search, Filter, User } from "lucide-react"',
    'import { CheckCircle, XCircle, Package, Clock, Laptop, Cable, Projector, HdmiPort, Plug, Mouse, Tablet, Printer, Monitor, Keyboard, Speaker, Presentation, MicVocal, X, Search, Filter, User, Camera } from "lucide-react"\nimport WebcamCapture from "@/components/ui/webcam-capture"'
  );

  // Add state
  pengembalian = pengembalian.replace(
    '  const [isConfirmOpen, setIsConfirmOpen] = useState(false)',
    '  const [isConfirmOpen, setIsConfirmOpen] = useState(false)\n  const [returnPhoto, setReturnPhoto] = useState<string | null>(null)'
  );

  // In handleReturn: add returnPhoto to payload
  pengembalian = pengembalian.replace(
    '        status: allReturned ? "dikembalikan" : "dipinjam",\n        returnDate: allReturned ? new Date().toISOString() : undefined,',
    '        status: allReturned ? "dikembalikan" : "dipinjam",\n        returnDate: allReturned ? new Date().toISOString() : undefined,\n        returnPhoto: returnPhoto || undefined,'
  );

  // In handleReturn reset
  pengembalian = pengembalian.replace(
    '    setIsConfirmOpen(false)\n    setReturningLoan(null)',
    '    setIsConfirmOpen(false)\n    setReturningLoan(null)\n    setReturnPhoto(null)'
  );

  // In return dialog: add WebcamCapture
  const returnWebcamJSX = `              {/* Foto Bukti Pengembalian Barang (Webcam) */}
              <div className="pt-2">
                <WebcamCapture
                  onPhotoCaptured={(url) => setReturnPhoto(url)}
                  initialPhotoUrl={returnPhoto}
                  captureType="return"
                  label="Foto Bukti Kondisi Barang (Webcam)"
                  helperText="Ambil foto kondisi fisik barang saat dikembalikan sebagai bukti serah terima."
                />
              </div>
`;

  pengembalian = pengembalian.replace(
    '            </div>\n          )}\n          <AlertDialogFooter>',
    '            </div>\n          )}\n' + returnWebcamJSX + '          <AlertDialogFooter>'
  );

  // In detail modal: add Documentation photos section
  const detailPhotoJSX = `
                          {/* Bukti Foto Serah Terima (Webcam) */}
                          {(detailLoan.borrowPhoto || detailLoan.returnPhoto) && (
                            <div className="rounded-lg bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                              <div className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Camera className="w-4 h-4 text-accent-600" />
                                <span>Dokumentasi Bukti Fisik Serah Terima</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {detailLoan.borrowPhoto && (
                                  <div>
                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                      Foto Saat Peminjaman
                                    </div>
                                    <a href={detailLoan.borrowPhoto} target="_blank" rel="noreferrer" className="block relative aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity group">
                                      <img src={detailLoan.borrowPhoto} alt="Bukti Peminjaman" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity">
                                        Klik untuk perbesar
                                      </div>
                                    </a>
                                  </div>
                                )}
                                {detailLoan.returnPhoto && (
                                  <div>
                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                      Foto Saat Pengembalian
                                    </div>
                                    <a href={detailLoan.returnPhoto} target="_blank" rel="noreferrer" className="block relative aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity group">
                                      <img src={detailLoan.returnPhoto} alt="Bukti Pengembalian" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity">
                                        Klik untuk perbesar
                                      </div>
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
`;

  pengembalian = pengembalian.replace(
    '                          </div>\n                        </div>\n                      )}\n                    </div>\n                    <AlertDialogFooter className="mt-6 flex flex-row justify-between items-center w-full">',
    '                          </div>\n' + detailPhotoJSX + '                        </div>\n                      )}\n                    </div>\n                    <AlertDialogFooter className="mt-6 flex flex-row justify-between items-center w-full">'
  );

  fs.writeFileSync(pengembalianPath, pengembalian, 'utf-8');
  console.log('pengembalian/page.tsx updated with WebcamCapture');
}

// 3. Update mrc/app/riwayat/page.tsx for detail modal
const riwayatPath = path.join(__dirname, '..', 'app', 'riwayat', 'page.tsx');
let riwayat = fs.readFileSync(riwayatPath, 'utf-8');

if (!riwayat.includes('Dokumentasi Bukti Fisik Serah Terima')) {
  if (!riwayat.includes('Camera')) {
    riwayat = riwayat.replace(
      'import { CheckCircle, XCircle, Package, Clock, Laptop, Cable, Projector, HdmiPort, Plug, Mouse, Tablet, Printer, Monitor, Keyboard, Speaker, Presentation, MicVocal, X, Search, Filter, User }',
      'import { CheckCircle, XCircle, Package, Clock, Laptop, Cable, Projector, HdmiPort, Plug, Mouse, Tablet, Printer, Monitor, Keyboard, Speaker, Presentation, MicVocal, X, Search, Filter, User, Camera }'
    );
  }

  const detailPhotoJSX2 = `
                          {/* Bukti Foto Serah Terima (Webcam) */}
                          {(detailLoan.borrowPhoto || detailLoan.returnPhoto) && (
                            <div className="rounded-lg bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                              <div className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Camera className="w-4 h-4 text-accent-600" />
                                <span>Dokumentasi Bukti Fisik Serah Terima</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {detailLoan.borrowPhoto && (
                                  <div>
                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                      Foto Saat Peminjaman
                                    </div>
                                    <a href={detailLoan.borrowPhoto} target="_blank" rel="noreferrer" className="block relative aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity group">
                                      <img src={detailLoan.borrowPhoto} alt="Bukti Peminjaman" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity">
                                        Klik untuk perbesar
                                      </div>
                                    </a>
                                  </div>
                                )}
                                {detailLoan.returnPhoto && (
                                  <div>
                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                      Foto Saat Pengembalian
                                    </div>
                                    <a href={detailLoan.returnPhoto} target="_blank" rel="noreferrer" className="block relative aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity group">
                                      <img src={detailLoan.returnPhoto} alt="Bukti Pengembalian" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity">
                                        Klik untuk perbesar
                                      </div>
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
`;

  riwayat = riwayat.replace(
    '                          </div>\n                        </div>\n                      )}\n                    </div>\n                    <AlertDialogFooter className="mt-6 flex flex-row justify-between items-center w-full">',
    '                          </div>\n' + detailPhotoJSX2 + '                        </div>\n                      )}\n                    </div>\n                    <AlertDialogFooter className="mt-6 flex flex-row justify-between items-center w-full">'
  );

  fs.writeFileSync(riwayatPath, riwayat, 'utf-8');
  console.log('riwayat/page.tsx updated with detail photos');
}

// 4. Update mrc/app/print/bast/page.tsx for BAST documentation
const bastPath = path.join(__dirname, '..', 'app', 'print', 'bast', 'page.tsx');
let bast = fs.readFileSync(bastPath, 'utf-8');

if (!bast.includes('Dokumentasi Bukti Serah Terima Fisik')) {
  const bastPhotoJSX = `
          {/* Dokumentasi Foto Serah Terima Fisik (Webcam Capture) */}
          {(loan.borrowPhoto || loan.returnPhoto) && (
            <div className="mt-6 pt-4 border-t border-black">
              <h3 className="text-[11pt] font-bold uppercase mb-2 text-center">
                Dokumentasi Bukti Serah Terima Fisik
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {loan.borrowPhoto ? (
                  <div className="border border-black p-1 text-center">
                    <img
                      src={loan.borrowPhoto}
                      alt="Bukti Penyerahan"
                      className="w-full h-36 object-cover mb-1 border border-gray-300"
                    />
                    <p className="text-[9pt] font-semibold">Bukti Penyerahan Barang (Peminjaman)</p>
                  </div>
                ) : (
                  <div className="border border-black p-4 text-center flex items-center justify-center text-gray-400 text-xs">
                    (Tidak ada foto penyerahan)
                  </div>
                )}
                {loan.returnPhoto ? (
                  <div className="border border-black p-1 text-center">
                    <img
                      src={loan.returnPhoto}
                      alt="Bukti Pengembalian"
                      className="w-full h-36 object-cover mb-1 border border-gray-300"
                    />
                    <p className="text-[9pt] font-semibold">Bukti Pengembalian Barang</p>
                  </div>
                ) : (
                  <div className="border border-dashed border-gray-400 p-4 text-center flex items-center justify-center text-gray-400 text-xs">
                    (Foto pengembalian akan dilampirkan setelah barang kembali)
                  </div>
                )}
              </div>
            </div>
          )}
`;

  bast = bast.replace(
    '            </div>\n          </div>\n        </div>\n      </div>\n\n      {/* Print CSS Styling */}',
    '            </div>\n          </div>\n' + bastPhotoJSX + '        </div>\n      </div>\n\n      {/* Print CSS Styling */}'
  );

  fs.writeFileSync(bastPath, bast, 'utf-8');
  console.log('print/bast/page.tsx updated with BAST photo attachment');
}
