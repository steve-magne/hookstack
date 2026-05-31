'use client'

import { T, type Translations } from './i18n'

export function useT(): Translations {
  return T
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
