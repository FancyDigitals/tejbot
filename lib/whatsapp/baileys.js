/**
 * TEJUROLEX GLOBAL — Web-Enabled Baileys WhatsApp Engine
 * Manages socket lifecycle, QR code generation for the Web UI, and AI auto-replies.
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';

import { findOrCreateCustomer } from '../crm/customers.js';
import { getOrCreateConversation, recordMessage, updateConversationState } from '../crm/conversations.js';
import { updateLeadScoreAndStatus } from '../crm/leads.js';
import { processCustomerMessageWithAI } from '../ai/index.js';
import { CONVERSATION_STATES, SENDER_TYPES } from '../constants/statuses.js';
import { query } from '../db/index.js';

// Global Singleton State for the Next.js process
let globalState = global._tejurolex_wa_state || {
  sock: null,
  status: 'DISCONNECTED', // 'DISCONNECTED' | 'SCAN_QR' | 'CONNECTING' | 'CONNECTED'
  qrCodeDataUrl: null,
  connectedPhone: null,
  connectedName: null,
  lastUpdated: Date.now(),
};

global._tejurolex_wa_state = globalState;

export function getWhatsAppSessionStatus() {
  return {
    status: globalState.status,
    qrCodeDataUrl: globalState.qrCodeDataUrl,
    connectedPhone: globalState.connectedPhone,
    connectedName: globalState.connectedName,
    lastUpdated: globalState.lastUpdated,
  };
}

export async function initWhatsAppBaileys() {
  if (globalState.sock && globalState.status === 'CONNECTED') {
    return globalState;
  }

  try {
    globalState.status = 'CONNECTING';
    globalState.lastUpdated = Date.now();

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
    });

    globalState.sock = sock;

    // Handle connection events
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Convert raw QR string to Base64 image URL for the browser UI
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, {
            margin: 2,
            width: 320,
            color: { dark: '#111111', light: '#FFFFFF' }
          });
          globalState.status = 'SCAN_QR';
          globalState.qrCodeDataUrl = qrDataUrl;
          globalState.lastUpdated = Date.now();
        } catch (err) {
          console.error('[QR GENERATE ERROR]', err);
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;

        globalState.status = 'DISCONNECTED';
        globalState.qrCodeDataUrl = null;
        globalState.connectedPhone = null;
        globalState.lastUpdated = Date.now();

        if (!isLoggedOut) {
          console.log('🔄 Reconnecting WhatsApp Socket...');
          setTimeout(() => initWhatsAppBaileys(), 3000);
        } else {
          console.log('⚠️ Logged out. Ready for new QR scan.');
        }
      } else if (connection === 'open') {
        const phone = sock.user?.id ? sock.user.id.split(':')[0] : 'Unknown';
        const name = sock.user?.name || 'Tejurolex Global Business';

        globalState.status = 'CONNECTED';
        globalState.qrCodeDataUrl = null;
        globalState.connectedPhone = phone;
        globalState.connectedName = name;
        globalState.lastUpdated = Date.now();

        console.log(`✅ WhatsApp Connected to: +${phone} (${name})`);
      }
    });

    // Save auth credentials
    sock.ev.on('creds.update', saveCreds);

    // Incoming messages listener
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        if (msg.key.remoteJid === 'status@broadcast') continue;
        if (msg.key.remoteJid?.endsWith('@g.us')) continue; // Skip groups

        const remoteJid = msg.key.remoteJid;
        const rawPhone = remoteJid.replace('@s.whatsapp.net', '');
        const pushName = msg.pushName || 'Customer';

        const messageText =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          '';

        if (!messageText.trim()) continue;

        console.log(`📩 [INBOUND WA] ${pushName} (${rawPhone}): "${messageText}"`);

        try {
          // 1. Identify or create customer
          const customer = await findOrCreateCustomer(rawPhone, pushName);

          // 2. Check marketing opt-out
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

          // 3. Conversation
          const conversation = await getOrCreateConversation(customer.id);

          // 4. Record inbound message
          await recordMessage({
            conversationId: conversation.id,
            externalMessageId: msg.key.id,
            direction: 'INBOUND',
            senderType: SENDER_TYPES.CUSTOMER,
            content: messageText,
          });

          // 5. Check if Human Agent is active
          if (conversation.state === CONVERSATION_STATES.HUMAN_ACTIVE) {
            console.log(`[HUMAN ACTIVE] Skipping AI for ${rawPhone}`);
            continue;
          }

          // 6. Process with AI
          const aiResponse = await processCustomerMessageWithAI({
            customer,
            conversation,
            messageText,
          });

          // 7. Update Lead CRM
          await updateLeadScoreAndStatus(customer.id, {
            intent: aiResponse.intent,
            extractedData: aiResponse.extractedData,
            messageText,
          }).catch(err => console.error('[LEAD UPDATE ERROR]', err.message));

          // 8. Human handoff state change
          if (aiResponse.stateChange) {
            await updateConversationState(conversation.id, aiResponse.stateChange);
          }

          // 9. Send WhatsApp reply
          await sock.sendMessage(remoteJid, { text: aiResponse.responseText });
          console.log(`📤 [AI AUTO-REPLIED] to ${pushName}`);

          // 10. Record outbound message
          await recordMessage({
            conversationId: conversation.id,
            direction: 'OUTBOUND',
            senderType: SENDER_TYPES.AI,
            content: aiResponse.responseText,
            intent: aiResponse.intent,
          });

        } catch (err) {
          console.error('[WA MESSAGE HANDLER ERROR]', err);
        }
      }
    });

  } catch (err) {
    console.error('[INIT BAILEYS ERROR]', err);
    globalState.status = 'DISCONNECTED';
  }

  return globalState;
}

export async function disconnectWhatsAppSession() {
  if (globalState.sock) {
    try {
      await globalState.sock.logout();
    } catch {}
  }
  globalState.sock = null;
  globalState.status = 'DISCONNECTED';
  globalState.qrCodeDataUrl = null;
  globalState.connectedPhone = null;
  globalState.lastUpdated = Date.now();
  return { success: true };
}