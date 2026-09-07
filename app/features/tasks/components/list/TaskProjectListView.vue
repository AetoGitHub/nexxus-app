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
const { projects, sections, loadMore } = useProjectTasks(() => props.filters)
</script>

<template>
  <div>
    <div v-if="projects.isPending.value && !sections.length" class="px-4 py-3 space-y-2">
      <USkeleton v-for="n in 3" :key="n" class="h-10 w-full" />
    </div>

    <p v-else-if="projects.isError.value" class="px-4 py-4 text-sm text-error">
      {{ t('tasks.loadError') }}
    </p>

    <p v-else-if="!sections.length" class="px-4 py-4 text-sm text-muted-foreground">
      {{ t('tasks.empty') }}
    </p>

    <div v-else class="space-y-6">
      <TaskSection
        v-for="section in sections"
        :key="section.id"
        :title="section.name"
        :dot-color="section.dotColor"
        :count="section.count"
        :tasks="section.tasks"
        :loading="section.loading"
        :error="section.error"
        :has-next-page="section.hasNextPage"
        :is-fetching-next-page="section.isFetchingNextPage"
        :selected-task-id="selectedTaskId"
        show-status
        show-create
        @select="emit('select', $event)"
        @create="emit('create', { id: section.id, title: section.name })"
        @load-more="loadMore(section.id)"
      />
    </div>
  </div>
</template>
