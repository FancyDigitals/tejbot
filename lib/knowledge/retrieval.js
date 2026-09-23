import { query } from '../db/index.js';

/**
 * TEJUROLEX GLOBAL
 * Intelligent knowledge retrieval
 *
 * Keeps the existing API:
 * {
 *   contextText,
 *   hasSpecificKnowledge
 * }
 *
 * No embeddings or extra packages required.
 * Uses PostgreSQL full-text search + intelligent keyword matching.
 */

function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchTerms(messageText = '', intent = '') {
  const text = normalizeText(messageText);

  const stopWords = new Set([
    'the',
    'a',
    'an',
    'is',
    'are',
    'am',
    'i',
    'me',
    'my',
    'we',
    'you',
    'your',
    'to',
    'for',
    'of',
    'in',
    'on',
    'at',
    'and',
    'or',
    'do',
    'does',
    'can',
    'could',
    'would',
    'will',
    'what',
    'which',
    'where',
    'when',
    'how',
    'much',
    'about',
    'please',
    'want',
    'like',
    'tell',
    'know',
    'there',
    'this',
    'that',
    'with',
    'from',
    'have',
    'has',
    'be',
    'it',
    'me',
  ]);

  const words = text
    .split(/\s+/)
    .filter(word => word.length >= 2)
    .filter(word => !stopWords.has(word));

  const intentTerms = {
    COURSE_ENQUIRY: [
      'course',
      'programme',
      'program',
      'class',
      'german',
      'ielts',
      'language',
    ],

    PRICE_ENQUIRY: [
      'price',
      'cost',
      'fee',
      'fees',
      'tuition',
      'payment',
      'pay',
      'charges',
    ],

    SCHEDULE_ENQUIRY: [
      'schedule',
      'time',
      'date',
      'start',
      'duration',
      'weekend',
      'evening',
      'morning',
      'weekday',
    ],

    LOCATION_ENQUIRY: [
      'location',
      'address',
      'office',
      'ikeja',
      'lagos',
      'online',
      'zoom',
    ],

    REGISTRATION: [
      'register',
      'registration',
      'enrol',
      'enroll',
      'admission',
      'application',
    ],

    PAYMENT: [
      'payment',
      'pay',
      'bank',
      'account',
      'transfer',
    ],

    REQUIREMENTS: [
      'requirement',
      'requirements',
      'needed',
      'documents',
      'document',
      'eligibility',
    ],

    COURSE_RECOMMENDATION: [
      'recommend',
      'recommendation',
      'which',
      'best',
      'suitable',
      'choose',
    ],

    GENERAL_ENQUIRY: [
      'information',
      'details',
      'help',
      'service',
    ],
  };

  const expanded = [
    ...words,
    ...(intentTerms[intent] || []),
  ];

  return [...new Set(expanded)];
}

function scoreKnowledgeItem(item, terms, messageText, intent) {
  const title = normalizeText(item.title);
  const category = normalizeText(item.category);
  const content = normalizeText(item.content);

  let score = 0;

  for (const term of terms) {
    if (title.includes(term)) score += 12;
    if (category.includes(term)) score += 8;
    if (content.includes(term)) score += 2;
  }

  const original = normalizeText(messageText);

  if (original && title.includes(original)) {
    score += 40;
  }

  const categoryIntentMap = {
    PRICE_ENQUIRY: ['price', 'pricing', 'fees', 'tuition', 'payment'],
    SCHEDULE_ENQUIRY: ['schedule', 'class', 'timing'],
    LOCATION_ENQUIRY: ['location', 'address'],
    REGISTRATION: ['registration', 'admission', 'enrollment'],
    PAYMENT: ['payment', 'fees'],
    REQUIREMENTS: ['requirements', 'admission'],
    COURSE_ENQUIRY: ['course', 'programme', 'language'],
  };

  const relevantCategories = categoryIntentMap[intent] || [];

  for (const categoryTerm of relevantCategories) {
    if (
      category.includes(categoryTerm) ||
      title.includes(categoryTerm)
    ) {
      score += 10;
    }
  }

  score += Number(item.priority || 0);

  return score;
}

function formatKnowledgeItem(item) {
  return `
[${String(item.category || 'GENERAL').toUpperCase()}]
${item.title}
${item.content}
`.trim();
}

