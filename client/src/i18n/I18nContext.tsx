import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { defaultLocale, locales, type Dir, type Locale } from './strings';

const STORAGE_KEY = 'alper.lang';

interface I18nValue {
  code: string;
  dir: Dir;
  /** Translate a key, optionally interpolating `{name}`-style params. */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Available languages for a switcher. */
  languages: { code: string; name: string }[];
  setLanguage: (code: string) => void;
  toggle: () => void;
}

const I18nContext = createContext<I18nValue | null>(null);

function pickInitial(): Locale {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && locales[saved]) return locales[saved];
  }
  return defaultLocale;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => pickInitial());

  useEffect(() => {
    // Flip the whole document to LTR/RTL and set the language.
    document.documentElement.dir = locale.dir;
    document.documentElement.lang = locale.code;
  }, [locale]);

  const setLanguage = useCallback((code: string) => {
    const next = locales[code];
    if (!next) return;
    localStorage.setItem(STORAGE_KEY, code);
    setLocale(next);
  }, []);

  const toggle = useCallback(() => {
    setLocale((cur) => {
      const nextCode = cur.code === 'he' ? 'en' : 'he';
      localStorage.setItem(STORAGE_KEY, nextCode);
      return locales[nextCode];
    });
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let s = locale.t[key] ?? defaultLocale.t[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return s;
    },
    [locale],
  );

  const value = useMemo<I18nValue>(
    () => ({
      code: locale.code,
      dir: locale.dir,
      t,
      languages: Object.values(locales).map((l) => ({ code: l.code, name: l.name })),
      setLanguage,
      toggle,
    }),
    [locale, t, setLanguage, toggle],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const v = useContext(I18nContext);
  if (!v) throw new Error('useI18n must be used within I18nProvider');
  return v;
}
