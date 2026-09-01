import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import QRCode from 'qrcode';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import qrcodeTerminal from 'qrcode-terminal';
import pino from 'pino';

import { findOrCreateCustomer } from './lib/crm/customers.js';
import { getOrCreateConversation, recordMessage, updateConversationState } from './lib/crm/conversations.js';
import { updateLeadScoreAndStatus } from './lib/crm/leads.js';
import { processCustomerMessageWithAI } from './lib/ai/index.js';
import { CONVERSATION_STATES, SENDER_TYPES } from './lib/constants/statuses.js';
import { query } from './lib/db/index.js';

let activeSock = null;

async function setSetting(key, value) {
  try {
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO settings (id, key, value, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = $3, updated_at = CURRENT_TIMESTAMP`,
      [id, key, value]
    );
  } catch (err) {
    console.error(`[DB SETTING ERROR] ${key}:`, err.message);
  }
}

// HTTP Health Check Server
const PORT = process.env.PORT || 3005;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('TEJUROLEX GLOBAL WhatsApp Bot Engine Running 24/7\n');
});

server.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') {
    console.error('[HTTP ERROR]', err.message);
  }
});

server.listen(PORT, () => {
  console.log(`🌐 Bot HTTP Server running on port ${PORT}`);
});

// Periodically check if Disconnect was triggered from Web UI
setInterval(async () => {
  try {
    const res = await query(`SELECT value FROM settings WHERE key = 'whatsapp_status' LIMIT 1`);
    const status = res.rows[0]?.value;

    if (status === 'DISCONNECTED' && activeSock) {
      console.log('⚠️ Disconnect requested from Web UI. Cleaning session & restarting for new QR...');
      try {
        await activeSock.logout();
      } catch {}
      activeSock = null;

      const sessionPath = path.join(process.cwd(), 'auth_info_baileys');
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }

      startWhatsAppBot();
    }
  } catch {}
}, 4000);

async function startWhatsAppBot() {
  console.log('🚀 Starting TEJUROLEX GLOBAL WhatsApp Automation...');
  await setSetting('whatsapp_status', 'CONNECTING');

  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  activeSock = sock;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📲 FRESH QR CODE GENERATED:\n');
      qrcodeTerminal.generate(qr, { small: true });

      try {
        const qrDataUrl = await QRCode.toDataURL(qr, {
          margin: 2,
          width: 320,
          color: { dark: '#111111', light: '#FFFFFF' }
        });
        await setSetting('whatsapp_qr', qrDataUrl);
        await setSetting('whatsapp_status', 'SCAN_QR');
      } catch (err) {
        console.error('[QR CONVERT ERROR]', err);
      }
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error)?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      activeSock = null;
      await setSetting('whatsapp_status', 'DISCONNECTED');
      await setSetting('whatsapp_qr', '');
      await setSetting('whatsapp_phone', '');
      await setSetting('whatsapp_name', '');

      if (isLoggedOut) {
        const sessionPath = path.join(process.cwd(), 'auth_info_baileys');
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
      }

      console.log('⚠️ Connection closed. Reconnecting...');
      setTimeout(() => startWhatsAppBot(), 3000);
    } else if (connection === 'open') {
      const phone = sock.user?.id ? sock.user.id.split(':')[0] : 'Unknown';
      const name = sock.user?.name || 'TEJUROLEX GLOBAL';

      await setSetting('whatsapp_status', 'CONNECTED');
      await setSetting('whatsapp_qr', '');
      await setSetting('whatsapp_phone', phone);
      await setSetting('whatsapp_name', name);

      console.log(`\n✅ TEJUROLEX WHATSAPP CONNECTED: +${phone} (${name})`);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (msg.key.remoteJid === 'status@broadcast') continue;
      if (msg.key.remoteJid?.endsWith('@g.us')) continue;

      const remoteJid = msg.key.remoteJid;
      const rawPhone = remoteJid.replace('@s.whatsapp.net', '');
      const pushName = msg.pushName || 'Customer';

      const messageText =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        '';

      if (!messageText.trim()) continue;

      console.log(`\n📩 [INBOUND] ${pushName} (${rawPhone}): "${messageText}"`);

      try {
        const customer = await findOrCreateCustomer(rawPhone, pushName);

        if (customer.marketing_opt_out) {
          const lower = messageText.toLowerCase();
          if (!lower.includes('start') && !lower.includes('hello') && !lower.includes('hi')) {
            continue;
          }
          await query(
            `UPDATE customers SET marketing_opt_out = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [customer.id]
          );
        }

        const conversation = await getOrCreateConversation(customer.id);

        await recordMessage({
          conversationId: conversation.id,
          externalMessageId: msg.key.id,
          direction: 'INBOUND',
          senderType: SENDER_TYPES.CUSTOMER,
          content: messageText,
        });

        if (conversation.state === CONVERSATION_STATES.HUMAN_ACTIVE) {
          console.log(`[HUMAN ACTIVE] AI paused for ${rawPhone}`);
          continue;
        }

        console.log(`⚡ Generating AI response for ${pushName}...`);
        const aiResponse = await processCustomerMessageWithAI({
          customer,
          conversation,
          messageText,
        });

        await updateLeadScoreAndStatus(customer.id, {
          intent: aiResponse.intent,
          extractedData: aiResponse.extractedData,
          messageText,
        }).catch(err => console.error('[LEAD UPDATE ERROR]', err.message));

        if (aiResponse.stateChange) {
          await updateConversationState(conversation.id, aiResponse.stateChange);
        }

        await sock.sendMessage(remoteJid, { text: aiResponse.responseText });
        console.log(`📤 [AI REPLIED] to ${pushName}`);

        await recordMessage({
          conversationId: conversation.id,
          direction: 'OUTBOUND',
          senderType: SENDER_TYPES.AI,
          content: aiResponse.responseText,
          intent: aiResponse.intent,
        });

      } catch (err) {
        console.error('❌ Error processing message:', err.message);
      }
    }
  });
}

startWhatsAppBot();