<script setup lang="ts">
import TaskCalendarPhaseFilter from '~/features/tasks/components/workspace/TaskCalendarPhaseFilter.vue'
import TaskGroupByFilter from '~/features/tasks/components/workspace/TaskGroupByFilter.vue'
import TaskListFilters from '~/features/tasks/components/workspace/TaskListFilters.vue'
import TaskNewTaskSlideover from '~/features/tasks/components/form/TaskNewTaskSlideover.vue'
import TaskViewSwitcher from '~/features/tasks/components/workspace/TaskViewSwitcher.vue'
import { useRefreshTaskWorkspace } from '~/features/tasks/composables/workspace/useRefreshTaskWorkspace'
import { useTaskWorkspaceState } from '~/features/tasks/composables/workspace/useTaskWorkspaceState'
import type { TaskView } from '~/features/tasks/types/task.types'

const props = withDefaults(
  defineProps<{
    title: string
    excludeViews?: TaskView[]
    /** Slideover en modo autorización (pending-approval). */
    authorizeMode?: boolean
  }>(),
  {
    excludeViews: () => [],
    authorizeMode: false,
  },
)

const {
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
} = useTaskWorkspaceState({
  excludeViews: () => props.excludeViews,
})

const { refresh, isRefreshing } = useRefreshTaskWorkspace()

const showRefresh = computed(() => view.value === 'list' || view.value === 'kanban')

function toggleFilters() {
  filtersOpen.value = !filtersOpen.value
}
</script>

<template>
  <div class="h-full min-h-0 flex flex-col p-6">
    <h1 class="sr-only">
      {{ title }}
    </h1>

    <div class="shrink-0 space-y-2">
      <div
        class="rounded-lg border border-border bg-card px-3 py-1.5 flex items-center justify-between gap-2"
      >
        <UButton
          color="neutral"
          variant="ghost"
          class="flex-1 justify-between px-0 hover:bg-transparent"
          @click="toggleFilters"
        >
          <span class="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground min-w-0">
            <UIcon name="i-lucide-sliders-horizontal" class="h-3.5 w-3.5 shrink-0" />
            <span>{{ $t('tasks.filters') }} ·</span>
            <span class="text-foreground truncate">{{ activeGroupByLabel }}</span>
            <span class="font-normal hidden sm:inline">· {{ $t(`tasks.views.${view}`) }}</span>
          </span>
          <UIcon
            name="i-lucide-chevron-down"
            class="h-4 w-4 text-muted-foreground shrink-0 transition-transform"
            :class="{ 'rotate-180': filtersOpen }"
          />
        </UButton>

        <div class="flex items-center gap-2 shrink-0">
          <UButton
            icon="i-lucide-plus"
            color="primary"
            size="sm"
            class="h-8 font-semibold shrink-0"
            :label="$t('tasks.newTask')"
            @click="openNewTask()"
          />
        </div>
      </div>

      <div v-if="filtersOpen" class="space-y-2">
        <TaskGroupByFilter v-model="groupBy">
          <UButton
            v-if="showRefresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            size="sm"
            class="h-8 shrink-0"
            :label="$t('tasks.refresh')"
            :loading="isRefreshing"
            :disabled="isRefreshing"
            @click="refresh"
          />
        </TaskGroupByFilter>

        <div class="mb-2 flex items-stretch gap-2">
          <div class="min-w-0 flex-1">
            <TaskListFilters
              v-model="listFilters"
              v-model:search="search"
              class="mb-0! h-full"
            >
              <TaskViewSwitcher v-model="view" :exclude="excludeViews" />
            </TaskListFilters>
          </div>
          <Transition name="calendar-phase">
            <div
              v-if="view === 'calendar'"
              class="calendar-phase-panel h-auto self-stretch"
            >
              <TaskCalendarPhaseFilter
                v-model="calendarPhase"
                class="h-full"
              />
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <div
      class="mt-3 flex-1 min-h-0"
      :class="view === 'kanban' ? 'overflow-hidden' : 'overflow-y-auto'"
    >
      <slot
        :view="view"
        :group-by="groupBy"
        :filters="listFilters"
        :calendar-phase="calendarPhase"
        :selected-task-id="selectedTaskId"
        :open-task="openTask"
        :open-new-task="openNewTask"
      />
    </div>

    <TaskNewTaskSlideover
      v-model:open="newTaskOpen"
      v-model:task-id="selectedTaskId"
      :view="view"
      :group-by="groupBy"
      :initial-defaults="newTaskDefaults"
      :authorize-mode="props.authorizeMode"
      :to-update-section="toUpdateSection"
    />
  </div>
</template>

<style scoped>
.calendar-phase-enter-active,
.calendar-phase-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease,
    max-width 0.22s ease;
  overflow: hidden;
  max-width: 18rem;
}

.calendar-phase-enter-from,
.calendar-phase-leave-to {
  opacity: 0;
  transform: translateX(0.75rem);
  max-width: 0;
}

.calendar-phase-panel {
  display: flex;
}
</style>
