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

import {
  findOrCreateCustomer
} from './lib/crm/customers.js';

import {
  getOrCreateConversation,
  recordMessage,
  updateConversationState
} from './lib/crm/conversations.js';

import {
  updateLeadScoreAndStatus
} from './lib/crm/leads.js';

import {
  processCustomerMessageWithAI
} from './lib/ai/index.js';

import {
  CONVERSATION_STATES,
  SENDER_TYPES
} from './lib/constants/statuses.js';

import {
  query
} from './lib/db/index.js';


/* =========================================================
   GLOBAL WHATSAPP STATE
========================================================= */

let activeSock = null;

let isConnected = false;
let isStarting = false;
let isDisconnecting = false;

let reconnectTimer = null;

let connectionGeneration = 0;


/* =========================================================
   SETTINGS
========================================================= */

async function setSetting(key, value) {
  try {
    const id = crypto.randomUUID();

    await query(
      `INSERT INTO settings (id, key, value, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (key)
       DO UPDATE SET
         value = $3,
         updated_at = CURRENT_TIMESTAMP`,
      [id, key, value]
    );

  } catch (err) {
    console.error(
      `[DB SETTING ERROR] ${key}:`,
      err.message
    );
  }
}


/* =========================================================
   RECONNECT MANAGEMENT
========================================================= */

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}


function scheduleReconnect(delay = 10000) {

  if (reconnectTimer) {
    return;
  }

  if (isDisconnecting) {
    return;
  }

  console.log(
    `🔄 Scheduling WhatsApp reconnect in ${Math.round(delay / 1000)}s...`
  );

  reconnectTimer = setTimeout(() => {

    reconnectTimer = null;

    if (isDisconnecting) {
      return;
    }

    if (isConnected || isStarting) {
      return;
    }

    startWhatsAppBot();

  }, delay);
}


/* =========================================================
   HTTP HEALTH CHECK
========================================================= */

const PORT = process.env.PORT || 3005;

const server = http.createServer((req, res) => {

  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });

  res.end(
    'TEJUROLEX GLOBAL WhatsApp Bot Engine Running 24/7\n'
  );
});


server.on('error', (err) => {

  if (err.code !== 'EADDRINUSE') {
    console.error(
      '[HTTP ERROR]',
      err.message
    );
  }

});


server.listen(PORT, () => {

  console.log(
    `🌐 Bot HTTP Server running on port ${PORT}`
  );

});


/* =========================================================
   WEB UI DISCONNECT WATCHER
========================================================= */

setInterval(async () => {

  try {

    const res = await query(
      `SELECT value
       FROM settings
       WHERE key = 'whatsapp_status'
       LIMIT 1`
    );

    const status = res.rows[0]?.value;

    if (
      status === 'DISCONNECT_REQUESTED' &&
      !isDisconnecting
    ) {

      console.log(
        '⚠️ Disconnect requested from Web UI.'
      );

      isDisconnecting = true;
      isConnected = false;

      clearReconnectTimer();

      const sock = activeSock;

      activeSock = null;

      if (sock) {

        try {
          await sock.logout();
        } catch (err) {
          console.log(
            '⚠️ WhatsApp logout:',
            err.message
          );
        }

      }

      const sessionPath = path.join(
        process.cwd(),
        'auth_info_baileys'
      );

      if (fs.existsSync(sessionPath)) {

        fs.rmSync(
          sessionPath,
          {
            recursive: true,
            force: true
          }
        );

      }

      await setSetting(
        'whatsapp_status',
        'DISCONNECTED'
      );

      await setSetting(
        'whatsapp_qr',
        ''
      );

      await setSetting(
        'whatsapp_phone',
        ''
      );

      await setSetting(
        'whatsapp_name',
        ''
      );

      /*
       * Give the old socket time to completely die
       * before creating a new one.
       */
      setTimeout(() => {

        isDisconnecting = false;

        startWhatsAppBot();

      }, 3000);

    }

  } catch (err) {

    console.error(
      '[DISCONNECT WATCHER ERROR]',
      err.message
    );

  }

}, 3000);


/* =========================================================
   START WHATSAPP BOT
========================================================= */

