<script setup lang="ts">
import TaskWorkspaceShell from '~/features/tasks/components/workspace/TaskWorkspaceShell.vue'

const ToUpdateListView = defineAsyncComponent(
  () => import('~/features/to-update/components/ToUpdateListView.vue'),
)
const ToUpdateKanbanView = defineAsyncComponent(
  () => import('~/features/to-update/components/ToUpdateKanbanView.vue'),
)

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()

useSeoMeta({
  title: () => t('tasks.toUpdate.title'),
})
</script>

<template>
  <TaskWorkspaceShell
    :title="t('tasks.toUpdate.title')"
    :exclude-views="['calendar']"
    authorize-mode
    hide-group-by
  >
    <template #default="{ view, groupBy, filters, selectedTaskId, openTask }">
      <ToUpdateListView
        v-if="view === 'list' && groupBy === 'all'"
        :filters="filters"
        :selected-task-id="selectedTaskId"
        @select="openTask"
      />
      <ToUpdateKanbanView
        v-else-if="view === 'kanban' && groupBy === 'all'"
        class="h-full"
        :filters="filters"
        :selected-task-id="selectedTaskId"
        @select="openTask"
      />

      <div
        v-else
        class="p-10 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground"
      >
        <UIcon name="i-lucide-construction" class="h-8 w-8" />
        <p class="text-sm">
          {{ t('tasks.comingSoon') }}
        </p>
      </div>
    </template>
  </TaskWorkspaceShell>
</template>
