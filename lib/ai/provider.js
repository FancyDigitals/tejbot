/**
 * TEJUROLEX GLOBAL
 * Resilient Production AI Engine
 *
 * Provider order:
 * OpenRouter → Groq → Gemini
 *
 * IMPORTANT:
 * - Current model IDs
 * - Real provider errors are logged
 * - Per-request timeout
 * - Automatic fallback
 * - No API keys exposed in logs
 */

function cleanEnv(val) {
  if (!val) return '';

  return String(val)
    .replace(/['"]/g, '')
    .replace(/^[a-zA-Z0-9_]+\s*=\s*/, '')
    .trim();
}


const REQUEST_TIMEOUT_MS = 30000;


async function fetchWithTimeout(url, options = {}) {

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {

    return await fetch(url, {
      ...options,
      signal: controller.signal
    });

  } finally {

    clearTimeout(timeout);

  }
}


async function readResponse(res) {

  const raw = await res.text();

  let data;

  try {
    data = JSON.parse(raw);
  } catch {
    data = {
      raw
    };
  }

  return data;
}


function getProviderError(data, res) {

  return (
    data?.error?.message ||
    data?.error?.code ||
    data?.message ||
    data?.raw ||
    `${res.status} ${res.statusText}`
  );
}


/* =========================================================
   OPENROUTER
========================================================= */

async function callOpenRouter(systemPrompt, messages) {

  const apiKey = cleanEnv(
    process.env.OPENROUTER_API_KEY
  );

  if (
    !apiKey ||
    apiKey.length < 10
  ) {
    throw new Error(
      'OpenRouter API key missing or invalid'
    );
  }


  /*
   * Use models that are currently available
   * through OpenRouter.
   *
   * These are fallback candidates, not assumptions
   * that every account has free access to every model.
   */

  const candidateModels = [

    'openai/gpt-oss-120b',

    'openai/gpt-oss-20b',

    'google/gemini-2.5-flash',

  ];


  const formattedMessages = [

    {
      role: 'system',
      content: systemPrompt
    },

    ...messages.map(message => ({

      role:
        message.sender_type === 'CUSTOMER'
          ? 'user'
          : 'assistant',

      content: message.content

    }))

  ];


  let lastError = null;


  for (
    const model of candidateModels
  ) {

    try {

      console.log(
        `[AI][OPENROUTER] Trying ${model}...`
      );


      const res = await fetchWithTimeout(

        'https://openrouter.ai/api/v1/chat/completions',

        {
          method: 'POST',

          headers: {

            Authorization:
              `Bearer ${apiKey}`,

            'Content-Type':
              'application/json',

            'HTTP-Referer':
              'https://tejurolexglobal.com',

            'X-Title':
              'TEJUROLEX GLOBAL AI'

          },

          body: JSON.stringify({

            model,

            messages:
              formattedMessages,

            temperature:
              0.3,

            max_tokens:
              500

          })

        }

      );


      const data =
        await readResponse(res);


      if (!res.ok) {

        const reason =
          getProviderError(
            data,
            res
          );

        console.error(
          `[AI][OPENROUTER] ${model} failed: ${res.status} - ${reason}`
        );

        lastError =
          new Error(
            `OpenRouter ${res.status}: ${reason}`
          );

        continue;

      }


      const text =
        data?.choices?.[0]?.message?.content?.trim();


      if (!text) {

        console.error(
          `[AI][OPENROUTER] ${model} returned no text`
        );

        lastError =
          new Error(
            'OpenRouter returned an empty response'
          );

        continue;

      }


      return {

        text,

        usage: {

          promptTokens:
            data?.usage?.prompt_tokens || 0,

          responseTokens:
            data?.usage?.completion_tokens || 0

        },

        model,

        provider:
          'openrouter'

      };

    } catch (error) {

      console.error(
        `[AI][OPENROUTER] ${model} exception:`,
        error.message
      );

      lastError = error;

    }

  }


  throw (
    lastError ||
    new Error(
      'All OpenRouter candidate models failed'
    )
  );

}


/* =========================================================
   GROQ
========================================================= */

async function callGroq(
  systemPrompt,
  messages
) {

  const apiKey =
    cleanEnv(
      process.env.GROQ_API_KEY
    );


  if (
    !apiKey ||
    apiKey.length < 10
  ) {

    throw new Error(
      'Groq API key missing or invalid'
    );

  }


  /*
   * Current Groq production models.
   */

  const candidateModels = [

    'openai/gpt-oss-120b',

    'openai/gpt-oss-20b'

  ];


  const formattedMessages = [

    {
      role: 'system',
      content: systemPrompt
    },

    ...messages.map(message => ({

      role:
        message.sender_type === 'CUSTOMER'
          ? 'user'
          : 'assistant',

      content:
        message.content

    }))

  ];


  let lastError = null;


  for (
    const model of candidateModels
  ) {

    try {

      console.log(
        `[AI][GROQ] Trying ${model}...`
      );


      const res =
        await fetchWithTimeout(

          'https://api.groq.com/openai/v1/chat/completions',

          {

            method: 'POST',

            headers: {

              Authorization:
                `Bearer ${apiKey}`,

              'Content-Type':
                'application/json'

            },

            body: JSON.stringify({

              model,

              messages:
                formattedMessages,

              temperature:
                0.3,

              max_tokens:
                500

            })

          }

        );


      const data =
        await readResponse(res);


      if (!res.ok) {

        const reason =
          getProviderError(
            data,
            res
          );


        console.error(
          `[AI][GROQ] ${model} failed: ${res.status} - ${reason}`
        );


        lastError =
          new Error(
            `Groq ${res.status}: ${reason}`
          );


        continue;

      }


      const text =
        data?.choices?.[0]?.message?.content?.trim();


      if (!text) {

        console.error(
          `[AI][GROQ] ${model} returned no text`
        );


        lastError =
          new Error(
            'Groq returned an empty response'
          );


        continue;

      }


      return {

        text,

        usage: {

          promptTokens:
            data?.usage?.prompt_tokens || 0,

          responseTokens:
            data?.usage?.completion_tokens || 0

        },

        model,

        provider:
          'groq'

      };

    } catch (error) {

      console.error(
        `[AI][GROQ] ${model} exception:`,
        error.message
      );

      lastError = error;

    }

  }


  throw (
    lastError ||
    new Error(
      'All Groq candidate models failed'
    )
  );

}


/* =========================================================
   GEMINI
========================================================= */

async function callGemini(
  systemPrompt,
  messages
) {

  const apiKey =
    cleanEnv(
      process.env.GEMINI_API_KEY
    );


  if (
    !apiKey ||
    apiKey.length < 10
  ) {

    throw new Error(
      'Gemini API key missing or invalid'
    );

  }


  /*
   * Current Gemini models.
   */

  const candidateModels = [

    'gemini-2.5-flash',

    'gemini-2.5-flash-lite'

  ];


  const contents =
    messages.map(message => ({

      role:
        message.sender_type === 'CUSTOMER'
          ? 'user'
          : 'model',

      parts: [
        {
          text:
            message.content
        }
      ]

    }));


  let lastError = null;


  for (
    const model of candidateModels
  ) {

    try {

      console.log(
        `[AI][GEMINI] Trying ${model}...`
      );


      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;


      const res =
        await fetchWithTimeout(

          url,

          {

            method: 'POST',

            headers: {

              'Content-Type':
                'application/json'

            },

            body: JSON.stringify({

              system_instruction: {

                parts: [

                  {
                    text:
                      systemPrompt
                  }

                ]

              },

              contents,

              generationConfig: {

                temperature:
                  0.3,

                maxOutputTokens:
                  500

              }

            })

          }

        );


      const data =
        await readResponse(res);


      if (!res.ok) {

        const reason =
          getProviderError(
            data,
            res
          );


        console.error(
          `[AI][GEMINI] ${model} failed: ${res.status} - ${reason}`
        );


        lastError =
          new Error(
            `Gemini ${res.status}: ${reason}`
          );


        continue;

      }


      const text =
        data
          ?.candidates?.[0]
          ?.content
          ?.parts
          ?.map(part => part.text || '')
          .join('')
          .trim();


      if (!text) {

        console.error(
          `[AI][GEMINI] ${model} returned no text`
        );


        lastError =
          new Error(
            'Gemini returned an empty response'
          );


        continue;

      }


      return {

        text,

        usage: {

          promptTokens:
            data
              ?.usageMetadata
              ?.promptTokenCount || 0,

          responseTokens:
            data
              ?.usageMetadata
              ?.candidatesTokenCount || 0

        },

        model,

        provider:
          'gemini'

      };

    } catch (error) {

      console.error(
        `[AI][GEMINI] ${model} exception:`,
        error.message
      );

      lastError = error;

    }

  }


  throw (
    lastError ||
    new Error(
      'All Gemini candidate models failed'
    )
  );

}


/* =========================================================
   MASTER FAILOVER
========================================================= */

export async function generateAICompletion({
  systemPrompt,
  messages
}) {

  const startTime =
    Date.now();


  const providers = [

    {
      name: 'openrouter',
      fn: callOpenRouter
    },

    {
      name: 'groq',
      fn: callGroq
    },

    {
      name: 'gemini',
      fn: callGemini
    }

  ];


  for (
    const provider of providers
  ) {

    try {

      console.log(
        `\n[AI] Trying ${provider.name}...`
      );


      const result =
        await provider.fn(
          systemPrompt,
          messages
        );


      if (
        result?.text &&
        result.text.length > 5
      ) {

        result.latencyMs =
          Date.now() -
          startTime;


        console.log(
          `[AI] ✅ ${provider.name} (${result.model}) responded in ${result.latencyMs}ms`
        );


        return result;

      }


    } catch (error) {

      console.error(
        `[AI] ❌ ${provider.name} failed:`,
        error.message
      );

    }

  }


  console.error(
    '[AI] ❌ ALL AI PROVIDERS FAILED'
  );


  return {

    text:
      'Thank you for reaching out to TEJUROLEX GLOBAL. Our team has been notified and will respond to you shortly. You can also visit tejurolexglobal.com for more information.',

    usage: {

      promptTokens: 0,

      responseTokens: 0

    },

    model:
      'safe-fallback',

    provider:
      'fallback',

    latencyMs:
      Date.now() -
      startTime

  };

}