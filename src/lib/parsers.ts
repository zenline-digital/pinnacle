import { categorizeTransaction } from './categorize';
import type { Transaction } from '@/types';

type ParsedTx = Omit<Transaction, 'id' | 'account_id' | 'created_at'>;

// ─── CSV Parser (WIO Bank CSV format) ─────────────────────────────────────
export function parseCSVStatement(csvText: string): ParsedTx[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const transactions: ParsedTx[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 5) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });

    const dateStr = row['date'] || row['transaction date'] || row['trans date'];
    const description = row['description'] || row['particulars'] || row['notes'] || '';
    const amountStr = row['amount'] || '0';
    const balanceStr = row['balance'] || '0';
    const reference = row['ref. number'] || row['ref no'] || '';

    if (!dateStr) continue;

    const amount = parseFloat(amountStr.replace(/,/g, '')) || 0;
    const type: 'credit' | 'debit' = amount >= 0 ? 'credit' : 'debit';
    const absAmount = Math.abs(amount);

    // Use notes as friendly label if available
    const notes = row['notes'];
    const displayDesc = notes && notes !== 'N/A' ? `${description} (${notes})` : description;

    const { category, isFixed } = categorizeTransaction(displayDesc, type);

    transactions.push({
      date: formatDate(dateStr),
      description: displayDesc || description,
      raw_description: description,
      amount: absAmount,
      type,
      category,
      is_fixed: isFixed,
      reference,
    });
  }

  return transactions;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}

// ─── Generic PDF Text Parser ──────────────────────────────────────────────────
// Handles DIB, CBD, Emirates Islamic (bank accounts)
// The PDF parser extracts raw text; we then find the transaction table
export function parsePDFBankStatement(rawText: string, bankHint: string): ParsedTx[] {
  const bank = bankHint.toLowerCase();

  if (bank.includes('dib') || bank.includes('dubai islamic')) {
    return parseDIBStatement(rawText);
  }
  if (bank.includes('cbd') || bank.includes('commercial bank')) {
    return parseCBDStatement(rawText);
  }
  if (bank.includes('wio') || bank.includes('zenline')) {
    return parseCSVStatement(''); // WIO is always CSV
  }
  if (bank.includes('enbd') || bank.includes('emirates nbd')) {
    return parseENBDCreditCard(rawText);
  }
  if (bank.includes('emirates islamic') || bank.includes('ei ') || bank.includes('islamic')) {
    return parseEmiratesIslamicCard(rawText);
  }

  // Fallback: generic parser
  return parseGenericBankStatement(rawText);
}

