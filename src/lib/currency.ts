export type Currency = 'AED' | 'INR' | 'USD';
let cached: Record<string, number> | null = null;
let cacheTime = 0;
export async function getExchangeRates(): Promise<Record<Currency, number>> {
  if (cached && Date.now() - cacheTime < 3600000) return cached as Record<Currency, number>;
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/AED');
    if (res.ok) { const d = await res.json(); cached = { AED: 1, INR: d.rates?.INR || 22.5, USD: d.rates?.USD || 0.272 }; cacheTime = Date.now(); return cached as Record<Currency, number>; }
  } catch {}
  return { AED: 1, INR: 22.5, USD: 0.272 };
}
export const CURRENCY_SYMBOLS: Record<Currency, string> = { AED: 'AED', INR: '₹', USD: '$' };
