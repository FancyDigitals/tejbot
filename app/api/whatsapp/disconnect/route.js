import { NextResponse } from 'next/server';
import { disconnectWhatsAppSession, initWhatsAppBaileys } from '@/lib/whatsapp/baileys.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    await disconnectWhatsAppSession();
    setTimeout(() => initWhatsAppBaileys().catch(() => {}), 1000);
    return NextResponse.json({ success: true, message: 'Session disconnected. New QR generating.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}