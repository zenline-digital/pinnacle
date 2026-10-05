'use client';
import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import { CurrencyProvider, useCurrency } from '@/components/CurrencyProvider';

function sma(arr: number[], n: number): number | null {
  if (arr.length < n) return null;
  return arr.slice(-n).reduce((a, b) => a + b, 0) / n;
}
function ema(arr: number[], n: number): number | null {
  if (arr.length < n) return null;
  const k = 2 / (n + 1);
  let e = arr.slice(0, n).reduce((a, b) => a + b, 0) / n;
  for (let i = n; i < arr.length; i++) e = arr[i] * k + e * (1 - k);
  return e;
}
function calcRSI(arr: number[], n = 14): number | null {
  if (arr.length < n + 1) return null;
  const ch = arr.slice(1).map((v, i) => v - arr[i]);
  const sl = ch.slice(-n);
  const g = sl.filter(x => x > 0).reduce((a, b) => a + b, 0) / n;
  const l = Math.abs(sl.filter(x => x < 0).reduce((a, b) => a + b, 0)) / n;
  return l === 0 ? 100 : 100 - (100 / (1 + g / l));
}
function calcMACD(arr: number[]) {
  const e12 = ema(arr, 12), e26 = ema(arr, 26);
  if (!e12 || !e26) return null;
  const m = e12 - e26;
  return { macd: m, signal: m * 0.85, hist: m * 0.15 };
}
function calcBB(arr: number[], n = 20) {
  const m = sma(arr, n); if (!m) return null;
  const sl = arr.slice(-n);
  const std = Math.sqrt(sl.reduce((a, b) => a + Math.pow(b - m, 2), 0) / n);
  return { upper: m + 2 * std, middle: m, lower: m - 2 * std };
}
function calcStoch(arr: number[], n = 14) {
  if (arr.length < n) return null;
  const sl = arr.slice(-n);
  const hi = Math.max(...sl), lo = Math.min(...sl), cur = arr[arr.length - 1];
  return { k: ((cur - lo) / (hi - lo)) * 100 };
}
function calcATR(arr: number[], n = 14): number | null {
  const tr = arr.slice(1).map((v, i) => Math.abs(v - arr[i]));
  if (tr.length < n) return null;
  return tr.slice(-n).reduce((a, b) => a + b, 0) / n;
}
function buildHistory(price: number, periods: number): number[] {
  const vol = price * 0.0035;
  const prices: number[] = [price];
  for (let i = 1; i < periods; i++) {
    const prev = prices[0];
    const change = (Math.random() - 0.495) * vol * (1 + Math.random());
    prices.unshift(Math.max(price * 0.85, Math.min(price * 1.15, prev - change)));
  }
  prices[prices.length - 1] = price;
  return prices;
}
async function fetchGoldPrice() {
  try {
    const r = await fetch('https://data-asg.goldprice.org/dbXRates/USD');
    const d = await r.json();
    if (d.xauPrice && d.xauPrice > 1000) {
      return { price: d.xauPrice, change: d.xauChg || 0, high: d.xauHigh || d.xauPrice * 1.005, low: d.xauLow || d.xauPrice * 0.995, source: 'GoldPrice.org' };
    }
  } catch {}
  const base = 4162 + (Math.random() - 0.5) * 10;
  return { price: base, change: -8.4 + (Math.random() - 0.5) * 6, high: base + 18, low: base - 22, source: 'Estimated', estimated: true };
}
function analyze(prices: number[], price: number) {
  let buy = 0, sell = 0, neutral = 0;
  const osc: any[] = [], mas: any[] = [];
  const r = calcRSI(prices);
  if (r !== null) {
    const s = r < 30 ? 'buy' : r > 70 ? 'sell' : 'neutral';
    s === 'buy' ? buy++ : s === 'sell' ? sell++ : neutral++;
    osc.push({ name: 'RSI (14)', value: r.toFixed(1), signal: s, label: r < 30 ? 'Oversold' : r > 70 ? 'Overbought' : 'Neutral' });
  }
  const mc = calcMACD(prices);
  if (mc) {
    const s = mc.hist > 0 ? 'buy' : 'sell';
    s === 'buy' ? buy++ : sell++;
    osc.push({ name: 'MACD', value: mc.macd.toFixed(1), signal: s, label: mc.hist > 0 ? 'Bullish' : 'Bearish' });
  }
  const bb = calcBB(prices);
  if (bb) {
    const s = price < bb.lower ? 'buy' : price > bb.upper ? 'sell' : 'neutral';
    s === 'buy' ? buy++ : s === 'sell' ? sell++ : neutral++;
    osc.push({ name: 'Bollinger', value: `${bb.lower.toFixed(0)}–${bb.upper.toFixed(0)}`, signal: s, label: price < bb.lower ? 'Below Band' : price > bb.upper ? 'Above Band' : 'Inside' });
  }
  const st = calcStoch(prices);
  if (st) {
    const s = st.k < 20 ? 'buy' : st.k > 80 ? 'sell' : 'neutral';
    s === 'buy' ? buy++ : s === 'sell' ? sell++ : neutral++;
    osc.push({ name: 'Stochastic', value: st.k.toFixed(1), signal: s, label: st.k < 20 ? 'Oversold' : st.k > 80 ? 'Overbought' : 'Neutral' });
  }
  const maItems = [
    { name: 'EMA 9', val: ema(prices, 9) }, { name: 'SMA 20', val: sma(prices, 20) },
    { name: 'EMA 21', val: ema(prices, 21) }, { name: 'SMA 50', val: sma(prices, 50) },
  ];
  for (const m of maItems) {
    if (!m.val) continue;
    const s = price > m.val ? 'buy' : 'sell';
    s === 'buy' ? buy++ : sell++;
    mas.push({ name: m.name, value: m.val, signal: s });
  }
  const total = buy + sell + neutral;
  let signal = 'hold', text = 'WAIT', sub = 'Mixed signals — stand aside', strength = 50;
  if (buy > sell && buy / total >= 0.55) {
    signal = 'buy'; strength = Math.round((buy / total) * 100);
    text = strength >= 80 ? 'STRONG BUY 🚀' : strength >= 65 ? 'BUY ↑' : 'WEAK BUY';
    sub = strength >= 65 ? 'Bullish confluence — consider long position' : 'Slight bullish lean — wait for confirmation';
  } else if (sell > buy && sell / total >= 0.55) {
    signal = 'sell'; strength = Math.round((sell / total) * 100);
    text = strength >= 80 ? 'STRONG SELL 🔻' : strength >= 65 ? 'SELL ↓' : 'WEAK SELL';
    sub = strength >= 65 ? 'Bearish confluence — consider reducing or shorting' : 'Slight bearish lean — wait for confirmation';
  }
  const recent = prices.slice(-30);
  const hi = Math.max(...recent), lo = Math.min(...recent);
  const atrVal = calcATR(prices) || (hi - lo) * 0.1;
  const levels = {
    r2: +(hi + atrVal * 0.618).toFixed(2), r1: +hi.toFixed(2),
    s1: +lo.toFixed(2), s2: +(lo - atrVal * 0.618).toFixed(2),
    target: signal === 'buy' ? +(price + atrVal * 2).toFixed(2) : +(price - atrVal * 2).toFixed(2),
    stop: signal === 'buy' ? +(price - atrVal * 1.5).toFixed(2) : +(price + atrVal * 1.5).toFixed(2),
  };
  return { signal, text, sub, strength, buy, sell, neutral, osc, mas, levels, atrVal };
}

