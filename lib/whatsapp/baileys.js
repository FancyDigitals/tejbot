/**
 * TEJUROLEX GLOBAL — Web-Enabled Baileys WhatsApp Engine
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

import { findOrCreateCustomer } from '../crm/customers.js';
import { getOrCreateConversation, recordMessage, updateConversationState } from '../crm/conversations.js';
import { updateLeadScoreAndStatus } from '../crm/leads.js';
import { processCustomerMessageWithAI } from '../ai/index.js';
import { CONVERSATION_STATES, SENDER_TYPES } from '../constants/statuses.js';
import { query } from '../db/index.js';

let globalState = global._tejurolex_wa_state || {
  sock: null,
  status: 'DISCONNECTED',
  qrCodeDataUrl: null,
  connectedPhone: null,
  connectedName: null,
  lastUpdated: Date.now(),
};

global._tejurolex_wa_state = globalState;

async function setSetting(key, value) {
  try {
    await query(
      `INSERT INTO settings (id, key, value, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );
  } catch (err) {
    console.error(`[DB SETTING ERROR] ${key}:`, err.message);
  }
}

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
    await setSetting('whatsapp_status', 'CONNECTING');

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
    });

    globalState.sock = sock;

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, {
            margin: 2,
            width: 320,
            color: { dark: '#111111', light: '#FFFFFF' }
          });
          globalState.status = 'SCAN_QR';
          globalState.qrCodeDataUrl = qrDataUrl;
          globalState.lastUpdated = Date.now();

          await setSetting('whatsapp_qr', qrDataUrl);
          await setSetting('whatsapp_status', 'SCAN_QR');
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

        await setSetting('whatsapp_status', 'DISCONNECTED');
        await setSetting('whatsapp_qr', '');
        await setSetting('whatsapp_phone', '');
        await setSetting('whatsapp_name', '');

        if (isLoggedOut) {
          const sessionPath = path.join(process.cwd(), 'auth_info_baileys');
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
          }
        } else {
          console.log('🔄 Reconnecting WhatsApp Socket...');
          setTimeout(() => initWhatsAppBaileys(), 3000);
        }
      } else if (connection === 'open') {
        const phone = sock.user?.id ? sock.user.id.split(':')[0] : 'Unknown';
        const name = sock.user?.name || 'TEJUROLEX GLOBAL';

        globalState.status = 'CONNECTED';
        globalState.qrCodeDataUrl = null;
        globalState.connectedPhone = phone;
        globalState.connectedName = name;
        globalState.lastUpdated = Date.now();

        await setSetting('whatsapp_status', 'CONNECTED');
        await setSetting('whatsapp_qr', '');
        await setSetting('whatsapp_phone', phone);
        await setSetting('whatsapp_name', name);

        console.log(`✅ WhatsApp Connected to: +${phone} (${name})`);
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

        console.log(`📩 [INBOUND WA] ${pushName} (${rawPhone}): "${messageText}"`);

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
            console.log(`[HUMAN ACTIVE] Skipping AI for ${rawPhone}`);
            continue;
          }

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
          console.log(`📤 [AI AUTO-REPLIED] to ${pushName}`);

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

  await setSetting('whatsapp_status', 'DISCONNECTED');
  await setSetting('whatsapp_qr', '');
  await setSetting('whatsapp_phone', '');
  await setSetting('whatsapp_name', '');

  const sessionPath = path.join(process.cwd(), 'auth_info_baileys');
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  }

  return { success: true };
}