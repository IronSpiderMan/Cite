import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Language } from '../../i18n'
import type { ThemeMode } from '../../settingsTypes'

export function SettingsModal({
  open,
  snapshotDir,
  theme,
  language,
  t,
  onClose,
  onSelectSnapshotDir,
  onClearSnapshotDir,
  onChangeTheme,
  onChangeLanguage,
}: {
  open: boolean
  snapshotDir: string | null
  theme: ThemeMode
  language: Language
  t: (key: string) => string
  onClose: () => void
  onSelectSnapshotDir: () => void
  onClearSnapshotDir: () => void
  onChangeTheme: (v: ThemeMode) => void
  onChangeLanguage: (v: Language) => void
}) {
  if (!open) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg">
        <div className="h-12 border-b border-border flex items-center justify-between px-4">
          <h2 className="text-sm font-semibold">{t('settings.title')}</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-5">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">{t('settings.snapshotDir')}</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 px-3 py-2 rounded-md border border-border bg-muted/10 text-sm truncate">
                {snapshotDir || t('settings.snapshotDirDefault')}
              </div>
              <button onClick={onSelectSnapshotDir} className="px-3 py-2 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90">
                {t('settings.choose')}
              </button>
              <button
                onClick={onClearSnapshotDir}
                disabled={!snapshotDir}
                className={cn(
                  'px-3 py-2 text-xs rounded-md border transition-colors',
                  snapshotDir ? 'border-border text-muted-foreground hover:text-foreground hover:bg-muted' : 'border-border text-muted-foreground/50 cursor-not-allowed'
                )}
              >
                {t('settings.resetDefault')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">{t('settings.theme')}</div>
              <select
                value={theme}
                onChange={(e) => onChangeTheme(e.target.value as ThemeMode)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
              >
                <option value="light">{t('settings.theme.light')}</option>
                <option value="dark">{t('settings.theme.dark')}</option>
                <option value="system">{t('settings.theme.system')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">{t('settings.language')}</div>
              <select
                value={language}
                onChange={(e) => onChangeLanguage(e.target.value as Language)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
              >
                <option value="zh">{t('settings.lang.zh')}</option>
                <option value="en">{t('settings.lang.en')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
