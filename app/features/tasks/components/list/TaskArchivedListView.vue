<script setup lang="ts">
import TaskSection from '~/features/tasks/components/list/TaskSection.vue'
import TaskDeleteProcessModal from '~/features/tasks/components/form/TaskDeleteProcessModal.vue'
import { useArchivedTasks } from '~/features/tasks/composables/shared/useArchivedTasks'
import type { TaskListFilters } from '~/features/tasks/types/task.types'

/**
 * Vista independiente de tareas archivadas (toggle en el toolbar del
 * workspace). Reemplaza la vista/agrupación activa mientras está encendida.
 */
const props = withDefaults(
  defineProps<{
    filters: TaskListFilters
    selectedTaskId?: number | null
  }>(),
  {
    selectedTaskId: null,
  },
)

const emit = defineEmits<{
  select: [taskId: number]
}>()

const { t } = useI18n()
const { counts, archived, tasks, loadMore } = useArchivedTasks(() => props.filters)

const deletingTaskId = ref<number | null>(null)
const deleteConfirmOpen = ref(false)

function onDeleteTask(taskId: number) {
  deletingTaskId.value = taskId
  deleteConfirmOpen.value = true
}
</script>

<template>
  <div>
    <TaskSection
      :title="t('tasks.sections.archived')"
      dot-color="#9ca3af"
      :count="counts.data.value?.total"
      :tasks="tasks"
      :loading="archived.isPending.value"
      :error="archived.isError.value"
      :has-next-page="archived.hasNextPage.value"
      :is-fetching-next-page="archived.isFetchingNextPage.value"
      :selected-task-id="selectedTaskId"
      show-status
      deletable
      @select="emit('select', $event)"
      @delete="onDeleteTask"
      @load-more="loadMore"
    />

    <TaskDeleteProcessModal
      v-if="deletingTaskId != null"
      v-model:open="deleteConfirmOpen"
      :task-id="deletingTaskId"
      @success="deletingTaskId = null"
    />
  </div>
</template>
