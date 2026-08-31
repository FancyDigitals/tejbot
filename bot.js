import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

import { findOrCreateCustomer } from './lib/crm/customers.js';
import { getOrCreateConversation, recordMessage, updateConversationState } from './lib/crm/conversations.js';
import { updateLeadScoreAndStatus } from './lib/crm/leads.js';
import { processCustomerMessageWithAI } from './lib/ai/index.js';
import { CONVERSATION_STATES, SENDER_TYPES } from './lib/constants/statuses.js';
import { query } from './lib/db/index.js';

// 1. Health-check HTTP server so Render Web Service satisfies health check
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('TEJUROLEX GLOBAL WhatsApp Bot is Running 24/7\n');
}).listen(PORT, () => {
  console.log(`🌐 Health-check HTTP server listening on port ${PORT}`);
});

// 2. WhatsApp Baileys Engine
async function startWhatsAppBot() {
  console.log('🚀 Starting TEJUROLEX GLOBAL WhatsApp Automation...');

  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📲 SCAN THIS QR CODE WITH TEJUROLEX WHATSAPP:\n');
      qrcode.generate(qr, { small: true });
      console.log('👉 Open WhatsApp → Settings → Linked Devices → Link a Device');
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️ Connection closed. Reconnecting...', shouldReconnect);
      if (shouldReconnect) {
        startWhatsAppBot();
      }
    } else if (connection === 'open') {
      console.log('\n✅ TEJUROLEX GLOBAL WHATSAPP IS CONNECTED & LIVE!');
      console.log('🤖 AI Auto-Responder is actively monitoring incoming chats.\n');
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