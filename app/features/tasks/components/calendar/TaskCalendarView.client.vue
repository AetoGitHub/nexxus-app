<script setup lang="ts">
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import type {
  CalendarApi,
  CalendarOptions,
  DatesSetArg,
  DayCellMountArg,
  DayHeaderContentArg,
  EventClickArg,
  EventInput,
  EventMountArg,
  MoreLinkArg,
} from '@fullcalendar/core'
import { useCalendarTasks } from '~/features/tasks/composables/calendar/useCalendarTasks'
import { useCalendarProjectTasks } from '~/features/tasks/composables/calendar/useCalendarProjectTasks'
import { useCalendarAssignedTasks } from '~/features/tasks/composables/calendar/useCalendarAssignedTasks'
import { useCalendarGroupTasks } from '~/features/tasks/composables/calendar/useCalendarGroupTasks'
import type { TaskCalendarPhase, TaskGroupBy, TaskListFilters } from '~/features/tasks/types/task.types'
import { extractResults } from '~/shared/utils/paginated.util'
import { coloredTasksToCalendarEvents, tasksToCalendarEvents } from '~/features/tasks/utils/calendar/task-calendar.util'

const COLLAPSED_EVENT_ROWS = 3
const PHASE_TRANSITION_MS = 180

const props = defineProps<{
  filters: TaskListFilters
  phase?: TaskCalendarPhase
  groupBy?: TaskGroupBy
  selectedTaskId?: number | null
}>()

const emit = defineEmits<{
  select: [taskId: number]
}>()

const phase = computed(() => props.phase ?? 'start')
/** Modo "por proyecto": tareas coloreadas por proyecto. */
const projectMode = computed(() => props.groupBy === 'project')
/** Modo "por usuario": tareas coloreadas por usuario asignado. */
const userMode = computed(() => props.groupBy === 'user')
/** Modo "por grupos": tareas coloreadas por grupo. */
const groupsMode = computed(() => props.groupBy === 'group')
/** Algún modo con leyenda de chips (proyecto, usuario o grupos). */
const legendMode = computed(() => projectMode.value || userMode.value || groupsMode.value)
/** Fuentes ocultas desde la leyenda (proyectos, usuarios o grupos). */
const hiddenSourceIds = ref(new Set<number>())

const now = new Date()
const visibleMonth = ref({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
})

const { tasks } = useCalendarTasks(
  visibleMonth,
  () => props.filters,
  phase,
  () => !legendMode.value,
)

const {
  projects: calendarProjects,
  isPending: projectsPending,
  isError: projectsError,
} = useCalendarProjectTasks(() => props.filters, () => projectMode.value)

const {
  assignees: calendarAssignees,
  isPending: assigneesPending,
  isError: assigneesError,
} = useCalendarAssignedTasks(() => props.filters, () => userMode.value)

const {
  groups: calendarGroups,
  isPending: groupsPending,
  isError: groupsError,
} = useCalendarGroupTasks(() => props.filters, () => groupsMode.value)

const legendItems = computed(() => {
  if (projectMode.value) {
    return calendarProjects.value
  }
  if (userMode.value) {
    return calendarAssignees.value
  }
  if (groupsMode.value) {
    return calendarGroups.value
  }
  return []
})

const visibleSources = computed(() =>
  legendItems.value.filter(item => !hiddenSourceIds.value.has(item.id)),
)

const sourceEvents = computed<EventInput[]>(() => {
  if (legendMode.value) {
    return coloredTasksToCalendarEvents(visibleSources.value, phase.value)
  }
  return tasksToCalendarEvents(extractResults(tasks.data.value), phase.value)
})

const isPending = computed(() => {
  if (projectMode.value) {
    return projectsPending.value
  }
  if (userMode.value) {
    return assigneesPending.value
  }
  if (groupsMode.value) {
    return groupsPending.value
  }
  return tasks.isPending.value
})

const isError = computed(() => {
  if (projectMode.value) {
    return projectsError.value
  }
  if (userMode.value) {
    return assigneesError.value
  }
  if (groupsMode.value) {
    return groupsError.value
  }
  return tasks.isError.value
})

function toggleSource(id: number) {
  const next = new Set(hiddenSourceIds.value)
  if (next.has(id)) {
    next.delete(id)
  }
  else {
    next.add(id)
  }
  hiddenSourceIds.value = next
}

