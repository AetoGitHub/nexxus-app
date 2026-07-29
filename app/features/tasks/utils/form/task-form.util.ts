import type {
  ApiTaskPriority,
  CreateTaskPayload,
  NewTaskFormType,
  TaskCloseApproval,
  TaskDetail,
  TaskEffort,
  UpdateTaskPayload,
} from '~/features/tasks/types/task.types'

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
}

const FORM_TASK_TYPES: NewTaskFormType[] = ['manual', 'volume', 'multiple_close']
const FORM_EFFORTS: TaskEffort[] = ['quick', 'normal', 'complex']

function isNewTaskFormType(value: string): value is NewTaskFormType {
  return FORM_TASK_TYPES.includes(value as NewTaskFormType)
}

function isTaskEffort(value: string): value is TaskEffort {
  return FORM_EFFORTS.includes(value as TaskEffort)
}

function isoToDateInput(iso: string | null): string {
  if (!iso) {
    return ''
  }
  return iso.slice(0, 10)
}

/** Mapea el detalle del API al estado del formulario del slideover. */
export function taskDetailToFormInput(detail: TaskDetail): NewTaskFormInput {
  const urgent = detail.priority === 'urgent'
  const effortFromApi = detail.effort && isTaskEffort(String(detail.effort))
    ? (detail.effort as TaskEffort)
    : undefined

  return {
    type: isNewTaskFormType(detail.type) ? detail.type : 'manual',
    name: detail.short_description ?? '',
    description: detail.long_description ?? '',
    project: detail.project ?? undefined,
    group: detail.group ?? undefined,
    assignedTo: [...(detail.assigned_to ?? [])],
    taskReviewer: detail.close_approvals?.map(approval => approval.profile) ?? [],
    dueDate: isoToDateInput(detail.limit_date),
    urgent,
    effort: urgent ? undefined : effortFromApi,
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

function normalizeTaskReviewers(reviewers: number[], currentUserId?: number): number[] {
  if (currentUserId == null) {
    return reviewers
  }
  if (reviewers.includes(currentUserId)) {
    return reviewers
  }
  return [currentUserId, ...reviewers]
}

export function buildCreateTaskPayload(
  form: NewTaskFormInput,
  currentUserId?: number,
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
    const reviewers = form.taskReviewer.length
      ? form.taskReviewer
      : (currentUserId != null ? [currentUserId] : [])

    if (!reviewers.length) {
      throw new Error('task_reviewer_required')
    }

    payload.task_reviewer = normalizeTaskReviewers(reviewers, currentUserId)
  }

  return payload
}

/**
 * Payload de PATCH /api/tasks/:id/update/.
 * Conserva `start_date` original; `group` puede ser null.
 */
export function buildUpdateTaskPayload(
  form: NewTaskFormInput,
  startDate: string | null | undefined,
  currentUserId?: number,
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
    const reviewers = form.taskReviewer.length
      ? form.taskReviewer
      : (currentUserId != null ? [currentUserId] : [])

    if (!reviewers.length) {
      throw new Error('task_reviewer_required')
    }

    payload.task_reviewer = normalizeTaskReviewers(reviewers, currentUserId)
  }
  else if (form.taskReviewer.length) {
    payload.task_reviewer = form.taskReviewer
  }

  return payload
}

export function defaultTaskReviewers(currentUserId?: number): number[] {
  return currentUserId != null ? [currentUserId] : []
}

/** Close approval pendiente del usuario logueado (profile match y aún no cerrado). */
export function findPendingCloseApproval(
  approvals: TaskCloseApproval[] | undefined,
  userId: number | undefined,
): TaskCloseApproval | undefined {
  if (userId == null || !approvals?.length) {
    return undefined
  }
  return approvals.find(approval => approval.profile === userId && !approval.closed)
}
