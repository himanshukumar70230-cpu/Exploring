const { Pool } = require('pg');
require('dotenv').config();

// Option A: Using individual credentials
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'paypal_ai_db',
  max: 20, // Max concurrent connections in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection cannot be established
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Option B: Using connection string (e.g., Supabase / Neon / Render)
/*
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
*/

pool.on('connect', () => {
  console.log('Connected to PostgreSQL pool');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

const initDB = async () => {
  const createTablesQuery = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      paypal_email VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      paypal_order_id VARCHAR(120) UNIQUE,
      source_amount NUMERIC(12, 2) NOT NULL,
      source_currency VARCHAR(10) NOT NULL,
      target_amount NUMERIC(12, 2),
      target_currency VARCHAR(10) NOT NULL,
      exchange_rate NUMERIC(12, 6),
      compliance_status VARCHAR(30) DEFAULT 'PENDING',
      risk_score NUMERIC(5, 2),
      agent_logs JSONB,
      status VARCHAR(40) DEFAULT 'INITIATED',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(createTablesQuery);
    console.log('PostgreSQL tables verified/initialized');
  } catch (err) {
    console.error('Error initializing PostgreSQL tables:', err.message || err.code || err);
    throw err;
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initDB,
};