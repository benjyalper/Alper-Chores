import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { defaultLocale, type Locale } from './strings';

const I18nContext = createContext<Locale>(defaultLocale);

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = defaultLocale;
  useEffect(() => {
    // Set document direction so a future RTL locale flips the whole layout.
    document.documentElement.dir = locale.dir;
    document.documentElement.lang = locale.code;
  }, [locale]);
  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const locale = useContext(I18nContext);
  const t = (key: string) => locale.t[key] ?? key;
  return { t, dir: locale.dir, code: locale.code };
}
