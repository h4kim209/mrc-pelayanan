import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

const defaultLoanTemplate = `📢 Yth. *{name}*,
Anda telah melakukan peminjaman barang dari *MRC*

🗓 Tanggal Pinjam: *{startDate}*
📋 Barang yang Dipinjam:
{items}

📅 Jatuh Tempo: *{dueDate}*
📌 Keperluan: *{purpose}*
{notes}
⚠️ Mohon untuk mengembalikan barang tepat waktu dalam keadaan *lengkap* dan *baik* sesuai saat dipinjam.

_Maintenance Repair Calibration_ 🛠️`;

const defaultReturnTemplate = `Horeeee🎉

✅ Yth. *{name}*,
Terima kasih sudah mengembalikan barang ke *MRC*!

📋 Barang yang dikembalikan:
{items}

🗓 Tanggal Pinjam: *{startDate}*
📌 Keperluan: *{purpose}*
{notes}
⏳ Durasi peminjaman: *{duration}*

Barang sudah diterima dalam keadaan baik dan lengkap yaa. Kalau butuh bantuan atau mau pinjam lagi, silakan hubungi MRC kapan ajaa 😁✨

_Maintenance Repair Calibration_ 🛠️`;

const defaultReminderTemplate = `📢 Yth. *{name}*,
Anda *belum mengembalikan* barang yang dipinjam dari *MRC*

🗓 Tanggal Pinjam: *{startDate}*
📋 Barang yang Dipinjam:
{items}

📅 Jatuh Tempo: *{dueDate}*
📌 Keperluan: *{purpose}*
{notes}
⚠️ Mohon untuk mengembalikan barang tepat waktu dalam keadaan *lengkap* dan *baik* sesuai saat dipinjam.

_Maintenance Repair Calibration_ 🛠️

> _Abaikan pesan ini jika sudah mengembalikan_`;

const defaultSettings = {
  siteName: "MRC Inventory",
  theme: "light",
  admin: {
    username: "admin",
    password: "nesas1965!"
  },
  operator: {
    username: "operator",
    password: "operator123"
  },
  notifications: {
    overdueReminders: true,
    returnReminders: true
  },
  system: {
    defaultLoanDays: 7,
    maxLoanItems: 5,
    returnConfirmation: true,
    borrowConfirmation: false
  },
  messages: {
    aiReply: true,
    loanMessage: true,
    returnMessage: true,
    reminderMessage: true,
    loanTemplate: defaultLoanTemplate,
    returnTemplate: defaultReturnTemplate,
    reminderTemplate: defaultReminderTemplate
  }
};

function mergeSettings(input: any) {
  const inputMessages = typeof input?.messages === "object" ? input.messages : {};
  return {
    ...defaultSettings,
    ...input,
    admin: {
      ...defaultSettings.admin,
      ...(input?.admin || {})
    },
    operator: {
      ...defaultSettings.operator,
      ...(input?.operator || {})
    },
    notifications: {
      ...defaultSettings.notifications,
      ...(input?.notifications || {})
    },
    system: {
      ...defaultSettings.system,
      ...(input?.system || {})
    },
    messages: {
      ...defaultSettings.messages,
      ...inputMessages,
      loanTemplate: inputMessages.loanTemplate !== undefined ? inputMessages.loanTemplate : defaultSettings.messages.loanTemplate,
      returnTemplate: inputMessages.returnTemplate !== undefined ? inputMessages.returnTemplate : defaultSettings.messages.returnTemplate,
      reminderTemplate: inputMessages.reminderTemplate !== undefined ? inputMessages.reminderTemplate : defaultSettings.messages.reminderTemplate,
    }
  };
}

export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT data FROM settings WHERE id = 1");
    if (rows.length > 0 && rows[0].data) {
      let parsed = rows[0].data;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          parsed = {};
        }
      }
      return NextResponse.json(mergeSettings(parsed));
    }
    return NextResponse.json(defaultSettings);
  } catch (e: any) {
    console.error("Error in GET /api/settings:", e);
    return NextResponse.json(defaultSettings);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const merged = mergeSettings(body);
    const jsonStr = JSON.stringify(merged);

    await pool.query(
      `INSERT INTO settings (id, data) VALUES (1, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data)`,
      [jsonStr]
    );

    return NextResponse.json({ success: true, settings: merged });
  } catch (e: any) {
    console.error("Error in PUT /api/settings:", e);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
