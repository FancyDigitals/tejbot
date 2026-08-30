import { NextResponse } from 'next/server';
import { initWhatsAppBaileys, getWhatsAppSessionStatus } from '../../../../lib/whatsapp/baileys.js';

export async function GET() {
  // Ensure the engine is initialized
  const statusObj = getWhatsAppSessionStatus();
  if (statusObj.status === 'DISCONNECTED') {
    initWhatsAppBaileys().catch(() => {});
  }

  return NextResponse.json(getWhatsAppSessionStatus(), {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}