import type { TaskMessage, TaskSystemMessageKey } from '~/features/tasks/types/task.types'

const SYSTEM_MESSAGE_I18N_KEYS: Record<TaskSystemMessageKey, string> = {
  task_created: 'tasks.messenger.system.taskCreated',
  task_updated: 'tasks.messenger.system.taskUpdated',
  task_started: 'tasks.messenger.system.taskStarted',
  task_sent_to_review: 'tasks.messenger.system.taskSentToReview',
  task_closed: 'tasks.messenger.system.taskClosed',
  task_rejected: 'tasks.messenger.system.taskRejected',
  close_approved_by: 'tasks.messenger.system.closeApprovedBy',
  task_reopened: 'tasks.messenger.system.taskReopened',
}

type TranslateFn = (key: string, params?: Record<string, unknown>) => string

/**
 * Resuelve el texto visible de un mensaje del chat.
 * Los mensajes de sistema se re-traducen según el locale activo vía i18n.
 */
export function resolveTaskMessageContent(
  message: TaskMessage,
  t: TranslateFn,
): string {
  if (message.type !== 'system' || !message.system_key) {
    return message.content
  }

  const i18nKey = SYSTEM_MESSAGE_I18N_KEYS[message.system_key]
  if (!i18nKey) {
    return message.content
  }

  return t(i18nKey, message.system_params ?? {})
}
