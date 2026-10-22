import { NextResponse } from 'next/server';

let cached: any = null;
let cacheTime = 0;

export async function GET() {
  if (cached && Date.now() - cacheTime < 2000) {
    return NextResponse.json(cached);
  }
  try {
    const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1m&range=1d', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta;
    if (meta?.regularMarketPrice && meta.regularMarketPrice > 1000) {
      cached = { price: meta.regularMarketPrice, change: meta.regularMarketPrice - (meta.previousClose || meta.regularMarketPrice), high: meta.regularMarketDayHigh || meta.regularMarketPrice * 1.005, low: meta.regularMarketDayLow || meta.regularMarketPrice * 0.995, source: 'Yahoo Finance' };
      cacheTime = Date.now();
      return NextResponse.json(cached);
    }
  } catch {}
  try {
    const r = await fetch('https://data-asg.goldprice.org/dbXRates/USD', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const d = await r.json();
    if (d.xauPrice && d.xauPrice > 1000) {
      cached = { price: d.xauPrice, change: d.xauChg || 0, high: d.xauHigh || d.xauPrice * 1.005, low: d.xauLow || d.xauPrice * 0.995, source: 'GoldPrice.org' };
      cacheTime = Date.now();
      return NextResponse.json(cached);
    }
  } catch {}
  if (cached) return NextResponse.json(cached);
  return NextResponse.json({ price: 4082.6, change: -12.4, high: 4097.6, low: 4064.6, source: 'Fallback', estimated: true });
}
