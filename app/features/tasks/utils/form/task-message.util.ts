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

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'])

/** Nombre original del archivo a partir de la URL de Firebase (quita el prefijo {timestamp}_). */
export function fileNameFromUrl(url: string): string {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname)
    const lastSegment = pathname.split('/').pop() ?? url
    return lastSegment.replace(/^\d+_/, '')
  } catch {
    return url
  }
}

function extensionOf(fileName: string): string {
  return fileName.toLowerCase().split('.').pop() ?? ''
}

/** Heurística por extensión para decidir si un adjunto se previsualiza como imagen. */
export function isImageFileUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.has(extensionOf(fileNameFromUrl(url)))
}

const ICON_BY_EXTENSION: Record<string, string> = {
  pdf: 'i-lucide-file-text',
  doc: 'i-lucide-file-text',
  docx: 'i-lucide-file-text',
  txt: 'i-lucide-file-text',
  rtf: 'i-lucide-file-text',
  xls: 'i-lucide-file-spreadsheet',
  xlsx: 'i-lucide-file-spreadsheet',
  csv: 'i-lucide-file-spreadsheet',
  ppt: 'i-lucide-file-chart-column',
  pptx: 'i-lucide-file-chart-column',
  zip: 'i-lucide-file-archive',
  rar: 'i-lucide-file-archive',
  '7z': 'i-lucide-file-archive',
  mp3: 'i-lucide-file-audio',
  wav: 'i-lucide-file-audio',
  ogg: 'i-lucide-file-audio',
  mp4: 'i-lucide-file-video-camera',
  mov: 'i-lucide-file-video-camera',
  avi: 'i-lucide-file-video-camera',
  webm: 'i-lucide-file-video-camera',
}

/** Ícono representativo según la extensión del archivo (genérico si no se reconoce). */
export function fileTypeIcon(nameOrUrl: string): string {
  const extension = extensionOf(fileNameFromUrl(nameOrUrl))
  return ICON_BY_EXTENSION[extension] ?? 'i-lucide-file'
}
