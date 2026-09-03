export type TaskPriority = 'urgent' | 'critical' | 'high' | 'normal'

export type TaskType =
  | 'manual'
  | 'trigger'
  | 'repeat'
  | 'volume'
  | 'multiple_close'
  | 'puesto'
  | 'bug'

/** Tipos disponibles al crear una tarea desde el slideover. */
export type NewTaskFormType = Extract<TaskType, 'manual' | 'volume' | 'multiple_close' | 'repeat'>

/** Frecuencia de una tarea repetitiva. */
export type RepeatFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

/** Día de la semana ISO: 1=lunes … 7=domingo. */
export type RepeatWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** Semana del mes: 1-4 o -1 (última). */
export type RepeatWeekOfMonth = 1 | 2 | 3 | 4 | -1

/** Mes del año: 1=enero … 12=diciembre. */
export type RepeatMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

/** Configuración de recurrencia enviada en create/update cuando type=repeat. */
export interface TaskRepeatConfig {
  frequency: RepeatFrequency
  every: number
  weekday: RepeatWeekday | null
  week_of_month: RepeatWeekOfMonth | null
  on_month: RepeatMonth | null
}

/** Esfuerzo seleccionado en el formulario de creación. */
export type TaskEffort = 'quick' | 'normal' | 'complex'

/** Prioridades aceptadas por el endpoint de creación. */
export type ApiTaskPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical'

export interface CreateTaskPayload {
  short_description: string
  long_description: string
  type: NewTaskFormType
  priority: ApiTaskPriority
  start_date: string
  limit_date: string
  project: number
  group: number
  assigned_to: number[]
  task_reviewer?: number[]
  repeat_config?: TaskRepeatConfig
}

/** Payload de PATCH /api/tasks/:id/update/. */
export interface UpdateTaskPayload {
  short_description: string
  long_description: string
  type: NewTaskFormType
  priority: ApiTaskPriority
  start_date: string
  limit_date: string
  group: number | null
  project: number
  assigned_to: number[]
  task_reviewer?: number[]
  repeat_config?: TaskRepeatConfig
  /** Convierte esta instancia en la plantilla maestra. Solo si type=repeat y hay generated_from. */
  set_as_master?: boolean
  /** Aplica los cambios a todas las instancias de la serie. Solo si type=repeat. */
  apply_to_all?: boolean
}

/** PATCH parcial para mover vencimiento en Kanban Due. */
export interface UpdateTaskLimitDatePayload {
  limit_date: string
}

/** PATCH parcial para mover proyecto en Kanban Proyectos. */
export interface UpdateTaskProjectPayload {
  project: number
}

/** Columnas del Kanban agrupado por vencimiento. */
export type OverdueColumnId = 'today' | 'tomorrow' | 'week' | 'month' | 'no_date'

export type TaskView = 'list' | 'kanban' | 'calendar'

export type TaskGroupBy = 'all' | 'due' | 'project' | 'user' | 'group'

/** Fase temporal del calendario: inicio, proceso o cierre. */
export type TaskCalendarPhase = 'start' | 'process' | 'close'

export interface CalendarMonth {
  year: number
  month: number
}

export type TaskSectionKey = 'urgent' | 'today' | 'upcoming'

/** Filtros de query compartidos por listas y Kanban. */
export interface TaskListFilters {
  short_description?: string
  type?: TaskType[]
  project?: number[]
  overdue?: boolean
  completed?: boolean
  multiple_close?: boolean
}

export interface TaskCloseApproval {
  id: number
  profile: number
  closed: boolean
  closed_at: string | null
}

/** Respuesta de PATCH /api/tasks/close_approvals/:id/update/ */
export interface AuthorizeCloseApprovalResponse {
  closed: boolean
  cancelled: boolean
}

export interface TaskProcessEntry {
  id: number
  status: string
  started_at: string | null
  started_by: number | null
  images: unknown[]
  comment: string
  created_at: string
}

/** Asignado en listados / Kanban (dos primeras letras del username). */
export interface TaskAssignee {
  id: number
  username: string
  /** Color hex del grupo del asignado. */
  group_color?: string
}

export interface Task {
  id: number
  short_description: string
  type: string
  status: string
  priority: string
  project: number
  project_name?: string
  project_color?: string
  group?: number | null
  group_name?: string
  multiple_close: boolean
  start_date: string | null
  limit_date: string | null
  created_at: string
  close_approvals: TaskCloseApproval[]
  assigned_to?: TaskAssignee[]
}

export interface CreateTaskChannelEvent {
  event: 'create_task'
  task_pk: number
  user: number[]
}

export interface UnknownTaskChannelEvent {
  event: string
  [key: string]: unknown
}

export type TaskChannelEvent = CreateTaskChannelEvent | UnknownTaskChannelEvent

