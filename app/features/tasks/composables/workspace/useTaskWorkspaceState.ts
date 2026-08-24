import type { MaybeRefOrGetter } from 'vue'
import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type {
  CalendarMonth,
  TaskCalendarPhase,
  TaskGroupBy,
  TaskListFilters,
  TaskView,
} from '~/features/tasks/types/task.types'
import type { NewTaskFormDefaults } from '~/features/tasks/utils/form/new-task-defaults.util'
import type { ToUpdateSectionId } from '~/features/to-update/types/to-update.types'

const PREFERRED_VIEW_KEY = 'nexxus:tasks:preferred-view'

const VALID_VIEWS: TaskView[] = ['list', 'kanban', 'calendar']
const VALID_GROUP_BY: TaskGroupBy[] = ['all', 'due', 'project', 'user', 'group']
const VALID_PHASES: TaskCalendarPhase[] = ['start', 'process', 'close']

function parseView(value: unknown): TaskView | null {
  return typeof value === 'string' && VALID_VIEWS.includes(value as TaskView)
    ? (value as TaskView)
    : null
}

function parseGroupBy(value: unknown): TaskGroupBy | null {
  return typeof value === 'string' && VALID_GROUP_BY.includes(value as TaskGroupBy)
    ? (value as TaskGroupBy)
    : null
}

function parsePhase(value: unknown): TaskCalendarPhase | null {
  return typeof value === 'string' && VALID_PHASES.includes(value as TaskCalendarPhase)
    ? (value as TaskCalendarPhase)
    : null
}

function pickQueryString(query: LocationQuery, key: string): unknown {
  const value = query[key]
  return Array.isArray(value) ? value[0] : value
}

function parseCalendarMonth(query: LocationQuery): CalendarMonth | null {
  const year = Number(pickQueryString(query, 'year'))
  const month = Number(pickQueryString(query, 'month'))

  if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

function currentCalendarMonth(): CalendarMonth {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

function buildWorkspaceQuery(
  current: LocationQuery,
  state: {
    view: TaskView
    groupBy: TaskGroupBy
    calendarPhase: TaskCalendarPhase
    calendarMonth: CalendarMonth
  },
): LocationQueryRaw {
  const next: LocationQueryRaw = { ...current }

  next.view = state.view

  if (state.groupBy === 'all') {
    delete next.groupBy
  }
  else {
    next.groupBy = state.groupBy
  }

  if (state.view !== 'calendar') {
    delete next.phase
    delete next.year
    delete next.month
  }
  else {
    next.phase = state.calendarPhase
    next.year = String(state.calendarMonth.year)
    next.month = String(state.calendarMonth.month)
  }

  return next
}

function sameQuery(a: LocationQueryRaw, b: LocationQuery): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    const left = a[key]
    const right = b[key]
    const leftValue = Array.isArray(left) ? left[0] : left
    const rightValue = Array.isArray(right) ? right[0] : right
    if ((leftValue ?? undefined) !== (rightValue ?? undefined)) {
      return false
    }
  }
  return true
}

