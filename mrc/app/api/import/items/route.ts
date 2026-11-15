import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const items = await req.json();
    if (!Array.isArray(items)) {
      return NextResponse.json({ success: false, error: "Expected an array of items" }, { status: 400 });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      for (const it of items) {
        const id = String(it.id || Date.now());
        const now = new Date().toISOString();
        const itemsJson = JSON.stringify(it.items || []);

        await conn.query(
          `INSERT INTO items (id, name, category, description, icon, image, items, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             category = VALUES(category),
             description = VALUES(description),
             icon = VALUES(icon),
             image = VALUES(image),
             items = VALUES(items),
             updatedAt = VALUES(updatedAt)`,
          [
            id,
            it.name || "",
            it.category || "",
            it.description || "",
            it.icon || null,
            it.image || null,
            itemsJson,
            it.createdAt || now,
            it.updatedAt || now,
          ]
        );
      }

      await conn.commit();
      return NextResponse.json({ success: true, count: items.length });
    } catch (txError) {
      await conn.rollback();
      throw txError;
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.error("Error in import/items:", err);
    return NextResponse.json({ success: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
