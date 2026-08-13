'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useCurrency } from '@/components/CurrencyProvider';
import { CurrencyProvider } from '@/components/CurrencyProvider';
import Link from 'next/link';

function DashboardContent() {
  const { format, currency, setCurrency } = useCurrency();
  const [analysis, setAnalysis] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [goals, setGoals] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/transactions/analysis?months=3').then(r => r.json()),
      fetch('/api/payments').then(r => r.json()),
      fetch('/api/goals').then(r => r.json()),
    ]).then(([a, p, g]) => {
      setAnalysis(a);
      setPayments(Array.isArray(p) ? p : []);
      setGoals(g);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const currentMonth = analysis?.monthly?.[0];
  const totalBalance = analysis?.balances?.reduce((sum: number, b: any) => sum + parseFloat(b.balance || 0), 0) || 0;
  const netSavings = currentMonth ? parseFloat(currentMonth.total_income) - parseFloat(currentMonth.total_expense) : 0;

  const upcoming = payments
    .filter(p => p.status === 'pending')
    .slice(0, 5);

  const totalGoals = goals?.areas?.flatMap((a: any) => a.goals || []).length || 0;
  const doneGoals = goals?.areas?.flatMap((a: any) => a.goals || []).filter((g: any) => g.status === 'done').length || 0;
  const goalProgress = totalGoals > 0 ? Math.round((doneGoals / totalGoals) * 100) : 0;

  return (
    <AppShell currency={currency} onCurrencyChange={setCurrency}>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold">Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {new Date().toLocaleDateString('en-AE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Link href="/accounts" className="btn-gold text-sm">
            + Upload Statement
          </Link>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Total Balance"
            value={loading ? '—' : format(totalBalance)}
            icon="💎"
            accent="#c9a84c"
            sub="Across all accounts"
          />
          <KpiCard
            label="This Month Income"
            value={loading ? '—' : format(parseFloat(currentMonth?.total_income || 0))}
            icon="📈"
            accent="#22c55e"
            sub={currentMonth?.month || '—'}
          />
          <KpiCard
            label="This Month Expense"
            value={loading ? '—' : format(parseFloat(currentMonth?.total_expense || 0))}
            icon="📉"
            accent="#ef4444"
            sub={`Fixed: ${format(parseFloat(currentMonth?.fixed_expenses || 0))}`}
          />
          <KpiCard
            label="Net Savings"
            value={loading ? '—' : format(netSavings)}
            icon="🏦"
            accent={netSavings >= 0 ? '#22c55e' : '#ef4444'}
            sub="Income – Expense"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Category breakdown */}
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-sm">Spending by Category</h2>
              <Link href="/analysis" className="text-xs" style={{ color: '#c9a84c' }}>View all →</Link>
            </div>
            {loading ? (
              <div className="text-sm text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
            ) : (analysis?.categories?.length > 0 ? (
              <div className="space-y-3">
                {analysis.categories.slice(0, 7).map((cat: any) => {
                  const pct = Math.min(100, (cat.total / (currentMonth?.total_expense || 1)) * 100);
                  return (
                    <div key={cat.category}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{cat.category}</span>
                        <span className="font-medium">{format(parseFloat(cat.total))}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #c9a84c, #e8c96a)' }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState text="Upload a bank statement to see your spending breakdown." link="/accounts" linkText="Go to Accounts →" />
            ))}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Goal progress */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-sm">Life Goals</h2>
                <Link href="/goals" className="text-xs" style={{ color: '#c9a84c' }}>Manage →</Link>
              </div>
              {goals ? (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-14 h-14 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#c9a84c" strokeWidth="3"
                          strokeDasharray={`${goalProgress} ${100 - goalProgress}`}
                          strokeLinecap="round"/>
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{goalProgress}%</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{goals.title}</p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{doneGoals}/{totalGoals} goals done</p>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState text="Set your life goal to track progress." link="/goals" linkText="Create Goal →" />
              )}
            </div>

            {/* Upcoming payments */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-sm">Upcoming Payments</h2>
                <Link href="/calendar" className="text-xs" style={{ color: '#c9a84c' }}>All →</Link>
              </div>
              {upcoming.length > 0 ? (
                <div className="space-y-2">
                  {upcoming.map(p => {
                    const dueDate = new Date(p.due_date);
                    const today = new Date();
                    const days = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
                    const isOverdue = days < 0;
                    const isSoon = days <= 3 && days >= 0;
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <div>
                          <p className="text-xs font-medium">{p.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: isOverdue ? '#ef4444' : isSoon ? '#f59e0b' : 'rgba(255,255,255,0.4)' }}>
                            {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d left`}
                          </p>
                        </div>
                        <span className="text-xs font-bold" style={{ color: '#c9a84c' }}>{format(parseFloat(p.amount))}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text="No upcoming payments tracked." link="/calendar" linkText="Add Payment →" />
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function KpiCard({ label, value, icon, accent, sub }: { label: string; value: string; icon: string; accent: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-xs px-2 py-1 rounded-lg" style={{ background: `${accent}18`, color: accent }}>
          {label}
        </span>
      </div>
      <p className="font-display font-bold text-lg leading-none mb-1">{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</p>}
    </div>
  );
}

function EmptyState({ text, link, linkText }: { text: string; link: string; linkText: string }) {
  return (
    <div className="text-center py-4">
      <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{text}</p>
      <Link href={link} className="text-xs" style={{ color: '#c9a84c' }}>{linkText}</Link>
    </div>
  );
}

export default function Dashboard() {
  return (
    <CurrencyProvider>
      <DashboardContent />
    </CurrencyProvider>
  );
}