const calendarRef = ref<{ getApi: () => CalendarApi } | null>(null)
const calendarRoot = ref<HTMLElement | null>(null)
/** Semanas expandidas (clave = YYYY-MM-DD del primer día visible de la fila). */
const expandedWeeks = ref(new Set<string>())
const isEventsExiting = ref(false)
let phaseTransitionToken = 0

const dayLetters = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

function dayHeaderContent(arg: DayHeaderContentArg) {
  return dayLetters[arg.date.getDay()] ?? ''
}

function wait(ms: number) {
  return new Promise<void>(resolve => {
    window.setTimeout(resolve, ms)
  })
}

function mountEventEnter(arg: EventMountArg) {
  arg.el.classList.add('fc-event-enter')
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function weekRowKey(date: Date): string {
  const api = calendarRef.value?.getApi()
  const weekStartsOn = Number(api?.getOption('firstDay') ?? 1)
  const day = date.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - diff)
  return toDateKey(start)
}

function setVisibleMonth(date: Date) {
  const next = {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  }

  if (
    visibleMonth.value.year === next.year
    && visibleMonth.value.month === next.month
  ) {
    return
  }

  visibleMonth.value = next
  expandedWeeks.value = new Set()
  applyDayMaxEventRows()
}

function syncFromDatesSet(arg: DatesSetArg) {
  setVisibleMonth(arg.view.currentStart)
}

function navigateMonth(direction: 'prev' | 'next' | 'today') {
  const api = calendarRef.value?.getApi()
  if (!api) {
    return
  }

  if (direction === 'prev') {
    api.prev()
  }
  else if (direction === 'next') {
    api.next()
  }
  else {
    api.today()
  }

  setVisibleMonth(api.getDate())
}

function applyDayMaxEventRows() {
  // En Proceso las barras multi-día no se pueden limitar por fila:
  // FullCalendar oculta el tramo inicial saturado y reaparece después,
  // dando la impresión de que la tarea empezó otro día.
  const rows: false | number = phase.value === 'process'
    ? false
    : expandedWeeks.value.size > 0
      ? false
      : COLLAPSED_EVENT_ROWS

  calendarOptions.dayMaxEventRows = rows
  calendarRef.value?.getApi()?.setOption('dayMaxEventRows', rows)
}

function toggleWeek(date: Date) {
  const key = weekRowKey(date)
  const next = new Set(expandedWeeks.value)
  if (next.has(key)) {
    next.delete(key)
  }
  else {
    next.add(key)
  }
  expandedWeeks.value = next
  applyDayMaxEventRows()
  syncWeekToggleButtons()
}

function handleMoreLinkClick(arg: MoreLinkArg) {
  toggleWeek(arg.date)
}

function syncWeekToggleButtons() {
  if (!calendarRoot.value) {
    return
  }

  calendarRoot.value.querySelectorAll<HTMLButtonElement>('[data-week-toggle]').forEach((button) => {
    const key = button.dataset.weekToggle
    if (!key) {
      return
    }
    const expanded = expandedWeeks.value.has(key)
    button.dataset.expanded = expanded ? 'true' : 'false'
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false')
    button.setAttribute('aria-label', expanded ? 'Colapsar semana' : 'Expandir semana')
    button.title = expanded ? 'Colapsar semana' : 'Expandir semana'

    const row = button.closest('tr')
    if (!row) {
      return
    }
    if (expanded) {
      row.setAttribute('data-week-expanded', 'true')
    }
    else {
      row.removeAttribute('data-week-expanded')
    }
  })
}

function mountWeekToggle(arg: DayCellMountArg) {
  const key = weekRowKey(arg.date)
  const weekStartKey = key
  const cellKey = toDateKey(arg.date)
  // Solo el primer día de la semana (fila) lleva el control.
  if (cellKey !== weekStartKey) {
    return
  }

  const top = arg.el.querySelector('.fc-daygrid-day-top')
  if (!top || top.querySelector('[data-week-toggle]')) {
    return
  }

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'fc-week-toggle'
  button.dataset.weekToggle = key
  button.innerHTML = '<span class="fc-week-toggle-icon" aria-hidden="true"></span>'
  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    toggleWeek(arg.date)
  })
  top.appendChild(button)
  syncWeekToggleButtons()
}

