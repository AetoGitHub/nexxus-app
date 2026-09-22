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
  const projectName = computed(() => current.value.project_name?.trim() ?? '')

  const isComplete = computed(() => current.value.status === 'complete')

  /** Completada: se muestra la fecha real de cierre (finish_at) en vez del vencimiento. */
  const dueDate = computed(() =>
    isComplete.value ? (current.value.finish_at ?? current.value.limit_date) : current.value.limit_date,
  )

  const dueDiff = computed(() => diffInDays(dueDate.value))
  /** Completada nunca se marca "vencida": esa fecha ya pasó por diseño, no es un problema. */
  const isOverdue = computed(() => !isComplete.value && dueDiff.value !== null && dueDiff.value < 0)

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
    return formatShortDate(dueDate.value, locale.value)
  })

  return {
    typeMeta,
    priorityMeta,
    statusMeta,
    barColor,
    requiresAttention,
    closeApprovalsProgress,
    assignees,
    projectName,
    dueDiff,
    isOverdue,
    dueLabel,
  }
}
