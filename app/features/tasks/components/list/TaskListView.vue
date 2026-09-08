<script setup lang="ts">
import TaskSection from '~/features/tasks/components/list/TaskSection.vue'
import type { KanbanCreateColumn, TaskListFilters, TaskSectionKey } from '~/features/tasks/types/task.types'
import { extractResults } from '~/shared/utils/paginated.util'

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
const { counts, backlogCounts, backlog, urgent, today, upcoming, archivedCounts, archived, loadMore } = useTasks(() => props.filters)

function onCreate(sectionId: TaskSectionKey) {
  emit('create', { id: sectionId })
}
</script>

<template>
  <div>
    <div class="space-y-6">
      <TaskSection
        :title="t('tasks.sections.backlog')"
        dot-color="#8b5cf6"
        :count="backlogCounts.data.value?.total"
        :tasks="extractResults(backlog.data.value)"
        :loading="backlog.isPending.value"
        :error="backlog.isError.value"
        :has-next-page="backlog.hasNextPage.value"
        :is-fetching-next-page="backlog.isFetchingNextPage.value"
        :selected-task-id="selectedTaskId"
        show-status
        @select="emit('select', $event)"
        @load-more="loadMore('backlog')"
      />

      <TaskSection
        :title="t('tasks.sections.urgent')"
        dot-color="#dc2626"
        :count="counts.data.value?.urgent"
        :tasks="extractResults(urgent.data.value)"
        :loading="urgent.isPending.value"
        :error="urgent.isError.value"
        :has-next-page="urgent.hasNextPage.value"
        :is-fetching-next-page="urgent.isFetchingNextPage.value"
        :selected-task-id="selectedTaskId"
        show-status
        show-create
        @select="emit('select', $event)"
        @create="onCreate('urgent')"
        @load-more="loadMore('urgent')"
      />

      <TaskSection
        :title="t('tasks.sections.today')"
        dot-color="#28ceab"
        :count="counts.data.value?.due_today"
        :tasks="extractResults(today.data.value)"
        :loading="today.isPending.value"
        :error="today.isError.value"
        :has-next-page="today.hasNextPage.value"
        :is-fetching-next-page="today.isFetchingNextPage.value"
        :selected-task-id="selectedTaskId"
        show-status
        show-create
        @select="emit('select', $event)"
        @create="onCreate('today')"
        @load-more="loadMore('today')"
      />

      <TaskSection
        :title="t('tasks.sections.upcoming')"
        dot-color="#6366f1"
        :count="counts.data.value?.tasks"
        :tasks="extractResults(upcoming.data.value)"
        :loading="upcoming.isPending.value"
        :error="upcoming.isError.value"
        :has-next-page="upcoming.hasNextPage.value"
        :is-fetching-next-page="upcoming.isFetchingNextPage.value"
        :selected-task-id="selectedTaskId"
        show-status
        show-create
        @select="emit('select', $event)"
        @create="onCreate('upcoming')"
        @load-more="loadMore('upcoming')"
      />
    </div>

    <TaskSection
      :title="t('tasks.sections.archived')"
      dot-color="#9ca3af"
      :count="archivedCounts.data.value?.total"
      :tasks="extractResults(archived.data.value)"
      :loading="archived.isPending.value"
      :error="archived.isError.value"
      :has-next-page="archived.hasNextPage.value"
      :is-fetching-next-page="archived.isFetchingNextPage.value"
      :selected-task-id="selectedTaskId"
      :default-open="false"
      minimal
      show-status
      @select="emit('select', $event)"
      @load-more="loadMore('archived')"
    />
  </div>
</template>
