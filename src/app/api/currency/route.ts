import { NextResponse } from 'next/server';
let cached: any = null; let cacheTime = 0;
export async function GET() {
  if (cached && Date.now() - cacheTime < 3600000) return NextResponse.json(cached);
  try { const r = await fetch('https://api.exchangerate-api.com/v4/latest/AED'); if (r.ok) { const d = await r.json(); cached = { AED: 1, INR: d.rates.INR || 22.5, USD: d.rates.USD || 0.272 }; cacheTime = Date.now(); return NextResponse.json(cached); } } catch {}
  return NextResponse.json({ AED: 1, INR: 22.5, USD: 0.272 });
}
