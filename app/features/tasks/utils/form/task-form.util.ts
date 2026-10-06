import type {
  ApiTaskPriority,
  CreateBacklogTaskPayload,
  CreateTaskPayload,
  CreateTaskSubtaskPayload,
  NewTaskFormType,
  PromoteBacklogTaskPayload,
  TaskCloseApproval,
  TaskDetail,
  TaskEffort,
  TaskRepeatConfig,
  UpdateBacklogTaskPayload,
  UpdateTaskPayload,
} from '~/features/tasks/types/task.types'
import {
  isRepeatConfigComplete,
  normalizeRepeatConfig,
  parseRepeatConfig,
} from '~/features/tasks/utils/form/repeat-config.util'
import { businessDayKey } from '~/shared/utils/date'

/**
 * Fila de subtarea en el formulario de creación. Vive fuera de `NewTaskFormInput`
 * (igual que los adjuntos generales) porque no es serializable tal cual: las
 * imágenes locales (`pendingImages`) se suben a Firebase justo antes del submit
 * y solo entonces se resuelve el payload final (`CreateTaskSubtaskPayload`).
 */
export interface SubtaskFormRow {
  /** Id local (no del backend): agrupa las imágenes de esta fila en Storage antes de que la tarea exista. */
  key: string
  shortDescription: string
  assignedTo: number | undefined
  /** URLs ya subidas a Firebase. */
  images: string[]
  /** Archivos locales aún no subidos. */
  pendingImages: File[]
}

export function createEmptySubtaskRow(): SubtaskFormRow {
  return {
    key: crypto.randomUUID(),
    shortDescription: '',
    assignedTo: undefined,
    images: [],
    pendingImages: [],
  }
}

/** Fila de «Más tareas»: el nombre de una tarea extra que se crea con el mismo cuerpo que la principal. */
export interface MoreTaskFormRow {
  /** Id local para el `v-for`; no viaja al backend. */
  key: string
  name: string
}

export function createEmptyMoreTaskRow(): MoreTaskFormRow {
  return {
    key: crypto.randomUUID(),
    name: '',
  }
}

/** Nombres para `more_tasks`: sin espacios sobrantes y sin las filas que se dejaron vacías (el backend rechaza textos vacíos). */
export function resolveMoreTaskNames(rows: MoreTaskFormRow[]): string[] {
  return rows.map(row => row.name.trim()).filter(Boolean)
}

export interface NewTaskFormInput {
  type: NewTaskFormType
  name: string
  description: string
  project: number | undefined
  group: number | undefined
  assignedTo: number[]
  taskReviewer: number[]
  dueDate: string
  urgent: boolean
  effort: TaskEffort | undefined
  repeatConfig: TaskRepeatConfig
}

const FORM_TASK_TYPES: NewTaskFormType[] = ['manual', 'volume', 'multiple_close', 'repeat']

function isNewTaskFormType(value: string): value is NewTaskFormType {
  return FORM_TASK_TYPES.includes(value as NewTaskFormType)
}

/** Día (YYYY-MM-DD) en hora de CDMX: el backend vence la tarea al final de ese día, no el día UTC del ISO. */
function isoToDateInput(iso: string | null): string {
  return businessDayKey(iso) ?? ''
}

/** Mapea el detalle del API al estado del formulario del slideover. */
export function taskDetailToFormInput(detail: TaskDetail): NewTaskFormInput {
  const urgent = detail.priority === 'urgent'
  return {
    type: isNewTaskFormType(detail.type) ? detail.type : 'manual',
    name: detail.short_description ?? '',
    description: detail.long_description ?? '',
    project: detail.project ?? undefined,
    group: detail.group ?? undefined,
    assignedTo: (detail.assigned_to ?? []).map(assignee => assignee.id),
    taskReviewer: detail.close_approvals?.map(approval => approval.profile) ?? [],
    dueDate: isoToDateInput(detail.limit_date),
    urgent,
    effort: urgent ? undefined : priorityToEffort(detail.priority),
    repeatConfig: parseRepeatConfig(detail.repeat_config),
  }
}

/**
 * Esfuerzo que se eligió al crear la tarea. El backend no guarda `effort` (siempre queda en `normal`): el
 * esfuerzo vive solo en `priority`, así que se deshace el mapeo de `resolveTaskPriority`.
 */
