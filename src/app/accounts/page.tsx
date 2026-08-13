'use client';
import { useState, useEffect, useRef } from 'react';
import AppShell from '@/components/layout/AppShell';
import { CurrencyProvider, useCurrency } from '@/components/CurrencyProvider';

const BANK_COLORS: Record<string, string> = {
  'DIB': '#00843D',
  'CBD': '#E31E24',
  'Emirates Islamic': '#8B1A1A',
  'Emirates NBD': '#FFD700',
  'WIO': '#6366f1',
  'Other': '#64748b',
};

const BANK_PRESETS = [
  { name: 'DIB', full: 'Dubai Islamic Bank', type: 'current' },
  { name: 'WIO', full: 'WIO Bank', type: 'current' },
  { name: 'Emirates Islamic', full: 'Emirates Islamic Bank', type: 'credit_card' },
  { name: 'Emirates NBD', full: 'Emirates NBD', type: 'credit_card' },
  { name: 'CBD', full: 'Commercial Bank of Dubai', type: 'current' },
];

function AccountsContent() {
  const { format, currency, setCurrency } = useCurrency();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null);
  const [editAccount, setEditAccount] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '', bank_name: '', account_number: '', account_type: 'current',
    currency: 'AED', color: '#6366f1', credit_limit: '', payment_due_date: '', minimum_payment: ''
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    setAccounts(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    const url = editAccount ? `/api/accounts/${editAccount.id}` : '/api/accounts';
    const method = editAccount ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowAddModal(false);
    setEditAccount(null);
    setForm({ name: '', bank_name: '', account_number: '', account_type: 'current', currency: 'AED', color: '#6366f1', credit_limit: '', payment_due_date: '', minimum_payment: '' });
    loadAccounts();
  }

  function openEdit(acc: any) {
    setForm({
      name: acc.name, bank_name: acc.bank_name, account_number: acc.account_number || '',
      account_type: acc.account_type, currency: acc.currency, color: acc.color,
      credit_limit: acc.credit_limit || '', payment_due_date: acc.payment_due_date || '',
      minimum_payment: acc.minimum_payment || ''
    });
    setEditAccount(acc);
    setShowAddModal(true);
  }

  function selectPreset(preset: typeof BANK_PRESETS[0]) {
    setForm(f => ({
      ...f,
      bank_name: preset.name,
      name: preset.full,
      account_type: preset.type,
      color: BANK_COLORS[preset.name] || '#6366f1',
    }));
  }

  async function deleteAccount(id: string) {
    if (!confirm('Remove this account?')) return;
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    loadAccounts();
  }

  async function handleUpload(accountId: string, bankName: string) {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('account_id', accountId);
    fd.append('bank_name', bankName);

    const res = await fetch('/api/statements', { method: 'POST', body: fd });
    const data = await res.json();
    setUploadResult(data);
    setUploading(false);
    if (data.ok) loadAccounts();
  }

  return (
    <AppShell currency={currency} onCurrencyChange={setCurrency}>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold">Bank Accounts</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Manage accounts and upload statements
            </p>
          </div>
          <button className="btn-gold text-sm" onClick={() => { setEditAccount(null); setForm({ name: '', bank_name: '', account_number: '', account_type: 'current', currency: 'AED', color: '#6366f1', credit_limit: '', payment_due_date: '', minimum_payment: '' }); setShowAddModal(true); }}>
            + Add Account
          </button>
        </div>

        {loading ? (
          <p className="text-center py-16" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="text-4xl mb-4">🏦</div>
            <h2 className="font-display text-lg font-semibold mb-2">No accounts yet</h2>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Add your bank accounts to start tracking your finances
            </p>
            <button className="btn-gold text-sm" onClick={() => setShowAddModal(true)}>
              Add First Account
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {accounts.map(acc => (
              <div key={acc.id} className="card p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                     style={{ background: acc.color }}>
                  {acc.bank_name?.charAt(0) || 'B'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold">{acc.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>
                      {acc.account_type === 'credit_card' ? 'Credit Card' : acc.account_type === 'savings' ? 'Savings' : 'Current'}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {acc.bank_name} {acc.account_number ? `· ****${acc.account_number.slice(-4)}` : ''}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {acc.transaction_count || 0} transactions
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-lg" style={{ color: parseFloat(acc.computed_balance) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {format(parseFloat(acc.computed_balance || 0))}
                  </p>
                  {acc.account_type === 'credit_card' && acc.payment_due_date && (
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Due: Day {acc.payment_due_date}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => { setShowUploadModal(acc.id); setUploadResult(null); if (fileRef.current) fileRef.current.value = ''; }}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}
                  >
                    Upload
                  </button>
                  <button onClick={() => openEdit(acc)} className="btn-ghost text-xs px-3 py-1.5">Edit</button>
                  <button onClick={() => deleteAccount(acc.id)} className="text-xs px-2 py-1.5 rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-400" style={{ color: 'rgba(255,255,255,0.3)' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Account Modal */}
      {showAddModal && (
        <Modal title={editAccount ? 'Edit Account' : 'Add Bank Account'} onClose={() => setShowAddModal(false)}>
          <form onSubmit={saveAccount} className="space-y-4">
            {!editAccount && (
              <div>
                <label>Quick Select Bank</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {BANK_PRESETS.map(p => (
                    <button type="button" key={p.name} onClick={() => selectPreset(p)}
                      className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                      style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label>Account Nickname *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. DIB Main" required />
              </div>
              <div>
                <label>Bank Name *</label>
                <input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="e.g. DIB" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label>Account Number (optional)</label>
                <input value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} placeholder="Last 4 digits" />
              </div>
              <div>
                <label>Account Type</label>
                <select value={form.account_type} onChange={e => setForm(f => ({ ...f, account_type: e.target.value }))}>
                  <option value="current">Current Account</option>
                  <option value="savings">Savings Account</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>
            </div>
            {form.account_type === 'credit_card' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label>Credit Limit (AED)</label>
                  <input type="number" value={form.credit_limit} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} placeholder="5000" />
                </div>
                <div>
                  <label>Payment Due Day</label>
                  <input type="number" value={form.payment_due_date} onChange={e => setForm(f => ({ ...f, payment_due_date: e.target.value }))} placeholder="23" min="1" max="31" />
                </div>
                <div>
                  <label>Min Payment (AED)</label>
                  <input type="number" value={form.minimum_payment} onChange={e => setForm(f => ({ ...f, minimum_payment: e.target.value }))} placeholder="240" />
                </div>
              </div>
            )}
            <div>
              <label>Color Tag</label>
              <div className="flex gap-2 mt-1">
                {['#00843D','#E31E24','#8B1A1A','#c9a84c','#6366f1','#0891b2','#64748b'].map(c => (
                  <button type="button" key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    className="w-8 h-8 rounded-lg border-2 transition-all"
                    style={{ background: c, borderColor: form.color === c ? 'white' : 'transparent' }}/>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-gold flex-1">{editAccount ? 'Save Changes' : 'Add Account'}</button>
              <button type="button" className="btn-ghost flex-1" onClick={() => setShowAddModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Upload Statement Modal */}
      {showUploadModal && (
        <Modal title="Upload Bank Statement" onClose={() => { setShowUploadModal(null); setUploadResult(null); }}>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Upload a PDF or CSV statement. Supported: DIB, CBD, Emirates Islamic, Emirates NBD, WIO.
            </p>
            <div>
              <label>Select File (PDF or CSV)</label>
              <input ref={fileRef} type="file" accept=".pdf,.csv" />
            </div>
            {uploadResult && (
              <div className={`p-3 rounded-xl text-sm ${uploadResult.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {uploadResult.ok
                  ? `✓ Parsed ${uploadResult.parsed} transactions, inserted ${uploadResult.inserted} new (${uploadResult.skipped} duplicates skipped)`
                  : `Error: ${uploadResult.error}`}
              </div>
            )}
            <div className="flex gap-3">
              <button
                className="btn-gold flex-1"
                disabled={uploading}
                onClick={() => {
                  const acc = accounts.find(a => a.id === showUploadModal);
                  handleUpload(showUploadModal!, acc?.bank_name || 'Unknown');
                }}
              >
                {uploading ? 'Parsing...' : 'Upload & Parse'}
              </button>
              <button className="btn-ghost flex-1" onClick={() => { setShowUploadModal(null); setUploadResult(null); }}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <CurrencyProvider>
      <AccountsContent />
    </CurrencyProvider>
  );
}
