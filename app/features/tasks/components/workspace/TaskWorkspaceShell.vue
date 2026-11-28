<script setup lang="ts">
import TaskFilterBar from '~/features/tasks/components/workspace/TaskFilterBar.vue'
import TaskFilterButton from '~/features/tasks/components/workspace/TaskFilterButton.vue'
import TaskNewTaskSlideover from '~/features/tasks/components/form/TaskNewTaskSlideover.vue'
import TaskVoiceQuickButton from '~/features/tasks/components/workspace/TaskVoiceQuickButton.vue'
import TaskViewSwitcher from '~/features/tasks/components/workspace/TaskViewSwitcher.vue'
import { useRefreshTaskWorkspace } from '~/features/tasks/composables/workspace/useRefreshTaskWorkspace'
import { useTaskHeaderCounts } from '~/features/tasks/composables/workspace/useTaskHeaderCounts'
import { useTaskWorkspaceState } from '~/features/tasks/composables/workspace/useTaskWorkspaceState'
import { withoutStatusFilter } from '~/features/tasks/utils/task-filter-params.util'
import type { TaskCalendarPhase, TaskGroupBy, TaskView } from '~/features/tasks/types/task.types'

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
// Botones de crear (header, voz y FAB): solo con permiso `task.can_create`.
const { can } = usePermissions()
const canCreateTask = computed(() => can('task', 'create'))
// Micrófono rápido (crear por voz): además de crear, `task.can_voice`.
const canVoiceTask = computed(() => canCreateTask.value && can('task', 'voice'))

const {
  view,
  search,
  groupBy,
  calendarPhase,
  calendarMonth,
  newTaskOpen,
  selectedTaskId,
  newTaskDefaults,
  newTaskVoiceDraft,
  toUpdateSection,
  promotingBacklogTaskId,
  listFilters,
  setCalendarMonth,
  openNewTask,
  openTask,
  openTaskFromBacklog,
} = useTaskWorkspaceState({
  excludeViews: () => props.excludeViews,
  // Pendientes de aprobación no usa los filtros del backend de las listas de tareas.
  syncFilters: !props.authorizeMode,
})

const { refresh, isRefreshing } = useRefreshTaskWorkspace()

/** Filtros que recibe cada vista: el Kanban no usa «Estado» (cada columna ya es un estado). */
const viewFilters = computed(() =>
  view.value === 'kanban' ? withoutStatusFilter(listFilters.value) : listFilters.value,
)

/** «24 activas · 7 vencidas» del encabezado (no aplica en pendientes de aprobación). */
const headerCounts = useTaskHeaderCounts(viewFilters, { enabled: () => !props.authorizeMode })

const showRefresh = computed(() => view.value === 'list' || view.value === 'kanban')

/** Toggle "vista independiente de archivadas": reemplaza el contenido activo (lista/kanban). */
const showArchivedOnly = ref(false)

function toggleArchivedOnly() {
  showArchivedOnly.value = !showArchivedOnly.value
}

// Fuera de list/kanban el botón no está visible: no dejar el toggle prendido de fondo.
watch(showRefresh, (visible) => {
  if (!visible) {
    showArchivedOnly.value = false
  }
})

/**
 * Misma condición que el CSS del final (ancho Y alto suficientes): ahí «Dictar» y «Crear tarea» van en el encabezado;
 * si no, son botones flotantes. El micrófono se monta solo en uno de los dos para que nunca haya dos grabadoras.
 */
const isDesktopLayout = useMediaQuery('(min-width: 768px) and (min-height: 601px)')

/** El micrófono está grabando o procesando: el botón flotante se ensancha en una tarjeta y se oculta el «+». */
const voiceBusy = ref(false)

// Al cambiar de barra (p. ej. al girar el celular) el micrófono se desmonta y descarta la grabación.
watch(isDesktopLayout, () => {
  voiceBusy.value = false
})

/** Contador de filtros activos (sin búsqueda ni «Agrupar»; van aparte en la barra). */
const activeFilterCount = computed(() => {
  const f = viewFilters.value
  let count = 0
  if (f.type?.length) count += 1
  if (f.status?.length) count += 1
  if (f.project?.length) count += 1
  if (f.users?.length) count += 1
  if (f.overdue === true) count += 1
  if (f.completed === true) count += 1
  if (f.multiple_close === true) count += 1
  if (f.not_started === true) count += 1
  if (f.private !== undefined) count += 1
  if (f.created_by?.length) count += 1
  if (f.start_date_from || f.start_date_to) count += 1
  if (f.wip_date_from || f.wip_date_to) count += 1
  if (f.final_date_from || f.final_date_to) count += 1
  return count
})

