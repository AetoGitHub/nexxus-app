import type { MaybeRefOrGetter } from 'vue'
import type { KanbanColumn, KanbanTaskMove } from '~/features/tasks/types/task.types'

function cloneColumns(columns: KanbanColumn[]): KanbanColumn[] {
  return columns.map(column => ({
    ...column,
    tasks: [...column.tasks],
  }))
}

/**
 * Estado local del tablero Kanban para drag & drop cosmético
 * (Due / Project / Group). En All el move lo confirma el modal de proceso.
 */
export function useKanbanBoardState(columns: MaybeRefOrGetter<KanbanColumn[]>) {
  const localColumns = ref<KanbanColumn[]>([])

  watch(
    () => toValue(columns),
    (next) => {
      localColumns.value = cloneColumns(next)
    },
    { deep: true, immediate: true },
  )

  function moveTask(payload: KanbanTaskMove): boolean {
    const { taskId, fromColumnId, toColumnId } = payload
    if (fromColumnId === toColumnId) {
      return false
    }

    const from = localColumns.value.find(column => column.id === fromColumnId)
    const to = localColumns.value.find(column => column.id === toColumnId)

    if (!from || !to || from.loading || to.loading || from.error || to.error) {
      return false
    }

    const taskIndex = from.tasks.findIndex(task => task.id === taskId)
    if (taskIndex < 0) {
      return false
    }

    const [task] = from.tasks.splice(taskIndex, 1)
    if (!task) {
      return false
    }

    to.tasks.unshift(task)

    if (from.count !== undefined) {
      from.count = Math.max(0, from.count - 1)
    }
    if (to.count !== undefined) {
      to.count += 1
    }
    else if (to.comingSoon) {
      to.count = to.tasks.length
    }

    return true
  }

  return { localColumns, moveTask }
}
