import { query } from '../db/index.js';
import crypto from 'crypto';
import { CONVERSATION_STATES, SENDER_TYPES } from '../constants/statuses.js';

/**
 * Get active conversation or create a new one
 */
export async function getOrCreateConversation(customerId) {
  const active = await query(
    `SELECT * FROM conversations 
     WHERE customer_id = $1 AND state NOT IN ($2, $3)
     ORDER BY updated_at DESC LIMIT 1`,
    [customerId, CONVERSATION_STATES.RESOLVED, CONVERSATION_STATES.ARCHIVED]
  );

  if (active.rows.length > 0) {
    return active.rows[0];
  }

  const id = crypto.randomUUID();
  const newConv = await query(
    `INSERT INTO conversations (id, customer_id, state)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [id, customerId, CONVERSATION_STATES.AI_ACTIVE]
  );

  return newConv.rows[0];
}

/**
 * Record a message in the database (Idempotent check by externalMessageId)
 */
export async function recordMessage({
  conversationId,
  externalMessageId = null,
  direction,
  senderType,
  senderId = null,
  content,
  messageType = 'text',
  intent = null,
  metadata = {},
}) {
  if (externalMessageId) {
    const exists = await query(
      `SELECT id FROM messages WHERE external_message_id = $1 LIMIT 1`,
      [externalMessageId]
    );
    if (exists.rows.length > 0) {
      return { duplicate: true, message: exists.rows[0] };
    }
  }

  const id = crypto.randomUUID();
  const result = await query(
    `INSERT INTO messages (
      id, conversation_id, external_message_id, direction, 
      sender_type, sender_id, content, message_type, intent, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      id,
      conversationId,
      externalMessageId,
      direction,
      senderType,
      senderId,
      content,
      messageType,
      intent,
      JSON.stringify(metadata),
    ]
  );

  await query(
    `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [conversationId]
  );

  return { duplicate: false, message: result.rows[0] };
}

/**
 * Update conversation state (e.g., Human Handoff)
 */
export async function updateConversationState(conversationId, state, assignedAgentId = null) {
  return await query(
    `UPDATE conversations 
     SET state = $1, assigned_agent_id = COALESCE($2, assigned_agent_id), updated_at = CURRENT_TIMESTAMP 
     WHERE id = $3 RETURNING *`,
    [state, assignedAgentId, conversationId]
  );
}

/**
 * Get recent message history for AI context
 */
export async function getRecentMessages(conversationId, limit = 8) {
  const res = await query(
    `SELECT sender_type, content, intent, created_at 
     FROM messages 
     WHERE conversation_id = $1 
     ORDER BY created_at DESC LIMIT $2`,
    [conversationId, limit]
  );
  return res.rows.reverse();
}