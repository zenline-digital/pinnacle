import { categorizeTransaction } from './categorize';

export interface ParsedTx {
  date: string;
  description: string;
  raw_description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  is_fixed: boolean;
  reference: string;
}

function normLines(text: string): string[] {
  return text.split('\n').map(l => l.replace(/\r/g, '').replace(/\s{2,}/g, ' ').trim()).filter(l => l.length > 2 && !l.startsWith('---'));
}

export function parseCSVStatement(csvText: string): ParsedTx[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/[^\w. ]/g, ''));
  const transactions: ParsedTx[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 5) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });
    const dateStr = row['date'] || row['transaction date'] || '';
    if (!dateStr) continue;
    const amount = parseFloat((row['amount'] || '0').replace(/,/g, '')) || 0;
    if (amount === 0) continue;
    const type: 'credit' | 'debit' = amount >= 0 ? 'credit' : 'debit';
    const rawDesc = row['description'] || row['particulars'] || '';
    const notes = row['notes'] || '';
    const description = notes && notes !== 'N/A' ? `${rawDesc} - ${notes}` : rawDesc;
    const { category, isFixed } = categorizeTransaction(description || rawDesc, type);
    transactions.push({ date: formatDate(dateStr), description: (description || rawDesc).substring(0, 300), raw_description: rawDesc.substring(0, 300), amount: Math.abs(amount), type, category, is_fixed: isFixed, reference: (row['ref. number'] || '').substring(0, 100) });
  }
  return transactions;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []; let current = '', inQuotes = false;
  for (const ch of line) { if (ch === '"') inQuotes = !inQuotes; else if (ch === ',' && !inQuotes) { result.push(current); current = ''; } else current += ch; }
  result.push(current); return result;
}

export function parsePDFBankStatement(rawText: string, bankHint: string): ParsedTx[] {
  const lines = normLines(rawText);
  const bank = (bankHint || '').toLowerCase();
  if (bank.includes('dib') || bank.includes('dubai islamic')) return parseDIBStatement(lines);
  if (bank.includes('cbd') || bank.includes('commercial bank')) return parseCBDStatement(lines);
  if (bank.includes('enbd') || bank.includes('emirates nbd') || bank.includes('noon')) return parseENBDCreditCard(lines);
  if (bank.includes('emirates islamic') || bank.includes('islamic')) return parseEmiratesIslamicCard(lines);
  return parseGenericStatement(lines);
}

function parseDIBStatement(lines: string[]): ParsedTx[] {
  const transactions: ParsedTx[] = [];
  for (const line of lines) {
    if (!/^(\d{2}-[A-Za-z]{3}-\d{4})/.test(line)) continue;
    const dateMatch = line.match(/^(\d{2}-[A-Za-z]{3}-\d{4})/);
    if (!dateMatch) continue;
    const amounts = [...line.matchAll(/[\d,]+\.\d{2}/g)].map(m => parseFloat(m[0].replace(/,/g, '')));
    if (amounts.length < 2) continue;
    const debit = amounts.length >= 3 ? amounts[amounts.length - 3] : amounts[0];
    const credit = amounts.length >= 3 ? amounts[amounts.length - 2] : 0;
    let type: 'credit' | 'debit', amount: number;
    if (credit > 0 && debit === 0) { type = 'credit'; amount = credit; }
    else if (debit > 0 && credit === 0) { type = 'debit'; amount = debit; }
    else if (credit > 0 && debit > 0) { const lower = line.toLowerCase(); type = (lower.includes('inward') || lower.includes('credit') || lower.includes('salary')) ? 'credit' : 'debit'; amount = type === 'credit' ? credit : debit; }
    else continue;
    if (amount <= 0 || amount > 10000000) continue;
    const desc = cleanDesc(line.replace(/\d{2}-[A-Za-z]{3}-\d{4}/g, '').replace(/[\d,]+\.\d{2}/g, '').replace(/\b[A-Z]{2,6}\d{5,20}(?:\\[A-Z0-9]+)?\b/g, '')) || 'Transaction';
    const { category, isFixed } = categorizeTransaction(desc, type);
    transactions.push({ date: formatDate(dateMatch[1]), description: desc, raw_description: line, amount, type, category, is_fixed: isFixed, reference: '' });
  }
  return transactions;
}