function handleEventClick(arg: EventClickArg) {
  const taskId = Number(arg.event.extendedProps.taskId ?? arg.event.id)
  if (!Number.isFinite(taskId) || taskId <= 0) {
    return
  }
  emit('select', taskId)
}

const calendarOptions = reactive<CalendarOptions>({
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  locale: esLocale,
  weekends: true,
  editable: false,
  selectable: false,
  height: 'auto',
  fixedWeekCount: false,
  dayMaxEventRows: COLLAPSED_EVENT_ROWS,
  moreLinkText: 'más...',
  moreLinkClick: handleMoreLinkClick,
  eventClick: handleEventClick,
  // Carriles estables: primero por inicio, luego las más largas arriba.
  eventOrder: 'start,-duration,title',
  eventOrderStrict: true,
  customButtons: {
    prevMonth: {
      icon: 'chevron-left',
      click: () => navigateMonth('prev'),
    },
    nextMonth: {
      icon: 'chevron-right',
      click: () => navigateMonth('next'),
    },
    goToday: {
      text: 'Hoy',
      click: () => navigateMonth('today'),
    },
  },
  headerToolbar: {
    left: 'title',
    center: '',
    right: 'prevMonth,goToday,nextMonth',
  },
  titleFormat: {
    year: 'numeric',
    month: 'long',
  },
  dayHeaderContent,
  dayHeaderFormat: { weekday: 'narrow' },
  dayCellDidMount: mountWeekToggle,
  eventDidMount: mountEventEnter,
  events: [],
})

async function applyCalendarEvents(events: EventInput[], animate: boolean) {
  const token = ++phaseTransitionToken
  const currentEvents = Array.isArray(calendarOptions.events)
    ? (calendarOptions.events as EventInput[])
    : []

  if (animate && currentEvents.length > 0) {
    isEventsExiting.value = true
    await wait(PHASE_TRANSITION_MS)
    if (token !== phaseTransitionToken) {
      return
    }
  }

  calendarOptions.events = events
  isEventsExiting.value = false
  await nextTick()
  if (token !== phaseTransitionToken) {
    return
  }
  syncWeekToggleButtons()
}

// Al cambiar el agrupador, reiniciamos chips ocultos.
watch(() => props.groupBy, () => {
  hiddenSourceIds.value = new Set()
})

// Al cambiar fase o modo reiniciamos semanas expandidas y recalculamos filas.
watch([phase, legendMode], () => {
  expandedWeeks.value = new Set()
  applyDayMaxEventRows()
})

// Fuente única de eventos: calendario global o agrupado (proyecto/grupo).
watch(
  sourceEvents,
  (events) => {
    applyDayMaxEventRows()
    void applyCalendarEvents(events, true)
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <div
      ref="calendarRoot"
      class="relative task-calendar overflow-hidden rounded-xl bg-card"
      :class="{
        'is-week-expanded': expandedWeeks.size > 0 && phase !== 'process',
        'is-events-exiting': isEventsExiting,
        'is-process-phase': phase === 'process',
      }"
    >
      <div
        v-if="isPending"
        class="absolute inset-0 z-10 flex items-center justify-center bg-card/70"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="h-6 w-6 animate-spin text-muted-foreground"
        />
      </div>

      <p
        v-else-if="isError"
        class="px-4 py-6 text-sm text-error"
      >
        No se pudieron cargar las tareas del calendario.
      </p>

      <Transition name="calendar-legend">
        <div
          v-if="legendMode && legendItems.length > 0"
          class="flex flex-wrap items-center gap-2 px-4 pt-3 pb-1"
        >
          <UBadge
            v-for="item in legendItems"
            :key="item.id"
            as="button"
            type="button"
            variant="solid"
            size="md"
            class="cursor-pointer border-0 font-medium text-white transition-opacity hover:opacity-90"
            :class="hiddenSourceIds.has(item.id) ? 'opacity-40 line-through' : ''"
            :style="{ backgroundColor: item.color }"
            :aria-pressed="!hiddenSourceIds.has(item.id)"
            @click="toggleSource(item.id)"
          >
            {{ item.name }}
          </UBadge>
        </div>
      </Transition>

      <FullCalendar
        ref="calendarRef"
        :options="calendarOptions"
        @dates-set="syncFromDatesSet"
      />
    </div>
  </div>
</template>

<style scoped>
.calendar-legend-enter-active,
.calendar-legend-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.calendar-legend-enter-from,
.calendar-legend-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}