export async function retrieveKnowledgeContext({
  messageText = '',
  intent = '',
} = {}) {
  try {
    // =========================================================
    // 1. SEARCH KNOWLEDGE ITEMS
    // =========================================================

    const knowledgeRes = await query(
      `
        SELECT
          id,
          title,
          category,
          content,
          priority
        FROM knowledge_items
        WHERE is_published = TRUE
        ORDER BY priority DESC, title ASC
      `
    );

    const terms = buildSearchTerms(messageText, intent);

    const scoredKnowledge = knowledgeRes.rows
      .map(item => ({
        item,
        score: scoreKnowledgeItem(
          item,
          terms,
          messageText,
          intent
        ),
      }))
      .sort((a, b) => b.score - a.score);

    /*
     * Only include relevant knowledge when possible.
     *
     * Keep a small amount of high-priority general knowledge
     * available as fallback.
     */
    // Critical knowledge is ALWAYS available to TejBot.
// Normal knowledge remains intelligently retrieved.
const alwaysAvailableKnowledge = knowledgeRes.rows
  .filter(item => Number(item.priority || 0) >= 9);

const relevantKnowledge = [
  ...alwaysAvailableKnowledge,
  ...scoredKnowledge
    .filter(result => result.score > 0)
    .map(result => result.item),
]
  .filter(
    (item, index, self) =>
      index === self.findIndex(x => x.id === item.id)
  )
  .slice(0, 15);

    // =========================================================
    // 2. SEARCH COURSES
    // =========================================================

    const courseRes = await query(
      `
        SELECT
          name,
          level,
          price,
          duration,
          schedule,
          description
        FROM courses
        WHERE is_active = TRUE
        ORDER BY level ASC, name ASC
      `
    );

    const normalizedMessage = normalizeText(messageText);

    const relevantCourses = courseRes.rows
      .map(course => {
        const name = normalizeText(course.name);
        const level = normalizeText(course.level);
        const description = normalizeText(course.description || '');

        let score = 0;

        for (const term of terms) {
          if (name.includes(term)) score += 15;
          if (level.includes(term)) score += 15;
          if (description.includes(term)) score += 3;
        }

        if (
          normalizedMessage.includes('german') &&
          name.includes('german')
        ) {
          score += 20;
        }

        if (
          normalizedMessage.includes('ielts') &&
          name.includes('ielts')
        ) {
          score += 25;
        }

        if (
          intent === 'PRICE_ENQUIRY' ||
          intent === 'COURSE_ENQUIRY' ||
          intent === 'SCHEDULE_ENQUIRY' ||
          intent === 'COURSE_RECOMMENDATION'
        ) {
          score += 3;
        }

        return {
          course,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);

    /*
     * If the customer clearly mentions a course,
     * return matching courses.
     *
     * For broad course questions, return the catalogue.
     */
    let selectedCourses = relevantCourses
      .filter(result => result.score > 0)
      .slice(0, 5)
      .map(result => result.course);

    if (
      selectedCourses.length === 0 &&
      (
        intent === 'COURSE_ENQUIRY' ||
        intent === 'COURSE_RECOMMENDATION'
      )
    ) {
      selectedCourses = courseRes.rows.slice(0, 8);
    }

    // =========================================================
    // 3. FAQ RETRIEVAL
    // =========================================================

    let faqRows = [];

    try {
      const faqRes = await query(
        `
          SELECT question, answer
          FROM faqs
          WHERE is_published = TRUE
        `
      );

      faqRows = faqRes.rows;
    } catch (error) {
      /*
       * Some installations may not have the FAQ table yet.
       * Do not break the AI because of that.
       */
      console.warn(
        '[KNOWLEDGE] FAQ retrieval skipped:',
        error.message
      );
    }

    const relevantFaqs = faqRows
      .map(faq => {
        const question = normalizeText(faq.question);
        const answer = normalizeText(faq.answer);

        let score = 0;

        for (const term of terms) {
          if (question.includes(term)) score += 15;
          if (answer.includes(term)) score += 3;
        }

        return {
          faq,
          score,
        };
      })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(result => result.faq);

    // =========================================================
    // 4. BUILD CONTEXT
    // =========================================================

    let contextText = `
### TEJUROLEX GLOBAL VERIFIED KNOWLEDGE

Official Website:
tejurolexglobal.com

Head Office & Learning Center:
Suit 43, Primal Tek Plaza, Egbeda, Lagos

Learning Formats:
Physical interactive classes in Egbeda OR live interactive online classes via convenient LMS.
`;

    if (selectedCourses.length > 0) {
      contextText += `

--- RELEVANT COURSE INFORMATION ---
`;

      for (const course of selectedCourses) {
        const priceValue = Number(course.price);

        const price =
          Number.isFinite(priceValue) && priceValue > 0
            ? `₦${priceValue.toLocaleString()}`
            : 'Contact admissions for the current tuition breakdown';

        contextText += `
Course: ${course.name}
Level: ${course.level || 'Not specified'}
Fee: ${price}
Duration: ${course.duration || 'Not specified'}
Schedule: ${course.schedule || 'Not specified'}
Details: ${
          course.description ||
          'No additional description provided.'
        }
`;
      }
    }

    if (relevantKnowledge.length > 0) {
      contextText += `

--- RELEVANT BUSINESS KNOWLEDGE ---
`;

      for (const item of relevantKnowledge) {
        contextText += `

${formatKnowledgeItem(item)}
`;
      }
    }

    if (relevantFaqs.length > 0) {
      contextText += `

--- RELEVANT FAQS ---
`;

      for (const faq of relevantFaqs) {
        contextText += `

Q: ${faq.question}
A: ${faq.answer}
`;
      }
    }

    // =========================================================
    // 5. DETERMINE WHETHER WE ACTUALLY FOUND KNOWLEDGE
    // =========================================================

    const hasSpecificKnowledge =
      selectedCourses.length > 0 ||
      relevantKnowledge.length > 0 ||
      relevantFaqs.length > 0;

    console.log(
      `[KNOWLEDGE] "${messageText}" | intent=${intent} | ` +
      `courses=${selectedCourses.length} | ` +
      `knowledge=${relevantKnowledge.length} | ` +
      `faqs=${relevantFaqs.length}`
    );

    return {
      contextText: contextText.trim(),
      hasSpecificKnowledge,
    };
  } catch (error) {
    console.error(
      '[KNOWLEDGE RETRIEVAL ERROR]',
      error.message
    );

    /*
     * Safe fallback.
     * The AI still knows the core verified company identity,
     * but must not fabricate detailed business information.
     */
    return {
      contextText: `
### TEJUROLEX GLOBAL VERIFIED CORE INFORMATION

Official Website:
tejurolexglobal.com

Head Office & Learning Center:
Suit 43, Primal Tek Plaza, Egbeda, Lagos, Nigeria

Learning Formats:
Physical interactive classes in Egbeda OR live interactive online classes via our online LMS.

Detailed knowledge retrieval is temporarily unavailable.
Do not invent missing business information.
`.trim(),

      hasSpecificKnowledge: true,
    };
  }
}