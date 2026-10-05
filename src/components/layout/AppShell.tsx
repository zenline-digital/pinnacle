'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Currency } from '@/types';

const NAV = [
  { href: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { href: '/accounts', icon: '🏦', label: 'Accounts' },
  { href: '/transactions', icon: '↕', label: 'Transactions' },
  { href: '/analysis', icon: '📊', label: 'Analysis' },
  { href: '/goals', icon: '🎯', label: 'Life Goals' },
  { href: '/calendar', icon: '📅', label: 'Payments' },
  { href: '/investments', icon: '🇮🇳', label: 'Investments' },
  { href: '/gold', icon: '⚡', label: 'Gold Signal' },
];

interface AppShellProps {
  children: React.ReactNode;
  currency?: Currency;
  onCurrencyChange?: (c: Currency) => void;
}

export default function AppShell({ children, currency = 'AED', onCurrencyChange }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className="flex flex-col shrink-0 transition-all duration-300 border-r"
        style={{
          width: collapsed ? 72 : 240,
          background: '#0e0e16',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
               style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)' }}>
            <span style={{ color: '#0a0a0f', fontSize: 16, fontWeight: 900 }}>P</span>
          </div>
          {!collapsed && (
            <span className="font-display font-bold tracking-widest text-sm gold-gradient">PINNACLE</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-gray-600 hover:text-gray-300 transition-colors"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {collapsed
                ? <path d="M9 18l6-6-6-6"/>
                : <path d="M15 18l-6-6 6-6"/>}
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group"
                style={{
                  background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
                  color: active ? '#c9a84c' : 'rgba(255,255,255,0.5)',
                }}
              >
                <span className="text-base shrink-0 w-5 text-center">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
                {active && !collapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current"/>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Currency selector */}
        {!collapsed && (
          <div className="px-4 pb-3">
            <label className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Currency</label>
            <select
              value={currency}
              onChange={e => onCurrencyChange?.(e.target.value as Currency)}
              className="text-sm py-1.5"
              style={{ background: '#1a1a28' }}
            >
              <option value="AED">AED — Dirham</option>
              <option value="INR">INR — ₹ Rupee</option>
              <option value="USD">USD — $ Dollar</option>
            </select>
          </div>
        )}

        {/* Logout */}
        <div className="px-3 pb-5 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm transition-all hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {children}
      </main>
    </div>
  );
}