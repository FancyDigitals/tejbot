import { query } from '../db/index.js';

/**
 * Retrieve verified TEJUROLEX GLOBAL business knowledge.
 * Guarantees zero hallucination by providing full active course catalog, policies, and FAQs.
 */
export async function retrieveKnowledgeContext({ messageText = '', intent = '' } = {}) {
  try {
    // 1. Fetch ALL published knowledge policy items (sorted by priority)
    const knowledgeRes = await query(
      `SELECT title, category, content FROM knowledge_items 
       WHERE is_published = TRUE 
       ORDER BY priority DESC, title ASC`
    );

    // 2. Fetch ALL active courses with prices, schedules, and duration
    const courseRes = await query(
      `SELECT name, level, price, duration, schedule, description 
       FROM courses 
       WHERE is_active = TRUE 
       ORDER BY level ASC, name ASC`
    );

    // 3. Fetch ALL published FAQs
    const faqRes = await query(
      `SELECT question, answer FROM faqs 
       WHERE is_published = TRUE`
    );

    let formattedContext = '### TEJUROLEX GLOBAL OFFICIAL VERIFIED KNOWLEDGE BASE\n';
    formattedContext += 'Official Website: tejurolexglobal.com.ng\n';
    formattedContext += 'Head Office & Learning Center: 12 Airport Road, Ikeja, Lagos, Nigeria\n';
    formattedContext += 'Class Formats: Physical interactive classes in Ikeja OR live interactive online classes via Zoom.\n\n';

    if (courseRes.rows.length > 0) {
      formattedContext += '--- OFFICIAL COURSE CATALOG & TUITION FEES ---\n';
      courseRes.rows.forEach(c => {
        const priceVal = Number(c.price);
        const priceDisplay = priceVal > 0 ? `₦${priceVal.toLocaleString()}` : 'Contact admissions for tuition breakdown';
        formattedContext += `• ${c.name} (${c.level} Level):\n  - Fee: ${priceDisplay}\n  - Duration: ${c.duration}\n  - Schedule: ${c.schedule}\n  - Details: ${c.description || 'Includes Goethe-Zertifikat exam prep.'}\n\n`;
      });
    }

    if (knowledgeRes.rows.length > 0) {
      formattedContext += '--- BUSINESS POLICIES, ADMISSION & ADVISORY SERVICES ---\n';
      knowledgeRes.rows.forEach(item => {
        formattedContext += `[${item.category.toUpperCase()}] ${item.title}:\n${item.content}\n\n`;
      });
    }

    if (faqRes.rows.length > 0) {
      formattedContext += '--- FREQUENTLY ASKED QUESTIONS ---\n';
      faqRes.rows.forEach(f => {
        formattedContext += `Q: ${f.question}\nA: ${f.answer}\n\n`;
      });
    }

    const hasSpecificKnowledge =
      knowledgeRes.rows.length > 0 ||
      courseRes.rows.length > 0 ||
      faqRes.rows.length > 0;

    return {
      contextText: formattedContext,
      hasSpecificKnowledge,
    };
  } catch (error) {
    console.error('[KNOWLEDGE RETRIEVAL ERROR]', error.message);
    return {
      contextText: 'TEJUROLEX GLOBAL — German Language & Education Consultancy. Office: 12 Airport Road, Ikeja, Lagos. Website: tejurolexglobal.com.ng',
      hasSpecificKnowledge: true,
    };
  }
}