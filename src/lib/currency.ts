import type { Currency } from '@/types';

// Approximate fixed rates as fallback (AED base)
const FALLBACK_RATES: Record<Currency, number> = {
  AED: 1,
  INR: 22.5,   // 1 AED ≈ 22.5 INR
  USD: 0.272,  // 1 AED ≈ 0.272 USD
};

let cachedRates: Record<Currency, number> | null = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function getExchangeRates(): Promise<Record<Currency, number>> {
  const now = Date.now();
  if (cachedRates && (now - cacheTime) < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/AED', {
      next: { revalidate: 3600 }
    });
    if (res.ok) {
      const data = await res.json();
      cachedRates = {
        AED: 1,
        INR: data.rates?.INR || FALLBACK_RATES.INR,
        USD: data.rates?.USD || FALLBACK_RATES.USD,
      };
      cacheTime = now;
      return cachedRates;
    }
  } catch {
    // Use fallback
  }

  return FALLBACK_RATES;
}

export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<Currency, number>
): number {
  if (from === to) return amount;
  // Convert to AED first, then to target
  const inAED = from === 'AED' ? amount : amount / rates[from];
  return to === 'AED' ? inAED : inAED * rates[to];
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  AED: 'AED',
  INR: '₹',
  USD: '$',
};

export const CURRENCY_LOCALES: Record<Currency, string> = {
  AED: 'en-AE',
  INR: 'en-IN',
  USD: 'en-US',
};

export function formatCurrency(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol} ${formatted}`;
}
