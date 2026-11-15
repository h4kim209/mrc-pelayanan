import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { Item } from '@/lib/types'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

function formatItem(row: any): Item {
  let serials = row.items
  if (typeof serials === 'string') {
    try {
      serials = JSON.parse(serials)
    } catch {
      serials = []
    }
  }
  return {
    id: String(row.id),
    name: row.name || '',
    category: row.category || '',
    description: row.description || '',
    icon: row.icon || undefined,
    image: row.image || undefined,
    items: Array.isArray(serials) ? serials : [],
    createdAt: row.createdAt || '',
    updatedAt: row.updatedAt || '',
  }
}

export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM items ORDER BY name ASC')
    const items = rows.map(formatItem)
    return NextResponse.json(items)
  } catch (err: any) {
    console.error('Error in GET /api/items:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id = body.id ? String(body.id) : Date.now().toString()
    const now = new Date().toISOString()
    const newItem: Item = {
      ...body,
      id,
      createdAt: body.createdAt || now,
      updatedAt: now,
    }

    const itemsJson = JSON.stringify(newItem.items || [])

    await pool.query(
      `INSERT INTO items (id, name, category, description, icon, image, items, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newItem.id,
        newItem.name || '',
        newItem.category || '',
        newItem.description || '',
        newItem.icon || null,
        newItem.image || null,
        itemsJson,
        newItem.createdAt,
        newItem.updatedAt,
      ]
    )

    return NextResponse.json(newItem)
  } catch (err: any) {
    console.error('Error in POST /api/items:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const [existing] = await pool.query<RowDataPacket[]>('SELECT * FROM items WHERE id = ?', [String(body.id)])
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const current = formatItem(existing[0])
    const updatedAt = new Date().toISOString()
    const updatedItem: Item = {
      ...current,
      ...body,
      updatedAt,
    }

    const itemsJson = JSON.stringify(updatedItem.items || [])

    await pool.query(
      `UPDATE items 
       SET name = ?, category = ?, description = ?, icon = ?, image = ?, items = ?, updatedAt = ?
       WHERE id = ?`,
      [
        updatedItem.name || '',
        updatedItem.category || '',
        updatedItem.description || '',
        updatedItem.icon || null,
        updatedItem.image || null,
        itemsJson,
        updatedItem.updatedAt,
        updatedItem.id,
      ]
    )

    return NextResponse.json(updatedItem)
  } catch (err: any) {
    console.error('Error in PUT /api/items:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM items WHERE id = ?', [String(body.id)])
    return NextResponse.json({ success: result.affectedRows > 0 })
  } catch (err: any) {
    console.error('Error in DELETE /api/items:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
