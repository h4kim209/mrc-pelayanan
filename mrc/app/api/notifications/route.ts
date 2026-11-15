import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM notifications ORDER BY id DESC LIMIT 100"
    );
    const notifications = rows.map((r) => ({
      id: Number(r.id),
      message: r.message,
      type: r.type,
      read: Boolean(r.read),
      slot: r.slot || undefined,
      timestamp: r.timestamp,
    }));
    return NextResponse.json(notifications);
  } catch (err: any) {
    console.error("Error in GET /api/notifications:", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = Date.now();
    const timestamp = new Date().toISOString();

    await pool.query(
      "INSERT INTO notifications (id, message, type, `read`, slot, timestamp) VALUES (?, ?, ?, 0, ?, ?)",
      [id, body.message || "", body.type || "info", body.slot || null, timestamp]
    );

    return NextResponse.json({ success: true, id, timestamp });
  } catch (err: any) {
    console.error("Error in POST /api/notifications:", err);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (id) {
      await pool.query("UPDATE notifications SET `read` = 1 WHERE id = ?", [id]);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in PATCH /api/notifications:", err);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
