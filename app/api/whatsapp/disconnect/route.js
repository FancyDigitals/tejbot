import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    // Write DISCONNECT_REQUESTED to PostgreSQL settings so bot.js catches it cleanly
    await query(`UPDATE settings SET value = 'DISCONNECT_REQUESTED', updated_at = CURRENT_TIMESTAMP WHERE key = 'whatsapp_status'`);
    await query(`UPDATE settings SET value = '', updated_at = CURRENT_TIMESTAMP WHERE key = 'whatsapp_qr'`);

    return NextResponse.json({ success: true, message: 'Disconnect requested.' });
  } catch (error) {
    console.error('[DISCONNECT ROUTE ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}