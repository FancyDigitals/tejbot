import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const res = await query(
      `SELECT key, value FROM settings WHERE key IN ('whatsapp_status', 'whatsapp_qr', 'whatsapp_phone', 'whatsapp_name')`
    );

    const map = {};
    res.rows.forEach(r => { map[r.key] = r.value; });

    return NextResponse.json({
      status: map.whatsapp_status || 'DISCONNECTED',
      qrCodeDataUrl: map.whatsapp_qr || null,
      connectedPhone: map.whatsapp_phone || null,
      connectedName: map.whatsapp_name || null,
      lastUpdated: Date.now(),
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error) {
    return NextResponse.json({ status: 'DISCONNECTED', error: error.message }, { status: 200 });
  }
}