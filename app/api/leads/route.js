import { NextResponse } from 'next/server';
import { query } from '../../../lib/db/index.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const res = await query(`
      SELECT 
        l.id,
        cust.name,
        cust.phone,
        l.interested_course,
        l.lead_score,
        l.lead_temperature,
        l.status,
        l.last_contact_at
      FROM leads l
      JOIN customers cust ON l.customer_id = cust.id
      ORDER BY l.lead_score DESC
    `);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}