import { NextResponse } from 'next/server';
import { query } from '../../../lib/db/index.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const res = await query(`
      SELECT 
        cust.id,
        cust.name,
        cust.phone,
        cust.email,
        cust.created_at,
        (SELECT COUNT(*) FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE customer_id = cust.id)) AS total_messages,
        COALESCE((SELECT status FROM leads WHERE customer_id = cust.id), 'NEW') AS status
      FROM customers cust
      ORDER BY cust.created_at DESC
    `);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}