export function priorityToEffort(priority: string): TaskEffort | undefined {
  switch (priority) {
    case 'low':
      return 'quick'
    case 'normal':
      return 'normal'
    case 'high':
      return 'complex'
    default:
      return undefined
  }
}

/** Mapea esfuerzo/urgente al priority del API. */
export function resolveTaskPriority(urgent: boolean, effort?: TaskEffort): ApiTaskPriority {
  if (urgent) {
    return 'urgent'
  }
  if (effort === 'quick') {
    return 'low'
  }
  if (effort === 'complex') {
    return 'high'
  }
  return 'normal'
}

/**
 * Convierte YYYY-MM-DD a ISO fin de ese día en UTC.
 * Evita el desfase +1 día de `toISOString()` sobre hora local (p. ej. UTC-4).
 */
export function dateInputToLimitISO(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) {
    throw new Error('due_date_required')
  }
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59)).toISOString()
}

/**
 * Revisores de una tarea de cierre múltiple: solo los elegidos en el formulario, sin repetidos.
 * Nunca se agrega al usuario en sesión (el backend crea una aprobación por cada id recibido).
 */
function resolveTaskReviewers(reviewers: number[]): number[] {
  const unique = [...new Set(reviewers)]
  if (!unique.length) {
    throw new Error('task_reviewer_required')
  }
  return unique
}

export function buildCreateTaskPayload(
  form: NewTaskFormInput,
  subtasks?: CreateTaskSubtaskPayload[],
  moreTasks: string[] = [],
): CreateTaskPayload {
  if (!form.name.trim()) {
    throw new Error('name_required')
  }
  if (form.project == null) {
    throw new Error('project_required')
  }
  if (form.group == null) {
    throw new Error('group_required')
  }
  if (!form.assignedTo.length) {
    throw new Error('assigned_to_required')
  }
  if (!form.dueDate) {
    throw new Error('due_date_required')
  }

  const payload: CreateTaskPayload = {
    short_description: form.name.trim(),
    long_description: form.description.trim(),
    type: form.type,
    priority: resolveTaskPriority(form.urgent, form.effort),
    start_date: new Date().toISOString(),
    limit_date: dateInputToLimitISO(form.dueDate),
    project: form.project,
    group: form.group,
    assigned_to: form.assignedTo,
  }

  if (form.type === 'multiple_close') {
    payload.task_reviewer = resolveTaskReviewers(form.taskReviewer)
  }

  if (form.type === 'repeat') {
    if (!isRepeatConfigComplete(form.repeatConfig)) {
      throw new Error('repeat_config_required')
    }
    payload.repeat_config = normalizeRepeatConfig(form.repeatConfig)
  }

  if (subtasks?.length) {
    payload.subtasks = subtasks
  }

  if (moreTasks.length) {
    payload.more_tasks = moreTasks
  }

  return payload
}

/** Payload de POST /api/tasks/backlog/create/: solo name/description/project, type fijo en manual. */
export function buildCreateBacklogTaskPayload(
  form: Pick<NewTaskFormInput, 'name' | 'description' | 'project'>,
  moreTasks: string[] = [],
): CreateBacklogTaskPayload {
  if (!form.name.trim()) {
    throw new Error('name_required')
  }
  if (form.project == null) {
    throw new Error('project_required')
  }

  const payload: CreateBacklogTaskPayload = {
    short_description: form.name.trim(),
    long_description: form.description.trim(),
    type: 'manual',
    project: form.project,
  }

  if (moreTasks.length) {
    payload.more_tasks = moreTasks
  }

  return payload
}

/** Payload de PATCH /api/tasks/:id/update/ para editar un backlog existente: solo name/description/project. */
export function buildUpdateBacklogTaskPayload(
  form: Pick<NewTaskFormInput, 'name' | 'description' | 'project'>,
): UpdateBacklogTaskPayload {
  if (!form.name.trim()) {
    throw new Error('name_required')
  }
  if (form.project == null) {
    throw new Error('project_required')
  }

  return {
    short_description: form.name.trim(),
    long_description: form.description.trim(),
    project: form.project,
  }
}

