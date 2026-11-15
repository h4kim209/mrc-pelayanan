import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const borrowers = await req.json();
    if (!Array.isArray(borrowers)) {
      return NextResponse.json({ success: false, error: "Expected an array of borrowers" }, { status: 400 });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      for (const b of borrowers) {
        const id = String(b.id || Date.now());
        const now = new Date().toISOString();
        await conn.query(
          `INSERT INTO borrowers (id, name, nip, officerId, rfid, phone, gender, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             nip = VALUES(nip),
             officerId = VALUES(officerId),
             rfid = VALUES(rfid),
             phone = VALUES(phone),
             gender = VALUES(gender),
             updatedAt = VALUES(updatedAt)`,
          [
            id,
            b.name || "",
            b.nip || "",
            b.officerId || "",
            b.rfid || "",
            b.phone || "",
            b.gender || "L",
            b.createdAt || now,
            b.updatedAt || now,
          ]
        );
      }

      await conn.commit();
      return NextResponse.json({ success: true, count: borrowers.length });
    } catch (txError) {
      await conn.rollback();
      throw txError;
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.error("Error in import/borrowers:", err);
    return NextResponse.json({ success: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
