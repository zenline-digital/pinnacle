'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { CurrencyProvider, useCurrency } from '@/components/CurrencyProvider';

const TYPE_COLORS: Record<string, string> = {
  loan: '#ef4444',
  credit_card: '#8b5cf6',
  emi: '#f59e0b',
  subscription: '#3b82f6',
  other: '#6b7280',
};

const TYPE_ICONS: Record<string, string> = {
  loan: '🏦',
  credit_card: '💳',
  emi: '📦',
  subscription: '📱',
  other: '📋',
};

function CalendarContent() {
  const { format, currency, setCurrency } = useCurrency();
  const [payments, setPayments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ type: 'loan', frequency: 'monthly', reminder_days_before: 3, status: 'pending' });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      fetch('/api/payments').then(r => r.json()),
      fetch('/api/accounts').then(r => r.json()),
    ]).then(([p, a]) => {
      setPayments(Array.isArray(p) ? p : []);
      setAccounts(Array.isArray(a) ? a : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function savePayment(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModal(false);
    setForm({ type: 'loan', frequency: 'monthly', reminder_days_before: 3, status: 'pending' });
    const res = await fetch('/api/payments');
    setPayments(await res.json());
  }

  async function markPaid(payment: any) {
    await fetch('/api/payments', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payment, status: 'paid' }) });
    const res = await fetch('/api/payments');
    setPayments(await res.json());
  }

  async function deletePayment(id: string) {
    if (!confirm('Delete this payment?')) return;
    await fetch('/api/payments', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const res = await fetch('/api/payments');
    setPayments(await res.json());
  }

  const today = new Date();
  function getDaysUntil(dateStr: string) {
    return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000);
  }

  function getStatusColor(payment: any) {
    if (payment.status === 'paid') return '#22c55e';
    const days = getDaysUntil(payment.due_date);
    if (days < 0) return '#ef4444';
    if (days <= 3) return '#f59e0b';
    return 'rgba(255,255,255,0.5)';
  }

  function getStatusLabel(payment: any) {
    if (payment.status === 'paid') return '✓ Paid';
    const days = getDaysUntil(payment.due_date);
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Due today!';
    return `${days} days`;
  }

  const filtered = payments.filter(p => {
    if (filter === 'pending') return p.status === 'pending';
    if (filter === 'paid') return p.status === 'paid';
    if (filter === 'overdue') return p.status === 'pending' && getDaysUntil(p.due_date) < 0;
    return true;
  });

  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + parseFloat(p.amount), 0);
  const thisMonthDue = payments.filter(p => {
    const d = new Date(p.due_date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() && p.status === 'pending';
  }).reduce((s, p) => s + parseFloat(p.amount), 0);

  return (
    <AppShell currency={currency} onCurrencyChange={setCurrency}>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold">Payment Calendar</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Track loans, EMIs, credit cards, and subscriptions</p>
          </div>
          <button className="btn-gold text-sm" onClick={() => setModal(true)}>+ Add Payment</button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Total Pending</p>
            <p className="font-display font-bold text-xl text-red-400">{format(totalPending)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Due This Month</p>
            <p className="font-display font-bold text-xl" style={{ color: '#f59e0b' }}>{format(thisMonthDue)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Total Tracked</p>
            <p className="font-display font-bold text-xl" style={{ color: '#c9a84c' }}>{payments.length}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {[['all','All'], ['pending','Pending'], ['overdue','Overdue'], ['paid','Paid']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className="text-sm px-4 py-2 rounded-xl transition-all"
              style={{ background: filter === val ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)', color: filter === val ? '#c9a84c' : 'rgba(255,255,255,0.5)' }}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="text-4xl mb-4">📅</div>
            <h2 className="font-display text-lg font-semibold mb-2">No payments tracked</h2>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Add your loans, EMIs, and credit card dues to never miss a payment</p>
            <button className="btn-gold text-sm" onClick={() => setModal(true)}>Add Payment</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map(p => {
              const statusColor = getStatusColor(p);
              const statusLabel = getStatusLabel(p);
              const isPaid = p.status === 'paid';
              return (
                <div key={p.id} className="card p-4 flex items-center gap-4" style={{ opacity: isPaid ? 0.6 : 1 }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                       style={{ background: `${TYPE_COLORS[p.type] || '#6b7280'}20` }}>
                    {TYPE_ICONS[p.type] || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{p.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${TYPE_COLORS[p.type]}20`, color: TYPE_COLORS[p.type] }}>
                        {p.type.replace('_', ' ')}
                      </span>
                      {p.frequency !== 'one-time' && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.frequency}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Due: {new Date(p.due_date).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {p.account_name && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>· {p.account_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold">{format(parseFloat(p.amount))}</p>
                    <p className="text-xs mt-0.5 font-medium" style={{ color: statusColor }}>{statusLabel}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!isPaid && (
                      <button onClick={() => markPaid(p)}
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                        Mark Paid
                      </button>
                    )}
                    <button onClick={() => deletePayment(p.id)}
                      className="text-xs px-2 py-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      style={{ color: 'rgba(255,255,255,0.25)' }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}
             onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg">Add Payment Due</h2>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>
            <form onSubmit={savePayment} className="space-y-4">
              <div><label>Name *</label>
                <input value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. DIB Home Loan, Noon Credit Card" required/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label>Type</label>
                  <select value={form.type} onChange={e => setForm((f: any) => ({ ...f, type: e.target.value }))}>
                    <option value="loan">Loan</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="emi">EMI</option>
                    <option value="subscription">Subscription</option>
                    <option value="other">Other</option>
                  </select></div>
                <div><label>Amount (AED) *</label>
                  <input type="number" value={form.amount || ''} onChange={e => setForm((f: any) => ({ ...f, amount: e.target.value }))} required placeholder="0"/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label>Due Date *</label>
                  <input type="date" value={form.due_date || ''} onChange={e => setForm((f: any) => ({ ...f, due_date: e.target.value }))} required/></div>
                <div><label>Frequency</label>
                  <select value={form.frequency} onChange={e => setForm((f: any) => ({ ...f, frequency: e.target.value }))}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one-time">One-time</option>
                  </select></div>
              </div>
              <div><label>Linked Account (optional)</label>
                <select value={form.linked_account_id || ''} onChange={e => setForm((f: any) => ({ ...f, linked_account_id: e.target.value || null }))}>
                  <option value="">None</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select></div>
              <div><label>Notes</label>
                <input value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes"/></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-gold flex-1">Add Payment</button>
                <button type="button" className="btn-ghost flex-1" onClick={() => setModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function CalendarPage() {
  return (
    <CurrencyProvider>
      <CalendarContent />
    </CurrencyProvider>
  );
}
