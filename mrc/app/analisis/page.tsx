import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AnalisisCharts from "./AnalisisCharts";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";
import fs from "fs";
import path from "path";

// Helper fallback untuk membaca data JSON jika database belum terhubung
function getFallbackData(file: string) {
  try {
    const filePath = path.join(process.cwd(), "database", file);
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

async function loadData() {
  try {
    const [borrowersRows] = await pool.query<RowDataPacket[]>("SELECT * FROM borrowers");
    const [itemsRows] = await pool.query<RowDataPacket[]>("SELECT * FROM items");
    const [loansRows] = await pool.query<RowDataPacket[]>("SELECT * FROM loans");

    const items = itemsRows.map((row: any) => {
      let serials = row.items;
      if (typeof serials === "string") {
        try {
          serials = JSON.parse(serials);
        } catch {
          serials = [];
        }
      }
      return {
        ...row,
        items: Array.isArray(serials) ? serials : [],
      };
    });

    const loans = loansRows.map((row: any) => {
      let itemsList = row.items;
      if (typeof itemsList === "string") {
        try {
          itemsList = JSON.parse(itemsList);
        } catch {
          itemsList = [];
        }
      }
      return {
        ...row,
        items: Array.isArray(itemsList) ? itemsList : [],
      };
    });

    return {
      borrowers: borrowersRows as any[],
      items,
      loans,
    };
  } catch (e) {
    console.warn("Could not query MySQL in AnalisisPage, falling back to local JSON:", e);
    return {
      borrowers: getFallbackData("borrowers.json"),
      items: getFallbackData("items.json"),
      loans: getFallbackData("loans.json"),
    };
  }
}

function getMonthYear(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

export const dynamic = "force-dynamic";

export default async function AnalisisPage() {
  const { borrowers, items, loans } = await loadData();

  // 1. 10 besar guru terbanyak minjem
  const borrowerLoanCount: Record<string, number> = {};
  loans.forEach((l: any) => {
    borrowerLoanCount[l.borrowerId] = (borrowerLoanCount[l.borrowerId] || 0) + 1;
  });
  const topBorrowers = Object.entries(borrowerLoanCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({
      ...borrowers.find((b: any) => String(b.id) === String(id)),
      count,
    }));

  // 2. 10 besar guru paling rajin mengembalikan (tepat waktu = returnDate <= dueDate)
  const borrowerReturnOnTime: Record<string, number> = {};
  const borrowerLateReturn: Record<string, number> = {};
  loans.forEach((l: any) => {
    if (l.returnDate && l.dueDate) {
      if (new Date(l.returnDate) <= new Date(l.dueDate)) {
        borrowerReturnOnTime[l.borrowerId] = (borrowerReturnOnTime[l.borrowerId] || 0) + 1;
      } else {
        borrowerLateReturn[l.borrowerId] = (borrowerLateReturn[l.borrowerId] || 0) + 1;
      }
    }
  });
  const topReturners = Object.entries(borrowerReturnOnTime)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({
      ...borrowers.find((b: any) => String(b.id) === String(id)),
      count,
    }));
  // 3. 10 besar guru paling sering terlambat mengembalikan
  const topLateReturners = Object.entries(borrowerLateReturn)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({
      ...borrowers.find((b: any) => String(b.id) === String(id)),
      count,
    }));

  // 3. 10 barang paling sering dipinjam (berdasarkan total quantity)
  const itemLoanCount: Record<string, number> = {};
  loans.forEach((l: any) => {
    if (Array.isArray(l.items)) {
      l.items.forEach((itemObj: any) => {
        if (typeof itemObj === "string") {
          itemLoanCount[itemObj] = (itemLoanCount[itemObj] || 0) + 1;
        } else if (itemObj && itemObj.itemId) {
          itemLoanCount[itemObj.itemId] = (itemLoanCount[itemObj.itemId] || 0) + (itemObj.quantity || 1);
        }
      });
    }
  });
  const topItems = Object.entries(itemLoanCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => {
      const item = items.find((i: any) => String(i.id) === String(id));
      return item ? { ...item, count } : null;
    })
    .filter(Boolean);

  // 4. Statistik total pengembalian
  let returnTotal = 0;
  loans.forEach((l: any) => {
    if (l.returnDate) {
      returnTotal++;
    }
  });

  // 5. Ringkasan (stat cards)
  const activeBorrowers = new Set();
  loans.forEach((l: any) => {
    if (l.status === "dipinjam" && l.borrowerId) activeBorrowers.add(l.borrowerId);
  });
  const statCards = [
    {
      title: "Total Barang",
      value: items.length,
      icon: "Package",
      gradient: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-600/30",
      iconColor: "text-blue-200",
      textColor: "text-blue-100",
    },
    {
      title: "Peminjam Aktif",
      value: activeBorrowers.size,
      icon: "Users",
      gradient: "from-green-500 to-green-600",
      iconBg: "bg-green-600/30",
      iconColor: "text-green-200",
      textColor: "text-green-100",
    },
    {
      title: "Total Transaksi",
      value: loans.length,
      icon: "FileText",
      gradient: "from-yellow-500 to-yellow-600",
      iconBg: "bg-yellow-600/30",
      iconColor: "text-yellow-200",
      textColor: "text-yellow-100",
    },
    {
      title: "Total Pengembalian",
      value: returnTotal,
      icon: "CheckCircle",
      gradient: "from-indigo-500 to-indigo-600",
      iconBg: "bg-indigo-600/30",
      iconColor: "text-indigo-200",
      textColor: "text-indigo-100",
    },
  ];

  // --- Chart Data Processing ---
  const weekdayNames = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
  const hourLabels = Array.from({ length: 24 }, (_, i) => i);
  const loansByHourWeekday: any[] = hourLabels.map((hour) => {
    const row: any = { hour };
    weekdayNames.forEach((wd) => (row[wd] = 0));
    return row;
  });
  loans.forEach((loan: any) => {
    const dateStr = loan.createdAt || loan.borrowDate || loan.loanDate;
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;
    const hour = d.getHours();
    const dayIdx = d.getDay();
    if (dayIdx >= 1 && dayIdx <= 5) {
      const wd = weekdayNames[dayIdx - 1];
      const row = loansByHourWeekday.find((r) => r.hour === hour);
      if (row && wd) row[wd]++;
    }
  });

  // Area chart: loans per date
  const loansByDateMap = new Map<string, number>();
  loans.forEach((loan: any) => {
    const dateStr = loan.createdAt || loan.borrowDate || loan.loanDate;
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;
    const dateOnly = d.toISOString().slice(0, 10);
    loansByDateMap.set(dateOnly, (loansByDateMap.get(dateOnly) || 0) + 1);
  });
  const loansByDate = Array.from(loansByDateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, Peminjaman: count }));

  return (
    <div className="p-4 lg:p-6 max-h-screen overflow-y-auto animate-fade-in duration-200">
      <Card className="mb-6 p-0 bg-transparent border-none shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Analisis & Statistik</CardTitle>
          <CardDescription className="text-sm text-gray-600 dark:text-gray-400">Rangkuman analisis dan statistik lengkap dari seluruh data peminjaman</CardDescription>
        </CardHeader>
      </Card>
      <AnalisisCharts
        statCards={statCards}
        topBorrowers={topBorrowers}
        topReturners={topReturners}
        topLateReturners={topLateReturners}
        topItems={topItems}
        loansByHourWeekday={loansByHourWeekday}
        loansByDate={loansByDate}
        allLoans={loans}
        itemsList={items}
      />
    </div>
  );
}
