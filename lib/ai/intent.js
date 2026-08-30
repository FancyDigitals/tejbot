import { INTENTS } from '../constants/intents.js';

/**
 * Fast Rule + Pattern Intent Classifier
 */
export function classifyIntent(text) {
  if (!text) return INTENTS.UNKNOWN;
  const lower = text.toLowerCase().trim();

  // Opt out
  if (/^(stop|unsubscribe|don'?t message me|cancel|opt out)$/i.test(lower)) {
    return INTENTS.OPT_OUT;
  }

  // Human Agent Requests
  if (
    lower.includes('human') ||
    lower.includes('speak with someone') ||
    lower.includes('talk to someone') ||
    lower.includes('call me') ||
    lower.includes('agent') ||
    lower.includes('representative') ||
    lower.includes('customer care')
  ) {
    return INTENTS.HUMAN_REQUEST;
  }

  // Buying & Registration Signals
  if (
    lower.includes('i want to register') ||
    lower.includes('how do i register') ||
    lower.includes('registration link') ||
    lower.includes('ready to pay') ||
    lower.includes('account number') ||
    lower.includes('payment details') ||
    lower.includes('how to pay')
  ) {
    return INTENTS.REGISTRATION;
  }

  // Price inquiries
  if (
    lower.includes('how much') ||
    lower.includes('cost') ||
    lower.includes('price') ||
    lower.includes('fee') ||
    lower.includes('charges') ||
    lower.includes('tuition')
  ) {
    return INTENTS.PRICE_ENQUIRY;
  }

  // Schedule inquiries
  if (
    lower.includes('when is the class') ||
    lower.includes('schedule') ||
    lower.includes('start date') ||
    lower.includes('weekend') ||
    lower.includes('evening') ||
    lower.includes('duration') ||
    lower.includes('how long')
  ) {
    return INTENTS.SCHEDULE_ENQUIRY;
  }

  // Location inquiries
  if (
    lower.includes('where are you located') ||
    lower.includes('office address') ||
    lower.includes('location') ||
    lower.includes('address')
  ) {
    return INTENTS.LOCATION_ENQUIRY;
  }

  // Course inquiries
  if (
    lower.includes('german') ||
    lower.includes('a1') ||
    lower.includes('a2') ||
    lower.includes('b1') ||
    lower.includes('b2') ||
    lower.includes('ielts') ||
    lower.includes('course') ||
    lower.includes('classes')
  ) {
    return INTENTS.COURSE_ENQUIRY;
  }

  // Greetings
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|howdy|xup|morning)/i.test(lower)) {
    return INTENTS.GREETING;
  }

  return INTENTS.GENERAL_ENQUIRY;
}

/**
 * Extract lead details from text
 */
export function extractLeadDetails(text) {
  const extracted = {};
  const lower = text.toLowerCase();

  if (lower.includes('a1')) extracted.interestedCourse = 'German A1';
  else if (lower.includes('a2')) extracted.interestedCourse = 'German A2';
  else if (lower.includes('b1')) extracted.interestedCourse = 'German B1';
  else if (lower.includes('b2')) extracted.interestedCourse = 'German B2';

  if (lower.includes('weekend')) extracted.preferredSchedule = 'Weekend';
  else if (lower.includes('evening')) extracted.preferredSchedule = 'Evening';
  else if (lower.includes('morning') || lower.includes('weekday')) extracted.preferredSchedule = 'Weekday Morning';

  if (lower.includes('lagos')) extracted.location = 'Lagos';
  else if (lower.includes('abuja')) extracted.location = 'Abuja';
  else if (lower.includes('ibadan')) extracted.location = 'Ibadan';
  else if (lower.includes('online')) extracted.location = 'Online';

  return extracted;
}