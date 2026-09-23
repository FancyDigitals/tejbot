import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db/index.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    const result = await query(`
      SELECT id, title, category, content, priority
      FROM knowledge_items
      WHERE is_published = TRUE
      ORDER BY priority DESC, title ASC
    `);

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[KNOWLEDGE SYNC]', error);

    return NextResponse.json(
      { error: 'Failed to sync knowledge base' },
      { status: 500 }
    );
  }
}