// ─── DIB Current Account Parser ──────────────────────────────────────────────
function parseDIBStatement(text: string): ParsedTx[] {
  const transactions: ParsedTx[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // DIB format: DATE DATE REF DESCRIPTION DEBIT CREDIT BALANCE
  // Dates look like: 02-Jan-2026 or 02/01/2026
  const datePattern = /^(\d{2}[-/]\w{3,9}[-/]\d{4}|\d{2}\/\d{2}\/\d{4})/;
  const amountPattern = /[\d,]+\.\d{2}/g;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!datePattern.test(line)) { i++; continue; }

    // Extract date
    const dateMatch = line.match(datePattern);
    if (!dateMatch) { i++; continue; }
    const date = formatDate(dateMatch[1]);

    // Collect description lines until we hit numbers
    let descParts: string[] = [];
    let j = i;
    let fullLine = line;

    // The description may span multiple lines; collect until we see the amount pattern at line end
    // In DIB, debit/credit/balance are 3 numbers at the end
    const collectLines = [line];
    let k = i + 1;
    while (k < lines.length && k < i + 8) {
      const next = lines[k];
      // If next line starts with a date, stop
      if (datePattern.test(next)) break;
      // If next line looks purely like amounts (0.00 / numbers only), could be end
      if (/^[\d,]+\.\d{2}\s+[\d,.-]+\.\d{2}\s+[\d,.-]+\.\d{2}$/.test(next)) {
        collectLines.push(next);
        k++;
        break;
      }
      collectLines.push(next);
      k++;
    }

    const combined = collectLines.join(' ');

    // Find all amounts in the combined string
    const amounts = combined.match(amountPattern);
    if (!amounts || amounts.length < 2) { i = k; continue; }

    // Last 3 amounts (or 2) are debit, credit, balance
    // In DIB: DEBIT | CREDIT | BALANCE — one of debit/credit is 0.00
    const nums = amounts.map(a => parseFloat(a.replace(/,/g, '')));

    // Extract description: everything between the ref number and the amounts
    // Remove dates and amounts from combined to get description
    let desc = combined
      .replace(datePattern, '')                          // remove date
      .replace(/\d{2}[-/]\w{3,9}[-/]\d{4}/g, '')       // remove value date
      .replace(/[A-Z0-9]{8,20}/g, '')                    // remove ref numbers
      .replace(/[\d,]+\.\d{2}/g, '')                     // remove amounts
      .replace(/\s+/g, ' ')
      .trim();

    // Better: find debit/credit from positions
    // DIB structure: if DEBIT != 0 and CREDIT == 0 → debit transaction
    // Last 3 nums: debit, credit, balance  OR  last num is balance, prev 2 are debit/credit
    let debit = 0, credit = 0;
    if (nums.length >= 3) {
      debit = nums[nums.length - 3];
      credit = nums[nums.length - 2];
    } else if (nums.length === 2) {
      // Could be debit + balance or credit + balance
      debit = nums[0];
    }

    // Determine type based on which is non-zero
    let type: 'credit' | 'debit' = 'debit';
    let amount = debit;
    if (credit > 0 && debit === 0) {
      type = 'credit';
      amount = credit;
    } else if (debit > 0 && credit === 0) {
      type = 'debit';
      amount = debit;
    } else if (credit > 0 && debit > 0) {
      // Both non-zero: compare context
      type = 'debit';
      amount = debit;
    }

    if (amount <= 0) { i = k; continue; }

    // Clean description from PDF artifacts
    desc = cleanDescription(combined);

    const { category, isFixed } = categorizeTransaction(desc, type);

    transactions.push({
      date,
      description: desc,
      raw_description: combined.trim(),
      amount,
      type,
      category,
      is_fixed: isFixed,
      reference: '',
    });

    i = k;
  }

  return transactions;
}

// ─── CBD Parser ───────────────────────────────────────────────────────────────
function parseCBDStatement(text: string): ParsedTx[] {
  const transactions: ParsedTx[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // CBD format: DATE DESCRIPTION VALUE_DATE DEBIT CREDIT BALANCE
  const datePattern = /^(\d{2}\/\d{2}\/\d{4})/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!datePattern.test(line)) continue;

    const dateMatch = line.match(datePattern);
    if (!dateMatch) continue;

    const date = formatDate(dateMatch[1]);
    const amounts = line.match(/[\d,]+\.\d{2}/g) || [];
    if (amounts.length < 2) continue;

    const nums = amounts.map(a => parseFloat(a.replace(/,/g, '')));
    const debit = nums[nums.length - 3] || 0;
    const credit = nums[nums.length - 2] || 0;

    let type: 'credit' | 'debit' = debit > 0 ? 'debit' : 'credit';
    let amount = debit > 0 ? debit : credit;

    const desc = cleanDescription(line.replace(datePattern, '').replace(/[\d,]+\.\d{2}/g, ''));

    const { category, isFixed } = categorizeTransaction(desc, type);

    transactions.push({
      date,
      description: desc,
      raw_description: line,
      amount,
      type,
      category,
      is_fixed: isFixed,
      reference: '',
    });
  }

  return transactions;
}

// ─── Emirates NBD Credit Card Parser ─────────────────────────────────────────
function parseENBDCreditCard(text: string): ParsedTx[] {
  const transactions: ParsedTx[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // ENBD CC format: DD/MM/YYYY DD/MM/YYYY DESCRIPTION AMOUNT
  const datePattern = /^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})(CR)?$/;

  for (const line of lines) {
    const match = line.match(datePattern);
    if (!match) continue;

    const [, txDate, , description, amountStr, crSuffix] = match;
    const amount = parseFloat(amountStr.replace(/,/g, ''));
    const type: 'credit' | 'debit' = crSuffix === 'CR' ? 'credit' : 'debit';

    const { category, isFixed } = categorizeTransaction(description, type);

    transactions.push({
      date: formatDate(txDate),
      description: description.trim(),
      raw_description: line,
      amount,
      type,
      category,
      is_fixed: isFixed,
      reference: '',
    });
  }

  return transactions;
}

