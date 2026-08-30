import { NextResponse } from 'next/server';
import { extractWhatsAppMessages } from '../../../../lib/whatsapp/webhook.js';
import { sendWhatsAppMessage, markWhatsAppMessageAsRead } from '../../../../lib/whatsapp/client.js';
import { findOrCreateCustomer } from '../../../../lib/crm/customers.js';
import { getOrCreateConversation, recordMessage, updateConversationState } from '../../../../lib/crm/conversations.js';
import { updateLeadScoreAndStatus } from '../../../../lib/crm/leads.js';
import { processCustomerMessageWithAI } from '../../../../lib/ai/index.js';
import { CONVERSATION_STATES, SENDER_TYPES } from '../../../../lib/constants/statuses.js';
import { query } from '../../../../lib/db/index.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[WEBHOOK] ✅ Verified by Meta');
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const incomingMessages = extractWhatsAppMessages(body);

    if (!incomingMessages.length) {
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    for (const msg of incomingMessages) {
      // Skip empty messages
      if (!msg.text || msg.text.trim().length === 0) continue;

      console.log(`[INBOUND] From ${msg.from}: "${msg.text.substring(0, 80)}"`);

      // Mark as read
      markWhatsAppMessageAsRead(msg.messageId).catch(() => {});

      // Find or create customer
      const customer = await findOrCreateCustomer(msg.from, msg.name);

      // Check opt-out
      if (customer.marketing_opt_out) {
        const lower = msg.text.toLowerCase();
        if (!lower.includes('start') && !lower.includes('hello') && !lower.includes('hi')) {
          continue;
        }
        // Re-activate if they message again
        await query(
          `UPDATE customers SET marketing_opt_out = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [customer.id]
        );
      }

      // Get or create conversation
      const conversation = await getOrCreateConversation(customer.id);

      // Record inbound message (idempotent)
      const record = await recordMessage({
        conversationId: conversation.id,
        externalMessageId: msg.messageId,
        direction: 'INBOUND',
        senderType: SENDER_TYPES.CUSTOMER,
        content: msg.text,
        messageType: msg.type || 'text',
      });

      if (record.duplicate) {
        console.log(`[DUPLICATE] Skipping ${msg.messageId}`);
        continue;
      }

      // Skip AI if human agent is active
      if (conversation.state === CONVERSATION_STATES.HUMAN_ACTIVE) {
        console.log(`[HUMAN ACTIVE] AI paused for ${conversation.id}`);
        continue;
      }

      // Process through AI engine
      const aiResponse = await processCustomerMessageWithAI({
        customer,
        conversation,
        messageText: msg.text,
      });

      // Update lead score
      await updateLeadScoreAndStatus(customer.id, {
        intent: aiResponse.intent,
        extractedData: aiResponse.extractedData,
        messageText: msg.text,
      }).catch(err => console.error('[LEAD UPDATE ERROR]', err.message));

      // Handle opt-out
      if (aiResponse.optOut) {
        await query(
          `UPDATE customers SET marketing_opt_out = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [customer.id]
        );
      }

      // Handle state change (human handoff)
      if (aiResponse.stateChange) {
        await updateConversationState(conversation.id, aiResponse.stateChange);
      }

      // Send real WhatsApp response
      console.log(`[OUTBOUND] To ${customer.phone}: "${aiResponse.responseText.substring(0, 80)}..."`);
      const sendResult = await sendWhatsAppMessage(customer.phone, aiResponse.responseText);

      // Record outbound message
      await recordMessage({
        conversationId: conversation.id,
        externalMessageId: sendResult.messageId || null,
        direction: 'OUTBOUND',
        senderType: SENDER_TYPES.AI,
        content: aiResponse.responseText,
        intent: aiResponse.intent,
      });
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}