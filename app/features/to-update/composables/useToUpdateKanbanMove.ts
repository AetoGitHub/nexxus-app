import type { KanbanTaskMove, Task } from '~/features/tasks/types/task.types'
import { useTaskProcessActions } from '~/features/tasks/composables/shared/useTaskProcessActions'
import { findPendingCloseApproval } from '~/features/tasks/utils/form/task-form.util'
import { isToUpdateLinearMove } from '~/features/to-update/utils/to-update-kanban-move.util'

/**
 * DnD lineal en Kanban de pending-approval: autoriza directo, sin modal.
 */
export function useToUpdateKanbanMove(options: { onNeedsEvidence?: (taskId: number) => void } = {}) {
  const toast = useToast()
  const { t } = useI18n()
  const { user } = useAuth()
  const { authorizeTask } = useTaskProcessActions(options)

  /** Tareas con la autorización en curso: soltar otra vez la misma tarjeta no la repite. */
  const authorizingIds = new Set<number>()

  async function authorize(taskId: number, approvalId: number) {
    if (authorizingIds.has(taskId)) {
      return
    }
    authorizingIds.add(taskId)
    try {
      await authorizeTask(taskId, approvalId)
    }
    finally {
      authorizingIds.delete(taskId)
    }
  }

  function requestMove(payload: KanbanTaskMove & { task: Task }) {
    if (!isToUpdateLinearMove(payload.fromColumnId, payload.toColumnId)) {
      toast.add({
        title: t('tasks.toUpdate.kanban.moveNotAllowedTitle'),
        description: t('tasks.toUpdate.kanban.moveNotAllowedDescription'),
        color: 'warning',
      })
      return false
    }

    const approval = findPendingCloseApproval(
      payload.task.close_approvals,
      user.value?.id,
    )

    if (!approval) {
      toast.add({
        title: t('tasks.toUpdate.authorize.errorTitle'),
        description: t('tasks.toUpdate.kanban.noPendingApproval'),
        color: 'error',
      })
      return false
    }

    void authorize(payload.task.id, approval.id)
    return true
  }

  return { requestMove }
}
