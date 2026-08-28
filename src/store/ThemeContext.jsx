import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useStore } from './StoreContext.jsx';

const ThemeContext = createContext(null);

function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function ThemeProvider({ children }) {
  const { appearance, setAppearance } = useStore();
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemTheme(e.matches ? 'dark' : 'light');
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, []);

  const chosen = appearance.theme || 'system';
  const effective = chosen === 'system' ? systemTheme : chosen;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', effective === 'dark');
    document.documentElement.setAttribute('data-theme', effective);
  }, [effective]);

  const setTheme = useCallback(
    (mode) => setAppearance((a) => ({ ...a, theme: mode })),
    [setAppearance]
  );

  const value = useMemo(
    () => ({ theme: effective, chosen, setTheme }),
    [effective, chosen, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