/** Estado compartido del workspace de tareas (filtros, vista, slideover). */
export function useTaskWorkspaceState(options: {
  excludeViews?: MaybeRefOrGetter<TaskView[]>
} = {}) {
  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()

  const preferredView = useLocalStorage<TaskView>(PREFERRED_VIEW_KEY, 'list')

  const excludedViews = computed(() => toValue(options.excludeViews) ?? [])

  function resolveView(candidate: TaskView | null | undefined, fallback: TaskView = 'list'): TaskView {
    const value = candidate && VALID_VIEWS.includes(candidate) ? candidate : fallback
    if (excludedViews.value.includes(value)) {
      return VALID_VIEWS.find(viewOption => !excludedViews.value.includes(viewOption)) ?? 'list'
    }
    return value
  }

  // Prioridad: URL > default. localStorage se aplica en cliente si no hay param.
  const initialView = resolveView(parseView(pickQueryString(route.query, 'view')))
  const initialGroupBy = parseGroupBy(pickQueryString(route.query, 'groupBy')) ?? 'all'
  const initialPhase = parsePhase(pickQueryString(route.query, 'phase')) ?? 'start'
  const initialCalendarMonth = parseCalendarMonth(route.query) ?? currentCalendarMonth()

  const view = ref<TaskView>(initialView)
  const search = ref('')
  const groupBy = ref<TaskGroupBy>(initialGroupBy)
  const calendarPhase = ref<TaskCalendarPhase>(initialPhase)
  const calendarMonth = ref<CalendarMonth>(initialCalendarMonth)
  const filtersOpen = ref(false)
  const newTaskOpen = ref(false)
  const selectedTaskId = ref<number | null>(null)
  /** Prefills al abrir el slideover en modo creación (p. ej. proyecto desde Kanban). */
  const newTaskDefaults = ref<NewTaskFormDefaults | null>(null)
  /** Sección de pending-approval desde la que se abrió el detalle. */
  const toUpdateSection = ref<ToUpdateSectionId | null>(null)

  const debouncedSearch = refDebounced(search, 300)
  const listFilters = ref<TaskListFilters>({})

  /** Evita bucles al sincronizar URL ↔ estado. */
  let syncingFromRoute = false

  onMounted(() => {
    if (parseView(pickQueryString(route.query, 'view'))) {
      return
    }

    const stored = resolveView(
      VALID_VIEWS.includes(preferredView.value) ? preferredView.value : null,
    )
    if (stored !== view.value) {
      view.value = stored
    }
  })

  watch(debouncedSearch, (value) => {
    listFilters.value = {
      ...listFilters.value,
      short_description: value.trim() || undefined,
    }
  })

  watch(newTaskOpen, (isOpen) => {
    if (!isOpen) {
      newTaskDefaults.value = null
      toUpdateSection.value = null
    }
  })

  watch(excludedViews, () => {
    view.value = resolveView(view.value)
  })

  watch([view, groupBy], ([value, selectedGroupBy]) => {
    preferredView.value = value
    if (value === 'calendar' && selectedGroupBy === 'due') {
      groupBy.value = 'all'
    }
  }, { immediate: true })

  // Estado → URL
  watch(
    [view, groupBy, calendarPhase, calendarMonth],
    () => {
      if (syncingFromRoute || import.meta.server) {
        return
      }

      const nextQuery = buildWorkspaceQuery(route.query, {
        view: view.value,
        groupBy: groupBy.value,
        calendarPhase: calendarPhase.value,
        calendarMonth: calendarMonth.value,
      })

      if (sameQuery(nextQuery, route.query)) {
        return
      }

      router.replace({ query: nextQuery })
    },
    { immediate: true },
  )

  // URL (back/forward o deep link) → estado
  watch(
    () => [
      route.query.view,
      route.query.groupBy,
      route.query.phase,
      route.query.year,
      route.query.month,
    ] as const,
    () => {
      // Sin param = default (list / all / start), no conservar el estado previo.
      const nextView = resolveView(parseView(pickQueryString(route.query, 'view')) ?? 'list')
      const nextGroupBy = parseGroupBy(pickQueryString(route.query, 'groupBy')) ?? 'all'
      const nextPhase = parsePhase(pickQueryString(route.query, 'phase')) ?? 'start'
      const nextCalendarMonth = parseCalendarMonth(route.query) ?? currentCalendarMonth()

      if (
        nextView === view.value
        && nextGroupBy === groupBy.value
        && nextPhase === calendarPhase.value
        && nextCalendarMonth.year === calendarMonth.value.year
        && nextCalendarMonth.month === calendarMonth.value.month
      ) {
        return
      }

      syncingFromRoute = true
      view.value = nextView
      groupBy.value = nextGroupBy
      calendarPhase.value = nextPhase
      calendarMonth.value = nextCalendarMonth
      nextTick(() => {
        syncingFromRoute = false
      })
    },
  )

  const activeGroupByLabel = computed(() => t(`tasks.groupBy.${groupBy.value}`))

  function openNewTask(defaults?: NewTaskFormDefaults | null) {
    selectedTaskId.value = null
    toUpdateSection.value = null
    newTaskDefaults.value = defaults ?? null
    newTaskOpen.value = true
  }

  function openTask(taskId: number, section?: ToUpdateSectionId | null) {
    selectedTaskId.value = taskId
    toUpdateSection.value = section ?? null
    newTaskDefaults.value = null
    newTaskOpen.value = true
  }

  function setCalendarMonth(value: CalendarMonth) {
    calendarMonth.value = value
  }

  return {
    view,
    search,
    groupBy,
    calendarPhase,
    calendarMonth,
    filtersOpen,
    newTaskOpen,
    selectedTaskId,
    newTaskDefaults,
    toUpdateSection,
    listFilters,
    activeGroupByLabel,
    setCalendarMonth,
    openNewTask,
    openTask,
  }
}
