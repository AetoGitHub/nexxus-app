<script setup lang="ts">
import TaskSection from '~/features/tasks/components/list/TaskSection.vue'
import type { TaskListFilters } from '~/features/tasks/types/task.types'
import type { ToUpdateSectionId } from '~/features/to-update/types/to-update.types'

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
  select: [taskId: number, sectionId: ToUpdateSectionId]
}>()

const { t } = useI18n()
const { sections } = useToUpdateTasks(() => props.filters)
</script>

<template>
  <div class="space-y-6">
    <TaskSection
      v-for="section in sections"
      :key="section.id"
      :title="t(section.labelKey)"
      :dot-color="section.color"
      :count="section.count"
      :tasks="section.tasks"
      :loading="section.loading"
      :error="section.error"
      :selected-task-id="selectedTaskId"
      @select="emit('select', $event, section.id)"
    />
  </div>
</template>
