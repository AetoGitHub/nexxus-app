import { useToUpdateCounts } from '~/features/to-update/composables/useToUpdateCounts'

export interface AppNavChild {
  label: string
  to: string
}

export interface AppNavItem {
  labelKey: string
  icon: string
  to?: string
  indent?: boolean
  badge?: number
  /** Si es false, no aparece en la bottom nav mobile. Default true. */
  bottomNav?: boolean
  /** Si tiene hijos, el ítem se renderiza como desplegable (ej. Tareas por grupo). */
  children?: AppNavChild[]
}

/**
 * Navegación principal del shell (sidebar desktop + bottom nav mobile).
 */
export function useAppNav() {
  const route = useRoute()
  const { actionableCount } = useToUpdateCounts()
  const { isSuperuser, isGroupManager, managedGroups, userProjects } = useAuth()

  const tasksItems = computed<AppNavItem[]>(() => {
    const items: AppNavItem[] = [
      { labelKey: 'sidebar.reporteCeo', icon: 'i-lucide-file-chart-column', to: '/reporte-ceo' },
      { labelKey: 'sidebar.dashboard', icon: 'i-lucide-layout-dashboard', to: '/dashboard' },
      { labelKey: 'sidebar.myTasks', icon: 'i-lucide-square-check-big', to: '/tasks' },
    ]

    if (isSuperuser.value) {
      items.push({ labelKey: 'sidebar.adminTasks', icon: 'i-lucide-shield', to: '/tasks/admin' })
    }

    if (isGroupManager.value) {
      items.push({
        labelKey: 'sidebar.groupTasks',
        icon: 'i-lucide-users',
        // Sin bottom nav: es un desplegable, no un link directo (aún no hay UI para esto en mobile).
        bottomNav: false,
        children: managedGroups.value.map(group => ({
          label: group.name,
          to: `/tasks/group/${group.id}`,
        })),
      })
    }

    if (userProjects.value.length > 0) {
      items.push({
        labelKey: 'sidebar.projectTasks',
        icon: 'i-lucide-folder-kanban',
        // Sin bottom nav: es un desplegable, no un link directo (aún no hay UI para esto en mobile).
        bottomNav: false,
        children: userProjects.value.map(project => ({
          label: project.name,
          to: `/tasks/project/${project.id}`,
        })),
      })
    }

    items.push(
      // Oculto de momento: aún no funciona
      // { labelKey: 'sidebar.toAccept', icon: 'i-lucide-inbox', badge: 1 },
      {
        labelKey: 'sidebar.toUpdate',
        icon: 'i-lucide-refresh-cw',
        to: '/tasks/pending-approval',
        badge: actionableCount.value,
        bottomNav: false,
      },
      { labelKey: 'sidebar.settings', icon: 'i-lucide-settings', to: '/tasks/settings' },
    )

    return items
  })

  /** Ítems planos para la bottom nav (sin indentación; máx. ~6 para que quepan). */
  const bottomNavItems = computed<AppNavItem[]>(() =>
    tasksItems.value.filter(item => item.bottomNav !== false),
  )

  function isActive(item: AppNavItem): boolean {
    if (item.children?.length) {
      return item.children.some(
        child => route.path === child.to || route.path.startsWith(`${child.to}/`),
      )
    }
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

  function isChildActive(child: AppNavChild): boolean {
    return route.path === child.to || route.path.startsWith(`${child.to}/`)
  }

  function navigateToChild(child: AppNavChild) {
    void navigateTo(child.to)
  }

  return {
    tasksItems,
    bottomNavItems,
    isActive,
    navigate,
    isChildActive,
    navigateToChild,
  }
}
