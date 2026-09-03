import type { EventInput } from '@fullcalendar/core'
import type { CalendarMonth, Task, TaskCalendarPhase } from '~/features/tasks/types/task.types'
import { taskBarColor } from '~/features/tasks/utils/task-format.util'

/** Letras de weekday en es; índice = domingo…sábado (0–6). */
export const CALENDAR_WEEKDAY_LETTERS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

export interface CalendarCivilDate {
  year: number
  month: number
  day: number
  weekday: number
}

/**
 * FullCalendar marca fechas all-day como UTC midnight.
 * En zonas UTC−N, getDay/getDate locales retroceden un día civil.
 */
export function calendarCivilDate(date: Date): CalendarCivilDate {
  const isAllDayUtcMarker =
    date.getUTCHours() === 0
    && date.getUTCMinutes() === 0
    && date.getUTCSeconds() === 0
    && date.getUTCMilliseconds() === 0

  if (isAllDayUtcMarker) {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      weekday: date.getUTCDay(),
    }
  }

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    weekday: date.getDay(),
  }
}

export function calendarDateKey(date: Date): string {
  const { year, month, day } = calendarCivilDate(date)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function calendarWeekdayLetter(date: Date): string {
  return CALENDAR_WEEKDAY_LETTERS[calendarCivilDate(date).weekday] ?? ''
}

export function calendarWeekStartKey(date: Date, weekStartsOn: number): string {
  const civil = calendarCivilDate(date)
  const diff = (civil.weekday - weekStartsOn + 7) % 7
  const start = new Date(Date.UTC(civil.year, civil.month - 1, civil.day - diff))
  return calendarDateKey(start)
}

/** Medianoche local del día 1: evita que YYYY-MM-DD se parsee como UTC. */
export function calendarMonthStart(period: CalendarMonth): Date {
  return new Date(period.year, period.month - 1, 1)
}

/** Extrae YYYY-MM-DD de un ISO o fecha parcial. */
function toDateOnly(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? null
}

/** Día siguiente en formato YYYY-MM-DD (end exclusivo de FullCalendar all-day). */
function nextDay(dateOnly: string): string {
  const date = new Date(`${dateOnly}T00:00:00`)
  date.setDate(date.getDate() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** `color` fuerza el color (modo por proyecto); si no, usa el de la tarea. */
function eventColors(task: Task, color?: string) {
  const resolved = color ?? taskBarColor(task)
  return {
    backgroundColor: resolved,
    borderColor: resolved,
    textColor: '#ffffff',
  }
}

/**
 * Vista Inicio: la tarea aparece solo el día de `start_date`.
 * El rango completo (inicio → cierre) es responsabilidad de Proceso.
 */
export function taskToStartCalendarEvent(task: Task, color?: string): EventInput | null {
  const startDate = toDateOnly(task.start_date)
  if (!startDate) {
    return null
  }

  return {
    id: String(task.id),
    title: task.short_description,
    start: startDate,
    allDay: true,
    extendedProps: { taskId: task.id },
    ...eventColors(task, color),
  }
}

/**
 * Vista Proceso: barra desde `start_date` hasta `limit_date` (duración).
 * Si falta limit_date, se muestra solo el día de inicio.
 *
 * Importante: no limitar filas visibles en esta fase; si FullCalendar
 * oculta el inicio de una barra multi-día, parece que empezó otro día.
 */
export function taskToProcessCalendarEvent(task: Task, color?: string): EventInput | null {
  const start = toDateOnly(task.start_date)
  if (!start) {
    return null
  }

  const limit = toDateOnly(task.limit_date)
  const endExclusive = limit && limit >= start
    ? nextDay(limit)
    : undefined

  return {
    id: String(task.id),
    title: task.short_description,
    start,
    end: endExclusive,
    allDay: true,
    extendedProps: { taskId: task.id },
    ...eventColors(task, color),
  }
}

/**
 * Vista Cierre: la tarea aparece solo el día de `limit_date`
 * (fecha de cierre), sin importar el rango completo.
 */
export function taskToCloseCalendarEvent(task: Task, color?: string): EventInput | null {
  const closeDate = toDateOnly(task.limit_date)
  if (!closeDate) {
    return null
  }

  return {
    id: String(task.id),
    title: task.short_description,
    start: closeDate,
    allDay: true,
    extendedProps: { taskId: task.id },
    ...eventColors(task, color),
  }
}

/** Devuelve el mapper de tarea → evento para la fase indicada. */
function phaseMapper(phase: TaskCalendarPhase) {
  return phase === 'process'
    ? taskToProcessCalendarEvent
    : phase === 'close'
      ? taskToCloseCalendarEvent
      : taskToStartCalendarEvent
}

/** Orden estable por fecha de inicio y luego título. */
function sortEvents(events: EventInput[]): EventInput[] {
  return events.sort((a, b) => {
    const startA = String(a.start ?? '')
    const startB = String(b.start ?? '')
    if (startA !== startB) {
      return startA.localeCompare(startB)
    }
    return String(a.title ?? '').localeCompare(String(b.title ?? ''))
  })
}

export function tasksToCalendarEvents(
  tasks: Task[],
  phase: TaskCalendarPhase = 'start',
): EventInput[] {
  const mapper = phaseMapper(phase)
  const events = tasks
    .map(task => mapper(task))
    .filter((event): event is EventInput => event != null)

  return sortEvents(events)
}

/** Fuente coloreada (proyecto o asignado) con sus tareas. */
export interface CalendarColoredSource {
  id: number
  color: string
  tasks: Task[]
}

/** @deprecated Preferir `CalendarColoredSource`. */
export type CalendarProjectEvents = CalendarColoredSource

/**
 * Agrupa tareas por fuente (proyecto / asignado) con color fijo.
 * El id del evento es compuesto (`sourceId-taskId`) para evitar colisiones
 * cuando la misma tarea aparece en más de un grupo.
 */
export function coloredTasksToCalendarEvents(
  sources: CalendarColoredSource[],
  phase: TaskCalendarPhase = 'start',
): EventInput[] {
  const mapper = phaseMapper(phase)
  const events: EventInput[] = []

  for (const source of sources) {
    for (const task of source.tasks) {
      const event = mapper(task, source.color)
      if (event) {
        events.push({
          ...event,
          id: `${source.id}-${task.id}`,
          extendedProps: {
            ...(event.extendedProps ?? {}),
            taskId: task.id,
            sourceId: source.id,
          },
        })
      }
    }
  }

  return sortEvents(events)
}

/** Alias: modo "por proyecto". */
export function projectTasksToCalendarEvents(
  projects: CalendarColoredSource[],
  phase: TaskCalendarPhase = 'start',
): EventInput[] {
  return coloredTasksToCalendarEvents(projects, phase)
}