/** Detalle completo de GET /api/tasks/:id/ */
export interface TaskDetail extends Omit<Task, 'assigned_to'> {
  long_description: string
  effort: TaskEffort | string | null
  assigned_to: number[]
  recurrence: boolean
  repeat_config?: TaskRepeatConfig | null
  /** Id de la tarea maestra; null si esta es la original. */
  generated_from: number | null
  finish_at: string | null
  updated_at: string
  process_tasks: TaskProcessEntry[]
}

export interface TaskCounts {
  urgent: number
  due_today: number
  tasks: number
}

export interface OverdueCounts {
  today: number
  tomorrow: number
  week: number
  month: number
  no_date: number
}

export interface ProjectDropdown {
  id: number
  name: string
}

export interface GroupDropdown {
  id: number
  name: string
}

export interface ProjectTaskCount {
  id: number
  name: string
  total: number
}

export interface ProjectTaskSection {
  id: number
  name: string
  count?: number
  dotColor: string
  tasks: Task[]
  loading: boolean
  error: boolean
}

/** Sección genérica de lista/kanban (due, close, status, etc.). */
export interface TaskBoardSection {
  id: string | number
  name?: string
  labelKey?: string
  color: string
  count?: number
  tasks: Task[]
  loading: boolean
  error: boolean
  comingSoon?: boolean
}

export interface UserDropdown {
  id: number
  username: string
  group_id?: number | null
  group_name?: string | null
}

export interface AssignedTaskCount {
  id: number
  username: string
  total: number
}

/** Grupo en GET /api/tasks/company/:id/groups/ */
export interface TaskGroupListItem {
  id: number
  name: string
  color: string
}

/** Contador en GET /api/tasks/company/:id/group/counts/ */
export interface TaskGroupCount {
  id: number
  name: string
  total: number
}

/** Columnas del tablero Kanban (status o agrupaciones dinámicas). */
export type KanbanStatusColumnId = 'pending' | 'wip' | 'in_review' | 'rejected' | 'complete'

export interface KanbanCounts {
  pending: number
  wip: number
  in_review: number
  rejected: number
  complete: number
  total?: number
}

export interface KanbanColumn {
  id: string | number
  /** Título fijo (proyectos, usuarios). */
  title?: string
  /** Clave i18n cuando no hay title. */
  labelKey?: string
  color: string
  count?: number
  tasks: Task[]
  loading: boolean
  error: boolean
  /** Columnas cuyo endpoint de lista aún no está listo. */
  comingSoon?: boolean
}

/** Columna desde la que se crea una tarea en Kanban (id + título para prefills). */
export interface KanbanCreateColumn {
  id: string | number
  title?: string
}

/** Payload de POST /api/tasks/process/start/ */
export interface StartTaskProcessPayload {
  task: number
  comment?: string
  images?: File[]
}

/** Destino al cerrar proceso vía POST /api/tasks/process/close/. */
export type CloseTaskProcessStatus = 'in_review' | 'complete'

/** Destino desde In review. */
export type ReviewDecisionStatus = 'rejected' | 'complete'

/** Payload de POST /api/tasks/process/close/. */
export interface CloseTaskProcessPayload {
  task: number
  status: CloseTaskProcessStatus
  comment?: string
  images?: File[]
}

/** Payload de POST /api/tasks/process/reject/. */
export interface RejectTaskProcessPayload {
  task: number
  comment?: string
  images?: File[]
}

/** Payload de POST /api/tasks/process/reopen/. */
export interface ReopenTaskProcessPayload {
  task: number
  comment?: string
  images?: File[]
}

/** Payload de POST /api/tasks/process/archive/. */
export interface ArchiveTaskProcessPayload {
  task: number
  comment?: string
}

/** Payload de drop entre columnas Kanban.
 * En groupBy=all dispara el flujo de proceso (modal + start/close/reject).
 * En groupBy=due dispara el flujo de cambio de limit_date.
 * En groupBy=project dispara el flujo de cambio de project.
 * En otras vistas solo mueve en cliente.
 */
export interface KanbanTaskMove {
  taskId: number
  fromColumnId: string | number
  toColumnId: string | number
}

/** Origen del mensaje en el chat de una tarea. */
export type TaskMessageType = 'user' | 'system'

/** Claves de mensajes de sistema (alineadas con el backend). */
export type TaskSystemMessageKey =
  | 'task_created'
  | 'task_updated'
  | 'task_started'
  | 'task_sent_to_review'
  | 'task_closed'
  | 'task_rejected'
  | 'close_approved_by'
  | 'task_reopened'

/** Mensaje del chat de una tarea. */
export interface TaskMessage {
  id: number
  task: number
  profile: number
  profile_username: string
  content: string
  /** Presente en mensajes de sistema; permite re-traducir en el cliente. */
  system_key?: TaskSystemMessageKey | null
  system_params?: Record<string, string | number>
  type: TaskMessageType
  read: boolean
  created_at: string
}

/** Payload de POST /api/tasks/messages/create/. */
export interface CreateTaskMessagePayload {
  task: number
  content: string
}
