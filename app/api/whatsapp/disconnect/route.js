import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { disconnectWhatsAppSession } from '@/lib/whatsapp/baileys.js';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    // 1. Call Baileys logout
    await disconnectWhatsAppSession();

    // 2. Wipe PostgreSQL settings so the Web UI immediately flips to DISCONNECTED / QR Mode
    await query(`UPDATE settings SET value = 'DISCONNECTED', updated_at = CURRENT_TIMESTAMP WHERE key = 'whatsapp_status'`);
    await query(`UPDATE settings SET value = '', updated_at = CURRENT_TIMESTAMP WHERE key = 'whatsapp_qr'`);
    await query(`UPDATE settings SET value = '', updated_at = CURRENT_TIMESTAMP WHERE key = 'whatsapp_phone'`);
    await query(`UPDATE settings SET value = '', updated_at = CURRENT_TIMESTAMP WHERE key = 'whatsapp_name'`);

    // 3. Delete auth credentials directory from disk
    const sessionPath = path.join(process.cwd(), 'auth_info_baileys');
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log('🗑️ Saved WhatsApp session folder deleted.');
    }

    return NextResponse.json({ success: true, message: 'Disconnected successfully. New QR generating...' });
  } catch (error) {
    console.error('[DISCONNECT ROUTE ERROR]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}