import { NextResponse } from 'next/server';
import { query } from '../../../lib/db/index.js';
import { recordMessage, updateConversationState } from '../../../lib/crm/conversations.js';
import { SENDER_TYPES } from '../../../lib/constants/statuses.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET: Fetch all active conversations with messages and customer profile
export async function GET() {
  try {
    const convRes = await query(`
      SELECT
        c.id,
        c.state,
        c.summary,
        c.updated_at,
        cust.id AS customer_id,
        COALESCE(cust.name, 'Customer') AS customer_name,
        cust.phone AS customer_phone,
        cust.email AS customer_email,
        l.lead_score,
        l.lead_temperature,
        l.interested_course,
        l.preferred_schedule,
        l.location,
        l.status AS lead_status
      FROM conversations c
      JOIN customers cust ON c.customer_id = cust.id
      LEFT JOIN leads l ON l.customer_id = cust.id
      ORDER BY c.updated_at DESC
    `);

    const conversations = [];

    for (const row of convRes.rows) {
      const msgRes = await query(`
        SELECT id, sender_type, content, intent, created_at
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
      `, [row.id]);

      const lastMsg = msgRes.rows[msgRes.rows.length - 1];

      conversations.push({
        id: row.id,
        state: row.state,
        lastMessage: lastMsg?.content || 'Conversation started',
        time: lastMsg?.created_at
          ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : new Date(row.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        customer: {
          id: row.customer_id,
          name: row.customer_name,
          phone: row.customer_phone,
          email: row.customer_email,
        },
        lead: {
          lead_score: row.lead_score || 0,
          lead_temperature: row.lead_temperature || 'COLD',
          interested_course: row.interested_course,
          preferred_schedule: row.preferred_schedule,
          location: row.location,
          status: row.lead_status || 'NEW',
        },
        messages: msgRes.rows,
      });
    }

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('[CONVERSATIONS API ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Send a manual agent reply from the web inbox
export async function POST(request) {
  try {
    const { conversationId, content, toggleState } = await request.json();

    if (toggleState) {
      await updateConversationState(conversationId, toggleState);
      return NextResponse.json({ success: true, state: toggleState });
    }

    if (!conversationId || !content) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Get conversation & customer phone
    const convRes = await query(`
      SELECT c.id, cust.phone 
      FROM conversations c 
      JOIN customers cust ON c.customer_id = cust.id 
      WHERE c.id = $1
    `, [conversationId]);

    if (convRes.rows.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { phone } = convRes.rows[0];

    // 2. Try sending via active Baileys socket if connected
    const globalState = global._tejurolex_wa_state;
    if (globalState?.sock && globalState.status === 'CONNECTED') {
      const jid = `${phone.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
      await globalState.sock.sendMessage(jid, { text: content });
    }

    // 3. Record outbound message in DB
    const message = await recordMessage({
      conversationId,
      direction: 'OUTBOUND',
      senderType: SENDER_TYPES.AGENT,
      content,
    });

    return NextResponse.json({ success: true, message: message.message });
  } catch (error) {
    console.error('[MANUAL AGENT SEND ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}