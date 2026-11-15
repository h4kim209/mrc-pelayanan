"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft, Edit3, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import type { Loan, Borrower, Item } from "@/lib/types";

interface LoanItemDetail {
  code: string;
  name: string;
  quantity: number;
  condition: string;
}

function BastContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loanId = searchParams?.get("id");

  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [itemsDetails, setItemsDetails] = useState<LoanItemDetail[]>([]);

  // Default Pihak Pertama (bisa diedit jika petugas piket berbeda)
  const [officerName, setOfficerName] = useState("Ahmad Hakim Makarim");
  const [officerNip, setOfficerNip] = useState("200209202025211010");
  const [officerPosition, setOfficerPosition] = useState(
    "Staf Wakil Kepala Sekolah Maintenance Repair Callibration SMK Negeri 1 Subang"
  );
  const [isEditingOfficer, setIsEditingOfficer] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!loanId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [loans, borrowers, items] = await Promise.all([
          api.getLoans(),
          api.getBorrowers(),
          api.getItems(),
        ]);

        const selectedLoan = loans.find((l) => String(l.id) === String(loanId));
        if (selectedLoan) {
          setLoan(selectedLoan);

          const selectedBorrower = borrowers.find(
            (b) => String(b.id) === String(selectedLoan.borrowerId)
          );
          setBorrower(selectedBorrower || null);

          // Build code -> item map
          const serialToItemMap: Record<
            string,
            { name: string; condition: string }
          > = {};
          items.forEach((it) => {
            if (Array.isArray(it.items)) {
              it.items.forEach((s: any) => {
                const condText =
                  s.condition === 1
                    ? "Baik"
                    : s.condition === 0
                    ? "Perlu Perbaikan"
                    : "Rusak";
                if (s.rfidCode) {
                  serialToItemMap[String(s.rfidCode)] = {
                    name: it.name,
                    condition: condText,
                  };
                }
                if (s.sn) {
                  serialToItemMap[String(s.sn)] = {
                    name: it.name,
                    condition: condText,
                  };
                }
              });
            }
          });

          // Build item details list for table
          const details: LoanItemDetail[] = [];
          if (Array.isArray(selectedLoan.items)) {
            selectedLoan.items.forEach((itemObj: any) => {
              if (itemObj.rfidCode) {
                const found = serialToItemMap[String(itemObj.rfidCode)];
                details.push({
                  code: itemObj.rfidCode,
                  name: found?.name || "Barang",
                  quantity: 1,
                  condition: found?.condition || "Baik",
                });
              } else if (itemObj.itemId) {
                const it = items.find((i) => String(i.id) === String(itemObj.itemId));
                details.push({
                  code: it?.id || "-",
                  name: it?.name || "Barang",
                  quantity: itemObj.quantity || 1,
                  condition: "Baik",
                });
              }
            });
          }
          setItemsDetails(details);
        }
      } catch (err) {
        console.error("Gagal memuat data BAST:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [loanId]);

  const handleBack = () => {
    if (typeof window !== "undefined") {
      // Coba tutup tab jika dibuka via new tab / window.open
      if (window.opener) {
        window.close();
      }
      // Navigasi kembali jika masih terbuka
      setTimeout(() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/pengembalian");
        }
      }, 50);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-700">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p>Memuat Dokumen Berita Acara...</p>
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-semibold mb-4">Peminjaman tidak ditemukan!</p>
        <Button onClick={handleBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Button>
      </div>
    );
  }

  // Format dates
  const loanDateObj = loan.borrowDate ? new Date(loan.borrowDate) : new Date();
  const dayName = loanDateObj.toLocaleDateString("id-ID", { weekday: "long" });
  const fullDateStr = loanDateObj.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 py-6 px-2 sm:px-4 text-black">
      {/* Top Action Bar (Hidden when printed) */}
      <div className="max-w-4xl mx-auto mb-6 bg-white dark:bg-gray-900 p-4 rounded-xl shadow border border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          <Button onClick={handleBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali
          </Button>
          <Button
            onClick={() => setIsEditingOfficer(!isEditingOfficer)}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1" />
            {isEditingOfficer ? "Selesai Edit Petugas" : "Ubah Data Petugas"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow"
          >
            <Printer className="w-4 h-4 mr-2" /> Cetak / Download PDF
          </Button>
        </div>
      </div>

      {/* Editor data petugas jika diaktifkan (Hidden when printed) */}
      {isEditingOfficer && (
        <div className="max-w-4xl mx-auto mb-6 bg-blue-50 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-200 dark:border-blue-800 no-print">
          <h4 className="text-xs font-bold uppercase text-blue-800 dark:text-blue-200 mb-2">
            Ubah Data Petugas (PIHAK PERTAMA)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Nama Petugas:</label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="w-full text-xs p-1.5 border rounded bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">NIP Petugas:</label>
              <input
                type="text"
                value={officerNip}
                onChange={(e) => setOfficerNip(e.target.value)}
                className="w-full text-xs p-1.5 border rounded bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Jabatan Petugas:</label>
              <input
                type="text"
                value={officerPosition}
                onChange={(e) => setOfficerPosition(e.target.value)}
                className="w-full text-xs p-1.5 border rounded bg-white dark:bg-gray-800"
              />
            </div>
          </div>
          <Button
            onClick={() => setIsEditingOfficer(false)}
            size="sm"
            className="mt-3 text-xs"
          >
            <Check className="w-3.5 h-3.5 mr-1" /> Simpan Perubahan
          </Button>
        </div>
      )}

      {/* ===================== DOKUMEN CETAK BAST ===================== */}
      <div className="bast-page-wrapper max-w-[210mm] mx-auto bg-white p-[15mm] shadow-lg rounded-sm text-black font-['Times_New_Roman',_Times,_serif] text-[12pt] leading-[1.3]">
        {/* HALAMAN 1 */}
        <div className="bast-sheet">
          {/* Header Kop Surat Gambar Resmi */}
          <div className="w-full mb-3 text-center">
            <img
              src="/logo-surat.jpg"
              alt="Kop Surat SMKN 1 Subang"
              className="w-full max-h-[140px] object-contain mx-auto"
            />
          </div>

          {/* Judul Dokumen */}
          <div className="text-center mb-4">
            <h1 className="text-[14pt] font-bold tracking-wide uppercase inline-block border-b-2 border-black pb-0.5">
              BERITA ACARA SERAH TERIMA PENGGUNAAN BARANG
            </h1>
          </div>

          {/* Pembuka */}
          <p className="mb-2 text-justify">
            Pada hari ini, {dayName}, {fullDateStr}
          </p>
          <p className="mb-3 text-justify">
            Bertempat di Subang, Kami yang bertandatangan di bawah ini :
          </p>

          {/* Pihak Pertama */}
          <div className="mb-3 pl-4">
            <table className="w-full text-[12pt]">
              <tbody>
                <tr>
                  <td className="w-[110px] align-top py-0.5">Nama</td>
                  <td className="w-[15px] align-top py-0.5">:</td>
                  <td className="font-semibold py-0.5">{officerName}</td>
                </tr>
                <tr>
                  <td className="align-top py-0.5">NIP</td>
                  <td className="align-top py-0.5">:</td>
                  <td className="py-0.5">{officerNip}</td>
                </tr>
                <tr>
                  <td className="align-top py-0.5">Jabatan</td>
                  <td className="align-top py-0.5">:</td>
                  <td className="py-0.5 text-justify">{officerPosition}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-1 text-justify">
              Dalam hal ini bertindak untuk dan atas nama SMK Negeri 1 Subang, yang
              selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>.
            </p>
          </div>

          {/* Pihak Kedua */}
          <div className="mb-3 pl-4">
            <table className="w-full text-[12pt]">
              <tbody>
                <tr>
                  <td className="w-[110px] align-top py-0.5">Nama</td>
                  <td className="w-[15px] align-top py-0.5">:</td>
                  <td className="font-semibold py-0.5">
                    {borrower?.name || "Nama Peminjam"}
                  </td>
                </tr>
                <tr>
                  <td className="align-top py-0.5">NIP</td>
                  <td className="align-top py-0.5">:</td>
                  <td className="py-0.5">{borrower?.nip || "-"}</td>
                </tr>
                <tr>
                  <td className="align-top py-0.5">Jabatan</td>
                  <td className="align-top py-0.5">:</td>
                  <td className="py-0.5">
                    {borrower?.officerId || "Guru / Tenaga Pendidik SMK Negeri 1 Subang"}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-1 text-justify">
              Dalam hal ini bertindak untuk dan atas nama Jabatan, yang selanjutnya
              disebut sebagai <strong>PIHAK KEDUA</strong>.
            </p>
          </div>

          <p className="mb-3 text-justify">
            PIHAK PERTAMA dan PIHAK KEDUA sepakat untuk melakukan Serah Terima
            Barang Milik Negara dengan ketentuan sebagai berikut :
          </p>

          {/* Pasal-Pasal */}
          <div className="space-y-2 text-justify text-[11pt] leading-[1.35]">
            <div>
              <div className="font-bold text-center mb-0.5">Pasal 1</div>
              <p>
                PIHAK PERTAMA menyerahkan kepada PIHAK KEDUA dan PIHAK KEDUA
                menerima dari PIHAK PERTAMA Barang Milik Negara sebagaimana tercantum
                dalam lampiran berita acara ini.
              </p>
            </div>

            <div>
              <div className="font-bold text-center mb-0.5">Pasal 2</div>
              <p>
                Sejak Berita Acara ini ditandatangani maka tanggung jawab pengurusan
                barang Milik Negara tersebut beralih dari PIHAK PERTAMA kepada PIHAK
                KEDUA.
              </p>
            </div>

            <div>
              <div className="font-bold text-center mb-0.5">Pasal 3</div>
              <p>
                Sejak Berita Acara ini ditandatangani maka tanggung jawab Perbaikan
                yang di akibatkan Kesalahan Manusia (Human Error) pada barang Milik
                Negara tersebut beralih dari PIHAK PERTAMA kepada PIHAK KEDUA dan
                Biaya Perbaikan di bebankan kepada PIHAK KEDUA.
              </p>
            </div>

            <div>
              <div className="font-bold text-center mb-0.5">Pasal 4</div>
              <p>
                Sejak Berita Acara ini ditandatangani maka tanggung jawab Pengamanan
                Barang Milik Negara tersebut beralih dari PIHAK PERTAMA kepada PIHAK
                KEDUA dan Apabila terjadi kehilangan maka PIHAK KEDUA Wajib mengganti
                dengan Barang sejenis dan Spesifikasi yang sesuai dengan Barang Milik
                Negara yang hilang.
              </p>
            </div>

            <div>
              <div className="font-bold text-center mb-0.5">Pasal 5</div>
              <p>
                Berita Acara ini berlaku mulai tanggal di buatnya Berita Acara
                sampai dengan Akhir Waktu Peminjaman Selesai Sesuai dengan Surat
                Permintaan Peminjaman di buat. Kemudian PIHAK KEDUA mengembalikan
                Barang Milik Negara kepada PIHAK PERTAMA untuk dilakukan
                Pemeriksaan.
              </p>
            </div>

            <div>
              <div className="font-bold text-center mb-0.5">Pasal 6</div>
              <p>
                Waktu Pengembalian / Penarikan Barang Milik Negara dari PIHAK KEDUA
                kepada PIHAK PERTAMA Setelah Masa Berlaku Berita Acara Selesai,
                Pengembalian secara Sukarela, Masa Jabatan telah habis, Pensiun,
                Meninggal, Resign, dipergunakan oleh Sekolah dan lainnya.
              </p>
            </div>

            <div>
              <div className="font-bold text-center mb-0.5">Pasal 7</div>
              <p>
                PIHAK KEDUA tidak diperkenankan Melepas, Merobek, Mencoret, Menutup
                Label / Stiker Inventaris Barang yang ada di Barang Inventaris. Serta
                tidak diperkenankan Menempel Label / Stiker Lain di Barang Inventaris
                Sekolah.
              </p>
            </div>
          </div>

          {/* Tanda Tangan Halaman 1 */}
          <div className="mt-6 text-[11pt]">
            <div className="text-right mb-2">Subang, {fullDateStr}</div>
            <div className="grid grid-cols-2 text-center">
              <div>
                <p className="font-bold mb-16">PIHAK PERTAMA</p>
                <p className="font-bold underline">{officerName}</p>
                <p>NIP. {officerNip}</p>
              </div>
              <div>
                <p className="font-bold mb-16">PIHAK KEDUA</p>
                <p className="font-bold underline">
                  {borrower?.name || "Nama Peminjam"}
                </p>
                <p>NIP. {borrower?.nip || "-"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* PAGE BREAK UNTUK PRINT */}
        <div className="page-break" />

        {/* HALAMAN 2: LAMPIRAN */}
        <div className="bast-sheet mt-8 print:mt-0">
          <div className="mb-4">
            <h2 className="text-[13pt] font-bold text-center uppercase border-b pb-1">
              Lampiran : Berita Acara Serah Terima Barang
            </h2>
          </div>

          {/* Bagian 1: Penyerahan */}
          <div className="mb-6">
            <h3 className="text-[12pt] font-bold mb-1.5">Penyerahan</h3>
            <table className="w-full border-collapse border border-black text-[11pt]">
              <thead>
                <tr className="bg-gray-100 print:bg-transparent">
                  <th className="border border-black px-2 py-1 text-center w-10">No.</th>
                  <th className="border border-black px-2 py-1 text-center w-40">Kode Barang</th>
                  <th className="border border-black px-2 py-1 text-center">Nama Barang</th>
                  <th className="border border-black px-2 py-1 text-center w-20">Jumlah</th>
                  <th className="border border-black px-2 py-1 text-center w-28">Kondisi</th>
                </tr>
              </thead>
              <tbody>
                {itemsDetails.length > 0 ? (
                  itemsDetails.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                      <td className="border border-black px-2 py-1 text-center font-mono text-[10pt]">
                        {item.code}
                      </td>
                      <td className="border border-black px-2 py-1">{item.name}</td>
                      <td className="border border-black px-2 py-1 text-center">{item.quantity}</td>
                      <td className="border border-black px-2 py-1 text-center">{item.condition}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="border border-black px-2 py-2 text-center text-gray-500">
                      Tidak ada detail barang
                    </td>
                  </tr>
                )}
                {/* Baris Keterangan */}
                <tr>
                  <td colSpan={5} className="border border-black px-2 py-1.5">
                    <strong>Keterangan :</strong>{" "}
                    {loan.purpose ? `Keperluan: ${loan.purpose}` : ""}
                    {loan.notes ? ` (${loan.notes})` : ""}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Tanda Tangan Penyerahan */}
            <div className="grid grid-cols-2 text-center mt-4 text-[11pt]">
              <div>
                <p className="font-semibold mb-14">Diserahkan Oleh :</p>
                <p className="font-bold underline">{officerName}</p>
                <p>NIP. {officerNip}</p>
              </div>
              <div>
                <p className="font-semibold mb-14">Di Terima Oleh :</p>
                <p className="font-bold underline">
                  {borrower?.name || "Nama Peminjam"}
                </p>
                <p>NIP. {borrower?.nip || "-"}</p>
              </div>
            </div>
          </div>

          <hr className="border-t-2 border-dashed border-gray-300 my-6 print:border-black" />

          {/* Bagian 2: Pengembalian */}
          <div className="mb-4">
            <h3 className="text-[12pt] font-bold mb-1.5">Pengembalian</h3>
            <table className="w-full border-collapse border border-black text-[11pt]">
              <thead>
                <tr className="bg-gray-100 print:bg-transparent">
                  <th className="border border-black px-2 py-1 text-center w-10">No.</th>
                  <th className="border border-black px-2 py-1 text-center w-40">Kode Barang</th>
                  <th className="border border-black px-2 py-1 text-center">Nama Barang</th>
                  <th className="border border-black px-2 py-1 text-center w-20">Jumlah</th>
                  <th className="border border-black px-2 py-1 text-center w-28">Kondisi</th>
                </tr>
              </thead>
              <tbody>
                {itemsDetails.length > 0 ? (
                  itemsDetails.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                      <td className="border border-black px-2 py-1 text-center font-mono text-[10pt]">
                        {item.code}
                      </td>
                      <td className="border border-black px-2 py-1">{item.name}</td>
                      <td className="border border-black px-2 py-1 text-center">{item.quantity}</td>
                      <td className="border border-black px-2 py-1 text-center">
                        {loan.status === "dikembalikan" ? "Baik" : ""}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="border border-black px-2 py-2 text-center text-gray-500">
                      Tidak ada detail barang
                    </td>
                  </tr>
                )}
                {/* Baris Keterangan */}
                <tr>
                  <td colSpan={5} className="border border-black px-2 py-1.5">
                    <strong>Keterangan :</strong>{" "}
                    {loan.returnDate ? `Dikembalikan tanggal ${new Date(loan.returnDate).toLocaleDateString("id-ID")}` : ""}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Tanda Tangan Pengembalian */}
            <div className="grid grid-cols-2 text-center mt-4 text-[11pt]">
              <div>
                <p className="font-semibold mb-14">Diterima Oleh :</p>
                <p className="font-bold underline">{officerName}</p>
                <p>NIP. {officerNip}</p>
              </div>
              <div>
                <p className="font-semibold mb-14">Dikembalikan Oleh :</p>
                <p className="font-bold underline">
                  {borrower?.name || "Nama Peminjam"}
                </p>
                <p>NIP. {borrower?.nip || "-"}</p>
              </div>
            </div>
          </div>

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
                      src={loan.borrowPhoto?.replace("/uploads/captures/", "/api/captures/")}
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
                      src={loan.returnPhoto?.replace("/uploads/captures/", "/api/captures/")}
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
        </div>
      </div>

      {/* Print CSS Styling */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 15mm 15mm 15mm;
          }
          nav, header, aside, .mobile-nav, [data-sidebar], .no-print, [role="navigation"] {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .bast-page-wrapper {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .page-break {
            page-break-before: always;
            break-before: page;
            height: 0;
            display: block;
          }
          table {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

export default function BastPrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Memuat Dokumen...</div>}>
      <BastContent />
    </Suspense>
  );
}
