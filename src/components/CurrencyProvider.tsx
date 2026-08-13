'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import type { Currency } from '@/types';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Record<Currency, number>;
  convert: (amount: number, from?: Currency) => number;
  format: (amount: number, from?: Currency) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'AED',
  setCurrency: () => {},
  rates: { AED: 1, INR: 22.5, USD: 0.272 },
  convert: (n) => n,
  format: (n) => `AED ${n.toFixed(2)}`,
});

export function useCurrency() {
  return useContext(CurrencyContext);
}

const SYMBOLS: Record<Currency, string> = {
  AED: 'AED',
  INR: '₹',
  USD: '$',
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('AED');
  const [rates, setRates] = useState<Record<Currency, number>>({ AED: 1, INR: 22.5, USD: 0.272 });

  useEffect(() => {
    const saved = localStorage.getItem('pinnacle_currency') as Currency;
    if (saved) setCurrencyState(saved);

    fetch('/api/currency')
      .then(r => r.json())
      .then(data => setRates(data))
      .catch(() => {});
  }, []);

  function setCurrency(c: Currency) {
    setCurrencyState(c);
    localStorage.setItem('pinnacle_currency', c);
  }

  function convert(amount: number, from: Currency = 'AED'): number {
    if (from === currency) return amount;
    const inAED = from === 'AED' ? amount : amount / rates[from];
    return currency === 'AED' ? inAED : inAED * rates[currency];
  }

  function format(amount: number, from: Currency = 'AED'): string {
    const converted = convert(amount, from);
    const sym = SYMBOLS[currency];
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
    return `${sym} ${formatted}`;
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, convert, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}
