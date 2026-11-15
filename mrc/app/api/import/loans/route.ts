import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const loans = await req.json();
    if (!Array.isArray(loans)) {
      return NextResponse.json({ success: false, error: "Expected an array of loans" }, { status: 400 });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      for (const l of loans) {
        const id = String(l.id || Date.now());
        const now = new Date().toISOString();
        const itemsJson = JSON.stringify(l.items || []);

        await conn.query(
          `INSERT INTO loans (id, borrowerId, items, borrowDate, dueDate, returnDate, status, purpose, notes, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             borrowerId = VALUES(borrowerId),
             items = VALUES(items),
             borrowDate = VALUES(borrowDate),
             dueDate = VALUES(dueDate),
             returnDate = VALUES(returnDate),
             status = VALUES(status),
             purpose = VALUES(purpose),
             notes = VALUES(notes),
             updatedAt = VALUES(updatedAt)`,
          [
            id,
            String(l.borrowerId || ""),
            itemsJson,
            l.borrowDate || "",
            l.dueDate || "",
            l.returnDate || null,
            l.status || "dipinjam",
            l.purpose || null,
            l.notes || null,
            l.createdAt || now,
            l.updatedAt || now,
          ]
        );
      }

      await conn.commit();
      return NextResponse.json({ success: true, count: loans.length });
    } catch (txError) {
      await conn.rollback();
      throw txError;
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.error("Error in import/loans:", err);
    return NextResponse.json({ success: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
