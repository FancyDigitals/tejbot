import { NextResponse } from 'next/server';
import { extractWhatsAppMessages } from '@/lib/whatsapp/webhook.js';
import { sendWhatsAppMessage, markWhatsAppMessageAsRead } from '@/lib/whatsapp/client.js';
import { findOrCreateCustomer } from '@/lib/crm/customers.js';
import { getOrCreateConversation, recordMessage, updateConversationState } from '@/lib/crm/conversations.js';
import { updateLeadScoreAndStatus } from '@/lib/crm/leads.js';
import { processCustomerMessageWithAI } from '@/lib/ai/index.js';
import { CONVERSATION_STATES, SENDER_TYPES } from '@/lib/constants/statuses.js';
import { query } from '@/lib/db/index.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || 'tejurolex_webhook_verify_2026';

// Meta webhook verification
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    console.log('[WEBHOOK VERIFY]', { mode, tokenMatch: token === VERIFY_TOKEN, hasChallenge: !!challenge });

    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return new Response('Forbidden', { status: 403 });
  } catch (error) {
    console.error('[WEBHOOK VERIFY ERROR]', error);
    return new Response('Error', { status: 500 });
  }
}

// Incoming WhatsApp messages
export async function POST(request) {
  try {
    const body = await request.json();
    const incomingMessages = extractWhatsAppMessages(body);

    // Always 200 quickly for Meta
    if (!incomingMessages.length) {
      return NextResponse.json({ status: 'ok' });
    }

    for (const msg of incomingMessages) {
      if (!msg.text?.trim()) continue;

      console.log(`[INBOUND] ${msg.from}: ${msg.text.substring(0, 80)}`);

      markWhatsAppMessageAsRead(msg.messageId).catch(() => {});

      const customer = await findOrCreateCustomer(msg.from, msg.name);
      const conversation = await getOrCreateConversation(customer.id);

      const record = await recordMessage({
        conversationId: conversation.id,
        externalMessageId: msg.messageId,
        direction: 'INBOUND',
        senderType: SENDER_TYPES.CUSTOMER,
        content: msg.text,
        messageType: msg.type || 'text',
      });

      if (record.duplicate) continue;
      if (conversation.state === CONVERSATION_STATES.HUMAN_ACTIVE) continue;

      const aiResponse = await processCustomerMessageWithAI({
        customer,
        conversation,
        messageText: msg.text,
      });

      await updateLeadScoreAndStatus(customer.id, {
        intent: aiResponse.intent,
        extractedData: aiResponse.extractedData,
        messageText: msg.text,
      }).catch(() => {});

      if (aiResponse.stateChange) {
        await updateConversationState(conversation.id, aiResponse.stateChange);
      }

      const sendResult = await sendWhatsAppMessage(customer.phone, aiResponse.responseText);

      await recordMessage({
        conversationId: conversation.id,
        externalMessageId: sendResult?.messageId || null,
        direction: 'OUTBOUND',
        senderType: SENDER_TYPES.AI,
        content: aiResponse.responseText,
        intent: aiResponse.intent,
      });
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('[WEBHOOK POST ERROR]', error);
    // Still return 200 so Meta does not disable webhook
    return NextResponse.json({ status: 'error_handled' });
  }
}