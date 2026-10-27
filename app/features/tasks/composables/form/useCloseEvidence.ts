import type { MaybeRefOrGetter } from 'vue'
import { useTaskDetail } from '~/features/tasks/composables/form/useTaskDetail'
import { useTaskMessages } from '~/features/tasks/composables/form/useTaskMessages'
import type { TaskDetail, TaskMessage } from '~/features/tasks/types/task.types'

/** Misma regla del backend: archivo en un mensaje no borrado del chat o imagen de un paso previo del proceso. */
export function hasCloseEvidence(
  messages: Array<Pick<TaskMessage, 'deleted' | 'files'>>,
  detail: Pick<TaskDetail, 'process_tasks'> | null | undefined,
): boolean {
  return messages.some(message => !message.deleted && (message.files?.length ?? 0) > 0)
    || (detail?.process_tasks ?? []).some(step => (step.images?.length ?? 0) > 0)
}

/**
 * Evidencia de cierre de una tarea con `requires_close_file`.
 *
 * La evidencia se sube en el chat de la tarea (no en los modales de cierre). El backend acepta el cierre si la tarea ya
 * tiene un archivo en un mensaje no borrado del chat, o una imagen adjunta a un paso previo del proceso. Aquí se
 * calcula con esa misma regla si todavía falta (`needsEvidence`), para avisar y bloquear el cierre en vez de dejar que
 * el backend responda 400. Las consultas solo corren mientras `active` sea `true` y se refrescan solas cuando
 * llega el archivo al chat.
 */
export function useCloseEvidence(
  taskId: MaybeRefOrGetter<number>,
  active: MaybeRefOrGetter<boolean>,
) {
  const activeTaskId = computed(() => (toValue(active) ? toValue(taskId) : null))
  const detail = useTaskDetail(activeTaskId)
  const { messages } = useTaskMessages(activeTaskId)

  /** La tarea exige evidencia. */
  const taskRequiresFile = computed(() => detail.data.value?.requires_close_file === true)
  const hasEvidence = computed(() => hasCloseEvidence(messages.value, detail.data.value))
  /** Falta subir al menos un archivo al chat para poder cerrar. */
  const needsEvidence = computed(() => taskRequiresFile.value && !hasEvidence.value)

  return { detail, taskRequiresFile, hasEvidence, needsEvidence }
}
