import dotenv from 'dotenv';
import pg from 'pg';
import crypto from 'crypto';

dotenv.config();

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL not set in .env');
    process.exit(1);
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const pool = new pg.Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'true' || !isLocal ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🌱 Seeding TEJUROLEX GLOBAL production knowledge base...');

    // ===== COURSES =====
    const courses = [
      {
        name: 'German A1 Beginner Programme',
        level: 'A1',
        price: 0, // UPDATE WITH REAL PRICE
        duration: '8 Weeks',
        schedule: 'Weekday evenings and weekend batches available',
        description: 'Complete beginner German course covering basic grammar, vocabulary, pronunciation, and everyday conversations. Includes Goethe-Zertifikat A1 exam preparation. Suitable for absolute beginners with no prior German knowledge.',
      },
      {
        name: 'German A2 Elementary Programme',
        level: 'A2',
        price: 0, // UPDATE WITH REAL PRICE
        duration: '8 Weeks',
        schedule: 'Weekday evenings and weekend batches available',
        description: 'Elementary German course building on A1 foundations. Covers past tense, modal verbs, daily routines, and extended conversations. Includes Goethe-Zertifikat A2 exam preparation.',
      },
      {
        name: 'German B1 Intermediate Programme',
        level: 'B1',
        price: 0, // UPDATE WITH REAL PRICE
        duration: '10 Weeks',
        schedule: 'Weekday evenings and weekend batches available',
        description: 'Intermediate German required for Ausbildung (vocational training), job seeker visas, and university pathway applications in Germany. Includes Goethe-Zertifikat B1 exam preparation.',
      },
      {
        name: 'German B2 Upper Intermediate Programme',
        level: 'B2',
        price: 0, // UPDATE WITH REAL PRICE
        duration: '12 Weeks',
        schedule: 'Weekday evenings and weekend batches available',
        description: 'Advanced German for university admission, professional employment, and permanent residency applications in Germany. Includes Goethe-Zertifikat B2 and TestDaF preparation.',
      },
      {
        name: 'IELTS Preparation Programme',
        level: 'IELTS',
        price: 0, // UPDATE WITH REAL PRICE
        duration: '6 Weeks',
        schedule: 'Flexible weekday and weekend batches',
        description: 'Comprehensive IELTS preparation covering all four modules: Listening, Reading, Writing, and Speaking. Target band 6.5-8.0. Includes mock tests and personalized feedback.',
      },
    ];

    for (const c of courses) {
      await pool.query(
        `INSERT INTO courses (id, name, level, price, duration, schedule, description, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
         ON CONFLICT (name) DO UPDATE SET
           duration = EXCLUDED.duration,
           schedule = EXCLUDED.schedule,
           description = EXCLUDED.description`,
        [crypto.randomUUID(), c.name, c.level, c.price, c.duration, c.schedule, c.description]
      );
    }

    // ===== KNOWLEDGE ITEMS =====
    const knowledge = [
      {
        title: 'About TEJUROLEX GLOBAL',
        category: 'general',
        content: 'TEJUROLEX GLOBAL is a leading Nigerian education consultancy and language training institute. We specialize in German language training, study abroad programmes, German Ausbildung placement, visa guidance, university admissions, and document certification. Our website is tejurolexglobal.com.ng.',
        priority: 10,
      },
      {
        title: 'German Language Class Levels',
        category: 'courses',
        content: 'We offer German language classes at all CEFR levels: A1 (Beginner), A2 (Elementary), B1 (Intermediate), and B2 (Upper Intermediate). All programmes include Goethe-Institut exam preparation. Classes are available in physical and online formats. Both weekday evening and weekend batches are available.',
        priority: 10,
      },
      {
        title: 'Study in Germany Services',
        category: 'services',
        content: 'TEJUROLEX GLOBAL provides end-to-end study in Germany support including: university admission processing, blocked account setup guidance, student visa application support, accommodation assistance, and pre-departure orientation. We work with universities across Germany.',
        priority: 9,
      },
      {
        title: 'Ausbildung (Vocational Training) Programme',
        category: 'services',
        content: 'We assist Nigerian candidates in securing German Ausbildung (vocational training) placements in fields such as nursing, hospitality, IT, logistics, and skilled trades. Requirements include minimum German B1 level, relevant qualifications, and age typically between 18-35.',
        priority: 9,
      },
      {
        title: 'German Opportunity Card (Chancenkarte)',
        category: 'services',
        content: 'TEJUROLEX GLOBAL provides advisory and document preparation support for the German Opportunity Card (Chancenkarte), which allows skilled professionals to enter Germany to search for employment. Requirements include a recognized qualification, German A1 or English B2 proficiency, and proof of financial means.',
        priority: 8,
      },
      {
        title: 'Registration Process',
        category: 'registration',
        content: 'To register for any TEJUROLEX GLOBAL programme: 1) Choose your desired course or service, 2) Contact us via WhatsApp or visit tejurolexglobal.com.ng, 3) Provide your full name, email, and phone number, 4) Receive your enrollment invoice, 5) Complete payment, 6) Receive your student portal access and learning materials. Registration is open throughout the year.',
        priority: 10,
      },
      {
        title: 'Payment Information',
        category: 'payments',
        content: 'TEJUROLEX GLOBAL accepts payment via bank transfer to our official corporate account. Payment details and invoices are provided upon registration confirmation. Installment payment plans may be available for select programmes. For exact pricing and payment details, please contact our team directly or visit tejurolexglobal.com.ng.',
        priority: 10,
      },
      {
        title: 'Class Formats and Schedule',
        category: 'schedules',
        content: 'We offer both physical classroom sessions and live interactive online classes via Zoom. Physical classes are held at our learning center. Online classes are available for students anywhere in Nigeria and worldwide. Weekday evening batches and weekend intensive batches are available. Specific class times are confirmed upon enrollment.',
        priority: 9,
      },
      {
        title: 'Document Translation and Certification',
        category: 'services',
        content: 'TEJUROLEX GLOBAL offers certified document translation services (English to German and German to English), document verification, and legalization support for visa applications, university admissions, and employment purposes.',
        priority: 7,
      },
      {
        title: 'Visa Application Support',
        category: 'services',
        content: 'We provide comprehensive German visa application guidance including: student visa, job seeker visa, Ausbildung visa, and Opportunity Card visa. Our team helps with document checklists, application form review, embassy appointment scheduling guidance, and interview preparation.',
        priority: 8,
      },
    ];

    for (const k of knowledge) {
      await pool.query(
        `INSERT INTO knowledge_items (id, title, category, content, is_published, priority)
         VALUES ($1, $2, $3, $4, TRUE, $5)`,
        [crypto.randomUUID(), k.title, k.category, k.content, k.priority]
      );
    }

    // ===== FAQs =====
    const faqs = [
      { question: 'Do I need any prior German knowledge to start A1?', answer: 'No, our A1 programme is designed for absolute beginners with zero German knowledge. We start from the very basics including the alphabet, pronunciation, and simple greetings.' },
      { question: 'Are your classes physical or online?', answer: 'We offer both options: physical classes at our learning center and live interactive online classes via Zoom. You can choose the format that works best for you.' },
      { question: 'Do you prepare students for Goethe-Institut exams?', answer: 'Yes, all our German language programmes include dedicated Goethe-Zertifikat exam preparation. We cover all exam modules: Lesen, Hören, Schreiben, and Sprechen.' },
      { question: 'How long does it take to complete A1 to B1?', answer: 'Typically, A1 takes 8 weeks, A2 takes 8 weeks, and B1 takes 10 weeks. So from zero to B1, you can expect approximately 6-7 months of consistent study.' },
      { question: 'Can I study in Germany without knowing German?', answer: 'Some English-taught programmes exist, but most German universities and all Ausbildung programmes require German proficiency (usually B1 or B2). We recommend starting German classes as early as possible.' },
      { question: 'What is the German Opportunity Card?', answer: 'The Chancenkarte (Opportunity Card) is a German immigration pathway that allows skilled professionals from outside the EU to enter Germany for up to one year to search for employment. You need a recognized qualification and basic German (A1) or English (B2) proficiency.' },
      { question: 'Can I pay in installments?', answer: 'Yes, installment payment plans may be available for select programmes. Please contact our team for specific payment options.' },
      { question: 'How do I register?', answer: 'Simply message us here on WhatsApp with your full name and the programme you are interested in, or visit our website at tejurolexglobal.com.ng. Our team will guide you through the enrollment process.' },
    ];

    for (const f of faqs) {
      await pool.query(
        `INSERT INTO faqs (id, question, answer, is_published)
         VALUES ($1, $2, $3, TRUE)`,
        [crypto.randomUUID(), f.question, f.answer]
      );
    }

    console.log('✅ Production knowledge base seeded successfully!');
    console.log('📌 IMPORTANT: Update course prices in the Knowledge Base UI or database.');
  } catch (err) {
    console.error('❌ Seeding Error:', err.message);
  } finally {
    await pool.end();
  }
}

seed();