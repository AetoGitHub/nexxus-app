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
  const { isSuperuser } = useAuth()

  const tasksItems = computed<AppNavItem[]>(() => {
    const items: AppNavItem[] = [
      { labelKey: 'sidebar.reporteCeo', icon: 'i-lucide-file-chart-column', to: '/reporte-ceo' },
      { labelKey: 'sidebar.dashboard', icon: 'i-lucide-layout-dashboard', to: '/dashboard' },
      { labelKey: 'sidebar.myTasks', icon: 'i-lucide-square-check-big', to: '/tasks' },
    ]

    if (isSuperuser.value) {
      items.push({ labelKey: 'sidebar.adminTasks', icon: 'i-lucide-shield', to: '/tasks/admin' })
    }

    items.push(
      // Oculto de momento: aún no funciona
      // { labelKey: 'sidebar.toAccept', icon: 'i-lucide-inbox', indent: true, badge: 1 },
      {
        labelKey: 'sidebar.toUpdate',
        icon: 'i-lucide-refresh-cw',
        indent: true,
        to: '/tasks/pending-approval',
        badge: actionableCount.value,
        bottomNav: false,
      },
      { labelKey: 'sidebar.settings', icon: 'i-lucide-settings', indent: true, to: '/tasks/settings' },
    )

    return items
  })

  /** Ítems planos para la bottom nav (sin indentación; máx. ~6 para que quepan). */
  const bottomNavItems = computed<AppNavItem[]>(() =>
    tasksItems.value.filter(item => item.bottomNav !== false),
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
    bottomNavItems,
    isActive,
    navigate,
  }
}
