<script setup lang="ts">
import TaskWorkspaceShell from '~/features/tasks/components/workspace/TaskWorkspaceShell.vue'
import { buildNewTaskDefaultsFromKanbanColumn } from '~/features/tasks/utils/form/new-task-defaults.util'
import type { NewTaskFormDefaults } from '~/features/tasks/utils/form/new-task-defaults.util'
import type { KanbanCreateColumn, TaskGroupBy } from '~/features/tasks/types/task.types'

const TaskListView = defineAsyncComponent(
  () => import('~/features/tasks/components/list/TaskListView.vue'),
)
const TaskDueListView = defineAsyncComponent(
  () => import('~/features/tasks/components/list/TaskDueListView.vue'),
)
const TaskProjectListView = defineAsyncComponent(
  () => import('~/features/tasks/components/list/TaskProjectListView.vue'),
)
const TaskUserListView = defineAsyncComponent(
  () => import('~/features/tasks/components/list/TaskUserListView.vue'),
)
const TaskGroupListView = defineAsyncComponent(
  () => import('~/features/tasks/components/list/TaskGroupListView.vue'),
)
const TaskKanbanView = defineAsyncComponent(
  () => import('~/features/tasks/components/kanban/TaskKanbanView.vue'),
)
const TaskDueKanbanView = defineAsyncComponent(
  () => import('~/features/tasks/components/kanban/TaskDueKanbanView.vue'),
)
const TaskProjectKanbanView = defineAsyncComponent(
  () => import('~/features/tasks/components/kanban/TaskProjectKanbanView.vue'),
)
const TaskUserKanbanView = defineAsyncComponent(
  () => import('~/features/tasks/components/kanban/TaskUserKanbanView.vue'),
)
const TaskGroupKanbanView = defineAsyncComponent(
  () => import('~/features/tasks/components/kanban/TaskGroupKanbanView.vue'),
)
const TaskCalendarView = defineAsyncComponent(
  () => import('~/features/tasks/components/calendar/TaskCalendarView.client.vue'),
)

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()

useSeoMeta({
  title: () => t('toolbar.moduleName'),
})

function onSectionCreate(
  groupBy: TaskGroupBy,
  column: KanbanCreateColumn,
  openNewTask: (defaults?: NewTaskFormDefaults | null) => void,
) {
  openNewTask(buildNewTaskDefaultsFromKanbanColumn(groupBy, column.id, column.title))
}
</script>

<template>
  <TaskWorkspaceShell :title="t('toolbar.moduleName')">
    <template #default="{
      view,
      groupBy,
      filters,
      calendarPhase,
      calendarMonth,
      selectedTaskId,
      openTask,
      openNewTask,
      setCalendarMonth,
    }">
      <TaskListView
        v-if="view === 'list' && groupBy === 'all'"
        :filters="filters"
        :selected-task-id="selectedTaskId"
        @select="openTask"
        @create="onSectionCreate(groupBy, $event, openNewTask)"
      />
      <TaskDueListView
        v-else-if="view === 'list' && groupBy === 'due'"
        :filters="filters"
        :selected-task-id="selectedTaskId"
        @select="openTask"
        @create="onSectionCreate(groupBy, $event, openNewTask)"
      />
      <TaskProjectListView
        v-else-if="view === 'list' && groupBy === 'project'"
        :filters="filters"
        :selected-task-id="selectedTaskId"
        @select="openTask"
        @create="onSectionCreate(groupBy, $event, openNewTask)"
      />
      <TaskUserListView
        v-else-if="view === 'list' && groupBy === 'user'"
        :filters="filters"
        :selected-task-id="selectedTaskId"
        @select="openTask"
        @create="onSectionCreate(groupBy, $event, openNewTask)"
      />
      <TaskGroupListView
        v-else-if="view === 'list' && groupBy === 'group'"
        :filters="filters"
        :selected-task-id="selectedTaskId"
        @select="openTask"
        @create="onSectionCreate(groupBy, $event, openNewTask)"
      />
      <TaskKanbanView
        v-else-if="view === 'kanban' && groupBy === 'all'"
        class="h-full"
        :filters="filters"
        :selected-task-id="selectedTaskId"
        @select="openTask"
        @create="onSectionCreate(groupBy, $event, openNewTask)"
      />
      <TaskDueKanbanView
        v-else-if="view === 'kanban' && groupBy === 'due'"
        class="h-full"
        :filters="filters"
        :selected-task-id="selectedTaskId"
        @select="openTask"
        @create="onSectionCreate(groupBy, $event, openNewTask)"
      />
      <TaskProjectKanbanView
        v-else-if="view === 'kanban' && groupBy === 'project'"
        class="h-full"
        :filters="filters"
        :selected-task-id="selectedTaskId"
        @select="openTask"
        @create="onSectionCreate(groupBy, $event, openNewTask)"
      />
      <TaskUserKanbanView
        v-else-if="view === 'kanban' && groupBy === 'user'"
        class="h-full"
        :filters="filters"
        :selected-task-id="selectedTaskId"
        @select="openTask"
        @create="onSectionCreate(groupBy, $event, openNewTask)"
      />
      <TaskGroupKanbanView
        v-else-if="view === 'kanban' && groupBy === 'group'"
        class="h-full"
        :filters="filters"
        :selected-task-id="selectedTaskId"
        @select="openTask"
        @create="onSectionCreate(groupBy, $event, openNewTask)"
      />
      <TaskCalendarView
        v-else-if="view === 'calendar'"
        :filters="filters"
        :phase="calendarPhase"
        :period="calendarMonth"
        :group-by="groupBy"
        :selected-task-id="selectedTaskId"
        @select="openTask"
        @update:period="setCalendarMonth"
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
