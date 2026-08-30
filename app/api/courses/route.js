import { NextResponse } from 'next/server';
import { query } from '../../../lib/db/index.js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const res = await query(`SELECT * FROM courses ORDER BY name ASC`);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, level, price, duration, schedule } = await request.json();
    const id = crypto.randomUUID();

    await query(`
      INSERT INTO courses (id, name, level, price, duration, schedule, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
    `, [id, name, level, parseFloat(price) || 0, duration, schedule]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}