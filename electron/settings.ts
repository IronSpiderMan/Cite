import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export type ThemeMode = 'light' | 'dark' | 'system'
export type Language = 'zh' | 'en'

export interface AppSettings {
  snapshotDir: string | null
  theme: ThemeMode
  language: Language
}

const DEFAULT_SETTINGS: AppSettings = {
  snapshotDir: null,
  theme: 'system',
  language: 'zh',
}

function settingsFilePath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

function sanitizeSettings(input: any): AppSettings {
  const theme: ThemeMode = input?.theme === 'light' || input?.theme === 'dark' || input?.theme === 'system' ? input.theme : DEFAULT_SETTINGS.theme
  const language: Language = input?.language === 'zh' || input?.language === 'en' ? input.language : DEFAULT_SETTINGS.language
  const snapshotDir = typeof input?.snapshotDir === 'string' && input.snapshotDir.trim() ? input.snapshotDir : null
  return { snapshotDir, theme, language }
}

export function getSettings(): AppSettings {
  try {
    const fp = settingsFilePath()
    if (!fs.existsSync(fp)) return DEFAULT_SETTINGS
    const raw = fs.readFileSync(fp, 'utf-8')
    const parsed = JSON.parse(raw)
    return sanitizeSettings({ ...DEFAULT_SETTINGS, ...parsed })
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const prev = getSettings()
  const next = sanitizeSettings({ ...prev, ...patch })
  const fp = settingsFilePath()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(fp, JSON.stringify(next, null, 2), 'utf-8')
  return next
}

export function getEffectiveSnapshotDir(): string {
  const s = getSettings()
  if (s.snapshotDir) return s.snapshotDir
  return path.join(app.getPath('userData'), 'snapshots')
}