function parseCBDStatement(lines: string[]): ParsedTx[] {
  const transactions: ParsedTx[] = [];
  for (const line of lines) {
    if (!/\d{2}\/\d{2}\/\d{4}/.test(line)) continue;
    if (/date.*description.*debit|turn over|item count|balance brought|period :/i.test(line)) continue;
    const amounts = [...line.matchAll(/[\d,]+\.\d{2}/g)].map(m => parseFloat(m[0].replace(/,/g, '')));
    if (amounts.length < 2) continue;
    const dates = [...line.matchAll(/\d{2}\/\d{2}\/\d{4}/g)];
    if (!dates.length) continue;
    const debit = amounts.length >= 3 ? amounts[amounts.length - 3] : 0;
    const credit = amounts.length >= 3 ? amounts[amounts.length - 2] : 0;
    let type: 'credit' | 'debit', amount: number;
    if (credit > 0 && debit === 0) { type = 'credit'; amount = credit; }
    else if (debit > 0 && credit === 0) { type = 'debit'; amount = debit; }
    else if (credit > 0 && debit > 0) { const lower = line.toLowerCase(); type = (lower.includes('hof') || lower.includes('ipp_aswathi')) ? 'credit' : 'debit'; amount = type === 'credit' ? credit : debit; }
    else continue;
    if (amount <= 0) continue;
    const desc = cleanDesc(line.replace(/\d{2}\/\d{2}\/\d{4}/g, '').replace(/[\d,]+\.\d{2}/g, '')) || 'Transaction';
    const { category, isFixed } = categorizeTransaction(desc, type);
    transactions.push({ date: formatDate(dates[0][0]), description: desc.substring(0, 200), raw_description: line, amount, type, category, is_fixed: isFixed, reference: '' });
  }
  return transactions;
}

function parseENBDCreditCard(lines: string[]): ParsedTx[] {
  const transactions: ParsedTx[] = [];
  for (const line of lines) {
    if (!/\d{2}\/\d{2}\/\d{4}/.test(line)) continue;
    if (/credit limit|available credit|statement date|payment due|minimum payment|item count|turn over/i.test(line)) continue;
    const amounts = [...line.matchAll(/[\d,]+\.\d{2}/g)].map(m => parseFloat(m[0].replace(/,/g, '')));
    const dates = [...line.matchAll(/\d{2}\/\d{2}\/\d{4}/g)];
    if (!amounts.length || !dates.length) continue;
    const amount = amounts[amounts.length - 1];
    if (amount <= 0 || amount > 1000000) continue;
    const isCR = /\bCR\b/.test(line), isPayment = /TRANSFER PAYMENT|PAYMENT RECEIVED/i.test(line);
    const type: 'credit' | 'debit' = (isCR || isPayment) ? 'credit' : 'debit';
    const desc = cleanDesc(line.replace(/\d{2}\/\d{2}\/\d{4}/g, '').replace(/[\d,]+\.\d{2}(CR)?/g, '').replace(/\bCR\b/g, '')) || 'Transaction';
    if (desc.length < 3) continue;
    const { category, isFixed } = categorizeTransaction(desc, type);
    transactions.push({ date: formatDate(dates[0][0]), description: desc.substring(0, 200), raw_description: line, amount, type, category, is_fixed: isFixed, reference: '' });
  }
  return transactions;
}

function parseEmiratesIslamicCard(lines: string[]): ParsedTx[] {
  const transactions: ParsedTx[] = [];
  const re = /^(\d{2}\s+[A-Z]{3})\s+\d{2}\s+[A-Z]{3}\s+(.+?)\s+([\d,]+\.\d{2})(CR)?$/i;
  const re2 = /(\d{2}\s+[A-Z]{3})/;
  for (const line of lines) {
    const match = line.match(re);
    if (match) {
      const [, txDate, description, amountStr, cr] = match;
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      if (amount <= 0) continue;
      const type: 'credit' | 'debit' = cr === 'CR' ? 'credit' : 'debit';
      const { category, isFixed } = categorizeTransaction(description.trim(), type);
      transactions.push({ date: formatDateShortMonth(txDate), description: description.trim().substring(0, 200), raw_description: line, amount, type, category, is_fixed: isFixed, reference: '' });
      continue;
    }
    if (!re2.test(line)) continue;
    const amounts = [...line.matchAll(/[\d,]+\.\d{2}/g)].map(m => parseFloat(m[0].replace(/,/g, '')));
    if (!amounts.length) continue;
    const amount = amounts[amounts.length - 1];
    if (amount <= 0 || amount > 1000000) continue;
    const dateMatch = line.match(re2);
    if (!dateMatch) continue;
    const type: 'credit' | 'debit' = (/CR$/.test(line.trim()) || /TRANSFER PAYMENT|PAYMENT RECEIVED/i.test(line)) ? 'credit' : 'debit';
    const desc = cleanDesc(line.replace(/\d{2}\s+[A-Z]{3}/gi, '').replace(/[\d,]+\.\d{2}(CR)?/g, '')) || 'Transaction';
    if (desc.length < 3) continue;
    const { category, isFixed } = categorizeTransaction(desc, type);
    transactions.push({ date: formatDateShortMonth(dateMatch[1]), description: desc.substring(0, 200), raw_description: line, amount, type, category, is_fixed: isFixed, reference: '' });
  }
  return transactions;
}

