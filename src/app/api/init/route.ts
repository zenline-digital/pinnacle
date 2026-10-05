import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { initializeDatabase } from '@/lib/db';
export async function GET() {
  try {
    await initializeDatabase();
    await sql`ALTER TABLE bank_statements ADD COLUMN IF NOT EXISTS file_size INTEGER`;
    await sql`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS iban VARCHAR(50)`;
    await sql`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255)`;
    await sql`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS branch VARCHAR(255)`;
    await sql`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS swift_bic VARCHAR(20)`;
    return NextResponse.json({ ok: true, message: 'Database initialized and migrated' });
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
