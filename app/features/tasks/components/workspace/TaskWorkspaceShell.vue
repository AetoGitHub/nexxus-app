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
    /** Oculta chips de «Ver por» y deja el contenedor (p. ej. botón actualizar). */
    hideGroupBy?: boolean
  }>(),
  {
    excludeViews: () => [],
    authorizeMode: false,
    hideGroupBy: false,
  },
)

const { t } = useI18n()

const {
  view,
  search,
  groupBy,
  calendarPhase,
  calendarMonth,
  filtersOpen,
  newTaskOpen,
  selectedTaskId,
  newTaskDefaults,
  toUpdateSection,
  listFilters,
  activeGroupByLabel,
  setCalendarMonth,
  openNewTask,
  openTask,
} = useTaskWorkspaceState({
  excludeViews: () => props.excludeViews,
})

const { refresh, isRefreshing } = useRefreshTaskWorkspace()

const showRefresh = computed(() => view.value === 'list' || view.value === 'kanban')

/** Sheet de filtros solo en mobile (independiente del panel desktop). */
const mobileFiltersOpen = ref(false)

/** Contador de filtros activos (sin búsqueda; va aparte en la barra). */
const activeFilterCount = computed(() => {
  const f = listFilters.value
  let count = 0
  if (groupBy.value !== 'all') count += 1
  if (f.type?.length) count += 1
  if (f.project?.length) count += 1
  if (f.overdue === true) count += 1
  if (f.completed === true) count += 1
  if (f.multiple_close === true) count += 1
  return count
})

const statusSummary = computed(() =>
  t('tasks.statusSummary', {
    groupBy: activeGroupByLabel.value,
    view: t(`tasks.views.${view.value}`),
  }),
)

function toggleFilters() {
  filtersOpen.value = !filtersOpen.value
}

function openMobileFilters() {
  mobileFiltersOpen.value = true
}

function closeMobileFilters() {
  mobileFiltersOpen.value = false
}
</script>

<template>
  <div class="h-full min-h-0 min-w-0 flex flex-col p-3 sm:p-6">
    <h1 class="sr-only">
      {{ title }}
    </h1>

    <!-- Mobile: barra compacta (búsqueda + filtros en sheet + nueva tarea) -->
    <div class="shrink-0 space-y-2 md:hidden">
      <div class="flex items-center gap-2">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          size="sm"
          class="flex-1 min-w-0"
          :placeholder="t('toolbar.searchPlaceholder')"
        />

        <UChip
          :show="activeFilterCount > 0"
          :text="activeFilterCount"
          size="3xl"
          color="primary"
        >
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            class="h-8 shrink-0"
            icon="i-lucide-sliders-horizontal"
            :label="t('tasks.filters')"
            @click="openMobileFilters"
          />
        </UChip>
      </div>

      <div class="flex items-center gap-2">
        <TaskViewSwitcher v-model="view" class="flex-1" :exclude="excludeViews" />
        <UButton
          v-if="showRefresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          size="sm"
          square
          class="h-8 w-8 shrink-0"
          :aria-label="t('tasks.refresh')"
          :loading="isRefreshing"
          :disabled="isRefreshing"
          @click="refresh"
        />
      </div>

      <p class="text-xs text-muted-foreground px-0.5 truncate">
        {{ statusSummary }}
      </p>
    </div>

    <!-- Desktop: barra colapsable existente -->
    <div class="hidden md:block shrink-0 space-y-2">
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
            <span>{{ t('tasks.filters') }} ·</span>
            <span class="text-foreground truncate">{{ activeGroupByLabel }}</span>
            <span class="font-normal hidden sm:inline">· {{ t(`tasks.views.${view}`) }}</span>
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
            :label="t('tasks.newTask')"
            @click="openNewTask()"
          />
        </div>
      </div>

      <div v-if="filtersOpen" class="space-y-2">
        <TaskGroupByFilter
          v-model="groupBy"
          :hide-options="hideGroupBy"
          :exclude="view === 'calendar' ? ['due'] : []"
        >
          <UButton
            v-if="showRefresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            size="sm"
            class="h-8 shrink-0"
            :label="t('tasks.refresh')"
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
              :align-controls-start="view === 'calendar'"
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
      class="mt-3 flex-1 min-h-0 min-w-0"
      :class="view === 'kanban' ? 'overflow-hidden' : 'overflow-y-auto'"
    >
      <slot
        :view="view"
        :group-by="groupBy"
        :filters="listFilters"
        :calendar-phase="calendarPhase"
        :calendar-month="calendarMonth"
        :set-calendar-month="setCalendarMonth"
        :selected-task-id="selectedTaskId"
        :open-task="openTask"
        :open-new-task="openNewTask"
      />
    </div>

    <!-- Sheet de filtros (solo mobile) -->
    <USlideover
      v-model:open="mobileFiltersOpen"
      side="bottom"
      :title="t('tasks.filters')"
      :description="statusSummary"
      :ui="{
        content: 'max-h-[85dvh] rounded-t-xl',
        body: 'space-y-3',
      }"
    >
      <template #body>
        <TaskGroupByFilter
          v-model="groupBy"
          stacked
          :hide-options="hideGroupBy"
          :exclude="view === 'calendar' ? ['due'] : []"
        />

        <TaskListFilters
          v-model="listFilters"
          v-model:search="search"
          stacked
          hide-search
        />

        <TaskCalendarPhaseFilter
          v-if="view === 'calendar'"
          v-model="calendarPhase"
        />
      </template>

      <template #footer>
        <UButton
          color="primary"
          block
          :label="t('tasks.applyFilters')"
          @click="closeMobileFilters"
        />
      </template>
    </USlideover>

    <!-- FAB mobile: encima del bottom nav; se oculta con el slideover abierto. -->
    <UButton
      v-show="!newTaskOpen"
      color="primary"
      size="xl"
      square
      class="md:hidden fixed z-40 size-14 rounded-full shadow-lg right-4 bottom-[calc(60px+env(safe-area-inset-bottom)+1rem)] p-0!"
      :ui="{
        base: 'inline-flex items-center justify-center gap-0',
        leadingIcon: 'hidden',
      }"
      :aria-label="t('tasks.newTask')"
      @click="openNewTask()"
    >
      <UIcon
        name="i-lucide-plus"
        class="size-6"
      />
    </UButton>

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
