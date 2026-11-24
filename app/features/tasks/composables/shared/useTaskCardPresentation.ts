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

  /**
   * Día a mostrar (YYYY-MM-DD en CDMX): el día límite (`limit_day`) o, en una completada, el día real de cierre
   * (`finish_at`). Nunca se corta `limit_date` (UTC): 20 nov 23:59 CDMX llega como `2026-11-21T05:59:59Z`.
   */
  const dueDay = computed(() => {
    const task = current.value
    if (isComplete.value && task.finish_at) {
      return businessDayKey(task.finish_at)
    }
    return limitDayOf(task)
  })

  /** Hoy / mañana / vencida se comparan contra hoy en CDMX. */
  const dueDiff = computed(() => (dueDay.value ? diffDayKeys(dueDay.value, businessToday()) : null))
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
    return dueDay.value ? formatShortDayKey(dueDay.value, locale.value) : ''
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