.task-calendar {
  --calendar-grid-line: #d4d4d4;
  --calendar-day-other: #ededed;
  --calendar-button-hover: #e5e5e5;
}

:global(.dark) .task-calendar,
.dark .task-calendar {
  --calendar-grid-line: #3f3f3f;
  --calendar-day-other: #2b2b2b;
  --calendar-button-hover: #333333;
}

.task-calendar :deep(.fc) {
  --fc-border-color: var(--calendar-grid-line);
  --fc-page-bg-color: var(--card);
  --fc-neutral-bg-color: color-mix(in oklab, var(--muted) 70%, var(--card));
  --fc-today-bg-color: transparent;
  --fc-list-event-hover-bg-color: var(--muted);
  --fc-highlight-color: color-mix(in oklab, var(--aeto-teal) 12%, transparent);
  --fc-button-bg-color: transparent;
  --fc-button-border-color: transparent;
  --fc-button-text-color: var(--muted-foreground);
  --fc-button-hover-bg-color: var(--calendar-button-hover);
  --fc-button-hover-border-color: transparent;
  --fc-button-active-bg-color: var(--calendar-button-hover);
  --fc-button-active-border-color: transparent;
  font-family: inherit;
  color: var(--foreground);
}

.task-calendar :deep(.fc .fc-toolbar) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0;
  padding: 0.875rem 1rem 0.25rem;
  border: 0 !important;
  border-bottom: 0 !important;
  box-shadow: none !important;
}

.task-calendar :deep(.fc .fc-header-toolbar) {
  border: 0 !important;
  margin-bottom: 0 !important;
}

.task-calendar :deep(.fc .fc-toolbar-chunk) {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.task-calendar :deep(.fc .fc-toolbar-title) {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--foreground);
  text-transform: capitalize;
}

.task-calendar :deep(.fc .fc-button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  box-shadow: none !important;
  font-size: 0.8125rem;
  font-weight: 500;
  text-transform: none;
}

.task-calendar :deep(.fc .fc-button-primary:not(:disabled):hover),
.task-calendar :deep(.fc .fc-button-primary:not(:disabled).fc-button-active),
.task-calendar :deep(.fc .fc-button-primary:not(:disabled):active) {
  background: var(--calendar-button-hover);
  border-color: transparent;
  color: var(--foreground);
}

.task-calendar :deep(.fc .fc-prevMonth-button),
.task-calendar :deep(.fc .fc-nextMonth-button) {
  width: 1.75rem;
  padding-inline: 0;
  color: var(--muted-foreground);
}

.task-calendar :deep(.fc .fc-goToday-button) {
  color: var(--muted-foreground);
}

.task-calendar :deep(.fc .fc-goToday-button:disabled) {
  opacity: 0.45;
}

/* Padding interno para que la grilla no toque el borde del contenedor. */
.task-calendar :deep(.fc .fc-view-harness) {
  padding: 0.75rem 1rem 1rem;
  background: var(--card);
  box-sizing: border-box;
}

/* Con height auto no hay scroll: evita el gutter que desalinea la derecha. */
.task-calendar :deep(.fc .fc-scroller) {
  overflow: visible !important;
}

.task-calendar :deep(.fc .fc-scroller-liquid-absolute) {
  position: static !important;
}

.task-calendar :deep(.fc .fc-scrollgrid),
.task-calendar :deep(.fc .fc-scrollgrid table),
.task-calendar :deep(.fc .fc-scrollgrid td),
.task-calendar :deep(.fc .fc-scrollgrid th) {
  border-color: var(--calendar-grid-line) !important;
}

.task-calendar :deep(.fc .fc-scrollgrid) {
  /* Sin marco exterior: solo líneas internas entre celdas. */
  border: 0 !important;
  border-radius: 0.5rem;
  overflow: hidden;
  background: var(--card);
}

.task-calendar :deep(.fc .fc-scrollgrid-section > td),
.task-calendar :deep(.fc .fc-scrollgrid-section > th) {
  border-color: var(--calendar-grid-line) !important;
}

