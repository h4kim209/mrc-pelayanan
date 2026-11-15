import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { Loan } from '@/lib/types'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

function formatLoan(row: any): Loan {
  let items = row.items
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items)
    } catch {
      items = []
    }
  }
  return {
    id: String(row.id),
    borrowerId: String(row.borrowerId),
    items: Array.isArray(items) ? items : [],
    borrowDate: row.borrowDate || '',
    dueDate: row.dueDate || '',
    returnDate: row.returnDate || undefined,
    status: row.status || 'dipinjam',
    purpose: row.purpose || undefined,
    notes: row.notes || undefined,
    borrowPhoto: row.borrowPhoto || undefined,
    returnPhoto: row.returnPhoto || undefined,
    createdAt: row.createdAt || '',
    updatedAt: row.updatedAt || '',
  }
}

export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM loans ORDER BY id DESC')
    const loans = rows.map(formatLoan)
    return NextResponse.json(loans)
  } catch (err: any) {
    console.error('Error in GET /api/loans:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id = body.id != null ? String(body.id) : Date.now().toString()
    const now = new Date().toISOString()
    const newLoan: Loan = {
      ...body,
      id,
      createdAt: body.createdAt || now,
      updatedAt: now,
    }

    const itemsJson = JSON.stringify(newLoan.items || [])

    await pool.query(
      `INSERT INTO loans (id, borrowerId, items, borrowDate, dueDate, returnDate, status, purpose, notes, borrowPhoto, returnPhoto, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newLoan.id,
        String(newLoan.borrowerId || ''),
        itemsJson,
        newLoan.borrowDate || '',
        newLoan.dueDate || '',
        newLoan.returnDate || null,
        newLoan.status || 'dipinjam',
        newLoan.purpose || null,
        newLoan.notes || null,
        newLoan.borrowPhoto || null,
        newLoan.returnPhoto || null,
        newLoan.createdAt,
        newLoan.updatedAt,
      ]
    )

    return NextResponse.json(newLoan)
  } catch (err: any) {
    console.error('Error in POST /api/loans:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const [existing] = await pool.query<RowDataPacket[]>('SELECT * FROM loans WHERE id = ?', [String(body.id)])
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const current = formatLoan(existing[0])
    const updatedAt = new Date().toISOString()
    const updatedLoan: Loan = {
      ...current,
      ...body,
      updatedAt,
    }

    const itemsJson = JSON.stringify(updatedLoan.items || [])

    await pool.query(
      `UPDATE loans 
       SET borrowerId = ?, items = ?, borrowDate = ?, dueDate = ?, returnDate = ?, status = ?, purpose = ?, notes = ?, borrowPhoto = ?, returnPhoto = ?, updatedAt = ?
       WHERE id = ?`,
      [
        String(updatedLoan.borrowerId || ''),
        itemsJson,
        updatedLoan.borrowDate || '',
        updatedLoan.dueDate || '',
        updatedLoan.returnDate || null,
        updatedLoan.status || 'dipinjam',
        updatedLoan.purpose || null,
        updatedLoan.notes || null,
        updatedLoan.borrowPhoto || null,
        updatedLoan.returnPhoto || null,
        updatedLoan.updatedAt,
        updatedLoan.id,
      ]
    )

    return NextResponse.json(updatedLoan)
  } catch (err: any) {
    console.error('Error in PUT /api/loans:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM loans WHERE id = ?', [String(body.id)])
    return NextResponse.json({ success: result.affectedRows > 0 })
  } catch (err: any) {
    console.error('Error in DELETE /api/loans:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
