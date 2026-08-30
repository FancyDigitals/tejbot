/**
 * Parse incoming webhook payload from Meta WhatsApp Cloud API
 * @param {Object} body - Raw JSON payload received from Meta
 * @returns {Array<{messageId: string, from: string, name: string, text: string, timestamp: string, type: string}>}
 */
export function extractWhatsAppMessages(body) {
  const extracted = [];

  if (!body || body.object !== 'whatsapp_business_account') {
    return extracted;
  }

  const entries = body.entry || [];
  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      const value = change.value;
      if (!value || !value.messages) continue;

      const contacts = value.contacts || [];
      const contactMap = {};
      contacts.forEach(c => {
        contactMap[c.wa_id] = c.profile?.name || 'Customer';
      });

      for (const msg of value.messages) {
        let textContent = '';

        if (msg.type === 'text') {
          textContent = msg.text?.body || '';
        } else if (msg.type === 'button') {
          textContent = msg.button?.text || msg.button?.payload || '';
        } else if (msg.type === 'interactive') {
          textContent = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
        } else {
          textContent = `[Received media message: ${msg.type}]`;
        }

        extracted.push({
          messageId: msg.id,
          from: msg.from,
          name: contactMap[msg.from] || 'Customer',
          text: textContent.trim(),
          timestamp: msg.timestamp ? new Date(parseInt(msg.timestamp, 10) * 1000).toISOString() : new Date().toISOString(),
          type: msg.type,
        });
      }
    }
  }

  return extracted;
}