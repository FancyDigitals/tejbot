import { query } from '../db/index.js';
import crypto from 'crypto';

/**
 * Find or create a customer by their WhatsApp ID
 */
export async function findOrCreateCustomer(whatsappId, name = null) {
  const cleanId = whatsappId.replace(/[^0-9]/g, '');

  const existing = await query(
    `SELECT * FROM customers WHERE whatsapp_id = $1 OR phone = $1 LIMIT 1`,
    [cleanId]
  );

  if (existing.rows.length > 0) {
    const customer = existing.rows[0];
    if (name && (!customer.name || customer.name === 'Customer')) {
      await query(
        `UPDATE customers SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [name, customer.id]
      );
      customer.name = name;
    }
    return customer;
  }

  const id = crypto.randomUUID();
  const insertRes = await query(
    `INSERT INTO customers (id, whatsapp_id, phone, name)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id, cleanId, cleanId, name || 'Customer']
  );

  return insertRes.rows[0];
}