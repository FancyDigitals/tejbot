import dotenv from 'dotenv';
import pg from 'pg';
import crypto from 'crypto';

dotenv.config();

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🌱 Seeding Staff Users and approved WhatsApp Templates...');

    // 1. Seed Team Members
    const users = [
      { id: crypto.randomUUID(), email: 'director@tejurolexglobal.com.ng', password: 'pbkdf2_placeholder_hash', name: 'Director Tejurolex', role: 'OWNER' },
      { id: crypto.randomUUID(), email: 'admissions@tejurolexglobal.com.ng', password: 'pbkdf2_placeholder_hash', name: 'Lead Admissions Advisor', role: 'ADMIN' },
      { id: crypto.randomUUID(), email: 'counselor@tejurolexglobal.com.ng', password: 'pbkdf2_placeholder_hash', name: 'German Language Counselor', role: 'AGENT' },
    ];

    for (const u of users) {
      await pool.query(`
        INSERT INTO users (id, email, password_hash, name, role, is_active)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        ON CONFLICT (email) DO NOTHING
      `, [u.id, u.email, u.password, u.name, u.role]);
    }

    // 2. Seed WhatsApp Message Templates
    const templates = [
      {
        id: crypto.randomUUID(),
        name: 'German A1 Course Details',
        category: 'pricing',
        content: `Hi! 👋\n\nOur German A1 Intensive Course fee is ₦150,000.\n\nDuration: 8 Weeks\nSchedule: Mondays, Wednesdays & Fridays (6:00 PM – 8:30 PM)\n\nWe offer both physical and Zoom classes with certified Goethe tutors. Would you like to reserve your seat? 🎓🇩🇪`
      },
      {
        id: crypto.randomUUID(),
        name: 'Enrollment & Bank Transfer',
        category: 'registration',
        content: `Great! 🎓 To complete your enrollment, please transfer the tuition fee to our official bank account:\n\nBank: Access Bank\nAccount Name: TEJUROLEX GLOBAL LTD\nAccount Number: 1234567890\n\nPlease send your payment receipt here on WhatsApp so we can generate your student portal login details right away!`
      },
      {
        id: crypto.randomUUID(),
        name: 'Admissions Human Handoff',
        category: 'welcome',
        content: `I'm connecting you right away with a TEJUROLEX GLOBAL admissions advisor who will assist you with details on Germany university pathways and Ausbildung placements. Please hold on for a moment! 🙏`
      }
    ];

    for (const t of templates) {
      await pool.query(`
        INSERT INTO message_templates (id, name, category, content)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO NOTHING
      `, [t.id, t.name, t.category, t.content]);
    }

    console.log('✅ Approved message templates and default staff users seeded!');
  } catch (err) {
    console.error('❌ Extra Seeding failed:', err.message);
  } finally {
    await pool.end();
  }
}

seed();