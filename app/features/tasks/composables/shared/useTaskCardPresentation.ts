import type { MaybeRefOrGetter } from 'vue'
import type { Task } from '~/features/tasks/types/task.types'

/**
 * Presentación compartida de una tarea en lista y kanban
 * (tipo, prioridad, status, barra, due label, atención).
 */
export function useTaskCardPresentation(task: MaybeRefOrGetter<Task>) {
  const { t, locale } = useI18n()

  const current = computed(() => toValue(task))

  const typeMeta = computed(() => taskTypeMeta(current.value.type))
  const priorityMeta = computed(() => taskPriorityMeta(current.value.priority))
  const statusMeta = computed(() => taskStatusMeta(current.value.status))
  const barColor = computed(() => taskBarColor(current.value))
  const requiresAttention = computed(() => taskRequiresAttention(current.value))
  const closeApprovalsProgress = computed(() =>
    taskCloseApprovalsProgress(current.value.close_approvals),
  )
  const assignees = computed(() => current.value.assigned_to ?? [])

  const dueDiff = computed(() => diffInDays(current.value.limit_date))
  const isOverdue = computed(() => dueDiff.value !== null && dueDiff.value < 0)

  const dueLabel = computed(() => {
    const diff = dueDiff.value
    if (diff === null) {
      return ''
    }
    if (diff === 0) {
      return t('tasks.due.today')
    }
    if (diff === 1) {
      return t('tasks.due.tomorrow')
    }
    if (diff === -1) {
      return t('tasks.due.yesterday')
    }
    if (diff > 1 && diff <= 30) {
      return t('tasks.due.inDays', { n: diff })
    }
    return formatShortDate(current.value.limit_date, locale.value)
  })

  return {
    typeMeta,
    priorityMeta,
    statusMeta,
    barColor,
    requiresAttention,
    closeApprovalsProgress,
    assignees,
    dueDiff,
    isOverdue,
    dueLabel,
  }
}
