import type { TaskCalendarPhase, TaskGroupBy, TaskListFilters, TaskView } from '~/features/tasks/types/task.types'
import type { NewTaskFormDefaults } from '~/features/tasks/utils/form/new-task-defaults.util'

/** Estado compartido del workspace de tareas (filtros, vista, slideover). */
export function useTaskWorkspaceState() {
  const { t } = useI18n()

  const view = ref<TaskView>('list')
  const search = ref('')
  const groupBy = ref<TaskGroupBy>('all')
  const calendarPhase = ref<TaskCalendarPhase>('start')
  const filtersOpen = ref(false)
  const newTaskOpen = ref(false)
  const selectedTaskId = ref<number | null>(null)
  /** Prefills al abrir el slideover en modo creación (p. ej. proyecto desde Kanban). */
  const newTaskDefaults = ref<NewTaskFormDefaults | null>(null)

  const debouncedSearch = refDebounced(search, 300)
  const listFilters = ref<TaskListFilters>({})

  watch(debouncedSearch, (value) => {
    listFilters.value = {
      ...listFilters.value,
      short_description: value.trim() || undefined,
    }
  })

  watch(newTaskOpen, (isOpen) => {
    if (!isOpen) {
      newTaskDefaults.value = null
    }
  })

  const activeGroupByLabel = computed(() => t(`tasks.groupBy.${groupBy.value}`))

  function openNewTask(defaults?: NewTaskFormDefaults | null) {
    selectedTaskId.value = null
    newTaskDefaults.value = defaults ?? null
    newTaskOpen.value = true
  }

  function openTask(taskId: number) {
    selectedTaskId.value = taskId
    newTaskDefaults.value = null
    newTaskOpen.value = true
  }

  return {
    view,
    search,
    groupBy,
    calendarPhase,
    filtersOpen,
    newTaskOpen,
    selectedTaskId,
    newTaskDefaults,
    listFilters,
    activeGroupByLabel,
    openNewTask,
    openTask,
  }
}
