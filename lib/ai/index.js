import { classifyIntent, extractLeadDetails } from './intent.js';
import { retrieveKnowledgeContext } from '../knowledge/retrieval.js';
import { generateAICompletion } from './provider.js';
import { SYSTEM_PROMPT } from './prompts.js';
import { INTENTS } from '../constants/intents.js';
import { query } from '../db/index.js';
import crypto from 'crypto';

export async function processCustomerMessageWithAI({ customer, conversation, messageText }) {
  const intent = classifyIntent(messageText);
  const extractedData = extractLeadDetails(messageText);

  // Handle opt-out immediately
  if (intent === INTENTS.OPT_OUT) {
    return {
      responseText: "Noted. You have been unsubscribed from promotional messages from TEJUROLEX GLOBAL. You can always message us again if you need help. Visit tejurolexglobal.com.ng anytime.",
      intent,
      extractedData,
      stateChange: null,
      optOut: true,
    };
  }

  // Handle human handoff immediately
  if (intent === INTENTS.HUMAN_REQUEST) {
    return {
      responseText: "Of course! I am connecting you with a TEJUROLEX GLOBAL advisor right now. Please hold on for a moment. 🙏",
      intent,
      extractedData,
      stateChange: 'HUMAN_REQUIRED',
      optOut: false,
    };
  }

  // Retrieve verified knowledge from database
  const { contextText, hasSpecificKnowledge } = await retrieveKnowledgeContext({ messageText, intent });

  // Get recent conversation history for context
  const historyRes = await query(
    `SELECT sender_type, content FROM messages 
     WHERE conversation_id = $1 
     ORDER BY created_at DESC LIMIT 8`,
    [conversation.id]
  );
  const recentMessages = historyRes.rows.reverse();

  // Get conversation summary if available
  const convRes = await query(
    `SELECT summary FROM conversations WHERE id = $1`,
    [conversation.id]
  );
  const summary = convRes.rows[0]?.summary || '';

  // Build the full system prompt with knowledge and guardrails
  let fullSystemPrompt = SYSTEM_PROMPT;

  if (hasSpecificKnowledge) {
    fullSystemPrompt += `\n\n=== VERIFIED TEJUROLEX GLOBAL KNOWLEDGE BASE (USE ONLY THIS) ===\n${contextText}\n=== END KNOWLEDGE BASE ===`;
  } else {
    fullSystemPrompt += `\n\n⚠️ IMPORTANT: No specific knowledge base entries matched this query. Do NOT invent information. Politely tell the customer you will connect them with a TEJUROLEX GLOBAL advisor for accurate details, and direct them to tejurolexglobal.com.ng.`;
  }

  if (summary) {
    fullSystemPrompt += `\n\n=== CONVERSATION SUMMARY SO FAR ===\n${summary}\n=== END SUMMARY ===`;
  }

  fullSystemPrompt += `\n\nCustomer Name: ${customer.name || 'Prospect'}\nCustomer Phone: ${customer.phone}`;

  // Generate AI response with multi-provider failover
  const aiResult = await generateAICompletion({
    systemPrompt: fullSystemPrompt,
    messages: [...recentMessages, { sender_type: 'CUSTOMER', content: messageText }],
  });

  // Clean the response for WhatsApp formatting
  let cleanResponse = aiResult.text
    .replace(/\*\*(.*?)\*\*/g, '*$1*')  // Convert markdown bold to WhatsApp bold
    .replace(/^#+\s/gm, '')              // Remove markdown headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links, keep text
    .trim();

  // Safety check: if response is too long for WhatsApp, truncate
  if (cleanResponse.length > 1500) {
    cleanResponse = cleanResponse.substring(0, 1450) + '\n\n...Feel free to ask more questions!';
  }

  // Log AI run for analytics
  try {
    await query(
      `INSERT INTO ai_runs (id, conversation_id, prompt_tokens, response_tokens, provider, model_used, latency_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        crypto.randomUUID(),
        conversation.id,
        aiResult.usage.promptTokens,
        aiResult.usage.responseTokens,
        aiResult.provider,
        aiResult.model,
        aiResult.latencyMs || 0,
      ]
    );
  } catch (err) {
    console.error('[AI RUN LOG ERROR]', err.message);
  }

  return {
    responseText: cleanResponse,
    intent,
    extractedData,
    stateChange: null,
    optOut: false,
  };
}