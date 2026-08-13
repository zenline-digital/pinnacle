import { sql } from '@vercel/postgres';

export { sql };

export async function initializeDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      bank_name VARCHAR(255) NOT NULL,
      account_number VARCHAR(255),
      account_type VARCHAR(50) NOT NULL DEFAULT 'current',
      currency VARCHAR(10) NOT NULL DEFAULT 'AED',
      color VARCHAR(20) NOT NULL DEFAULT '#6366f1',
      icon VARCHAR(50) NOT NULL DEFAULT 'bank',
      credit_limit DECIMAL(15,2),
      payment_due_date VARCHAR(10),
      minimum_payment DECIMAL(15,2),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bank_statements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
      file_name VARCHAR(500),
      file_url VARCHAR(1000),
      upload_date TIMESTAMP DEFAULT NOW(),
      parsed_status VARCHAR(50) DEFAULT 'pending',
      date_range_from DATE,
      date_range_to DATE,
      transaction_count INTEGER DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
      statement_id UUID REFERENCES bank_statements(id) ON DELETE SET NULL,
      date DATE NOT NULL,
      description TEXT NOT NULL,
      raw_description TEXT,
      amount DECIMAL(15,2) NOT NULL,
      type VARCHAR(10) NOT NULL,
      category VARCHAR(100) DEFAULT 'Uncategorized',
      sub_category VARCHAR(100),
      is_fixed BOOLEAN DEFAULT false,
      custom_label VARCHAR(255),
      reference VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS manual_incomes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_name VARCHAR(255) NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      frequency VARCHAR(50) DEFAULT 'monthly',
      date DATE NOT NULL,
      note TEXT,
      currency VARCHAR(10) DEFAULT 'AED',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS life_goals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(500) NOT NULL,
      description TEXT,
      vision_statement TEXT,
      target_year INTEGER,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS goal_areas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      life_goal_id UUID REFERENCES life_goals(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      icon VARCHAR(50) DEFAULT 'target',
      color VARCHAR(20) DEFAULT '#6366f1',
      priority_order INTEGER DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS goals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      area_id UUID REFERENCES goal_areas(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      target_date DATE,
      status VARCHAR(50) DEFAULT 'not_started',
      priority VARCHAR(20) DEFAULT 'medium',
      linked_amount DECIMAL(15,2),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS milestones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      due_date DATE,
      status VARCHAR(50) DEFAULT 'not_started',
      order_index INTEGER DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      note TEXT,
      due_date DATE,
      status VARCHAR(50) DEFAULT 'todo',
      priority VARCHAR(20) DEFAULT 'medium'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS payment_dues (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'other',
      amount DECIMAL(15,2) NOT NULL,
      due_date DATE NOT NULL,
      frequency VARCHAR(50) DEFAULT 'monthly',
      linked_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'pending',
      reminder_days_before INTEGER DEFAULT 3,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS statement_column_maps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bank_name VARCHAR(255) NOT NULL UNIQUE,
      column_map JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  console.log('Database initialized successfully');
}
