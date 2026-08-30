import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

async function initializeDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL is not defined in .env');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'AGENT',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(36) PRIMARY KEY,
      whatsapp_id VARCHAR(50) UNIQUE NOT NULL,
      phone VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255),
      email VARCHAR(255),
      avatar_url TEXT,
      notes TEXT,
      marketing_opt_out BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS leads (
      id VARCHAR(36) PRIMARY KEY,
      customer_id VARCHAR(36) UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      interested_course VARCHAR(255),
      current_level VARCHAR(50),
      learning_goal TEXT,
      preferred_schedule VARCHAR(100),
      location VARCHAR(255),
      lead_score INTEGER DEFAULT 0,
      lead_temperature VARCHAR(20) DEFAULT 'COLD',
      status VARCHAR(50) DEFAULT 'NEW',
      assigned_agent_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
      last_contact_at TIMESTAMP WITH TIME ZONE,
      next_follow_up_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS conversations (
      id VARCHAR(36) PRIMARY KEY,
      customer_id VARCHAR(36) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      state VARCHAR(50) DEFAULT 'AI_ACTIVE',
      summary TEXT,
      assigned_agent_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(36) PRIMARY KEY,
      conversation_id VARCHAR(36) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      external_message_id VARCHAR(255) UNIQUE,
      direction VARCHAR(20) NOT NULL,
      sender_type VARCHAR(20) NOT NULL,
      sender_id VARCHAR(36),
      content TEXT NOT NULL,
      message_type VARCHAR(50) DEFAULT 'text',
      status VARCHAR(50) DEFAULT 'sent',
      intent VARCHAR(100),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS knowledge_items (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      is_published BOOLEAN DEFAULT TRUE,
      priority INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS courses (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      level VARCHAR(50) NOT NULL,
      price NUMERIC(10, 2) NOT NULL DEFAULT 0,
      duration VARCHAR(100) NOT NULL,
      schedule VARCHAR(255) NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS faqs (
      id VARCHAR(36) PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      is_published BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS follow_ups (
      id VARCHAR(36) PRIMARY KEY,
      lead_id VARCHAR(36) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
      message_template TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'PENDING',
      assigned_agent_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS message_templates (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      category VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      variables JSONB DEFAULT '[]'::jsonb,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS conversation_events (
      id VARCHAR(36) PRIMARY KEY,
      conversation_id VARCHAR(36) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      event_type VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS ai_runs (
      id VARCHAR(36) PRIMARY KEY,
      conversation_id VARCHAR(36) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      prompt_tokens INTEGER DEFAULT 0,
      response_tokens INTEGER DEFAULT 0,
      provider VARCHAR(50) NOT NULL,
      model_used VARCHAR(100) NOT NULL,
      latency_ms INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS settings (
      id VARCHAR(36) PRIMARY KEY,
      key VARCHAR(100) UNIQUE NOT NULL,
      value TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`,
    `CREATE INDEX IF NOT EXISTS idx_leads_temp ON leads(lead_temperature)`,
    `CREATE INDEX IF NOT EXISTS idx_conv_state ON conversations(state)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_knowledge_cat ON knowledge_items(category)`,
    `CREATE INDEX IF NOT EXISTS idx_followup_sched ON follow_ups(scheduled_for, status)`
  ];

  try {
    console.log('🔄 Initializing TEJUROLEX Global Database...');
    for (const sql of tables) {
      await pool.query(sql);
    }
    console.log('✅ All tables and indexes successfully created in PostgreSQL!');
  } catch (error) {
    console.error('❌ Database Initialization Failed:', error.message);
  } finally {
    await pool.end();
  }
}

initializeDatabase();