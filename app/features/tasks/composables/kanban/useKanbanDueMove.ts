import type { KanbanTaskMove } from '~/features/tasks/types/task.types'
import { resolveKanbanDueMove } from '~/features/tasks/utils/kanban/kanban-due-move.util'

/**
 * Estado del flujo DnD → modal de cambio de vencimiento en Kanban Due.
 */
export function useKanbanDueMove() {
  const toast = useToast()
  const { t } = useI18n()

  const pendingTaskId = ref<number | null>(null)
  const confirmModalOpen = ref(false)
  const confirmColumnId = ref<'today' | 'tomorrow'>('tomorrow')
  const confirmLimitDateInput = ref('')
  const dateModalOpen = ref(false)
  const dateColumnId = ref<'week' | 'month'>('week')
  const dateMin = ref('')
  const dateMax = ref('')

  function resetModals() {
    pendingTaskId.value = null
    confirmModalOpen.value = false
    dateModalOpen.value = false
    confirmLimitDateInput.value = ''
    dateMin.value = ''
    dateMax.value = ''
  }

  function requestMove(payload: KanbanTaskMove) {
    const transition = resolveKanbanDueMove(payload.fromColumnId, payload.toColumnId)

    if (!transition) {
      toast.add({
        title: t('tasks.kanban.moveNotAllowedTitle'),
        description: t('tasks.kanban.dueMove.moveNotAllowedDescription'),
        color: 'warning',
      })
      return false
    }

    if (transition.kind === 'blocked') {
      toast.add({
        title: t('tasks.kanban.dueMove.noDateBlockedTitle'),
        description: t('tasks.kanban.dueMove.noDateBlockedDescription'),
        color: 'warning',
      })
      return false
    }

    pendingTaskId.value = payload.taskId

    if (transition.kind === 'confirm') {
      confirmColumnId.value = transition.columnId
      confirmLimitDateInput.value = transition.limitDateInput
      confirmModalOpen.value = true
      return true
    }

    dateColumnId.value = transition.columnId
    dateMin.value = transition.minDate
    dateMax.value = transition.maxDate
    dateModalOpen.value = true
    return true
  }

  function onMoveSuccess() {
    resetModals()
  }

  return {
    pendingTaskId,
    confirmModalOpen,
    confirmColumnId,
    confirmLimitDateInput,
    dateModalOpen,
    dateColumnId,
    dateMin,
    dateMax,
    requestMove,
    onMoveSuccess,
  }
}
