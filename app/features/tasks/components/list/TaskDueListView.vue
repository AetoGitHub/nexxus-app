<script setup lang="ts">
import TaskSection from '~/features/tasks/components/list/TaskSection.vue'
import type { KanbanCreateColumn, TaskListFilters } from '~/features/tasks/types/task.types'

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
const { sections } = useOverdueTasks(() => props.filters)
</script>

<template>
  <div class="space-y-6">
    <TaskSection
      v-for="section in sections"
      :key="section.id"
      :title="section.labelKey ? t(section.labelKey) : (section.name ?? '')"
      :dot-color="section.color"
      :count="section.count"
      :tasks="section.tasks"
      :loading="section.loading"
      :error="section.error"
      :selected-task-id="selectedTaskId"
      show-status
      show-create
      @select="emit('select', $event)"
      @create="emit('create', { id: section.id })"
    />
  </div>
</template>
