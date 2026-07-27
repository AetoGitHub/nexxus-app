import type { KanbanTaskMove, Task } from '~/features/tasks/types/task.types'
import { useAuthorizeCloseApproval } from '~/features/tasks/composables/form/useAuthorizeCloseApproval'
import { findPendingCloseApproval } from '~/features/tasks/utils/form/task-form.util'
import { isToUpdateLinearMove } from '~/features/to-update/utils/to-update-kanban-move.util'

/**
 * DnD lineal en Kanban de pending-approval → misma acción que Autorizar.
 */
export function useToUpdateKanbanMove() {
  const toast = useToast()
  const { t } = useI18n()
  const { user } = useAuth()
  const {
    mutateAsync: authorizeCloseApproval,
    isPending,
  } = useAuthorizeCloseApproval()

  async function requestMove(payload: KanbanTaskMove & { task: Task }) {
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

    try {
      await authorizeCloseApproval(approval.id)
      return true
    }
    catch {
      // Toast de error lo maneja useAuthorizeCloseApproval.
      return false
    }
  }

  return {
    requestMove,
    isPending,
  }
}