// ─── Emirates Islamic Credit Card Parser ─────────────────────────────────────
function parseEmiratesIslamicCard(text: string): ParsedTx[] {
  const transactions: ParsedTx[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // EI CC format: DD MMM  DD MMM  DESCRIPTION  AMOUNT(CR)?
  const datePattern = /^(\d{2}\s+\w{3})\s+(\d{2}\s+\w{3})\s+(.+?)\s+([\d,]+\.\d{2})(CR)?$/;

  for (const line of lines) {
    const match = line.match(datePattern);
    if (!match) continue;

    const [, txDate, , description, amountStr, crSuffix] = match;
    const amount = parseFloat(amountStr.replace(/,/g, ''));
    const type: 'credit' | 'debit' = crSuffix === 'CR' ? 'credit' : 'debit';

    const { category, isFixed } = categorizeTransaction(description, type);

    transactions.push({
      date: formatDateMonthYear(txDate),
      description: description.trim(),
      raw_description: line,
      amount,
      type,
      category,
      is_fixed: isFixed,
      reference: '',
    });
  }

  return transactions;
}

// ─── Generic Bank Statement Parser ───────────────────────────────────────────
function parseGenericBankStatement(text: string): ParsedTx[] {
  const transactions: ParsedTx[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const datePattern = /(\d{2}[-/]\w{3,9}[-/]\d{4}|\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/;
  const amountPattern = /[\d,]+\.\d{2}/g;

  for (const line of lines) {
    const dateMatch = line.match(datePattern);
    if (!dateMatch) continue;

    const amounts = line.match(amountPattern);
    if (!amounts || amounts.length < 2) continue;

    const date = formatDate(dateMatch[1]);
    const desc = cleanDescription(line
      .replace(datePattern, '')
      .replace(amountPattern, ''));

    const nums = amounts.map(a => parseFloat(a.replace(/,/g, '')));
    const amount = nums[0];
    const type: 'credit' | 'debit' = line.toLowerCase().includes('cr') ? 'credit' : 'debit';

    const { category, isFixed } = categorizeTransaction(desc, type);

    transactions.push({
      date,
      description: desc,
      raw_description: line,
      amount,
      type,
      category,
      is_fixed: isFixed,
      reference: '',
    });
  }

  return transactions;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cleanDescription(raw: string): string {
  return raw
    .replace(/\[.*?\]/g, '')          // Remove [brackets]
    .replace(/INSTQ\w+/gi, '')
    .replace(/IRTAC\w+/gi, '')
    .replace(/AE\d{20,}/g, '')
    .replace(/\d{15,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

function formatDate(dateStr: string): string {
  // Handle DD-Mon-YYYY (e.g., 02-Jan-2026)
  const dibPattern = /(\d{2})-([A-Za-z]{3})-(\d{4})/;
  const dibMatch = dateStr.match(dibPattern);
  if (dibMatch) {
    const months: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
    };
    return `${dibMatch[3]}-${months[dibMatch[2]] || '01'}-${dibMatch[1]}`;
  }

  // Handle DD/MM/YYYY
  const slashPattern = /(\d{2})\/(\d{2})\/(\d{4})/;
  const slashMatch = dateStr.match(slashPattern);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;
  }

  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.substring(0, 10);
  }

  return dateStr;
}

function formatDateMonthYear(dateStr: string): string {
  // Handle "17 APR" with current/guessed year
  const match = dateStr.match(/(\d{2})\s+(\w{3})/);
  if (match) {
    const months: Record<string, string> = {
      JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
      JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
    };
    const year = new Date().getFullYear();
    return `${year}-${months[match[2].toUpperCase()] || '01'}-${match[1]}`;
  }
  return dateStr;
}
