'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { CurrencyProvider, useCurrency } from '@/components/CurrencyProvider';

const CATEGORIES = [
  'Salary & Income','Loan Repayment','Rent','Credit Card Payment','Groceries',
  'Dining & Restaurants','Transport','Utilities','Shopping','ATM Withdrawal',
  'Transfer','Family Support','Insurance','Subscription','Charity','Bank Charges',
  'Investment','Travel','Healthcare','Food Delivery','Entertainment','Uncategorized'
];

function TransactionsContent() {
  const { format, currency, setCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterAccount, setFilterAccount] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const [editTx, setEditTx] = useState<any>(null);

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then(d => setAccounts(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [page, filterAccount, filterType]);

  async function loadTransactions() {
    setLoading(true);
    let url = `/api/transactions?page=${page}&limit=50`;
    if (filterAccount) url += `&account_id=${filterAccount}`;
    const res = await fetch(url);
    const data = await res.json();
    setTransactions(data.transactions || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  async function updateCategory(tx: any, category: string) {
    await fetch(`/api/transactions/${tx.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...tx, category })
    });
    setTransactions(ts => ts.map(t => t.id === tx.id ? { ...t, category } : t));
  }

  const filtered = transactions.filter(tx => {
    if (filterType && tx.type !== filterType) return false;
    if (filterCategory && tx.category !== filterCategory) return false;
    if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell currency={currency} onCurrencyChange={setCurrency}>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Transactions</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{total} transactions total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label>Search</label>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search description..." className="py-1.5"/>
            </div>
            <div>
              <label>Account</label>
              <select value={filterAccount} onChange={e => { setFilterAccount(e.target.value); setPage(1); }}>
                <option value="">All Accounts</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label>Type</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">All Types</option>
                <option value="credit">Income / Credit</option>
                <option value="debit">Expense / Debit</option>
              </select>
            </div>
            <div>
              <label>Category</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading transactions...</p>
        ) : filtered.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="text-4xl mb-4">↕</div>
            <h2 className="font-display text-lg font-semibold mb-2">No transactions yet</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Upload a bank statement to see your transactions here</p>
          </div>
        ) : (
          <>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)' }}>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Description</th>
                    <th className="text-left px-4 py-3 font-medium">Account</th>
                    <th className="text-left px-4 py-3 font-medium">Category</th>
                    <th className="text-right px-4 py-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(tx => (
                    <tr key={tx.id} className="border-t hover:bg-white/2 transition-colors"
                        style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {new Date(tx.date).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="truncate text-sm" title={tx.description}>{tx.description}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{tx.account_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: tx.account_color }}/>
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{tx.bank_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={tx.category}
                          onChange={e => updateCategory(tx, e.target.value)}
                          className="text-xs py-1 px-2 rounded-lg"
                          style={{ width: 'auto', padding: '4px 8px', background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(255,255,255,0.7)' }}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="font-bold" style={{ color: tx.type === 'credit' ? '#22c55e' : '#ef4444' }}>
                          {tx.type === 'credit' ? '+' : '-'}{format(parseFloat(tx.amount))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > 50 && (
              <div className="flex items-center justify-center gap-3 mt-5">
                <button className="btn-ghost text-sm px-4 py-2" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Page {page} of {Math.ceil(total / 50)}</span>
                <button className="btn-ghost text-sm px-4 py-2" disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function TransactionsPage() {
  return (
    <CurrencyProvider>
      <TransactionsContent />
    </CurrencyProvider>
  );
}