/**
 * Payload de POST /api/tasks/process/backlog/complete/ para promover una
 * tarea de backlog a Pendiente (drag Kanban Backlog → Pendiente). A diferencia
 * de `buildCreateTaskPayload`, `group` no es obligatorio (se envía `null` si
 * no hay asignado con grupo).
 */
export function buildPromoteBacklogTaskPayload(
  form: NewTaskFormInput,
  taskId: number,
): PromoteBacklogTaskPayload {
  if (!form.name.trim()) {
    throw new Error('name_required')
  }
  if (form.project == null) {
    throw new Error('project_required')
  }
  if (!form.assignedTo.length) {
    throw new Error('assigned_to_required')
  }
  if (!form.dueDate) {
    throw new Error('due_date_required')
  }

  const payload: PromoteBacklogTaskPayload = {
    task: taskId,
    short_description: form.name.trim(),
    long_description: form.description.trim(),
    type: form.type,
    priority: resolveTaskPriority(form.urgent, form.effort),
    start_date: new Date().toISOString(),
    limit_date: dateInputToLimitISO(form.dueDate),
    project: form.project,
    group: form.group ?? null,
    assigned_to: form.assignedTo,
  }

  if (form.type === 'multiple_close') {
    payload.task_reviewer = resolveTaskReviewers(form.taskReviewer)
  }

  if (form.type === 'repeat') {
    if (!isRepeatConfigComplete(form.repeatConfig)) {
      throw new Error('repeat_config_required')
    }
    payload.repeat_config = normalizeRepeatConfig(form.repeatConfig)
  }

  return payload
}

/** Flags de update para series repetitivas (instancia generada vs maestra). */
export interface RepeatSeriesUpdateOptions {
  generatedFrom?: number | null
  setAsMaster?: boolean
  applyToAll?: boolean
}

/**
 * Payload de PATCH /api/tasks/:id/update/.
 * Conserva `start_date` original; `group` puede ser null.
 */
export function buildUpdateTaskPayload(
  form: NewTaskFormInput,
  startDate: string | null | undefined,
  repeatSeries?: RepeatSeriesUpdateOptions,
): UpdateTaskPayload {
  if (!form.name.trim()) {
    throw new Error('name_required')
  }
  if (form.project == null) {
    throw new Error('project_required')
  }
  if (!form.assignedTo.length) {
    throw new Error('assigned_to_required')
  }
  if (!form.dueDate) {
    throw new Error('due_date_required')
  }

  const payload: UpdateTaskPayload = {
    short_description: form.name.trim(),
    long_description: form.description.trim(),
    type: form.type,
    priority: resolveTaskPriority(form.urgent, form.effort),
    start_date: startDate || new Date().toISOString(),
    limit_date: dateInputToLimitISO(form.dueDate),
    project: form.project,
    group: form.group ?? null,
    assigned_to: form.assignedTo,
  }

  if (form.type === 'multiple_close') {
    payload.task_reviewer = resolveTaskReviewers(form.taskReviewer)
  }

  if (form.type === 'repeat') {
    if (!isRepeatConfigComplete(form.repeatConfig)) {
      throw new Error('repeat_config_required')
    }
    payload.repeat_config = normalizeRepeatConfig(form.repeatConfig)
    payload.apply_to_all = repeatSeries?.applyToAll ?? false
    if (repeatSeries?.generatedFrom != null) {
      payload.set_as_master = repeatSeries.setAsMaster ?? false
    }
  }

  return payload
}

/** Close approval del usuario logueado (match por profile), sin importar si ya cerró. */
export function findCloseApprovalForUser(
  approvals: TaskCloseApproval[] | undefined,
  userId: number | undefined,
): TaskCloseApproval | undefined {
  if (userId == null || !approvals?.length) {
    return undefined
  }
  return approvals.find(approval => approval.profile === userId)
}

/** Close approval pendiente del usuario logueado (profile match y aún no cerrado). */
export function findPendingCloseApproval(
  approvals: TaskCloseApproval[] | undefined,
  userId: number | undefined,
): TaskCloseApproval | undefined {
  const approval = findCloseApprovalForUser(approvals, userId)
  return approval && !approval.closed ? approval : undefined
}
