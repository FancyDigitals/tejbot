import { NextResponse } from 'next/server';
import { query } from '../../../lib/db/index.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const res = await query(`SELECT id, name, email, role, is_active FROM users ORDER BY name ASC`);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}