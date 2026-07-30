import type { TaskCalendarPhase, TaskGroupBy, TaskListFilters, TaskView } from '~/features/tasks/types/task.types'
import type { NewTaskFormDefaults } from '~/features/tasks/utils/form/new-task-defaults.util'
import type { ToUpdateSectionId } from '~/features/to-update/types/to-update.types'

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
  /** Sección de pending-approval desde la que se abrió el detalle. */
  const toUpdateSection = ref<ToUpdateSectionId | null>(null)

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
      toUpdateSection.value = null
    }
  })

  const activeGroupByLabel = computed(() => t(`tasks.groupBy.${groupBy.value}`))

  function openNewTask(defaults?: NewTaskFormDefaults | null) {
    selectedTaskId.value = null
    toUpdateSection.value = null
    newTaskDefaults.value = defaults ?? null
    newTaskOpen.value = true
  }

  function openTask(taskId: number, section?: ToUpdateSectionId | null) {
    selectedTaskId.value = taskId
    toUpdateSection.value = section ?? null
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
    toUpdateSection,
    listFilters,
    activeGroupByLabel,
    openNewTask,
    openTask,
  }
}
