import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { Borrower } from '@/lib/types'
import { RowDataPacket, ResultSetHeader } from 'mysql2'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const idParams = searchParams.getAll('id')

    if (idParams.length === 0) {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM borrowers ORDER BY name ASC')
      return NextResponse.json(rows as Borrower[])
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM borrowers WHERE id IN (?) ORDER BY name ASC',
      [idParams]
    )
    return NextResponse.json(rows as Borrower[])
  } catch (err: any) {
    console.error('Error in GET /api/borrowers:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id = body.id ? String(body.id) : Date.now().toString()
    const now = new Date().toISOString()
    const newBorrower: Borrower = {
      ...body,
      id,
      name: body.name || '',
      nip: body.nip || '',
      officerId: body.officerId || '',
      rfid: body.rfid || '',
      phone: body.phone || '',
      gender: body.gender || 'L',
      createdAt: body.createdAt || now,
      updatedAt: now,
    }

    await pool.query(
      `INSERT INTO borrowers (id, name, nip, officerId, rfid, phone, gender, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newBorrower.id,
        newBorrower.name,
        newBorrower.nip,
        newBorrower.officerId,
        newBorrower.rfid,
        newBorrower.phone,
        newBorrower.gender,
        newBorrower.createdAt,
        newBorrower.updatedAt,
      ]
    )

    return NextResponse.json(newBorrower)
  } catch (err: any) {
    console.error('Error in POST /api/borrowers:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM borrowers WHERE id = ?',
      [String(body.id)]
    )

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const current = existing[0] as Borrower
    const updatedAt = new Date().toISOString()
    const updatedBorrower: Borrower = {
      ...current,
      ...body,
      updatedAt,
    }

    await pool.query(
      `UPDATE borrowers 
       SET name = ?, nip = ?, officerId = ?, rfid = ?, phone = ?, gender = ?, updatedAt = ?
       WHERE id = ?`,
      [
        updatedBorrower.name,
        updatedBorrower.nip,
        updatedBorrower.officerId,
        updatedBorrower.rfid,
        updatedBorrower.phone,
        updatedBorrower.gender,
        updatedBorrower.updatedAt,
        updatedBorrower.id,
      ]
    )

    return NextResponse.json(updatedBorrower)
  } catch (err: any) {
    console.error('Error in PUT /api/borrowers:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM borrowers WHERE id = ?',
      [String(body.id)]
    )

    return NextResponse.json({ success: result.affectedRows > 0 })
  } catch (err: any) {
    console.error('Error in DELETE /api/borrowers:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