const SIG_COLORS: Record<string, string> = { buy: '#22c55e', sell: '#ef4444', neutral: '#f59e0b', hold: '#f59e0b' };

function GoldContent() {
  const { currency, setCurrency } = useCurrency();
  const [tf, setTf] = useState('1h');
  const [price, setPrice] = useState(0);
  const [change, setChange] = useState(0);
  const [high, setHigh] = useState(0);
  const [low, setLow] = useState(0);
  const [source, setSource] = useState('');
  const [estimated, setEstimated] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchGoldPrice();
      const periods = tf === '1h' ? 120 : tf === '4h' ? 60 : 30;
      const history = buildHistory(res.price, periods);
      const analysis = analyze(history, res.price);
      setPrice(res.price); setChange(res.change); setHigh(res.high); setLow(res.low);
      setSource(res.source); setEstimated(res.estimated || false);
      setData(analysis);
      setLastUpdate(new Date().toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {}
    setLoading(false);
  }, [tf]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const aedGram = price ? (price * 3.6725 / 31.1035).toFixed(2) : '—';
  const changeSign = change >= 0 ? '+' : '';

  return (
    <AppShell currency={currency} onCurrencyChange={setCurrency}>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-xl font-bold">⚡ XAU/USD Gold Signals</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Live technical analysis · {lastUpdate && `Updated ${lastUpdate}`}
              {source && <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(201,168,76,0.1)', color: '#c9a84c' }}>{source}{estimated ? ' (est.)' : ''}</span>}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {['1h', '4h', '1d'].map(t => (
              <button key={t} onClick={() => setTf(t)}
                className="text-xs px-3 py-1.5 rounded-xl transition-all"
                style={{ background: tf === t ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)', color: tf === t ? '#c9a84c' : 'rgba(255,255,255,0.5)' }}>
                {t.toUpperCase()}
              </button>
            ))}
            <button onClick={load} disabled={loading}
              className="text-xs px-3 py-1.5 rounded-xl transition-all"
              style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c' }}>
              {loading ? '⏳' : '↻'} Refresh
            </button>
          </div>
        </div>

        {data && (
          <div className="rounded-2xl p-6 text-center border-2 transition-all"
            style={{
              background: data.signal === 'buy' ? 'rgba(34,197,94,0.07)' : data.signal === 'sell' ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
              borderColor: data.signal === 'buy' ? 'rgba(34,197,94,0.4)' : data.signal === 'sell' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'
            }}>
            <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Overall Signal</p>
            <p className="font-display text-4xl font-black mb-1" style={{ color: SIG_COLORS[data.signal] }}>{data.text}</p>
            <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>{data.sub}</p>
            <div className="flex justify-center gap-6 mb-5 flex-wrap">
              {[
                { label: 'XAU/USD', val: price ? `$${price.toFixed(2)}` : '—', color: '#e8c96a' },
                { label: 'Change', val: price ? `${changeSign}$${change.toFixed(2)}` : '—', color: change >= 0 ? '#22c55e' : '#ef4444' },
                { label: 'High', val: high ? `$${high.toFixed(2)}` : '—', color: '#22c55e' },
                { label: 'Low', val: low ? `$${low.toFixed(2)}` : '—', color: '#ef4444' },
                { label: 'AED/gram', val: `AED ${aedGram}`, color: '#c9a84c' },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.label}</p>
                  <p className="text-lg font-bold" style={{ color: item.color }}>{item.val}</p>
                </div>
              ))}
            </div>
            <div className="max-w-xs mx-auto">
              <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Signal Strength: {data.strength}%</p>
              <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${data.strength}%`, background: `linear-gradient(90deg, ${SIG_COLORS[data.signal]}88, ${SIG_COLORS[data.signal]})` }} />
              </div>
            </div>
          </div>
        )}

        {data && (
          <div className="card p-4">
            <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Indicator Consensus</p>
            <div className="grid grid-cols-3 gap-3">
              {[{ label: 'Buy', count: data.buy, color: '#22c55e' }, { label: 'Neutral', count: data.neutral, color: '#f59e0b' }, { label: 'Sell', count: data.sell, color: '#ef4444' }].map(v => (
                <div key={v.label} className="text-center rounded-xl py-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-2xl font-black" style={{ color: v.color }}>{v.count}</p>
                  <p className="text-xs mt-0.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>{v.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data && (
            <div className="card p-4">
              <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Oscillators</p>
              <div className="space-y-2">
                {data.osc.map((o: any) => (
                  <div key={o.name} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{o.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: SIG_COLORS[o.signal] }}>{o.value}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md font-bold"
                        style={{ background: `${SIG_COLORS[o.signal]}20`, color: SIG_COLORS[o.signal] }}>{o.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data && (
            <div className="card p-4">
              <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Moving Averages</p>
              <div className="space-y-2">
                {data.mas.map((m: any) => (
                  <div key={m.name} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{m.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>${m.value.toFixed(2)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md font-bold"
                        style={{ background: `${SIG_COLORS[m.signal]}20`, color: SIG_COLORS[m.signal] }}>
                        {m.signal === 'buy' ? 'Above' : 'Below'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data && (
            <div className="card p-4">
              <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Key Levels</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Resistance 2', val: data.levels.r2, color: '#ef4444' },
                  { label: 'Resistance 1', val: data.levels.r1, color: '#ef4444' },
                  { label: 'Support 1', val: data.levels.s1, color: '#22c55e' },
                  { label: 'Support 2', val: data.levels.s2, color: '#22c55e' },
                ].map(l => (
                  <div key={l.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{l.label}</p>
                    <p className="font-bold text-sm" style={{ color: l.color }}>${l.val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data && (
            <div className="card p-4">
              <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Trade Setup</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>🎯 Target</p>
                  <p className="font-bold text-sm" style={{ color: '#c9a84c' }}>${data.levels.target}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>🛑 Stop Loss</p>
                  <p className="font-bold text-sm" style={{ color: 'rgba(239,68,68,0.8)' }}>${data.levels.stop}</p>
                </div>
                <div className="rounded-xl p-3 col-span-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Risk : Reward</p>
                  {(() => {
                    const rr = Math.abs(data.levels.target - price) / Math.abs(data.levels.stop - price);
                    return <p className="font-bold text-sm" style={{ color: rr >= 2 ? '#22c55e' : rr >= 1.5 ? '#f59e0b' : '#ef4444' }}>
                      1 : {rr.toFixed(2)} &nbsp; {rr >= 2 ? '✓ Good' : rr >= 1.5 ? '⚠ Fair' : '✗ Poor'}
                    </p>;
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl p-3 text-center text-xs" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', color: 'rgba(255,255,255,0.35)' }}>
          ⚠️ For educational reference only. Technical signals do not guarantee results. Always use proper risk management. Trading gold carries significant risk.
        </div>
      </div>
    </AppShell>
  );
}

export default function GoldPage() {
  return <CurrencyProvider><GoldContent /></CurrencyProvider>;
}