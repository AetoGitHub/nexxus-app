import { useToUpdateCounts } from '~/features/to-update/composables/useToUpdateCounts'

export interface AppNavChild {
  label: string
  to: string
}

/** Grupos del menú (maqueta UX-04): TRABAJO · EQUIPO · ANÁLISIS, y al final Configuración. */
export type AppNavSectionId = 'work' | 'team' | 'analysis' | 'system'

export interface AppNavSection {
  id: AppNavSectionId
  labelKey: string
  items: AppNavItem[]
}

export interface AppNavItem {
  labelKey: string
  icon: string
  section: AppNavSectionId
  to?: string
  /** Query que distingue al ítem dentro de la misma ruta (ej. Calendario = /tasks?view=calendar). */
  query?: Record<string, string>
  badge?: number
  /** Si es false, no aparece en la bottom nav mobile. Default true. */
  bottomNav?: boolean
  /** Si tiene hijos, el ítem se renderiza como desplegable (ej. Tareas, Tareas por grupo). */
  children?: AppNavChild[]
  /** Lugar del bloque «Tareas por proyecto» (privados + empresa): AppNavList dibuja ahí AppPrivateProjects. */
  projectsBlock?: boolean
}

/**
 * Navegación principal del shell (sidebar desktop + bottom nav mobile).
 */
export function useAppNav() {
  const route = useRoute()
  const { actionableCount } = useToUpdateCounts()
  const { isGroupManager, managedGroups } = useAuth()
  const { can } = usePermissions()

  const tasksItems = computed<AppNavItem[]>(() => {
    const canViewTasks = can('task', 'view')
    const canViewAll = canViewTasks && can('task', 'view_all')
    const items: AppNavItem[] = []

    // Orden e iconos de la maqueta UX-04. En mobile la barra inferior lleva lo de TRABAJO (Mis tareas, Por aprobar,
    // Calendario) y «Más»; EQUIPO, ANÁLISIS y Configuración viven en la hoja «Más».

    // ── TRABAJO ──
    if (canViewTasks) {
      items.push({ labelKey: 'sidebar.myTasks', icon: 'i-lucide-list-checks', section: 'work', to: '/tasks' })
    }
    // Oculto de momento: aún no funciona
    // { labelKey: 'sidebar.toAccept', icon: 'i-lucide-inbox', badge: 1 },
    if (can('task', 'view_approvals')) {
      items.push({
        labelKey: 'sidebar.toUpdate',
        icon: 'i-lucide-inbox',
        section: 'work',
        to: '/tasks/pending-approval',
        badge: actionableCount.value,
      })
    }
    if (canViewTasks) {
      // Atajo a la vista Calendario de Mis tareas (misma pantalla, `?view=calendar`).
      items.push({
        labelKey: 'sidebar.calendar',
        icon: 'i-lucide-calendar',
        section: 'work',
        to: '/tasks',
        query: { view: 'calendar' },
      })
    }

    // ── EQUIPO ──
    if (canViewAll) {
      items.push({
        labelKey: 'sidebar.adminTasks',
        icon: 'i-lucide-layers',
        section: 'team',
        to: '/tasks/admin',
        bottomNav: false,
      })
    }
    // «Tareas por grupo»: permiso `task.can_view_by_group` (y los grupos que dirige, que son los que lista).
    if (canViewTasks && can('task', 'view_by_group') && isGroupManager.value) {
      items.push({
        labelKey: 'sidebar.groupTasks',
        icon: 'i-lucide-users',
        section: 'team',
        // Sin bottom nav: es un desplegable, no un link directo.
        bottomNav: false,
        children: managedGroups.value.map(group => ({
          label: group.name,
          to: `/tasks/group/${group.id}`,
        })),
      })
    }
    // «Tareas por proyecto»: en este lugar AppNavList dibuja el bloque AppPrivateProjects (privados primero y luego los de
    // la empresa, estos solo con `task.can_view_by_project`).
    if (canViewTasks) {
      items.push({
        labelKey: 'sidebar.projectTasks',
        icon: 'i-lucide-folder',
        section: 'team',
        bottomNav: false,
        projectsBlock: true,
      })
    }

    // ── ANÁLISIS ──
    if (can('dashboard', 'view')) {
      items.push({ labelKey: 'sidebar.dashboard', icon: 'i-lucide-chart-column', section: 'analysis', to: '/dashboard', bottomNav: false })
    }
    if (can('report', 'view')) {
      items.push({ labelKey: 'sidebar.reporteCeo', icon: 'i-lucide-file-text', section: 'analysis', to: '/reporte-ceo', bottomNav: false })
    }

    // ── Configuración ── (siempre: además de proyectos/grupos tiene secciones personales: notificaciones, general…)
    items.push({
      labelKey: 'sidebar.settings',
      icon: 'i-lucide-settings',
      section: 'system',
      to: '/tasks/settings',
      bottomNav: false,
    })

    return items
  })

  const SECTION_ORDER: { id: AppNavSectionId, labelKey: string }[] = [
    { id: 'work', labelKey: 'sidebar.sections.work' },
    { id: 'team', labelKey: 'sidebar.sections.team' },
    { id: 'analysis', labelKey: 'sidebar.sections.analysis' },
    { id: 'system', labelKey: 'sidebar.sections.system' },
  ]

  /** Ítems agrupados por sección (sin secciones vacías por permisos). */
  const navSections = computed<AppNavSection[]>(() =>
    SECTION_ORDER
      .map(section => ({ ...section, items: tasksItems.value.filter(item => item.section === section.id) }))
      .filter(section => section.items.length > 0),
  )

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
      if (route.path !== '/tasks') {
        return false
      }
      // Mis tareas y Calendario comparten ruta: los distingue `?view=calendar`.
      const onCalendar = route.query.view === 'calendar'
      return item.query?.view === 'calendar' ? onCalendar : !onCalendar
    }
    return route.path === item.to || route.path.startsWith(`${item.to}/`)
  }

  function navigate(item: AppNavItem) {
    if (item.to) {
      void navigateTo({ path: item.to, query: item.query })
    }
  }

  function navigateToChild(child: AppNavChild) {
    void navigateTo(child.to)
  }

  return {
    tasksItems,
    navSections,
    bottomNavItems,
    isActive,
    navigate,
    isChildActive,
    navigateToChild,
  }
}
