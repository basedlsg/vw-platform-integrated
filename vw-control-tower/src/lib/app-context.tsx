"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

// ── Theme ──────────────────────────────────────────────────────────────────

type Theme = 'dark' | 'light';

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: 'dark',
  toggleTheme: () => {},
});

// ── Language ───────────────────────────────────────────────────────────────

type Lang = 'en' | 'zh';

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'en',
  setLang: () => {},
});

// ── Providers ──────────────────────────────────────────────────────────────

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [lang, setLang] = useState<Lang>('en');

  // Initialise from localStorage (runs once on mount)
  useEffect(() => {
    const savedTheme = (localStorage.getItem('vw-theme') as Theme) ?? 'dark';
    const savedLang = (localStorage.getItem('vw-lang') as Lang) ?? 'en';
    setTheme(savedTheme);
    setLang(savedLang);
    document.documentElement.dataset.theme = savedTheme;
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('vw-theme', next);
    document.documentElement.dataset.theme = next;
  };

  const handleSetLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem('vw-lang', l);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <LangContext.Provider value={{ lang, setLang: handleSetLang }}>
        {children}
      </LangContext.Provider>
    </ThemeContext.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useTheme() {
  return useContext(ThemeContext);
}

export function useLang() {
  return useContext(LangContext);
}
