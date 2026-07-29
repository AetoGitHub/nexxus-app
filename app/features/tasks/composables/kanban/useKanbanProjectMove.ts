import type { KanbanTaskMove } from '~/features/tasks/types/task.types'

/**
 * Estado del flujo DnD → modal de cambio de proyecto en Kanban Proyectos.
 */
export function useKanbanProjectMove() {
  const toast = useToast()
  const { t } = useI18n()

  const pendingTaskId = ref<number | null>(null)
  const confirmModalOpen = ref(false)
  const targetProjectId = ref<number | null>(null)
  const fromProjectName = ref('')
  const toProjectName = ref('')

  function resetModals() {
    pendingTaskId.value = null
    confirmModalOpen.value = false
    targetProjectId.value = null
    fromProjectName.value = ''
    toProjectName.value = ''
  }

  function requestMove(
    payload: KanbanTaskMove & {
      fromProjectName: string
      toProjectName: string
    },
  ) {
    const projectId = Number(payload.toColumnId)

    if (
      payload.fromColumnId === payload.toColumnId
      || !Number.isFinite(projectId)
      || projectId <= 0
    ) {
      toast.add({
        title: t('tasks.kanban.moveNotAllowedTitle'),
        description: t('tasks.kanban.projectMove.moveNotAllowedDescription'),
        color: 'warning',
      })
      return false
    }

    pendingTaskId.value = payload.taskId
    targetProjectId.value = projectId
    fromProjectName.value = payload.fromProjectName
    toProjectName.value = payload.toProjectName
    confirmModalOpen.value = true
    return true
  }

  function onMoveSuccess() {
    resetModals()
  }

  return {
    pendingTaskId,
    confirmModalOpen,
    targetProjectId,
    fromProjectName,
    toProjectName,
    requestMove,
    onMoveSuccess,
  }
}
