import { NextResponse } from 'next/server';
import { initWhatsAppBaileys, getWhatsAppSessionStatus } from '../../../../lib/whatsapp/baileys.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const statusObj = getWhatsAppSessionStatus();
    if (statusObj.status === 'DISCONNECTED') {
      initWhatsAppBaileys().catch((err) => console.error('[BAILEYS INIT ERROR]', err));
    }

    return NextResponse.json(getWhatsAppSessionStatus(), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json({ status: 'ERROR', message: error.message }, { status: 500 });
  }
}