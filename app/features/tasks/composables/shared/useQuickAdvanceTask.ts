import type { InjectionKey } from 'vue'
import { useTaskProcessActions } from '~/features/tasks/composables/shared/useTaskProcessActions'
import type { Task } from '~/features/tasks/types/task.types'
import { isQuickAdvanceBlocked, resolveQuickAdvance, type QuickAdvanceStep } from '~/features/tasks/utils/task-quick-advance.util'

/** Lo que el tablero Kanban le da a sus tarjetas (provide/inject) para que su círculo avance la tarea. */
export interface QuickAdvanceApi {
  advance: (task: Task) => Promise<void>
  stepOf: (task: Task) => QuickAdvanceStep | null
  isBlocked: (task: Task) => boolean
  isAdvancing: (taskId: number) => boolean
}

export const QUICK_ADVANCE_KEY: InjectionKey<QuickAdvanceApi> = Symbol('task-quick-advance')

/**
 * Avance rápido del círculo de una tarea: pendiente → en progreso → en revisión → completada con un solo clic, sin
 * modal ni comentario. Reusa las mismas mutaciones de proceso que los modales (mismo endpoint, mismos toasts y misma
 * actualización de la lista/Kanban), solo que sin pedir nada.
 *
 * Una tarea que exige evidencia (`requires_close_file`) y todavía no la tiene no puede cerrarse: en vez de dejar que el
 * backend responda 400, se avisa y se llama a `onNeedsEvidence` para abrir su detalle, donde se sube el archivo al chat.
 */
export function useQuickAdvanceTask(options: { onNeedsEvidence?: (taskId: number) => void } = {}): QuickAdvanceApi {
  const { user } = useAuth()
  const toast = useToast()
  const { t } = useI18n()
  const { startTask, closeTask } = useTaskProcessActions(options)

  const advancingIds = ref<Set<number>>(new Set())

  function setAdvancing(taskId: number, on: boolean) {
    const next = new Set(advancingIds.value)
    if (on) {
      next.add(taskId)
    }
    else {
      next.delete(taskId)
    }
    advancingIds.value = next
  }

  function stepOf(task: Task) {
    return resolveQuickAdvance(task, user.value?.id)
  }

  function isBlocked(task: Task) {
    return isQuickAdvanceBlocked(task, user.value?.id)
  }

  function isAdvancing(taskId: number) {
    return advancingIds.value.has(taskId)
  }

  async function advance(task: Task) {
    const step = stepOf(task)
    if (!step && isBlocked(task)) {
      toast.add({
        title: t('tasks.quickAdvance.blockedTitle'),
        description: t('tasks.quickAdvance.blockedInReview'),
        color: 'warning',
        icon: 'i-lucide-info',
      })
      return
    }
    if (!step || isAdvancing(task.id)) {
      return
    }

    setAdvancing(task.id, true)
    try {
      if (step.kind === 'start') {
        await startTask(task.id)
        return
      }

      await closeTask(task.id, step.nextStatus === 'complete' ? 'complete' : 'in_review', task.requires_close_file)
    }
    finally {
      setAdvancing(task.id, false)
    }
  }

  return { advance, stepOf, isBlocked, isAdvancing }
}
