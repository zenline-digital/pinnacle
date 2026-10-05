'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useCurrency, CurrencyProvider } from '@/components/CurrencyProvider';
import SmartUpload from '@/components/SmartUpload';
import Link from 'next/link';

function DashboardContent() {
  const { format, currency, setCurrency } = useCurrency();
  const [analysis, setAnalysis] = useState<any>(null);
  const [fixedData, setFixedData] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [goals, setGoals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [breakdown, setBreakdown] = useState<any>(null);
  const [breakdownTxs, setBreakdownTxs] = useState<any[]>([]);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [fixedMonths, setFixedMonths] = useState(6);

  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { val, label: d.toLocaleDateString('en-AE', { month: 'long', year: 'numeric' }) };
  });

  useEffect(() => { loadData(); }, [selectedMonth]);
  useEffect(() => { loadFixed(); }, [fixedMonths]);

  async function loadData() {
    setLoading(true);
    try {
      const [a, p, g] = await Promise.all([
        fetch(`/api/transactions/analysis?months=6&month=${selectedMonth}`).then(r => r.json()),
        fetch('/api/payments').then(r => r.json()),
        fetch('/api/goals').then(r => r.json()),
      ]);
      setAnalysis(a); setPayments(Array.isArray(p) ? p : []); setGoals(g);
    } catch {}
    setLoading(false);
  }

  async function loadFixed() {
    const data = await fetch(`/api/transactions/fixed?months=${fixedMonths}`).then(r => r.json()).catch(() => null);
    setFixedData(data);
  }

  async function openBreakdown(type: 'income' | 'expense') {
    setBreakdown({ type }); setLoadingBreakdown(true);
    const res = await fetch(`/api/transactions?month=${selectedMonth}&limit=200&type=${type === 'income' ? 'credit' : 'debit'}`);
    const data = await res.json();
    setBreakdownTxs(data.transactions || []); setLoadingBreakdown(false);
  }

  const cur = analysis?.monthly?.find((m: any) => m.month === selectedMonth) || analysis?.monthly?.[0];
  const totalIncome = parseFloat(cur?.total_income || 0);
  const totalExpense = parseFloat(cur?.total_expense || 0);
  const fixedExpenses = parseFloat(cur?.fixed_expenses || 0);
  const netSavings = totalIncome - totalExpense;
  const totalBalance = analysis?.balances?.reduce((s: number, b: any) => s + parseFloat(b.balance || 0), 0) || 0;
  const upcoming = payments.filter(p => p.status === 'pending').slice(0, 4);
  const totalGoals = goals?.areas?.flatMap((a: any) => a.goals || []).length || 0;
  const doneGoals = goals?.areas?.flatMap((a: any) => a.goals || []).filter((g: any) => g.status === 'done').length || 0;
  const goalProgress = totalGoals > 0 ? Math.round((doneGoals / totalGoals) * 100) : 0;
  const hasData = (analysis?.monthly?.length || 0) > 0;

  const grouped = breakdownTxs.reduce((acc: any, tx: any) => {
    const cat = tx.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = { total: 0, count: 0, txs: [] };
    acc[cat].total += parseFloat(tx.amount); acc[cat].count++; acc[cat].txs.push(tx);
    return acc;
  }, {});
  const sortedCats = Object.entries(grouped).sort((a: any, b: any) => b[1].total - a[1].total);

  const f = (v: string | number) => format(parseFloat(String(v)) || 0);

  return (
    <AppShell currency={currency} onCurrencyChange={setCurrency}>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">Dashboard</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {new Date().toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              className="text-sm py-2 px-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: 'auto' }}>
              {monthOptions.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
            </select>
            <SmartUpload onSuccess={loadData} />
          </div>
        </div>

        {/* Empty state */}
        {!loading && !hasData && (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="font-display text-xl font-bold mb-2">No statements uploaded yet</h2>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Upload your bank statements to see your financial dashboard</p>
            <SmartUpload buttonLabel="📤 Upload Statements" />
          </div>
        )}

        {(loading || hasData) && <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Balance', value: format(totalBalance), icon: '💎', color: '#c9a84c', sub: 'All accounts', onClick: null },
            ].map(card => (
              <div key={card.label} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-lg">{card.icon}</span>
                  <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: `${card.color}18`, color: card.color }}>{card.label}</span>
                </div>
                <p className="font-display font-bold text-base md:text-lg">{loading ? '—' : card.value}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{card.sub}</p>
              </div>
            ))}
            <button onClick={() => openBreakdown('income')} className="card p-4 text-left hover:border-green-500/30 transition-all">
              <div className="flex items-start justify-between mb-2"><span className="text-lg">📈</span>
                <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>Income ↗</span></div>
              <p className="font-display font-bold text-base md:text-lg" style={{ color: '#22c55e' }}>{loading ? '—' : format(totalIncome)}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Tap for breakdown</p>
            </button>
            <button onClick={() => openBreakdown('expense')} className="card p-4 text-left hover:border-red-500/30 transition-all">
              <div className="flex items-start justify-between mb-2"><span className="text-lg">📉</span>
                <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>Expense ↗</span></div>
              <p className="font-display font-bold text-base md:text-lg" style={{ color: '#ef4444' }}>{loading ? '—' : format(totalExpense)}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Fixed: {format(fixedExpenses)}</p>
            </button>
            <div className="card p-4">
              <div className="flex items-start justify-between mb-2"><span className="text-lg">🏦</span>
                <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: `${netSavings>=0?'rgba(34,197,94':'rgba(239,68,68'}.12)`, color: netSavings>=0?'#22c55e':'#ef4444' }}>Net Savings</span></div>
              <p className="font-display font-bold text-base md:text-lg">{loading ? '—' : format(netSavings)}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {totalIncome > 0 ? `${Math.round((netSavings/totalIncome)*100)}% savings rate` : 'Income – Expense'}
              </p>
            </div>
          </div>

          {/* ── FIXED EXPENSES TABLE ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="font-display font-bold text-sm md:text-base">🔒 Fixed Expenses by Month</h2>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Loans · Rent · Credit Cards · Insurance · Utilities · Subscriptions</p>
              </div>
              <div className="flex gap-2">
                {[3,6,12].map(m => (
                  <button key={m} onClick={() => setFixedMonths(m)}
                    className="text-xs px-3 py-1.5 rounded-xl transition-all"
                    style={{ background: fixedMonths===m?'rgba(201,168,76,0.15)':'rgba(255,255,255,0.05)', color: fixedMonths===m?'#c9a84c':'rgba(255,255,255,0.5)' }}>
                    {m}M
                  </button>
                ))}
              </div>
            </div>
            {!fixedData?.totals?.length ? (
              <p className="text-center py-6 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Upload statements to see your fixed expense history</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs min-w-[600px]">
                  <thead>
                    <tr style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {['Month','Loans','Rent','Cards','Insurance','Utilities','Subs','Total Fixed'].map((h,i) => (
                        <th key={h} className={`pb-3 font-medium ${i===0?'text-left':'text-right'}`}
                            style={i===7?{color:'#c9a84c'}:{}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fixedData.totals.map((row: any, i: number) => (
                      <tr key={row.month} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <td className="py-2.5 font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{row.month_label}</td>
                        {[
                          {val: row.loans, color: '#ef4444'},
                          {val: row.rent, color: '#f97316'},
                          {val: row.credit_cards, color: '#8b5cf6'},
                          {val: row.insurance, color: '#7c3aed'},
                          {val: row.utilities, color: '#06b6d4'},
                          {val: row.subscriptions, color: '#0891b2'},
                        ].map((cell, ci) => (
                          <td key={ci} className="py-2.5 text-right"
                              style={{ color: parseFloat(cell.val)>0 ? cell.color : 'rgba(255,255,255,0.18)' }}>
                            {parseFloat(cell.val)>0 ? f(cell.val) : '—'}
                          </td>
                        ))}
                        <td className="py-2.5 text-right font-bold" style={{ color: '#c9a84c' }}>{f(row.total_fixed)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {fixedData.totals.length > 1 && (
                    <tfoot>
                      <tr className="border-t-2" style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
                        <td className="py-3 font-semibold" style={{ color: '#c9a84c' }}>Avg/month</td>
                        {['loans','rent','credit_cards','insurance','utilities','subscriptions','total_fixed'].map((key, i) => {
                          const avg = fixedData.totals.reduce((s: number, r: any) => s + parseFloat(r[key]||0), 0) / fixedData.totals.length;
                          return (
                            <td key={key} className="py-3 text-right font-semibold"
                                style={{ color: i===6 ? '#c9a84c' : avg>0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)' }}>
                              {avg > 0 ? f(avg) : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-sm">Spending by Category</h2>
                <Link href="/analysis" className="text-xs" style={{ color: '#c9a84c' }}>Full Analysis →</Link>
              </div>
              {loading ? <p className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading...</p>
              : analysis?.categories?.length > 0 ? (
                <div className="space-y-2.5">
                  {analysis.categories.slice(0,7).map((cat: any) => {
                    const pct = totalExpense > 0 ? Math.min(100, (cat.total/totalExpense)*100) : 0;
                    return (
                      <div key={cat.category}>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: 'rgba(255,255,255,0.7)' }}>{cat.category}</span>
                          <span className="font-medium">{f(cat.total)}</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <div className="h-1.5 rounded-full" style={{ width:`${pct}%`, background:'linear-gradient(90deg,#c9a84c,#e8c96a)' }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-6 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No spending data for this month</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-semibold text-sm">Life Goals</h2>
                  <Link href="/goals" className="text-xs" style={{ color: '#c9a84c' }}>Manage →</Link>
                </div>
                {goals ? (
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#c9a84c" strokeWidth="3"
                          strokeDasharray={`${goalProgress} ${100-goalProgress}`} strokeLinecap="round"/>
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{goalProgress}%</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{goals.title}</p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{doneGoals}/{totalGoals} goals done</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>No life goal set</p>
                    <Link href="/goals" className="text-xs" style={{ color: '#c9a84c' }}>Create Goal →</Link>
                  </div>
                )}
              </div>

              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-semibold text-sm">Upcoming Payments</h2>
                  <Link href="/calendar" className="text-xs" style={{ color: '#c9a84c' }}>All →</Link>
                </div>
                {upcoming.length > 0 ? (
                  <div className="space-y-2">
                    {upcoming.map(p => {
                      const days = Math.ceil((new Date(p.due_date).getTime()-Date.now())/86400000);
                      const isOverdue = days<0, isSoon = days<=3&&days>=0;
                      return (
                        <div key={p.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor:'rgba(255,255,255,0.05)' }}>
                          <div>
                            <p className="text-xs font-medium">{p.name}</p>
                            <p className="text-xs mt-0.5" style={{ color: isOverdue?'#ef4444':isSoon?'#f59e0b':'rgba(255,255,255,0.4)' }}>
                              {isOverdue?`${Math.abs(days)}d overdue`:days===0?'Today':`${days}d left`}
                            </p>
                          </div>
                          <span className="text-xs font-bold" style={{ color: '#c9a84c' }}>{f(p.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>No upcoming payments</p>
                    <Link href="/calendar" className="text-xs" style={{ color: '#c9a84c' }}>Add Payment →</Link>
                  </div>
                )}
              </div>

              <Link href="/investments" className="card p-4 flex items-center gap-3 hover:border-indigo-500/30 transition-all" style={{ display:'flex' }}>
                <span className="text-2xl">🇮🇳</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm">India Investments</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Stocks · MF · FD · Gold · Savings</p>
                </div>
                <span style={{ color: '#c9a84c' }}>→</span>
              </Link>
            </div>
          </div>
        </>}
      </div>

      {/* Breakdown Modal */}
      {breakdown && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
             style={{ background: 'rgba(0,0,0,0.8)' }}
             onClick={e => e.target===e.currentTarget && setBreakdown(null)}>
          <div className="card w-full md:max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl md:rounded-2xl">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <div>
                <h2 className="font-display font-bold text-lg">{breakdown.type==='income'?'📈 Income':'📉 Expense'} Breakdown</h2>
                <p className="text-xs mt-0.5" style={{ color:'rgba(255,255,255,0.4)' }}>
                  {monthOptions.find(m=>m.val===selectedMonth)?.label} · {breakdown.type==='income'?format(totalIncome):format(totalExpense)}
                </p>
              </div>
              <button onClick={() => setBreakdown(null)} className="text-gray-500 hover:text-white text-2xl">×</button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {loadingBreakdown ? <p className="text-center py-8" style={{ color:'rgba(255,255,255,0.3)' }}>Loading...</p>
              : sortedCats.length===0 ? <p className="text-center py-8" style={{ color:'rgba(255,255,255,0.3)' }}>No transactions this month</p>
              : sortedCats.map(([cat, data]: [string, any]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{cat}</span>
                    <div>
                      <span className="font-bold text-sm" style={{ color: breakdown.type==='income'?'#22c55e':'#c9a84c' }}>{f(data.total)}</span>
                      <span className="text-xs ml-2" style={{ color:'rgba(255,255,255,0.3)' }}>{data.count}x</span>
                    </div>
                  </div>
                  <div className="space-y-1 pl-2">
                    {data.txs.slice(0,5).map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between text-xs py-1 border-b" style={{ borderColor:'rgba(255,255,255,0.04)' }}>
                        <span className="truncate flex-1 pr-3" style={{ color:'rgba(255,255,255,0.6)' }}>{tx.description}</span>
                        <div className="text-right shrink-0">
                          <span>{f(tx.amount)}</span>
                          <span className="ml-2" style={{ color:'rgba(255,255,255,0.3)' }}>
                            {new Date(tx.date).toLocaleDateString('en-AE',{day:'numeric',month:'short'})}
                          </span>
                        </div>
                      </div>
                    ))}
                    {data.txs.length>5 && <p className="text-xs pt-1" style={{ color:'rgba(255,255,255,0.3)' }}>+{data.txs.length-5} more</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              <Link href="/transactions" onClick={()=>setBreakdown(null)} className="btn-gold w-full text-center text-sm block py-2.5">
                View All Transactions →
              </Link>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function Dashboard() {
  return <CurrencyProvider><DashboardContent /></CurrencyProvider>;
}
