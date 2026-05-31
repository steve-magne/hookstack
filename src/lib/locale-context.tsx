'use client'

import { createContext, useContext } from 'react'
import type { Locale, Translations } from './i18n'
import { getT, translations } from './i18n'

const LocaleContext = createContext<Locale>('fr')

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export function useLocale(): Locale {
  return useContext(LocaleContext)
}

export function useT(): Translations {
  const locale = useLocale()
  return translations[locale] ?? translations.fr
}
