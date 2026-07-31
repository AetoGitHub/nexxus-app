import type {
  CloseTaskProcessStatus,
  KanbanStatusColumnId,
  ReviewDecisionStatus,
  Task,
} from '~/features/tasks/types/task.types'

/** Transición de proceso resuelta desde un drop Kanban All. */
export type KanbanProcessMove =
  | { kind: 'start' }
  | { kind: 'close', status: CloseTaskProcessStatus }
  | { kind: 'review', status: ReviewDecisionStatus }
  | { kind: 'reopen' }

const STATUS_COLUMNS = new Set<string>([
  'pending',
  'wip',
  'in_review',
  'rejected',
  'complete',
])

function isStatusColumnId(id: string | number): id is KanbanStatusColumnId {
  return typeof id === 'string' && STATUS_COLUMNS.has(id)
}

function isMultipleCloseTask(task: Pick<Task, 'multiple_close' | 'type'>): boolean {
  return task.multiple_close === true || task.type === 'multiple_close'
}

/**
 * Resuelve si un drop entre columnas de status es una transición de proceso válida.
 * Misma matriz que los botones del slideover en Kanban All.
 */
export function resolveKanbanProcessMove(
  fromColumnId: string | number,
  toColumnId: string | number,
  task: Pick<Task, 'multiple_close' | 'type'>,
): KanbanProcessMove | null {
  if (!isStatusColumnId(fromColumnId) || !isStatusColumnId(toColumnId)) {
    return null
  }
  if (fromColumnId === toColumnId) {
    return null
  }

  const blockComplete = isMultipleCloseTask(task)

  if (fromColumnId === 'pending' && toColumnId === 'wip') {
    return { kind: 'start' }
  }

  if (fromColumnId === 'wip' && toColumnId === 'in_review') {
    return { kind: 'close', status: 'in_review' }
  }

  if (fromColumnId === 'wip' && toColumnId === 'complete') {
    return blockComplete ? null : { kind: 'close', status: 'complete' }
  }

  if (fromColumnId === 'in_review' && toColumnId === 'rejected') {
    return { kind: 'review', status: 'rejected' }
  }

  if (fromColumnId === 'in_review' && toColumnId === 'complete') {
    return blockComplete ? null : { kind: 'review', status: 'complete' }
  }

  if (fromColumnId === 'complete' && toColumnId === 'wip') {
    return { kind: 'reopen' }
  }

  return null
}
