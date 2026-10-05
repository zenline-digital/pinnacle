import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';
import { parseCSVStatement, parsePDFBankStatement, detectBankFromStatement } from '@/lib/parsers';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const contentType = req.headers.get('content-type') || '';
  let pdfText: string|null=null, csvText: string|null=null, fileName='unknown', fileSize=0, accountId='', bankName='';
  if (contentType.includes('application/json')) {
    const b = await req.json(); pdfText=b.pdf_text||null; fileName=b.file_name||'statement.pdf'; fileSize=b.file_size||0; accountId=b.account_id||''; bankName=b.bank_name||'';
  } else {
    const fd = await req.formData(); const file=fd.get('file') as File;
    if (!file) return NextResponse.json({ok:false,error:'No file'},{status:400});
    fileName=file.name; fileSize=file.size; accountId=fd.get('account_id') as string||''; bankName=fd.get('bank_name') as string||'';
    csvText=new TextDecoder().decode(await file.arrayBuffer());
  }
  try {
    if (fileSize>0) { const ex=await sql`SELECT id,transaction_count FROM bank_statements WHERE file_name=${fileName} AND file_size=${fileSize} LIMIT 1`; if (ex.rows.length>0) return NextResponse.json({ok:true,already_exists:true,statement_id:ex.rows[0].id,inserted:0,skipped:0,parsed:0}); }
    let transactions: any[]=[]; let detectedInfo: any={};
    if (csvText) { transactions=parseCSVStatement(csvText); detectedInfo=detectBankFromCSV(csvText); }
    else if (pdfText) { detectedInfo=detectBankFromStatement(pdfText); bankName=bankName||detectedInfo.bank_name||'Unknown'; transactions=parsePDFBankStatement(pdfText,bankName); }
    transactions=transactions.filter(tx=>tx.date&&tx.amount>0&&tx.amount<10000000);
    if (!accountId) {
      if (detectedInfo.account_number) { const ex=await sql`SELECT id FROM bank_accounts WHERE account_number=${detectedInfo.account_number} AND is_active=true LIMIT 1`; if (ex.rows.length>0) accountId=ex.rows[0].id; }
      if (!accountId&&detectedInfo.iban) { const ex=await sql`SELECT id FROM bank_accounts WHERE iban=${detectedInfo.iban} AND is_active=true LIMIT 1`; if (ex.rows.length>0) accountId=ex.rows[0].id; }
      if (!accountId&&detectedInfo.bank_name&&detectedInfo.bank_name!=='Unknown') { const ex=await sql`SELECT id FROM bank_accounts WHERE bank_name=${detectedInfo.bank_name} AND account_type=${detectedInfo.account_type||'current'} AND is_active=true LIMIT 1`; if (ex.rows.length>0) accountId=ex.rows[0].id; }
      if (!accountId) {
        const COLORS: Record<string,string>={'DIB':'#00843D','CBD':'#E31E24','Emirates Islamic':'#8B1A1A','Emirates NBD':'#c9a84c','WIO':'#6366f1'};
        const db=detectedInfo.bank_name||bankName||'Unknown'; const isCC=detectedInfo.account_type==='credit_card';
        const acc=await sql`INSERT INTO bank_accounts (name,bank_name,account_number,account_type,currency,color,icon,iban,account_holder_name,branch) VALUES (${db+(isCC?' Credit Card':' Account')},${db},${detectedInfo.account_number||null},${detectedInfo.account_type||'current'},${detectedInfo.currency||'AED'},${COLORS[db]||'#64748b'},'bank',${detectedInfo.iban||null},${detectedInfo.account_holder||null},${detectedInfo.branch||null}) RETURNING id`;
        accountId=acc.rows[0].id;
      }
    }
    if (!accountId) return NextResponse.json({ok:false,error:'Could not determine account'},{status:400});
    const dates=transactions.map((t:any)=>t.date).sort(); const dateFrom=dates[0]||null; const dateTo=dates[dates.length-1]||null;
    const stmt=await sql`INSERT INTO bank_statements (account_id,file_name,file_size,parsed_status,date_range_from,date_range_to) VALUES (${accountId},${fileName},${fileSize},'processing',${dateFrom},${dateTo}) RETURNING id`;
    const statementId=stmt.rows[0].id;
    let existingSet=new Set<string>();
    if (dateFrom&&dateTo) { const ex=await sql`SELECT date::text,amount,type,LEFT(LOWER(description),40) as desc_fp FROM transactions WHERE account_id=${accountId} AND date BETWEEN ${dateFrom}::date AND ${dateTo}::date`; ex.rows.forEach((r:any)=>existingSet.add(`${r.date?.toString().substring(0,10)}|${r.amount}|${r.type}|${r.desc_fp}`)); }
    const newTxs=transactions.filter((tx:any)=>!existingSet.has(`${tx.date}|${tx.amount}|${tx.type}|${(tx.description||'').substring(0,40).toLowerCase()}`));
    const skipped=transactions.length-newTxs.length; let inserted=0;
    for (const tx of newTxs) { try { await sql`INSERT INTO transactions (account_id,statement_id,date,description,raw_description,amount,type,category,is_fixed,reference) VALUES (${accountId},${statementId},${tx.date},${(tx.description||'').substring(0,300)},${(tx.raw_description||tx.description||'').substring(0,300)},${tx.amount},${tx.type},${tx.category},${tx.is_fixed},${(tx.reference||'').substring(0,100)})`; inserted++; } catch {} }
    await sql`UPDATE bank_statements SET parsed_status=${inserted===0&&skipped>0?'duplicate':'done'},transaction_count=${inserted} WHERE id=${statementId}`;
    return NextResponse.json({ok:true,statement_id:statementId,account_id:accountId,bank_detected:detectedInfo.bank_name,date_range:dateFrom&&dateTo?`${dateFrom} to ${dateTo}`:null,parsed:transactions.length,inserted,skipped});
  } catch (err: any) { return NextResponse.json({ok:false,error:err.message||'Error'},{status:500}); }
}
function detectBankFromCSV(text: string): any {
  const lines=text.split('\n'); const header=lines[0]||''; const first=lines[1]||'';
  if (header.includes('Account name')&&header.includes('Account IBAN')) { const v=first.split(','); return {bank_name:'WIO',account_holder:v[0]?.replace(/"/g,'').trim(),iban:v[2]?.replace(/"/g,'').trim(),account_number:v[3]?.replace(/"/g,'').trim(),currency:v[5]?.replace(/"/g,'').trim()||'AED',account_type:'current'}; }
  return {bank_name:'Unknown',account_type:'current'};
}
export async function GET(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({error:'Unauthorized'},{status:401});
  const accountId=new URL(req.url).searchParams.get('account_id');
  if (accountId) { const r=await sql`SELECT s.*,COUNT(t.id) as actual_count FROM bank_statements s LEFT JOIN transactions t ON t.statement_id=s.id WHERE s.account_id=${accountId} GROUP BY s.id ORDER BY s.upload_date DESC`; return NextResponse.json(r.rows); }
  const r=await sql`SELECT s.*,a.name as account_name,a.bank_name,a.color as account_color FROM bank_statements s JOIN bank_accounts a ON a.id=s.account_id ORDER BY s.upload_date DESC LIMIT 50`;
  return NextResponse.json(r.rows);
}
export async function DELETE(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({error:'Unauthorized'},{status:401});
  const {statement_id}=await req.json(); if (!statement_id) return NextResponse.json({error:'Missing id'},{status:400});
  const tx=await sql`DELETE FROM transactions WHERE statement_id=${statement_id}`; await sql`DELETE FROM bank_statements WHERE id=${statement_id}`;
  return NextResponse.json({ok:true,transactions_deleted:tx.rowCount});
}
