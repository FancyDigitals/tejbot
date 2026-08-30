import { NextResponse } from 'next/server';
import { query } from '../../../lib/db/index.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const res = await query(`SELECT * FROM message_templates ORDER BY category ASC, name ASC`);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}