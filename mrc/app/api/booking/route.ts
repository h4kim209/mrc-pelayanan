import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

function formatBooking(row: any) {
  let items = row.items;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }
  return {
    id: String(row.id),
    borrowerId: row.borrowerId ? String(row.borrowerId) : null,
    borrowerName: row.borrowerName || null,
    items: Array.isArray(items) ? items : [],
    borrowDate: row.borrowDate || "",
    dueDate: row.dueDate || "",
    status: row.status || "pending",
    notes: row.notes || null,
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || null,
  };
}

export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM bookings ORDER BY id DESC");
    const bookings = rows.map(formatBooking);
    return NextResponse.json(bookings);
  } catch (err: any) {
    console.error("Error in GET /api/booking:", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : Date.now().toString();
    const now = new Date().toISOString();

    let borrowerName = body.borrowerName;
    if (!borrowerName && body.borrowerId) {
      try {
        const [bRows] = await pool.query<RowDataPacket[]>("SELECT name FROM borrowers WHERE id = ?", [String(body.borrowerId)]);
        if (bRows.length > 0) {
          borrowerName = bRows[0].name;
        }
      } catch (e) {
        // ignore
      }
    }
    if (!borrowerName) {
      borrowerName = `ID ${body.borrowerId || 'Unknown'}`;
    }

    const newBooking = {
      ...body,
      id,
      borrowerName,
      createdAt: body.createdAt || now,
      updatedAt: now,
    };

    const itemsJson = JSON.stringify(newBooking.items || []);

    await pool.query(
      `INSERT INTO bookings (id, borrowerId, borrowerName, items, borrowDate, dueDate, status, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newBooking.id,
        newBooking.borrowerId ? String(newBooking.borrowerId) : null,
        newBooking.borrowerName,
        itemsJson,
        newBooking.borrowDate || "",
        newBooking.dueDate || "",
        newBooking.status || "pending",
        newBooking.notes || null,
        newBooking.createdAt,
        newBooking.updatedAt,
      ]
    );

    // Also add a notification
    try {
      const itemsLabel = newBooking.items ? (Array.isArray(newBooking.items) ? `${newBooking.items.length} item` : "") : "";
      const message = `Booking baru: ${borrowerName} - ${itemsLabel}`.trim();
      const notifId = Date.now();
      await pool.query(
        `INSERT INTO notifications (id, message, type, \`read\`, timestamp)
         VALUES (?, ?, ?, 0, ?)`,
        [notifId, message, "booking", now]
      );
    } catch (e) {
      console.error("Failed to insert notification for booking", e);
    }

    return NextResponse.json(newBooking, { status: 201 });
  } catch (err: any) {
    console.error("Error in POST /api/booking:", err);
    return NextResponse.json({ error: "Gagal menyimpan booking" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    const [existing] = await pool.query<RowDataPacket[]>("SELECT * FROM bookings WHERE id = ?", [String(body.id)]);
    if (existing.length === 0) {
      return NextResponse.json({ error: "Booking tidak ditemukan" }, { status: 404 });
    }

    const current = formatBooking(existing[0]);
    const updatedAt = new Date().toISOString();
    const updatedBooking = {
      ...current,
      ...body,
      updatedAt,
    };

    const itemsJson = JSON.stringify(updatedBooking.items || []);

    await pool.query(
      `UPDATE bookings
       SET borrowerId = ?, borrowerName = ?, items = ?, borrowDate = ?, dueDate = ?, status = ?, notes = ?, updatedAt = ?
       WHERE id = ?`,
      [
        updatedBooking.borrowerId ? String(updatedBooking.borrowerId) : null,
        updatedBooking.borrowerName || null,
        itemsJson,
        updatedBooking.borrowDate || "",
        updatedBooking.dueDate || "",
        updatedBooking.status || "pending",
        updatedBooking.notes || null,
        updatedBooking.updatedAt,
        updatedBooking.id,
      ]
    );

    return NextResponse.json(updatedBooking, { status: 200 });
  } catch (err: any) {
    console.error("Error in PUT /api/booking:", err);
    return NextResponse.json({ error: "Gagal update booking" }, { status: 500 });
  }
}
