import { classifyIntent, extractLeadDetails } from './intent.js';
import { retrieveKnowledgeContext } from '../knowledge/retrieval.js';
import { generateAICompletion } from './provider.js';
import { SYSTEM_PROMPT } from './prompts.js';
import { INTENTS } from '../constants/intents.js';
import { query } from '../db/index.js';
import crypto from 'crypto';

export async function processCustomerMessageWithAI({
  customer,
  conversation,
  messageText,
}) {
  const intent = classifyIntent(messageText);
  const extractedData = extractLeadDetails(messageText);

  // =========================================================
  // IMMEDIATE SYSTEM ACTIONS
  // =========================================================

  if (intent === INTENTS.OPT_OUT) {
    return {
      responseText:
        'Noted. You have been unsubscribed from promotional messages from TEJUROLEX GLOBAL. You can always message us again if you need help.',
      intent,
      extractedData,
      stateChange: null,
      optOut: true,
    };
  }

  if (intent === INTENTS.HUMAN_REQUEST) {
    return {
      responseText:
        'Of course. I’ll have a TEJUROLEX GLOBAL advisor take over from here. Please hold on for a moment.',
      intent,
      extractedData,
      stateChange: 'HUMAN_REQUIRED',
      optOut: false,
    };
  }

  // =========================================================
  // VERIFIED KNOWLEDGE
  // =========================================================

  const {
    contextText,
    hasSpecificKnowledge,
  } = await retrieveKnowledgeContext({
    messageText,
    intent,
  });

  // =========================================================
  // CONVERSATION HISTORY
  // =========================================================

  const historyRes = await query(
    `
      SELECT sender_type, content, intent, created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at DESC
      LIMIT 16
    `,
    [conversation.id]
  );

  const recentMessages = historyRes.rows
  .reverse()
  .filter(
    (msg) =>
      !(
        msg.sender_type === 'CUSTOMER' &&
        msg.content === messageText
      )
  );

  // =========================================================
  // CONVERSATION SUMMARY
  // =========================================================

  const convRes = await query(
    `
      SELECT summary, state
      FROM conversations
      WHERE id = $1
      LIMIT 1
    `,
    [conversation.id]
  );

  const summary = convRes.rows[0]?.summary || '';
  const conversationState = convRes.rows[0]?.state || 'AI_ACTIVE';

  // =========================================================
  // LEAD CONTEXT
  // =========================================================

  let leadContext = '';

  try {
    const leadRes = await query(
      `
        SELECT
          interested_course,
          current_level,
          learning_goal,
          preferred_schedule,
          location,
          lead_score,
          lead_temperature,
          status
        FROM leads
        WHERE customer_id = $1
        LIMIT 1
      `,
      [customer.id]
    );

    if (leadRes.rows.length > 0) {
      const lead = leadRes.rows[0];

      leadContext = `
=== CUSTOMER LEAD PROFILE ===
Interested course: ${lead.interested_course || 'Unknown'}
Current level: ${lead.current_level || 'Unknown'}
Learning goal: ${lead.learning_goal || 'Unknown'}
Preferred schedule: ${lead.preferred_schedule || 'Unknown'}
Location: ${lead.location || 'Unknown'}
Lead temperature: ${lead.lead_temperature || 'Unknown'}
Lead status: ${lead.status || 'Unknown'}
=== END CUSTOMER LEAD PROFILE ===
`;
    }
  } catch (error) {
    console.error('[LEAD CONTEXT ERROR]', error.message);
  }

    // =========================================================
  // REGISTRATION FORM PROGRESS
  // =========================================================

  let registrationContext = '';

  try {
    const formRes = await query(
      `
        SELECT
          c.name,
          c.email,
          c.phone,
          l.interested_course,
          l.current_level,
          l.learning_goal,
          l.preferred_schedule,
          l.location
        FROM customers c
        LEFT JOIN leads l ON l.customer_id = c.id
        WHERE c.id = $1
        LIMIT 1
      `,
      [customer.id]
    );

    const data = formRes.rows[0] || {};

    const missing = [];

    if (!data.name) missing.push('name');
    if (!data.email) missing.push('email');
    if (!data.phone) missing.push('phone');
    if (!data.interested_course) missing.push('interested course');
    if (!data.current_level) missing.push('current level');
    if (!data.learning_goal) missing.push('learning goal');
    if (!data.preferred_schedule) missing.push('preferred schedule');
    if (!data.location) missing.push('location');

    if (missing.length > 0) {
      registrationContext = `
==================================================
REGISTRATION FORM STATUS
==================================================

The customer has NOT completed the enrollment form.

Missing information:
${missing.map(item => `- ${item}`).join('\n')}

IMPORTANT:
Do NOT say that an invoice will be sent yet.
Do NOT ask for payment yet.
Do NOT say registration is complete.

Continue collecting the missing information naturally.

Ask for ONLY the next missing piece of information that is relevant to the current conversation.

Do not ask for multiple missing fields at once.

The invoice/payment stage can only happen after ALL required enrollment information has been collected.

==================================================
END REGISTRATION FORM STATUS
==================================================
`;
    } else {
      registrationContext = `
==================================================
REGISTRATION FORM STATUS
==================================================

The customer has completed all required enrollment information.

The enrollment form is complete.

The next appropriate step may be the invoice/payment process if the customer is actually ready to register.

==================================================
END REGISTRATION FORM STATUS
==================================================
`;
    }
  } catch (error) {
    console.error('[REGISTRATION FORM STATUS ERROR]', error.message);
  }

  // =========================================================
  // CUSTOMER PROFILE
  // =========================================================

  const customerContext = `
=== CUSTOMER PROFILE ===
Name: ${customer.name || 'Prospect'}
Phone: ${customer.phone || 'Unknown'}
Email: ${customer.email || 'Unknown'}
Conversation state: ${conversationState}
=== END CUSTOMER PROFILE ===
`;

  // =========================================================
  // BUILD INTELLIGENT SYSTEM PROMPT
  // =========================================================

  let fullSystemPrompt = SYSTEM_PROMPT;

if (contextText?.trim()) {
  fullSystemPrompt += `

==================================================
VERIFIED TEJUROLEX GLOBAL KNOWLEDGE
==================================================

${contextText}

==================================================
STRICT KNOWLEDGE RULES
==================================================

The verified knowledge above is the authoritative source for TEJUROLEX GLOBAL business facts.

If the customer's question is answered by the verified knowledge, YOU MUST ANSWER DIRECTLY USING THAT INFORMATION.

Do NOT say you do not know a fact that appears in the verified knowledge.

Do NOT ask the customer to contact an advisor for information already provided above.

Do NOT claim that information is unavailable when it is present above.

Do NOT invent, modify, contradict, or override verified information.

If the verified knowledge states an exact time, price, location, schedule, policy, course detail, requirement, payment detail, or other business fact, use that exact information.

If the customer asks a simple factual question, answer it directly.

Example:
If the verified knowledge says the office closes at 5:00 PM Monday to Friday and the customer asks when the office closes, answer directly:
"Our office closes at 5:00 PM, Monday to Friday."

Do not respond that the closing time is unknown.

Use the verified knowledge as the source of truth.

==================================================
END VERIFIED KNOWLEDGE
==================================================
`;
} else {
  fullSystemPrompt += `

==================================================
NO VERIFIED KNOWLEDGE FOUND
==================================================

No verified knowledge was found for this specific request.

Do NOT invent TEJUROLEX GLOBAL business facts.

If the customer asks for a business-specific fact that is genuinely unavailable, explain that an advisor should confirm it.

==================================================
END NO VERIFIED KNOWLEDGE
==================================================
`;
}

fullSystemPrompt += `

${customerContext}

${leadContext}

${registrationContext}
`;

if (summary) {
  fullSystemPrompt += `

==================================================
CONVERSATION MEMORY
==================================================

${summary}

==================================================
END CONVERSATION MEMORY
==================================================
`;
}

// =========================================================
// RESPONSE INTELLIGENCE
// =========================================================

fullSystemPrompt += `

==================================================
RESPONSE INTELLIGENCE
==================================================

The customer's latest message is the highest priority.

Before answering, silently determine:

- What is the customer asking?
- Is this a follow-up to something already discussed?
- What information has already been given?
- What verified information is relevant?
- Is the customer confused, interested, comparing options, ready to register, or simply chatting?
- Does the customer need a short answer or a detailed explanation?
- Is there a useful question that should naturally come next?

Do not expose this reasoning.

The verified knowledge is authoritative for TEJUROLEX GLOBAL business facts.

Do not contradict verified knowledge.

Do not replace verified knowledge with assumptions.

Do not mechanically follow the detected intent if the actual conversation context indicates something else.

The intent classification is only a signal, not the customer's entire meaning.

If the customer asks a simple question, answer simply.

If the customer asks for a detailed explanation, provide enough detail to actually help.

If the customer is casually chatting, converse naturally.

If the customer has already provided information, remember it and do not ask for it again.

Never respond as though every message starts a new conversation.


==================================================
ENROLLMENT FORM RULE
==================================================

When the customer is going through the enrollment process, collect the required information progressively.

Do NOT announce an invoice, payment, enrollment completion, student portal setup, or class schedule before the enrollment form is complete.

Never assume that the form is complete simply because the customer has provided their name, email and phone number.

If required information is still missing, continue naturally with the next relevant question.

Ask for ONE missing field at a time.

Only after all required enrollment information has been collected may you transition to the invoice/payment stage.

Never invent missing customer information.
==================================================

==================================================
END RESPONSE INTELLIGENCE
==================================================
`;

  // =========================================================
  // AI GENERATION
  // =========================================================

  const aiResult = await generateAICompletion({
    systemPrompt: fullSystemPrompt,
    messages: [
      ...recentMessages,
      {
        sender_type: 'CUSTOMER',
        content: messageText,
      },
    ],
  });

  // =========================================================
  // CLEAN WHATSAPP RESPONSE
  // =========================================================

  let cleanResponse = aiResult.text
    .replace(/\*\*(.*?)\*\*/gs, '*$1*')
    .replace(/^#{1,6}\s/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{4,}/g, '\n\n')
    .trim();

  // Remove obvious AI-style opening phrases
  cleanResponse = cleanResponse
    .replace(
      /^(certainly!|sure!|absolutely!|of course!|i'd be happy to help!|i understand your question\.?)\s*/i,
      ''
    )
    .trim();

  // =========================================================
  // SAFETY LENGTH LIMIT
  // =========================================================

  if (cleanResponse.length > 3000) {
    cleanResponse =
      cleanResponse.substring(0, 2950).trim() +
      '\n\nIf you want, I can break the rest down for you.';
  }

  if (!cleanResponse) {
    cleanResponse =
      'Let me get that clarified for you. I do not want to give you the wrong information.';
  }

  // =========================================================
  // ANALYTICS
  // =========================================================

  try {
    await query(
      `
        INSERT INTO ai_runs (
          id,
          conversation_id,
          prompt_tokens,
          response_tokens,
          provider,
          model_used,
          latency_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        crypto.randomUUID(),
        conversation.id,
        aiResult.usage?.promptTokens || 0,
        aiResult.usage?.responseTokens || 0,
        aiResult.provider,
        aiResult.model,
        aiResult.latencyMs || 0,
      ]
    );
  } catch (error) {
    console.error('[AI RUN LOG ERROR]', error.message);
  }

  return {
    responseText: cleanResponse,
    intent,
    extractedData,
    stateChange: null,
    optOut: false,
  };
}