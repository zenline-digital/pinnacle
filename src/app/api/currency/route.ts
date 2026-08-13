import { NextResponse } from 'next/server';

let cached: Record<string, number> | null = null;
let cacheTime = 0;

export async function GET() {
  const now = Date.now();
  if (cached && now - cacheTime < 3600000) {
    return NextResponse.json(cached);
  }
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/AED');
    if (res.ok) {
      const data = await res.json();
      cached = { AED: 1, INR: data.rates.INR || 22.5, USD: data.rates.USD || 0.272 };
      cacheTime = now;
      return NextResponse.json(cached);
    }
  } catch {}
  return NextResponse.json({ AED: 1, INR: 22.5, USD: 0.272 });
}