/** Estado solo aplica a la vista Lista (Kanban ya lo muestra vía sus columnas). */
const excludeGroupBy = computed<TaskGroupBy[]>(() => {
  if (view.value === 'calendar') {
    return ['due', 'status']
  }
  if (view.value === 'kanban') {
    return ['status']
  }
  return []
})

/** Fase del calendario en el teléfono (en escritorio va dentro de la cabecera del calendario). */
const PHASES: TaskCalendarPhase[] = ['start', 'process', 'close']

/** Atajo mobile: de Kanban directo a la Lista agrupada por Estado. */
function goToStatusList() {
  view.value = 'list'
  groupBy.value = 'status'
}
</script>

<template>
  <!-- Orden de la maqueta UX-04: pestañas de vista · encabezado (título, resumen, Dictar, Crear) · fila de filtros. -->
  <div class="h-full min-h-0 min-w-0 flex flex-col px-3 pb-3 sm:px-5 sm:pb-5">
    <!-- 1. Pestañas Lista / Tablero / Calendario (a lo ancho, con borde abajo) + Archivadas y Refrescar. -->
    <div class="workspace-tabs -mx-3 flex shrink-0 items-center gap-1 border-b border-border px-3 sm:-mx-5 sm:px-5">
      <TaskViewSwitcher
        v-model="view"
        class="min-w-0 overflow-x-auto [scrollbar-width:none]"
        :exclude="excludeViews"
      />
      <span class="flex-1" />
      <!-- Atajo mobile: de Tablero a la Lista agrupada por Estado (misma info, más legible). -->
      <UButton
        v-if="view === 'kanban' && !isDesktopLayout && !hideGroupBy"
        icon="i-lucide-flag"
        color="neutral"
        variant="ghost"
        square
        class="size-9 shrink-0 rounded-[10px] text-muted-foreground"
        :aria-label="t('tasks.groupBy.status')"
        :title="t('tasks.groupBy.status')"
        @click="goToStatusList"
      />
      <template v-if="showRefresh">
        <UButton
          icon="i-lucide-archive"
          :color="showArchivedOnly ? 'primary' : 'neutral'"
          :variant="showArchivedOnly ? 'subtle' : 'ghost'"
          square
          class="size-9 shrink-0 rounded-[10px]"
          :class="showArchivedOnly ? '' : 'text-muted-foreground'"
          :aria-label="showArchivedOnly ? t('tasks.hideArchived') : t('tasks.showArchived')"
          :title="showArchivedOnly ? t('tasks.hideArchived') : t('tasks.showArchived')"
          @click="toggleArchivedOnly"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          square
          class="size-9 shrink-0 rounded-[10px] text-muted-foreground"
          :aria-label="t('tasks.refresh')"
          :title="t('tasks.refresh')"
          :loading="isRefreshing"
          :disabled="isRefreshing"
          @click="refresh"
        />
      </template>
    </div>

    <!-- 2. Encabezado: título y resumen a la izquierda; Dictar y Crear tarea a la derecha (en el teléfono son flotantes). -->
    <div class="workspace-header mt-4 flex shrink-0 flex-wrap items-center gap-3">
      <div class="mr-auto min-w-0">
        <h1 class="truncate text-xl font-semibold leading-[26px] text-foreground">
          {{ title }}
        </h1>
        <p
          v-if="!authorizeMode && headerCounts.active.value !== null"
          class="text-[13px] leading-[18px] text-muted-foreground"
        >
          <span class="font-mono">{{ headerCounts.active.value }}</span>
          {{ t('tasks.header.active') }}
          <template v-if="headerCounts.overdue.value !== null">
            ·
            <span
              class="font-mono"
              :class="headerCounts.overdue.value > 0 ? 'text-danger' : ''"
            >{{ headerCounts.overdue.value }}</span>
            {{ t('tasks.header.overdue') }}
          </template>
        </p>
      </div>

      <template v-if="isDesktopLayout">
        <TaskVoiceQuickButton
          v-if="canVoiceTask"
          toolbar
          @result="task => openNewTask(null, task)"
        />
        <button
          v-if="canCreateTask"
          type="button"
          class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] bg-primary px-3.5 text-[13px] font-semibold text-on-teal shadow-[0_4px_20px_rgba(40,205,168,0.35)] transition-[filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          @click="openNewTask()"
        >
          <UIcon name="i-lucide-plus" class="size-[18px]" />
          {{ t('tasks.createTask') }}
        </button>
      </template>
    </div>

    <!-- 3. Fila de filtros (en el teléfono se desliza de lado). -->
    <TaskFilterBar
      v-model="listFilters"
      v-model:search="search"
      v-model:group-by="groupBy"
      class="workspace-filters mt-3 shrink-0"
      :view="view"
      :authorize-mode="authorizeMode"
      :hide-group-by="hideGroupBy"
      :exclude-group-by="excludeGroupBy"
      :active-filter-count="activeFilterCount"
    >
      <!-- Fase del calendario en el teléfono (en escritorio está dentro de la cabecera del calendario). -->
      <TaskFilterButton
        v-if="view === 'calendar' && !isDesktopLayout"
        :label="t(`tasks.calendarPhases.${calendarPhase}`)"
        :active="calendarPhase !== 'start'"
        icon="i-lucide-calendar-range"
        content-class="w-48"
      >
        <template #default="{ close }">
          <button
            v-for="phase in PHASES"
            :key="phase"
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted"
            :class="calendarPhase === phase ? 'font-semibold text-aeto-teal-dark' : 'text-foreground'"
            @click="calendarPhase = phase; close()"
          >
            <span class="flex-1">{{ t(`tasks.calendarPhases.${phase}`) }}</span>
            <UIcon v-if="calendarPhase === phase" name="i-lucide-check" class="size-4 shrink-0" />
          </button>
        </template>
      </TaskFilterButton>
    </TaskFilterBar>

    <!-- Pestañas, encabezado y filtros quedan fijos arriba; solo esta área baja (scroll infinito, sin barra visible). -->
    <div
      class="mt-3 flex-1 min-h-0 min-w-0"
      :class="view === 'kanban' && !showArchivedOnly ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain scrollbar-none pb-32 md:pb-0'"
    >
      <slot
        :view="view"
        :group-by="groupBy"
        :filters="viewFilters"
        :calendar-phase="calendarPhase"
        :calendar-month="calendarMonth"
        :set-calendar-month="setCalendarMonth"
        :set-calendar-phase="(value: TaskCalendarPhase) => { calendarPhase = value }"
        :selected-task-id="selectedTaskId"
        :open-task="openTask"
        :open-new-task="openNewTask"
        :open-task-from-backlog="openTaskFromBacklog"
        :show-archived-only="showArchivedOnly"
      />
    </div>

    <!-- Micrófono mobile (y celular acostado): botón flotante arriba del «+». Al grabar se ensancha en una tarjeta en el
         lugar del «+» (que se oculta) y, con el slideover abierto, se oculta junto con él. -->
    <div
      v-if="!isDesktopLayout && canVoiceTask"
      v-show="!newTaskOpen"
      data-hide-on-keyboard
      class="fixed z-40"
      :class="voiceBusy
        ? 'inset-x-4 bottom-[calc(60px+env(safe-area-inset-bottom)+1rem)]'
        : 'right-4 bottom-[calc(60px+env(safe-area-inset-bottom)+1rem+3.5rem+0.75rem)]'"
    >
      <TaskVoiceQuickButton
        fab
        fill
        @result="task => openNewTask(null, task)"
        @update:busy="voiceBusy = $event"
      />
    </div>

    <!-- FAB mobile «Crear tarea» (teal con el resplandor de la maqueta): encima del bottom nav; se oculta con el
         slideover abierto o mientras el micrófono graba. -->
    <UButton
      v-if="canCreateTask"
      v-show="!newTaskOpen && !voiceBusy"
      data-hide-on-keyboard
      color="primary"
      size="xl"
      square
      class="workspace-fab fixed z-40 size-14 rounded-full text-on-teal shadow-[0_4px_20px_rgba(40,205,168,0.45)] right-4 bottom-[calc(60px+env(safe-area-inset-bottom)+1rem)] p-0!"
      :ui="{
        base: 'inline-flex items-center justify-center gap-0',
        leadingIcon: 'hidden',
      }"
      :aria-label="t('tasks.createTask')"
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
      :voice-draft="newTaskVoiceDraft"
      :authorize-mode="props.authorizeMode"
      :to-update-section="toUpdateSection"
      :promoting-backlog-task-id="promotingBacklogTaskId"
    />
  </div>
</template>

<style scoped>
.workspace-fab {
  display: inline-flex;
}

/* Escritorio (ancho Y alto suficientes): «Crear tarea» y «Dictar» viven en el encabezado, sin botones flotantes. */
@media (min-width: 768px) and (min-height: 601px) {
  .workspace-fab {
    display: none;
  }
}

/*
 * Alto corto (celular acostado): el encabezado se compacta y la fila de filtros queda en una sola línea deslizable,
 * para no dejar sin alto a la lista/tablero/calendario.
 */
@media (max-height: 600px) {
  .workspace-header {
    margin-top: 0.5rem;
  }

  .workspace-header h1 {
    font-size: 1rem;
    line-height: 1.375rem;
  }

  .workspace-filters {
    flex-wrap: nowrap;
    overflow-x: auto;
    margin-top: 0.5rem;
  }
}
</style>
