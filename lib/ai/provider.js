/**
 * TEJUROLEX GLOBAL — Resilient Production AI Engine
 * Dynamic Model Selection with Multi-Model Fallbacks
 */

function cleanEnv(val) {
  if (!val) return '';
  return val.replace(/['"]/g, '').replace(/^[a-zA-Z0-9_]+=\s*/, '').trim();
}

async function callOpenRouter(systemPrompt, messages) {
  const apiKey = cleanEnv(process.env.OPENROUTER_API_KEY);
  if (!apiKey || apiKey.length < 10) throw new Error('OpenRouter API key missing or invalid');

  // Universal models that always work on OpenRouter
  const candidateModels = [
    'openrouter/auto',
    'meta-llama/llama-3.3-70b-instruct',
    'openai/gpt-4o-mini',
    'mistralai/mistral-7b-instruct:free'
  ];

  for (const model of candidateModels) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://tejurolexglobal.com.ng',
          'X-Title': 'TEJUROLEX GLOBAL AI',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({
              role: m.sender_type === 'CUSTOMER' ? 'user' : 'assistant',
              content: m.content,
            })),
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      const data = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) {
        return {
          text: data.choices[0].message.content.trim(),
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            responseTokens: data.usage?.completion_tokens || 0,
          },
          model,
          provider: 'openrouter',
        };
      }
    } catch {
      // Try next model
    }
  }

  throw new Error('All OpenRouter candidate models failed');
}

async function callGroq(systemPrompt, messages) {
  const apiKey = cleanEnv(process.env.GROQ_API_KEY);
  if (!apiKey || apiKey.length < 10) throw new Error('Groq API key missing or invalid');

  const candidateModels = [
    'llama-3.3-70b-versatile',
    'llama3-70b-8192',
    'llama3-8b-8192',
    'gemma2-9b-it'
  ];

  for (const model of candidateModels) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({
              role: m.sender_type === 'CUSTOMER' ? 'user' : 'assistant',
              content: m.content,
            })),
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      const data = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) {
        return {
          text: data.choices[0].message.content.trim(),
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            responseTokens: data.usage?.completion_tokens || 0,
          },
          model,
          provider: 'groq',
        };
      }
    } catch {
      // Try next model
    }
  }

  throw new Error('All Groq candidate models failed');
}

async function callGemini(systemPrompt, messages) {
  const apiKey = cleanEnv(process.env.GEMINI_API_KEY);
  if (!apiKey || apiKey.length < 10) throw new Error('Gemini API key missing or invalid');

  const candidateModels = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash'
  ];

  const contents = messages.map(m => ({
    role: m.sender_type === 'CUSTOMER' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  for (const model of candidateModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 500,
            },
          }),
        }
      );

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (res.ok && text) {
        return {
          text,
          usage: {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            responseTokens: data.usageMetadata?.candidatesTokenCount || 0,
          },
          model,
          provider: 'gemini',
        };
      }
    } catch {
      // Try next candidate
    }
  }

  throw new Error('All Gemini candidate models failed');
}

export async function generateAICompletion({ systemPrompt, messages }) {
  const startTime = Date.now();
  const providers = [
    { name: 'openrouter', fn: callOpenRouter },
    { name: 'groq', fn: callGroq },
    { name: 'gemini', fn: callGemini },
  ];

  for (const provider of providers) {
    try {
      console.log(`[AI] Trying ${provider.name}...`);
      const result = await provider.fn(systemPrompt, messages);

      if (result.text && result.text.length > 5) {
        result.latencyMs = Date.now() - startTime;
        console.log(`[AI] ✅ ${provider.name} (${result.model}) responded in ${result.latencyMs}ms`);
        return result;
      }
    } catch (error) {
      console.error(`[AI] ❌ ${provider.name} failed:`, error.message);
    }
  }

  console.warn('[AI] All providers failed. Using safe fallback.');
  return {
    text: "Thank you for reaching out to TEJUROLEX GLOBAL. Our team has been notified and will respond to you shortly. You can also visit tejurolexglobal.com.ng for more information.",
    usage: { promptTokens: 0, responseTokens: 0 },
    model: 'safe-fallback',
    provider: 'fallback',
    latencyMs: Date.now() - startTime,
  };
}