/* Sin borde en los extremos exteriores (izquierda, derecha, arriba). */
.task-calendar :deep(.fc .fc-scrollgrid td:last-child),
.task-calendar :deep(.fc .fc-scrollgrid th:last-child) {
  border-right: 0 !important;
}

.task-calendar :deep(.fc .fc-scrollgrid td:first-child),
.task-calendar :deep(.fc .fc-scrollgrid th:first-child) {
  border-left: 0 !important;
}

.task-calendar :deep(.fc .fc-scrollgrid-section-header > *) {
  border-top: 0 !important;
}

/* Sin borde en la fila inferior (última semana). */
.task-calendar :deep(.fc .fc-scrollgrid-section-body:last-child > td) {
  border-bottom: 0 !important;
}

.task-calendar :deep(.fc .fc-daygrid-body tr:last-child td) {
  border-bottom: 0 !important;
}

.task-calendar :deep(.fc .fc-col-header-cell) {
  background: var(--card);
  border-bottom-color: var(--calendar-grid-line);
  padding: 0.5rem 0.5rem 0.375rem;
}

.task-calendar :deep(.fc .fc-col-header-cell-cushion) {
  display: block;
  padding: 0;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted-foreground);
  text-align: left;
}

.task-calendar :deep(.fc .fc-daygrid-day) {
  background: var(--card);
  min-height: 6.5rem;
}

.task-calendar :deep(.fc .fc-daygrid-day-frame) {
  min-height: 6.5rem;
  padding: 0.35rem 0.35rem 0.5rem;
}

.task-calendar :deep(.fc .fc-daygrid-day-top) {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 0.25rem;
}

.task-calendar :deep(.fc .fc-daygrid-day-number) {
  padding: 0.15rem 0.35rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted-foreground);
}

.task-calendar :deep(.fc .fc-week-toggle) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.15rem;
  border-radius: 0.25rem;
  border: 0;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
}

.task-calendar :deep(.fc .fc-week-toggle:hover) {
  background: var(--muted);
  color: var(--foreground);
}

.task-calendar :deep(.fc .fc-week-toggle-icon) {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
  transition: transform 0.15s ease;
}

.task-calendar :deep(.fc .fc-week-toggle[data-expanded='true'] .fc-week-toggle-icon) {
  transform: rotate(180deg);
}

.task-calendar :deep(.fc .fc-day-other) {
  background: var(--calendar-day-other);
}

.task-calendar :deep(.fc .fc-day-other .fc-daygrid-day-number) {
  color: color-mix(in oklab, var(--muted-foreground) 55%, transparent);
}

.task-calendar :deep(.fc .fc-day-today .fc-daygrid-day-number) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  background: #7c3aed;
  color: #fff;
  font-weight: 600;
}

.task-calendar :deep(.fc .fc-daygrid-event) {
  margin-block: 0.15rem;
  border: 0;
  border-left: 3px solid var(--fc-event-border-color);
  border-radius: 0.375rem;
  background: var(--fc-event-bg-color);
  box-shadow: none;
  cursor: pointer;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.task-calendar.is-events-exiting :deep(.fc .fc-daygrid-event),
.task-calendar.is-events-exiting :deep(.fc .fc-more-link) {
  opacity: 0;
  transform: translateY(4px);
}

.task-calendar :deep(.fc .fc-daygrid-event.fc-event-enter) {
  animation: fc-event-enter 0.22s ease both;
}

@keyframes fc-event-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.task-calendar :deep(.fc .fc-daygrid-event .fc-event-main) {
  color: var(--fc-event-text-color);
}

.task-calendar :deep(.fc .fc-daygrid-block-event .fc-event-title) {
  padding: 0.2rem 0.4rem;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-calendar :deep(.fc .fc-daygrid-day-events) {
  margin-top: 0.15rem;
}

.task-calendar :deep(.fc .fc-more-link) {
  color: var(--muted-foreground);
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.15rem 0.35rem;
}

/* En Proceso no recortamos con overflow: corta barras multi-día a mitad. */
.task-calendar.is-week-expanded:not(.is-process-phase) :deep(tr:not([data-week-expanded]) .fc-daygrid-day-events) {
  max-height: 4.8rem;
  overflow: hidden;
}

.task-calendar.is-week-expanded:not(.is-process-phase) :deep(tr:not([data-week-expanded]) .fc-daygrid-day-bottom) {
  display: none;
}
</style>
