import type { MaybeRefOrGetter } from 'vue'
import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type {
  CalendarMonth,
  TaskCalendarPhase,
  TaskGroupBy,
  TaskListFilters,
  TaskView,
} from '~/features/tasks/types/task.types'
import type { VoiceTaskResponse } from '~/features/tasks/types/voice-task.types'
import type { NewTaskFormDefaults } from '~/features/tasks/utils/form/new-task-defaults.util'
import type { ToUpdateSectionId } from '~/features/to-update/types/to-update.types'
import { useProfileConfigurationStore } from '~/features/auth/composables/useProfileConfigurationStore'
import { useSavedTaskFilters } from '~/features/tasks/composables/filters/useSavedTaskFilters'
import {
  hasTaskFilters,
  normalizeTaskFilters,
  paramsToTaskFilters,
  TASK_FILTER_PARAM_KEYS,
  taskFiltersFromQuery,
  taskFiltersKey,
  taskFiltersToParams,
} from '~/features/tasks/utils/task-filter-params.util'

const VALID_VIEWS: TaskView[] = ['list', 'kanban', 'calendar']
const VALID_GROUP_BY: TaskGroupBy[] = ['all', 'due', 'project', 'user', 'group', 'status']
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

function parseTaskId(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    return null
  }
  return id
}

