'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { CurrencyProvider, useCurrency } from '@/components/CurrencyProvider';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#c9a84c','#ef4444','#22c55e','#3b82f6','#8b5cf6','#f59e0b','#06b6d4','#ec4899','#84cc16'];

function AnalysisContent() {
  const { format, currency, setCurrency } = useCurrency();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/transactions/analysis?months=${months}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [months]);

  const monthlyChartData = (data?.monthly || []).slice().reverse().map((m: any) => ({
    month: m.month?.slice(5), // MM
    income: parseFloat(m.total_income),
    expense: parseFloat(m.total_expense),
    savings: parseFloat(m.total_income) - parseFloat(m.total_expense),
  }));

  const categoryData = (data?.categories || []).slice(0, 8).map((c: any, i: number) => ({
    name: c.category,
    value: parseFloat(c.total),
    fill: COLORS[i % COLORS.length],
  }));

  const currentMonthData = data?.monthly?.[0];
  const totalIncome = parseFloat(currentMonthData?.total_income || 0);
  const totalExpense = parseFloat(currentMonthData?.total_expense || 0);
  const fixedExpenses = parseFloat(currentMonthData?.fixed_expenses || 0);
  const variableExpenses = parseFloat(currentMonthData?.variable_expenses || 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : '0';

  return (
    <AppShell currency={currency} onCurrencyChange={setCurrency}>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold">Expense Analysis</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Your spending patterns and trends</p>
          </div>
          <div className="flex gap-2">
            {[3, 6, 12].map(m => (
              <button key={m} onClick={() => setMonths(m)}
                className="text-sm px-4 py-2 rounded-xl transition-all"
                style={{ background: months === m ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)', color: months === m ? '#c9a84c' : 'rgba(255,255,255,0.5)' }}>
                {m}M
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading analysis...</div>
        ) : !data?.monthly?.length ? (
          <div className="card p-16 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="font-display text-lg font-semibold mb-2">No data yet</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Upload bank statements to see your expense analysis</p>
          </div>
        ) : (
          <>
            {/* Summary row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Income This Month', value: format(totalIncome), color: '#22c55e' },
                { label: 'Expenses This Month', value: format(totalExpense), color: '#ef4444' },
                { label: 'Fixed Expenses', value: format(fixedExpenses), color: '#c9a84c' },
                { label: 'Savings Rate', value: `${savingsRate}%`, color: parseFloat(savingsRate) > 20 ? '#22c55e' : '#f59e0b' },
              ].map(item => (
                <div key={item.label} className="card p-4">
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.label}</p>
                  <p className="font-display font-bold text-xl" style={{ color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Fixed vs Variable */}
            <div className="card p-5 mb-4">
              <h2 className="font-display font-semibold mb-4">Fixed vs Variable Expenses</h2>
              <div className="flex gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Fixed (Rent, Loans, Subs)</span>
                    <span className="font-medium">{format(fixedExpenses)}</span>
                  </div>
                  <div className="h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div className="h-2.5 rounded-full bg-amber-500" style={{ width: `${totalExpense > 0 ? (fixedExpenses/totalExpense)*100 : 0}%` }}/>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Variable (Daily spend)</span>
                    <span className="font-medium">{format(variableExpenses)}</span>
                  </div>
                  <div className="h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div className="h-2.5 rounded-full bg-blue-500" style={{ width: `${totalExpense > 0 ? (variableExpenses/totalExpense)*100 : 0}%` }}/>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Monthly income vs expense bar chart */}
              <div className="card p-5">
                <h2 className="font-display font-semibold mb-4">Monthly Income vs Expense</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyChartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false}
                           tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}/>
                    <Tooltip
                      contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                      formatter={(v: any) => [format(v), '']}
                    />
                    <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={28}/>
                    <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={28}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category pie chart */}
              <div className="card p-5">
                <h2 className="font-display font-semibold mb-4">Spending by Category</h2>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                           dataKey="value" nameKey="name" paddingAngle={2}>
                        {categoryData.map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.fill}/>
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                        formatter={(v: any) => [format(v), '']}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No expense data</p>
                )}
              </div>
            </div>

            {/* Top expenses table */}
            <div className="card p-5">
              <h2 className="font-display font-semibold mb-4">Top Expense Items (Last 3 months)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <th className="text-left pb-3 font-medium">Description</th>
                      <th className="text-left pb-3 font-medium">Category</th>
                      <th className="text-right pb-3 font-medium">Times</th>
                      <th className="text-right pb-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.topExpenses || []).map((tx: any, i: number) => (
                      <tr key={i} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <td className="py-2.5 pr-4" style={{ color: 'rgba(255,255,255,0.8)', maxWidth: 200 }}>
                          <span className="truncate block">{tx.description}</span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-2.5 text-right" style={{ color: 'rgba(255,255,255,0.5)' }}>{tx.count}x</td>
                        <td className="py-2.5 text-right font-medium" style={{ color: '#c9a84c' }}>{format(parseFloat(tx.total))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function AnalysisPage() {
  return (
    <CurrencyProvider>
      <AnalysisContent />
    </CurrencyProvider>
  );
}
