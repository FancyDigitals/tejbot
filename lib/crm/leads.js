import { query } from '../db/index.js';
import crypto from 'crypto';
import { LEAD_STATUSES, LEAD_TEMPERATURES } from '../constants/statuses.js';
import { INTENTS } from '../constants/intents.js';

/**
 * Evaluate and update lead scoring based on customer message and intent
 */
export async function updateLeadScoreAndStatus(customerId, { intent, extractedData = {}, messageText = '' }) {
  const existingLeadRes = await query(
    `SELECT * FROM leads WHERE customer_id = $1 LIMIT 1`,
    [customerId]
  );

  let lead = existingLeadRes.rows[0];
  let leadScore = lead?.lead_score || 0;
  let leadTemperature = lead?.lead_temperature || LEAD_TEMPERATURES.COLD;
  let status = lead?.status || LEAD_STATUSES.NEW;

  // Rule-based Lead Scoring
  const lowerMsg = messageText.toLowerCase();

  if (
    intent === INTENTS.READY_TO_BUY ||
    intent === INTENTS.REGISTRATION ||
    intent === INTENTS.PAYMENT ||
    lowerMsg.includes('register') ||
    lowerMsg.includes('how to pay') ||
    lowerMsg.includes('bank details') ||
    lowerMsg.includes('account number') ||
    lowerMsg.includes('payment link')
  ) {
    leadScore += 50;
    leadTemperature = LEAD_TEMPERATURES.HOT;
    status = status === LEAD_STATUSES.REGISTERED ? LEAD_STATUSES.REGISTERED : LEAD_STATUSES.READY_TO_REGISTER;
  } else if (
    intent === INTENTS.PRICE_ENQUIRY ||
    intent === INTENTS.SCHEDULE_ENQUIRY ||
    intent === INTENTS.COURSE_ENQUIRY ||
    intent === INTENTS.REQUIREMENTS
  ) {
    leadScore += 20;
    if (leadTemperature !== LEAD_TEMPERATURES.HOT) {
      leadTemperature = LEAD_TEMPERATURES.WARM;
      if (status === LEAD_STATUSES.NEW) status = LEAD_STATUSES.INTERESTED;
    }
  } else if (intent === INTENTS.GREETING) {
    leadScore += 5;
    if (status === LEAD_STATUSES.NEW) status = LEAD_STATUSES.CONTACTED;
  }

  // Cap score at 100
  if (leadScore > 100) leadScore = 100;

  if (lead) {
    const updated = await query(
      `UPDATE leads SET
        interested_course = COALESCE($1, interested_course),
        current_level = COALESCE($2, current_level),
        learning_goal = COALESCE($3, learning_goal),
        preferred_schedule = COALESCE($4, preferred_schedule),
        location = COALESCE($5, location),
        lead_score = $6,
        lead_temperature = $7,
        status = $8,
        last_contact_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 RETURNING *`,
      [
        extractedData.interestedCourse || null,
        extractedData.currentLevel || null,
        extractedData.learningGoal || null,
        extractedData.preferredSchedule || null,
        extractedData.location || null,
        leadScore,
        leadTemperature,
        status,
        lead.id,
      ]
    );
    return updated.rows[0];
  } else {
    const id = crypto.randomUUID();
    const inserted = await query(
      `INSERT INTO leads (
        id, customer_id, interested_course, current_level, learning_goal,
        preferred_schedule, location, lead_score, lead_temperature, status, last_contact_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        id,
        customerId,
        extractedData.interestedCourse || null,
        extractedData.currentLevel || null,
        extractedData.learningGoal || null,
        extractedData.preferredSchedule || null,
        extractedData.location || null,
        leadScore,
        leadTemperature,
        status,
      ]
    );
    return inserted.rows[0];
  }
}