import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';
import { parseCSVStatement, parsePDFBankStatement } from '@/lib/parsers';

export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const accountId = formData.get('account_id') as string;
  const bankName = formData.get('bank_name') as string;

  if (!file || !accountId) {
    return NextResponse.json({ error: 'Missing file or account_id' }, { status: 400 });
  }

  const fileName = file.name;
  const fileType = fileName.toLowerCase().endsWith('.csv') ? 'csv' : 'pdf';

  // Create statement record
  const stmtResult = await sql`
    INSERT INTO bank_statements (account_id, file_name, parsed_status)
    VALUES (${accountId}, ${fileName}, 'processing')
    RETURNING id
  `;
  const statementId = stmtResult.rows[0].id;

  try {
    let transactions: any[] = [];
    const arrayBuffer = await file.arrayBuffer();

    if (fileType === 'csv') {
      const text = new TextDecoder().decode(arrayBuffer);
      transactions = parseCSVStatement(text);
    } else {
      // PDF parsing - extract text using pdf-parse
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const buffer = Buffer.from(arrayBuffer);
      const pdfData = await pdfParse(buffer);
      transactions = parsePDFBankStatement(pdfData.text, bankName);
    }

    // Batch insert transactions
    let inserted = 0;
    for (const tx of transactions) {
      if (!tx.date || !tx.amount) continue;

      // Check for duplicates
      const existing = await sql`
        SELECT id FROM transactions
        WHERE account_id = ${accountId}
          AND date = ${tx.date}
          AND amount = ${tx.amount}
          AND description = ${tx.description}
        LIMIT 1
      `;
      if (existing.rows.length > 0) continue;

      await sql`
        INSERT INTO transactions (account_id, statement_id, date, description, raw_description, amount, type, category, is_fixed, reference)
        VALUES (${accountId}, ${statementId}, ${tx.date}, ${tx.description}, ${tx.raw_description || tx.description},
                ${tx.amount}, ${tx.type}, ${tx.category}, ${tx.is_fixed}, ${tx.reference || null})
      `;
      inserted++;
    }

    // Update statement status
    await sql`
      UPDATE bank_statements
      SET parsed_status = 'done', transaction_count = ${inserted}
      WHERE id = ${statementId}
    `;

    return NextResponse.json({
      ok: true,
      statement_id: statementId,
      parsed: transactions.length,
      inserted,
      skipped: transactions.length - inserted,
    });
  } catch (err: any) {
    await sql`UPDATE bank_statements SET parsed_status = 'error' WHERE id = ${statementId}`;
    console.error('Parse error:', err);
    return NextResponse.json({ error: err.message || 'Parse failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('account_id');

  if (accountId) {
    const result = await sql`SELECT * FROM bank_statements WHERE account_id = ${accountId} ORDER BY upload_date DESC`;
    return NextResponse.json(result.rows);
  }
  const result = await sql`SELECT * FROM bank_statements ORDER BY upload_date DESC LIMIT 20`;
  return NextResponse.json(result.rows);
}
