import { NextResponse } from 'next/server';
import { query } from '../../../lib/db/index.js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const res = await query(`SELECT * FROM knowledge_items ORDER BY priority DESC, title ASC`);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { title, category, content, priority } = await request.json();
    const id = crypto.randomUUID();

    await query(`
      INSERT INTO knowledge_items (id, title, category, content, is_published, priority)
      VALUES ($1, $2, $3, $4, TRUE, $5)
    `, [id, title, category, content, parseInt(priority, 10) || 5]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}