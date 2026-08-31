import { useToUpdateCounts } from '~/features/to-update/composables/useToUpdateCounts'

export interface AppNavItem {
  labelKey: string
  icon: string
  to?: string
  indent?: boolean
  badge?: number
  /** Si es false, no aparece en la bottom nav mobile. Default true. */
  bottomNav?: boolean
}

/**
 * Navegación principal del shell (sidebar desktop + bottom nav mobile).
 */
export function useAppNav() {
  const route = useRoute()
  const { actionableCount } = useToUpdateCounts()

  const tasksItems = computed<AppNavItem[]>(() => [
    { labelKey: 'sidebar.reporteCeo', icon: 'i-lucide-file-chart-column', to: '/reporte-ceo' },
    { labelKey: 'sidebar.dashboard', icon: 'i-lucide-layout-dashboard', to: '/dashboard' },
    { labelKey: 'sidebar.tasks', icon: 'i-lucide-square-check-big', to: '/tasks' },
    { labelKey: 'sidebar.toAccept', icon: 'i-lucide-inbox', indent: true, badge: 1 }, // mock: aún sin ruta
    {
      labelKey: 'sidebar.toUpdate',
      icon: 'i-lucide-refresh-cw',
      indent: true,
      to: '/tasks/pending-approval',
      badge: actionableCount.value,
      bottomNav: false,
    },
    { labelKey: 'sidebar.settings', icon: 'i-lucide-settings', indent: true, to: '/tasks/settings' },
  ])

  const masterItems: AppNavItem[] = [
    { labelKey: 'sidebar.masterSettings', icon: 'i-lucide-settings-2', to: '/settings' },
  ]

  /** Ítems planos para la bottom nav (sin indentación; máx. ~6 para que quepan). */
  const bottomNavItems = computed<AppNavItem[]>(() =>
    [...tasksItems.value, ...masterItems].filter(item => item.bottomNav !== false),
  )

  function isActive(item: AppNavItem): boolean {
    if (!item.to) {
      return false
    }
    // /tasks no debe activarse en /tasks/settings
    if (item.to === '/tasks') {
      return route.path === '/tasks'
    }
    return route.path === item.to || route.path.startsWith(`${item.to}/`)
  }

  function navigate(item: AppNavItem) {
    if (item.to) {
      void navigateTo(item.to)
    }
  }

  return {
    tasksItems,
    masterItems,
    bottomNavItems,
    isActive,
    navigate,
  }
}
