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
export type NewTaskFormType = Extract<TaskType, 'manual' | 'volume' | 'multiple_close'>

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
}

export type TaskView = 'list' | 'kanban' | 'calendar'

export type TaskGroupBy = 'all' | 'due' | 'topic' | 'user' | 'group'

/** Fase temporal del calendario: inicio, proceso o cierre. */
export type TaskCalendarPhase = 'start' | 'process' | 'close'

export type TaskSectionKey = 'urgent' | 'today' | 'upcoming'

/** Filtros de query compartidos por listas y Kanban. */
export interface TaskListFilters {
  short_description?: string
  type?: TaskType
  project?: number
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

/** Detalle completo de GET /api/tasks/:id/ */
export interface TaskDetail extends Omit<Task, 'assigned_to'> {
  long_description: string
  effort: TaskEffort | string | null
  assigned_to: number[]
  recurrence: boolean
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

/** Payload de drop entre columnas Kanban.
 * En groupBy=all dispara el flujo de proceso (modal + start/close/reject).
 * En otras vistas solo mueve en cliente.
 */
export interface KanbanTaskMove {
  taskId: number
  fromColumnId: string | number
  toColumnId: string | number
}

/** Origen del mensaje en el chat de una tarea. */
export type TaskMessageType = 'user' | 'system'

/** Mensaje del chat de una tarea. */
export interface TaskMessage {
  id: number
  task: number
  profile: number
  profile_username: string
  content: string
  type: TaskMessageType
  read: boolean
  created_at: string
}

/** Payload de POST /api/tasks/messages/create/. */
export interface CreateTaskMessagePayload {
  task: number
  content: string
}
