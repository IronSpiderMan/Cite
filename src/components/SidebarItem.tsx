import type React from 'react'
import { cn } from '../lib/cn'

export function SidebarItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-1.5 text-[13px] rounded-md transition-all duration-200',
        active
          ? 'bg-primary text-primary-foreground font-medium shadow-sm dark:bg-muted/70 dark:text-foreground dark:shadow-none'
          : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
      )}
    >
      <span className={cn('opacity-70', active && 'opacity-100')}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}
