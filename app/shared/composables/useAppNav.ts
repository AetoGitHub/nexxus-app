import { useToUpdateCounts } from '~/features/to-update/composables/useToUpdateCounts'

export interface AppNavChild {
  label: string
  to: string
}

export interface AppNavItem {
  labelKey: string
  icon: string
  to?: string
  badge?: number
  /** Si es false, no aparece en la bottom nav mobile. Default true. */
  bottomNav?: boolean
  /** Si tiene hijos, el ítem se renderiza como desplegable (ej. Tareas, Tareas por grupo). */
  children?: AppNavChild[]
}

/**
 * Navegación principal del shell (sidebar desktop + bottom nav mobile).
 */
export function useAppNav() {
  const route = useRoute()
  const { actionableCount } = useToUpdateCounts()
  const { isGroupManager, managedGroups, userProjects } = useAuth()
  const { can } = usePermissions()

  const tasksItems = computed<AppNavItem[]>(() => {
    const canViewTasks = can('task', 'view')
    const canViewAll = canViewTasks && can('task', 'view_all')
    const items: AppNavItem[] = []

    // En mobile viven en la hoja "Más": la barra inferior solo lleva Mis tareas, Pendiente de aprobación y Más.
    if (can('report', 'view')) {
      items.push({ labelKey: 'sidebar.reporteCeo', icon: 'i-lucide-file-chart-column', to: '/reporte-ceo', bottomNav: false })
    }
    if (can('dashboard', 'view')) {
      items.push({ labelKey: 'sidebar.dashboard', icon: 'i-lucide-layout-dashboard', to: '/dashboard', bottomNav: false })
    }
    if (canViewTasks) {
      items.push({ labelKey: 'sidebar.myTasks', icon: 'i-lucide-square-check-big', to: '/tasks' })
    }

    if (canViewAll) {
      items.push({
        labelKey: 'sidebar.adminTasks',
        icon: 'i-lucide-shield',
        to: '/tasks/admin',
        // Vive en la hoja "Más" mobile, junto con Tareas por grupo/proyecto.
        bottomNav: false,
      })
    }

    if (canViewTasks && isGroupManager.value) {
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

    // Ver por proyecto manda `admin_project`: es parte de la «Vista total».
    if (canViewAll && userProjects.value.length > 0) {
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

    // Oculto de momento: aún no funciona
    // { labelKey: 'sidebar.toAccept', icon: 'i-lucide-inbox', badge: 1 },
    if (can('task', 'view_approvals')) {
      items.push({
        labelKey: 'sidebar.toUpdate',
        icon: 'i-lucide-refresh-cw',
        to: '/tasks/pending-approval',
        badge: actionableCount.value,
      })
    }
    // Siempre: además de proyectos/grupos tiene secciones personales (notificaciones, general…).
    items.push({
      labelKey: 'sidebar.settings',
      icon: 'i-lucide-settings',
      to: '/tasks/settings',
      bottomNav: false,
    })

    return items
  })

  /** Ítems planos para la bottom nav (sin indentación; máx. ~6 para que quepan). */
  const bottomNavItems = computed<AppNavItem[]>(() =>
    tasksItems.value.filter(item => item.bottomNav !== false),
  )

  function isChildActive(child: AppNavChild): boolean {
    // /tasks no debe activarse en /tasks/settings, /tasks/admin, etc.
    if (child.to === '/tasks') {
      return route.path === '/tasks'
    }
    return route.path === child.to || route.path.startsWith(`${child.to}/`)
  }

  function isActive(item: AppNavItem): boolean {
    if (item.children?.length) {
      return item.children.some(child => isChildActive(child))
    }
    if (!item.to) {
      return false
    }
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
