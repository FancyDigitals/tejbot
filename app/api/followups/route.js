import { NextResponse } from 'next/server';
import { query } from '../../../lib/db/index.js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const res = await query(`
      SELECT 
        f.id,
        f.scheduled_for,
        f.message_template,
        f.status,
        cust.name AS lead_name,
        cust.phone,
        l.interested_course AS course
      FROM follow_ups f
      JOIN leads l ON f.lead_id = l.id
      JOIN customers cust ON l.customer_id = cust.id
      ORDER BY f.scheduled_for ASC
    `);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { leadId, scheduledFor, messageTemplate } = await request.json();
    const id = crypto.randomUUID();
    
    await query(`
      INSERT INTO follow_ups (id, lead_id, scheduled_for, message_template, status)
      VALUES ($1, $2, $3, $4, 'PENDING')
    `, [id, leadId, scheduledFor, messageTemplate]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}