"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme, useLang } from '@/lib/app-context';
import { T } from '@/lib/translations';

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();
  const t = T[lang];
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navItems = [
    { icon: 'grid_view',   label: t.nav_dashboard,  href: '/' },
    { icon: 'newspaper',   label: t.nav_news,       href: '/agents' },
    { icon: 'description', label: t.nav_reports,    href: '/reports' },
    { icon: 'timeline',    label: t.nav_activity,   href: '/activity' },
  ];

  const pages = [
    { icon: 'grid_view', label: t.nav_dashboard, href: '/' },
    { icon: 'flag', label: t.china_cmp_nav, href: '/china-competitiveness' },
    { icon: 'eco', label: t.sc_nav, href: '/supply-chain' },
  ];

  const currentPage = pages.find(p => p.href === pathname) ?? pages[0];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      {/* Ambient liquid gradient */}
      <div className="fixed inset-0 pointer-events-none liquid-gradient z-0" />

      {/* Sidebar */}
      <aside
        className="relative z-10 w-60 flex-shrink-0 flex flex-col"
        style={{
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-divider)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Logo + Page Dropdown */}
        <div
          className="px-5 py-6"
          style={{ borderBottom: '1px solid var(--border-divider)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#135bec' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'white' }}>account_balance</span>
            </div>
            <div>
              <p className="text-sm font-bold leading-tight t-primary">{t.app_name}</p>
              <p className="text-xs t-muted">{t.app_subtitle}</p>
            </div>
          </div>
          {/* Page selector dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setPageDropdownOpen(!pageDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#135bec' }}>{currentPage.icon}</span>
                {currentPage.label}
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', transition: 'transform 0.2s', transform: pageDropdownOpen ? 'rotate(180deg)' : 'none' }}>expand_more</span>
            </button>
            {pageDropdownOpen && (
              <div
                className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl z-50"
                style={{
                  background: 'var(--bg-modal)',
                  border: '1px solid var(--border-card)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                {pages.map((p) => (
                  <Link
                    key={p.href}
                    href={p.href}
                    onClick={() => setPageDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-all"
                    style={{
                      background: pathname === p.href ? 'rgba(19,91,236,0.08)' : 'transparent',
                      color: pathname === p.href ? '#135bec' : 'var(--text-secondary)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{p.icon}</span>
                    {p.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium"
                style={{
                  background: isActive ? 'rgba(19,91,236,0.12)' : 'transparent',
                  color: isActive ? '#135bec' : 'var(--text-secondary)',
                  border: `1px solid ${isActive ? 'rgba(19,91,236,0.2)' : 'transparent'}`,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Controls: theme + language */}
        <div
          className="px-3 py-3 space-y-2"
          style={{ borderTop: '1px solid var(--border-divider)' }}
        >
          {/* Language toggle */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
            {(['en', 'zh'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
                style={{
                  background: lang === l ? '#135bec' : 'transparent',
                  color: lang === l ? 'white' : 'var(--text-muted)',
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{
              background: 'var(--bg-btn-secondary)',
              border: '1px solid var(--border-btn-sec)',
              color: 'var(--text-muted)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
            {theme === 'dark' ? t.shell_light_mode : t.shell_dark_mode}
          </button>

          {/* Footer label */}
          <p className="text-xs px-1 t-very-muted" style={{ color: 'var(--text-very-muted)' }}>{t.app_footer}</p>
        </div>
      </aside>

      {/* Main */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Shell;