async function startWhatsAppBot() {

  /*
   * NEVER allow two Baileys sockets to start.
   */
  if (isStarting) {

    console.log(
      '⏳ WhatsApp engine is already starting.'
    );

    return;

  }


  if (isConnected && activeSock) {

    console.log(
      '✅ WhatsApp is already connected.'
    );

    return;

  }


  if (isDisconnecting) {

    console.log(
      '⏳ WhatsApp is currently disconnecting.'
    );

    return;

  }


  isStarting = true;

  clearReconnectTimer();

  const generation = ++connectionGeneration;

  console.log(
    '🚀 Starting TEJUROLEX GLOBAL WhatsApp Engine...'
  );


  try {

    const {
      state,
      saveCreds
    } = await useMultiFileAuthState(
      'auth_info_baileys'
    );


    const {
      version
    } = await fetchLatestBaileysVersion();


    console.log(
      `📡 Using WhatsApp protocol version: ${version.join('.')}`
    );


    const sock = makeWASocket({

      version,

      auth: state,

      logger: pino({
        level: 'silent'
      }),

      printQRInTerminal: false,

      connectTimeoutMs: 60000,

      keepAliveIntervalMs: 30000,

      /*
       * Avoid unnecessary history synchronization.
       */
      syncFullHistory: false,

      /*
       * We are not building a presence system.
       */
      markOnlineOnConnect: false

    });


    /*
     * Only this socket can become active.
     */
    activeSock = sock;

    isStarting = false;


    /* =====================================================
       CONNECTION UPDATE
    ===================================================== */

    sock.ev.on(
      'connection.update',
      async (update) => {

        const {
          connection,
          lastDisconnect,
          qr
        } = update;


        /* ================================================
           QR CODE
        ================================================= */

        if (
          qr &&
          !isConnected &&
          generation === connectionGeneration
        ) {

          console.log(
            '\n📲 QR CODE GENERATED:\n'
          );

          qrcodeTerminal.generate(
            qr,
            {
              small: true
            }
          );


          try {

            const qrDataUrl =
              await QRCode.toDataURL(
                qr,
                {
                  margin: 2,
                  width: 320,
                  color: {
                    dark: '#111111',
                    light: '#FFFFFF'
                  }
                }
              );


            await setSetting(
              'whatsapp_qr',
              qrDataUrl
            );


            await setSetting(
              'whatsapp_status',
              'SCAN_QR'
            );


          } catch (err) {

            console.error(
              '[QR CONVERT ERROR]',
              err.message
            );

          }

        }


        /* ================================================
           CONNECTION OPEN
        ================================================= */

        if (
          connection === 'open' &&
          generation === connectionGeneration
        ) {

          isConnected = true;
          isStarting = false;

          clearReconnectTimer();


          const phone =
            sock.user?.id
              ? sock.user.id.split(':')[0]
              : 'Unknown';


          const name =
            sock.user?.name ||
            'TEJUROLEX GLOBAL';


          await setSetting(
            'whatsapp_status',
            'CONNECTED'
          );


          await setSetting(
            'whatsapp_qr',
            ''
          );


          await setSetting(
            'whatsapp_phone',
            phone
          );


          await setSetting(
            'whatsapp_name',
            name
          );


          console.log(
            `\n✅ TEJUROLEX WHATSAPP CONNECTED: +${phone} (${name})\n`
          );

          return;

        }


        /* ================================================
           CONNECTION CLOSED
        ================================================= */

        if (
          connection === 'close' &&
          generation === connectionGeneration
        ) {

          const statusCode =
            lastDisconnect?.error?.output?.statusCode;


          const isLoggedOut =
            statusCode === DisconnectReason.loggedOut;


          isConnected = false;
          isStarting = false;


          if (activeSock === sock) {
            activeSock = null;
          }


          console.log(
            `⚠️ Connection closed (Status ${statusCode}). Logged out: ${isLoggedOut}`
          );


          /*
           * USER LOGGED OUT
           */

          if (isLoggedOut) {

            console.log(
              '🔴 WhatsApp session logged out.'
            );


            await setSetting(
              'whatsapp_status',
              'DISCONNECTED'
            );


            await setSetting(
              'whatsapp_qr',
              ''
            );


            await setSetting(
              'whatsapp_phone',
              ''
            );


            await setSetting(
              'whatsapp_name',
              ''
            );


            const sessionPath =
              path.join(
                process.cwd(),
                'auth_info_baileys'
              );


            if (
              fs.existsSync(sessionPath)
            ) {

              fs.rmSync(
                sessionPath,
                {
                  recursive: true,
                  force: true
                }
              );

            }


            /*
             * Give WhatsApp time to close
             * before creating a new socket.
             */

            scheduleReconnect(3000);

            return;

          }


          /*
           * STATUS 440 AND OTHER TEMPORARY
           * CONNECTION FAILURES
           */

          if (statusCode === 440) {

            console.log(
              '⚠️ WhatsApp returned 440. Treating as temporary connection loss.'
            );

          }


          await setSetting(
            'whatsapp_status',
            'RECONNECTING'
          );


          /*
           * IMPORTANT:
           *
           * Do NOT immediately create another
           * socket.
           *
           * Give the previous connection time
           * to disappear.
           */

          scheduleReconnect(10000);

        }

      }
    );


    /* =====================================================
       CREDENTIALS
    ===================================================== */

    sock.ev.on(
      'creds.update',
      saveCreds
    );


    /* =====================================================
       INCOMING MESSAGES
    ===================================================== */

    sock.ev.on(
      'messages.upsert',
      async ({ messages, type }) => {

        if (type !== 'notify') {
          return;
        }


        for (const msg of messages) {

          try {

            if (msg.key.fromMe) {
              continue;
            }


            if (
              msg.key.remoteJid ===
              'status@broadcast'
            ) {
              continue;
            }


            if (
              msg.key.remoteJid?.endsWith(
                '@g.us'
              )
            ) {
              continue;
            }


            const remoteJid =
              msg.key.remoteJid;


            if (!remoteJid) {
              continue;
            }


            const rawPhone =
              remoteJid.replace(
                '@s.whatsapp.net',
                ''
              );


            const pushName =
              msg.pushName ||
              'Customer';


            const messageText =
              msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.message?.imageMessage?.caption ||
              '';


            if (
              !messageText.trim()
            ) {
              continue;
            }


            console.log(
              `📩 [INBOUND] ${pushName} (${rawPhone}): "${messageText}"`
            );


            const customer =
              await findOrCreateCustomer(
                rawPhone,
                pushName
              );


            /* =========================================
               MARKETING OPT OUT
            ========================================= */

            if (
              customer.marketing_opt_out
            ) {

              const lower =
                messageText.toLowerCase();


              if (
                !lower.includes('start') &&
                !lower.includes('hello') &&
                !lower.includes('hi')
              ) {

                continue;

              }


              await query(
                `UPDATE customers
                 SET marketing_opt_out = FALSE,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [customer.id]
              );

            }


            /* =========================================
               CONVERSATION
            ========================================= */

            const conversation =
              await getOrCreateConversation(
                customer.id
              );


            await recordMessage({

              conversationId:
                conversation.id,

              externalMessageId:
                msg.key.id,

              direction:
                'INBOUND',

              senderType:
                SENDER_TYPES.CUSTOMER,

              content:
                messageText

            });


            /* =========================================
               HUMAN HANDOFF
            ========================================= */

            if (
              conversation.state ===
              CONVERSATION_STATES.HUMAN_ACTIVE
            ) {

              console.log(
                `[HUMAN ACTIVE] AI paused for ${rawPhone}`
              );

              continue;

            }


            /* =========================================
               AI
            ========================================= */

            console.log(
              `⚡ Generating AI response for ${pushName}...`
            );


            const aiResponse =
              await processCustomerMessageWithAI({

                customer,

                conversation,

                messageText

              });


            /* =========================================
               LEAD
            ========================================= */

            await updateLeadScoreAndStatus(
              customer.id,
              {
                intent:
                  aiResponse.intent,

                extractedData:
                  aiResponse.extractedData,

                messageText
              }
            ).catch(err => {

              console.error(
                '[LEAD UPDATE ERROR]',
                err.message
              );

            });


            /* =========================================
               STATE CHANGE
            ========================================= */

            if (
              aiResponse.stateChange
            ) {

              await updateConversationState(
                conversation.id,
                aiResponse.stateChange
              );

            }


            /* =========================================
               SEND RESPONSE
            ========================================= */

            if (
              !activeSock ||
              !isConnected
            ) {

              console.log(
                '⚠️ WhatsApp disconnected before AI response could be sent.'
              );

              continue;

            }


            await sock.sendMessage(
              remoteJid,
              {
                text:
                  aiResponse.responseText
              }
            );


            console.log(
              `📤 [AI REPLIED] to ${pushName}`
            );


            /* =========================================
               SAVE AI MESSAGE
            ========================================= */

            await recordMessage({

              conversationId:
                conversation.id,

              direction:
                'OUTBOUND',

              senderType:
                SENDER_TYPES.AI,

              content:
                aiResponse.responseText,

              intent:
                aiResponse.intent

            });

          } catch (err) {

            console.error(
              '❌ Error processing message:',
              err.message
            );

          }

        }

      }
    );


  } catch (err) {

    isStarting = false;

    isConnected = false;

    if (activeSock === sock) {
      activeSock = null;
    }


    console.error(
      '❌ Failed to start WhatsApp:',
      err.message
    );


    await setSetting(
      'whatsapp_status',
      'ERROR'
    );


    scheduleReconnect(10000);

  }

}


/* =========================================================
   START ENGINE
========================================================= */

startWhatsAppBot();