function buildWorkspaceQuery(
  current: LocationQuery,
  state: {
    view: TaskView
    groupBy: TaskGroupBy
    calendarPhase: TaskCalendarPhase
    calendarMonth: CalendarMonth
    /** Filtros de la lista en la URL; `null` = esta pantalla no los sincroniza. */
    filters: TaskListFilters | null
  },
): LocationQueryRaw {
  const next: LocationQueryRaw = { ...current }

  next.view = state.view

  if (state.filters) {
    for (const key of TASK_FILTER_PARAM_KEYS) {
      delete next[key]
    }
    Object.assign(next, taskFiltersToParams(state.filters))
  }

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
  /**
   * Los filtros de la lista viajan en la URL (compartible y sobrevive al recargar) y el filtro guardado
   * predeterminado se aplica al entrar. Solo en las listas que soportan los filtros del backend.
   */
  syncFilters?: boolean
} = {}) {
  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()
  const { configuration } = useProfileConfigurationStore()
  const defaultView = computed<TaskView>(() => configuration.value?.default_view ?? 'list')

  const excludedViews = computed(() => toValue(options.excludeViews) ?? [])

  function resolveView(candidate: TaskView | null | undefined, fallback: TaskView = 'list'): TaskView {
    const value = candidate && VALID_VIEWS.includes(candidate) ? candidate : fallback
    if (excludedViews.value.includes(value)) {
      return VALID_VIEWS.find(viewOption => !excludedViews.value.includes(viewOption)) ?? 'list'
    }
    return value
  }

  // Prioridad: URL > configuración del perfil > lista.
  const initialView = resolveView(
    parseView(pickQueryString(route.query, 'view')),
    defaultView.value,
  )
  const initialGroupBy = parseGroupBy(pickQueryString(route.query, 'groupBy')) ?? 'all'
  const initialPhase = parsePhase(pickQueryString(route.query, 'phase')) ?? 'start'
  const initialCalendarMonth = parseCalendarMonth(route.query) ?? currentCalendarMonth()

  const initialTaskId = parseTaskId(pickQueryString(route.query, 'task'))

  const syncFilters = options.syncFilters === true
  const initialFilters = syncFilters ? taskFiltersFromQuery(route.query) : {}

  const view = ref<TaskView>(initialView)
  const search = ref(initialFilters.short_description ?? '')
  const groupBy = ref<TaskGroupBy>(initialGroupBy)
  const calendarPhase = ref<TaskCalendarPhase>(initialPhase)
  const calendarMonth = ref<CalendarMonth>(initialCalendarMonth)
  const newTaskOpen = ref(initialTaskId != null)
  const selectedTaskId = ref<number | null>(initialTaskId)
  /** Prefills al abrir el slideover en modo creación (p. ej. proyecto desde Kanban). */
  const newTaskDefaults = ref<NewTaskFormDefaults | null>(null)
  /** Tarea dictada por voz con el atajo: el slideover se abre ya rellenado con ella. */
  const newTaskVoiceDraft = ref<VoiceTaskResponse | null>(null)
  /** Sección de pending-approval desde la que se abrió el detalle. */
  const toUpdateSection = ref<ToUpdateSectionId | null>(null)
  /** Id de la tarea cuando el detalle se abrió arrastrando Backlog → Pendiente en Kanban. */
  const promotingBacklogTaskId = ref<number | null>(null)

  const debouncedSearch = refDebounced(search, 300)
  const listFilters = ref<TaskListFilters>(initialFilters)

  /** Reemplaza los filtros activos (no se combinan) y deja la búsqueda en sintonía con `short_description`. */
  function applyFilters(filters: TaskListFilters) {
    const next = normalizeTaskFilters(filters)
    listFilters.value = next
    search.value = next.short_description ?? ''
  }

  /** Evita bucles al sincronizar URL ↔ estado. */
  let syncingFromRoute = false

  watch(debouncedSearch, (value) => {
    listFilters.value = {
      ...listFilters.value,
      short_description: value.trim() || undefined,
    }
  })

  watch(newTaskOpen, (isOpen) => {
    if (isOpen) {
      return
    }

    newTaskDefaults.value = null
    newTaskVoiceDraft.value = null
    toUpdateSection.value = null
    promotingBacklogTaskId.value = null

    if (import.meta.server || route.query.task == null) {
      return
    }

    const nextQuery = { ...route.query }
    delete nextQuery.task
    void router.replace({ query: nextQuery })
  })

  watch(
    () => pickQueryString(route.query, 'task'),
    (raw) => {
      const taskId = parseTaskId(raw)
      if (taskId == null) {
        return
      }
      if (selectedTaskId.value === taskId && newTaskOpen.value) {
        return
      }
      openTask(taskId)
    },
  )

  watch(excludedViews, () => {
    view.value = resolveView(view.value)
  })

  if (syncFilters) {
    // URL (back/forward o enlace compartido) → filtros
    watch(
      () => TASK_FILTER_PARAM_KEYS.map(key => pickQueryString(route.query, key)),
      () => {
        const fromUrl = taskFiltersFromQuery(route.query)
        if (taskFiltersKey(fromUrl) !== taskFiltersKey(listFilters.value)) {
          applyFilters(fromUrl)
        }
      },
    )

    // Filtro guardado predeterminado: solo al entrar y si la URL no trae filtros propios.
    const { savedFiltersQuery, defaultFilter } = useSavedTaskFilters()
    let defaultHandled = hasTaskFilters(listFilters.value)
    watch(
      () => savedFiltersQuery.isSuccess.value,
      (loaded) => {
        if (!loaded || defaultHandled) {
          return
        }
        defaultHandled = true
        if (defaultFilter.value) {
          applyFilters(paramsToTaskFilters(defaultFilter.value.params))
        }
      },
      { immediate: true },
    )
  }

  watch([view, groupBy], ([value, selectedGroupBy]) => {
    if (value === 'calendar' && selectedGroupBy === 'due') {
      groupBy.value = 'all'
    }
    // Estado solo aplica a la vista Lista (Kanban ya lo muestra vía sus columnas).
    if (value !== 'list' && selectedGroupBy === 'status') {
      groupBy.value = 'all'
    }
  }, { immediate: true })

  // Estado → URL (vista, agrupación, calendario y filtros en una sola navegación)
  watch(
    [view, groupBy, calendarPhase, calendarMonth, listFilters],
    () => {
      if (syncingFromRoute || import.meta.server) {
        return
      }

      const nextQuery = buildWorkspaceQuery(route.query, {
        view: view.value,
        groupBy: groupBy.value,
        calendarPhase: calendarPhase.value,
        calendarMonth: calendarMonth.value,
        filters: syncFilters ? listFilters.value : null,
      })

      if (sameQuery(nextQuery, route.query)) {
        return
      }

      router.replace({ query: nextQuery })
    },
    { immediate: true, deep: true },
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
      // Sin param = configuración del perfil (o lista como fallback).
      const nextView = resolveView(
        parseView(pickQueryString(route.query, 'view')),
        defaultView.value,
      )
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

  function openNewTask(defaults?: NewTaskFormDefaults | null, voiceDraft?: VoiceTaskResponse | null) {
    selectedTaskId.value = null
    toUpdateSection.value = null
    newTaskDefaults.value = defaults ?? null
    newTaskVoiceDraft.value = voiceDraft ?? null
    newTaskOpen.value = true
  }

  function openTask(taskId: number, section?: ToUpdateSectionId | null) {
    selectedTaskId.value = taskId
    toUpdateSection.value = section ?? null
    promotingBacklogTaskId.value = null
    newTaskDefaults.value = null
    newTaskOpen.value = true
  }

  /** Abre el detalle en modo "promover de Backlog": arranca en edición con botón "Enviar a pendiente". */
  function openTaskFromBacklog(taskId: number) {
    selectedTaskId.value = taskId
    toUpdateSection.value = null
    promotingBacklogTaskId.value = taskId
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
    newTaskOpen,
    selectedTaskId,
    newTaskDefaults,
    newTaskVoiceDraft,
    toUpdateSection,
    promotingBacklogTaskId,
    listFilters,
    applyFilters,
    activeGroupByLabel,
    setCalendarMonth,
    openNewTask,
    openTask,
    openTaskFromBacklog,
  }
}
