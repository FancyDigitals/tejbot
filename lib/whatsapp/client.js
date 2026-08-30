/**
 * TEJUROLEX GLOBAL — WhatsApp Cloud API Client
 */

const WHATSAPP_API_VERSION = 'v19.0';

/**
 * Send a plain text message via WhatsApp Cloud API
 * @param {string} to - Recipient phone number in international format without '+' (e.g., '2348031234567')
 * @param {string} messageText - Body of the message
 */
export async function sendWhatsAppMessage(to, messageText) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn('[WHATSAPP MOCK] Missing credentials. Message not sent to WhatsApp API:', { to, messageText });
    return { success: true, mocked: true, messageId: `mock_${Date.now()}` };
  }

  const cleanTo = to.replace(/[^0-9]/g, '');

  try {
    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'text',
          text: {
            preview_url: false,
            body: messageText,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[WHATSAPP API ERROR]', data);
      throw new Error(data?.error?.message || 'Failed to send WhatsApp message');
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error) {
    console.error('[WHATSAPP SEND EXCEPTION]', error.message);
    throw error;
  }
}

/**
 * Mark an incoming WhatsApp message as 'read'
 * @param {string} messageId - External message ID from WhatsApp
 */
export async function markWhatsAppMessageAsRead(messageId) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId || !messageId) return;

  try {
    await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      }
    );
  } catch (error) {
    console.error('[WHATSAPP MARK READ ERROR]', error.message);
  }
}