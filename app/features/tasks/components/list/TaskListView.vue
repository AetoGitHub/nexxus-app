<script setup lang="ts">
import TaskSection from '~/features/tasks/components/list/TaskSection.vue'
import type { KanbanCreateColumn, TaskListFilters, TaskSectionKey } from '~/features/tasks/types/task.types'

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
  create: [column: KanbanCreateColumn]
}>()

const { t } = useI18n()
const { counts, urgent, today, upcoming } = useTasks(() => props.filters)

function onCreate(sectionId: TaskSectionKey) {
  emit('create', { id: sectionId })
}
</script>

<template>
  <div class="space-y-6">
    <TaskSection
      :title="t('tasks.sections.urgent')"
      dot-color="#dc2626"
      :count="counts.data.value?.urgent"
      :tasks="urgent.data.value?.results ?? []"
      :loading="urgent.isPending.value"
      :error="urgent.isError.value"
      :selected-task-id="selectedTaskId"
      show-status
      show-create
      @select="emit('select', $event)"
      @create="onCreate('urgent')"
    />

    <TaskSection
      :title="t('tasks.sections.today')"
      dot-color="#28ceab"
      :count="counts.data.value?.due_today"
      :tasks="today.data.value?.results ?? []"
      :loading="today.isPending.value"
      :error="today.isError.value"
      :selected-task-id="selectedTaskId"
      show-status
      show-create
      @select="emit('select', $event)"
      @create="onCreate('today')"
    />

    <TaskSection
      :title="t('tasks.sections.upcoming')"
      dot-color="#6366f1"
      :count="counts.data.value?.tasks"
      :tasks="upcoming.data.value?.results ?? []"
      :loading="upcoming.isPending.value"
      :error="upcoming.isError.value"
      :selected-task-id="selectedTaskId"
      show-status
      show-create
      @select="emit('select', $event)"
      @create="onCreate('upcoming')"
    />
  </div>
</template>
