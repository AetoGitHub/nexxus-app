import type { KanbanTaskMove, Task } from '~/features/tasks/types/task.types'
import { findPendingCloseApproval } from '~/features/tasks/utils/form/task-form.util'
import { isToUpdateLinearMove } from '~/features/to-update/utils/to-update-kanban-move.util'

/**
 * DnD lineal en Kanban de pending-approval → modal de Autorizar.
 */
export function useToUpdateKanbanMove() {
  const toast = useToast()
  const { t } = useI18n()
  const { user } = useAuth()

  const pendingApprovalId = ref<number | null>(null)
  const authorizeModalOpen = ref(false)

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

    pendingApprovalId.value = approval.id
    authorizeModalOpen.value = true
    return true
  }

  function onAuthorizeSuccess() {
    pendingApprovalId.value = null
    authorizeModalOpen.value = false
  }

  return {
    pendingApprovalId,
    authorizeModalOpen,
    requestMove,
    onAuthorizeSuccess,
  }
}
