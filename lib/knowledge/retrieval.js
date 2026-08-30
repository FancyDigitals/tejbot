import { query } from '../db/index.js';
import { INTENTS } from '../constants/intents.js';

/**
 * Retrieve verified business knowledge based on customer query and detected intent
 * Zero Hallucination: AI will only receive verified DB records.
 */
export async function retrieveKnowledgeContext({ messageText, intent }) {
  const terms = messageText
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  let categoryFilter = null;

  if (intent === INTENTS.PRICE_ENQUIRY) categoryFilter = 'pricing';
  else if (intent === INTENTS.SCHEDULE_ENQUIRY) categoryFilter = 'schedules';
  else if (intent === INTENTS.LOCATION_ENQUIRY) categoryFilter = 'locations';
  else if (intent === INTENTS.REGISTRATION) categoryFilter = 'registration';
  else if (intent === INTENTS.PAYMENT) categoryFilter = 'payments';
  else if (intent === INTENTS.REQUIREMENTS) categoryFilter = 'requirements';
  else if (intent === INTENTS.COURSE_ENQUIRY) categoryFilter = 'courses';

  let knowledgeRows = [];

  if (categoryFilter) {
    const catRes = await query(
      `SELECT title, content, category FROM knowledge_items 
       WHERE is_published = TRUE AND category = $1 
       ORDER BY priority DESC LIMIT 4`,
      [categoryFilter]
    );
    knowledgeRows = catRes.rows;
  }

  // If no category-specific items or search needs broader context, query relevant keywords
  if (knowledgeRows.length === 0 && terms.length > 0) {
    const keywordQuery = terms.map((_, i) => `(LOWER(title) LIKE $${i + 1} OR LOWER(content) LIKE $${i + 1})`).join(' OR ');
    const params = terms.map(t => `%${t}%`);

    const searchRes = await query(
      `SELECT title, content, category FROM knowledge_items 
       WHERE is_published = TRUE AND (${keywordQuery}) 
       ORDER BY priority DESC LIMIT 4`,
      params
    );
    knowledgeRows = searchRes.rows;
  }

  // Also query active Course catalog if course or pricing is relevant
  const courseRes = await query(
    `SELECT name, level, price, duration, schedule, description 
     FROM courses 
     WHERE is_active = TRUE 
     ORDER BY name ASC LIMIT 10`
  );

  // Query FAQs
  const faqRes = await query(
    `SELECT question, answer FROM faqs 
     WHERE is_published = TRUE 
     LIMIT 5`
  );

  let formattedContext = '### TEJUROLEX GLOBAL OFFICIAL KNOWLEDGE BASE\n';

  if (knowledgeRows.length > 0) {
    formattedContext += '\n--- Verified Policy & Business Information ---\n';
    knowledgeRows.forEach(item => {
      formattedContext += `[${item.category.toUpperCase()}] ${item.title}:\n${item.content}\n\n`;
    });
  }

  if (courseRes.rows.length > 0) {
    formattedContext += '\n--- Available Courses & Official Pricing ---\n';
    courseRes.rows.forEach(c => {
      formattedContext += `• ${c.name} (${c.level}): Fee: ₦${Number(c.price).toLocaleString()} | Duration: ${c.duration} | Schedule: ${c.schedule}\n  Description: ${c.description || 'Standard Curriculum'}\n`;
    });
  }

  if (faqRes.rows.length > 0) {
    formattedContext += '\n--- Frequently Asked Questions ---\n';
    faqRes.rows.forEach(f => {
      formattedContext += `Q: ${f.question}\nA: ${f.answer}\n`;
    });
  }

  const hasSpecificKnowledge = knowledgeRows.length > 0 || courseRes.rows.length > 0;

  return {
    contextText: formattedContext,
    hasSpecificKnowledge,
  };
}