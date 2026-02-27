import type { Language } from './i18n'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface AppSettings {
  snapshotDir: string | null
  theme: ThemeMode
  language: Language
}

