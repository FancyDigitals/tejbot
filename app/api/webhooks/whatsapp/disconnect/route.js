import { NextResponse } from 'next/server';
import { disconnectWhatsAppSession, initWhatsAppBaileys } from '../../../../lib/whatsapp/baileys.js';

export async function POST() {
  await disconnectWhatsAppSession();
  setTimeout(() => initWhatsAppBaileys(), 1000);
  return NextResponse.json({ success: true, message: 'Session disconnected. New QR generating.' });
}