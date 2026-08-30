import dotenv from 'dotenv';
dotenv.config();

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

async function startWhatsAppBot() {
  console.log('🚀 Starting TEJUROLEX GLOBAL WhatsApp Automation...');

  // Store session credentials locally in 'auth_info_baileys' folder
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }), // Suppress noise logs
    printQRInTerminal: false,
  });

  // Handle connection events & display QR code
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📲 SCAN THIS QR CODE WITH TEJUROLEX WHATSAPP (Linked Devices):\n');
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

  // Save auth credentials whenever updated
  sock.ev.on('creds.update', saveCreds);

  // Listen for incoming WhatsApp messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      // Ignore messages sent by ourselves or status updates
      if (msg.key.fromMe) continue;
      if (msg.key.remoteJid === 'status@broadcast') continue;
      if (msg.key.remoteJid?.endsWith('@g.us')) continue; // Ignore group chats

      const remoteJid = msg.key.remoteJid;
      const rawPhone = remoteJid.replace('@s.whatsapp.net', '');
      const pushName = msg.pushName || 'Customer';

      // Extract message text
      const messageText =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        '';

      if (!messageText.trim()) continue;

      console.log(`\n📩 [INBOUND] ${pushName} (${rawPhone}): "${messageText}"`);

      try {
        // 1. Find or create customer in database
        const customer = await findOrCreateCustomer(rawPhone, pushName);

        // 2. Check if customer opted out
        if (customer.marketing_opt_out) {
          const lower = messageText.toLowerCase();
          if (!lower.includes('start') && !lower.includes('hello') && !lower.includes('hi')) {
            console.log(`[OPTED OUT] Ignoring message from ${rawPhone}`);
            continue;
          }
          await query(
            `UPDATE customers SET marketing_opt_out = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [customer.id]
          );
        }

        // 3. Find or create conversation
        const conversation = await getOrCreateConversation(customer.id);

        // 4. Record inbound message
        await recordMessage({
          conversationId: conversation.id,
          externalMessageId: msg.key.id,
          direction: 'INBOUND',
          senderType: SENDER_TYPES.CUSTOMER,
          content: messageText,
        });

        // 5. If human staff is actively handling this chat, pause AI
        if (conversation.state === CONVERSATION_STATES.HUMAN_ACTIVE) {
          console.log(`[HUMAN ACTIVE] AI paused for ${rawPhone}`);
          continue;
        }

        // 6. Process message through AI engine (OpenRouter + Knowledge Base)
        console.log(`⚡ Generating AI response for ${pushName}...`);
        const aiResponse = await processCustomerMessageWithAI({
          customer,
          conversation,
          messageText,
        });

        // 7. Update CRM Lead Scoring
        await updateLeadScoreAndStatus(customer.id, {
          intent: aiResponse.intent,
          extractedData: aiResponse.extractedData,
          messageText,
        }).catch(err => console.error('[LEAD UPDATE ERROR]', err.message));

        // 8. Handle human handoff state if triggered
        if (aiResponse.stateChange) {
          await updateConversationState(conversation.id, aiResponse.stateChange);
        }

        // 9. Send WhatsApp reply
        await sock.sendMessage(remoteJid, { text: aiResponse.responseText });
        console.log(`📤 [AI REPLIED] to ${pushName}: "${aiResponse.responseText.substring(0, 70)}..."`);

        // 10. Record outbound message in database
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