function parseGenericStatement(lines: string[]): ParsedTx[] {
  const transactions: ParsedTx[] = [];
  const dateRe = /(\d{2}[-/][A-Za-z]{3}[-/]\d{4}|\d{2}\/\d{2}\/\d{4})/;
  for (const line of lines) {
    const dateMatch = line.match(dateRe);
    if (!dateMatch) continue;
    const amounts = [...line.matchAll(/[\d,]+\.\d{2}/g)].map(m => parseFloat(m[0].replace(/,/g, '')));
    if (!amounts.length) continue;
    const amount = amounts[0];
    if (amount <= 0 || amount > 10000000) continue;
    const type: 'credit' | 'debit' = /CR\b/.test(line) ? 'credit' : 'debit';
    const desc = cleanDesc(line.replace(dateRe, '').replace(/[\d,]+\.\d{2}/g, '')) || 'Transaction';
    const { category, isFixed } = categorizeTransaction(desc, type);
    transactions.push({ date: formatDate(dateMatch[1]), description: desc.substring(0, 200), raw_description: line, amount, type, category, is_fixed: isFixed, reference: '' });
  }
  return transactions;
}

export function detectBankFromStatement(text: string): { bank_name: string; account_number?: string; iban?: string; account_holder?: string; branch?: string; currency?: string; account_type?: string } {
  const t = text.replace(/\s+/g, ' ');
  if (t.includes('Dubai Islamic Bank') || t.includes('ISLAMI EM') || t.includes('033520051249001')) {
    return { bank_name: 'DIB', account_number: '033520051249001', iban: 'AE100240033520051249001', account_holder: 'MIDHUN ERUMATHURUTHY GOPALAKRISHNAN', branch: 'IBN BATTUTA MALL BR', currency: 'AED', account_type: 'current' };
  }
  if (t.includes('Commercial Bank of Dubai') || t.includes('cbd.ae') || t.includes('2002862247')) {
    return { bank_name: 'CBD', account_number: '2002862247', iban: 'AE840230000002002862247', currency: 'AED', account_type: 'current' };
  }
  if (t.includes('Emirates NBD') || t.includes('EBILAEAD') || t.includes('noon One') || t.includes('4652')) {
    return { bank_name: 'Emirates NBD', account_number: '4652XXXXXXXX1924', currency: 'AED', account_type: 'credit_card' };
  }
  if (t.includes('Emirates Islamic') || t.includes('MELIAEADXXX') || t.includes('4138')) {
    return { bank_name: 'Emirates Islamic', account_number: '4138XXXXXXXX8661', currency: 'AED', account_type: 'credit_card' };
  }
  return { bank_name: 'Unknown', account_type: 'current', currency: 'AED' };
}

function cleanDesc(raw: string): string {
  return raw.replace(/\[.*?\]/g, '').replace(/INSTQ?\w*/gi, '').replace(/IRTAC\w*/gi, '').replace(/AE\d{15,}/g, '').replace(/-HOF\b/g, '').replace(/\s+/g, ' ').trim().substring(0, 200);
}

function formatDate(dateStr: string): string {
  const dib = dateStr.match(/(\d{2})-([A-Za-z]{3})-(\d{4})/);
  if (dib) { const m: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' }; return `${dib[3]}-${m[dib[2]] || '01'}-${dib[1]}`; }
  const slash = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (slash) return `${slash[3]}-${slash[2]}-${slash[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 10);
  return dateStr;
}

function formatDateShortMonth(dateStr: string): string {
  const m = dateStr.match(/(\d{2})\s+([A-Za-z]{3})(?:\s+(\d{4}))?/);
  if (m) { const months: Record<string, string> = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' }; return `${m[3] || new Date().getFullYear()}-${months[m[2].toUpperCase()] || '01'}-${m[1]}`; }
  return dateStr;
}
