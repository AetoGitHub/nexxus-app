<script setup lang="ts">
import type { KanbanColumn, KanbanCreateColumn } from '~/features/tasks/types/task.types'
import TaskKanbanCard from '~/features/tasks/components/kanban/TaskKanbanCard.vue'
import TaskSectionBadgeFallback from '~/features/tasks/components/shared/TaskSectionBadgeFallback.vue'

const props = withDefaults(
  defineProps<{
    column: KanbanColumn
    selectedTaskId?: number | null
    draggingTaskId?: number | null
    dropTargetId?: string | number | null
    showCreate?: boolean
  }>(),
  {
    selectedTaskId: null,
    draggingTaskId: null,
    dropTargetId: null,
    showCreate: true,
  },
)

// «Crear tarea» de la columna: además del prop, pide permiso `task.can_create`.
const { can } = usePermissions()
const canShowCreate = computed(() => props.showCreate && can('task', 'create'))

const emit = defineEmits<{
  select: [taskId: number]
  create: [column: KanbanCreateColumn]
  dragStart: [payload: { taskId: number, columnId: string | number }]
  dragEnd: []
  dragOverColumn: [columnId: string | number]
  dropTask: [payload: { taskId: number, fromColumnId: string | number, toColumnId: string | number }]
  loadMore: [columnId: string | number]
}>()

const { t } = useI18n()
const columnScroller = useTemplateRef<HTMLElement>('columnScroller')

/** Columnas `collapsible` (ej. Backlog) arrancan colapsadas como pestaña angosta. */
const collapsed = ref(props.column.collapsible === true)
const columnTitle = computed(() => props.column.title ?? (props.column.labelKey ? t(props.column.labelKey) : ''))

function toggleCollapsed() {
  collapsed.value = !collapsed.value
}

useInfiniteScroll(
  columnScroller,
  () => emit('loadMore', props.column.id),
  {
    distance: 80,
    canLoadMore: () =>
      !!props.column.hasNextPage && !props.column.isFetchingNextPage,
  },
)

/** «Creadas por mí» (`delegated`) no recibe tareas: es solo una consulta, no una fase. */
const canDrop = computed(() => !props.column.loading && !props.column.error && !props.column.delegated)
const isDropTarget = computed(() => props.dropTargetId === props.column.id)

function onDragOver(event: DragEvent) {
  if (!canDrop.value) {
    return
  }
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  emit('dragOverColumn', props.column.id)
}

function onDrop(event: DragEvent) {
  if (!canDrop.value) {
    return
  }
  event.preventDefault()

  const taskId = Number(event.dataTransfer?.getData('application/x-nexxus-task'))
  const fromColumnIdRaw = event.dataTransfer?.getData('application/x-nexxus-from-column')
  if (!Number.isFinite(taskId) || fromColumnIdRaw == null || fromColumnIdRaw === '') {
    return
  }

  const fromColumnId = Number.isNaN(Number(fromColumnIdRaw))
    ? fromColumnIdRaw
    : Number(fromColumnIdRaw)

  emit('dropTask', {
    taskId,
    fromColumnId,
    toColumnId: props.column.id,
  })
}
</script>

<template>
  <!-- Colapsada también recibe drops (p. ej. Pendiente → Backlog): no hay que expandirla antes de soltar. -->
  <!-- Colapsada (maqueta UX-04): tira de 48 px con flecha, contador y el nombre en vertical. -->
  <section
    v-if="collapsed"
    class="flex h-full min-h-0 w-12 shrink-0 flex-col items-center rounded-[14px] border border-border bg-card"
    :class="isDropTarget ? 'ring-2 ring-aeto-teal/40' : ''"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <button
      type="button"
      class="flex min-h-0 w-12 flex-1 flex-col items-center gap-2.5 rounded-[14px] py-3 text-muted-foreground transition-colors hover:text-foreground"
      :aria-label="t('tasks.kanban.expandColumn', { title: columnTitle })"
      @click="toggleCollapsed"
    >
      <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0" />
      <span
        v-if="column.count !== undefined"
        class="shrink-0 font-mono text-xs font-medium text-foreground"
      >
        {{ column.count }}
      </span>
      <TaskSectionBadgeFallback v-else />
      <span class="min-h-0 flex-1 truncate text-xs font-semibold uppercase tracking-[0.08em] [writing-mode:vertical-rl]">
        {{ columnTitle }}
      </span>
    </button>
    <!-- Controles que siguen a la mano con la columna colapsada (p. ej. cambiar Backlog ↔ «Creadas por mí»). -->
    <div
      v-if="$slots['collapsed-extra']"
      class="flex shrink-0 flex-col items-center gap-1 pb-3"
    >
      <slot name="collapsed-extra" />
    </div>
  </section>

  <!-- Expandida (maqueta UX-04): panel con borde a todo el alto del tablero (todas al mismo nivel); las tarjetas
       bajan con scroll infinito y sin barra visible. -->
  <section
    v-else
    class="flex h-full min-h-0 w-[min(280px,82vw)] sm:w-[280px] shrink-0 snap-start flex-col rounded-[14px] border border-border bg-kanban-column p-2 transition-colors"
    :class="isDropTarget ? 'ring-2 ring-aeto-teal/40' : ''"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <header class="flex h-8 shrink-0 items-center gap-2 px-1.5">
      <UButton
        v-if="column.collapsible"
        icon="i-lucide-chevron-left"
        variant="ghost"
        color="neutral"
        size="xs"
        square
        class="-ml-1 shrink-0"
        :aria-label="t('tasks.kanban.collapseColumn', { title: columnTitle })"
        @click="toggleCollapsed"
      />
      <span
        class="size-2 shrink-0 rounded-full"
        :style="{ backgroundColor: column.color }"
        aria-hidden="true"
      />
      <h3 class="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
        {{ columnTitle }}
      </h3>
      <slot name="header-extra" />
      <span
        v-if="column.count !== undefined"
        class="shrink-0 font-mono text-[13px] font-medium text-muted-foreground"
      >
        {{ column.count }}
      </span>
      <TaskSectionBadgeFallback v-else />
    </header>

    <div class="mt-2 flex min-h-0 flex-1 flex-col">
      <div
        ref="columnScroller"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none space-y-2"
      >
        <div v-if="column.loading" class="space-y-2">
          <USkeleton v-for="n in 3" :key="n" class="h-20 w-full rounded-lg" />
        </div>

        <p v-else-if="column.error" class="px-2 py-6 text-center text-sm text-error">
          {{ t('tasks.loadError') }}
        </p>

        <div
          v-else-if="column.comingSoon && !column.tasks.length"
          class="px-2 py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground"
        >
          <UIcon name="i-lucide-construction" class="h-6 w-6" />
          <p class="text-sm text-center">{{ t('tasks.comingSoon') }}</p>
          <p class="text-xs text-center">{{ t('tasks.kanban.dropHint') }}</p>
        </div>

        <p
          v-else-if="!column.tasks.length"
          class="px-2 py-6 text-center text-sm text-muted-foreground"
        >
          {{ isDropTarget ? t('tasks.kanban.dropHere') : t(column.emptyKey ?? 'tasks.empty') }}
        </p>

        <TransitionGroup
          v-else
          name="kanban-task"
          tag="div"
          class="space-y-2"
        >
          <TaskKanbanCard
            v-for="task in column.tasks"
            :key="task.id"
            :task="task"
            :column-id="column.id"
            :selected="selectedTaskId === task.id"
            :dragging="draggingTaskId === task.id"
            :draggable="!column.delegated"
            :delegated="column.delegated"
            @select="emit('select', $event)"
            @drag-start="emit('dragStart', $event)"
            @drag-end="emit('dragEnd')"
          />
        </TransitionGroup>

        <div
          v-if="column.hasNextPage || column.isFetchingNextPage"
          class="flex justify-center py-2"
        >
          <UIcon
            v-if="column.isFetchingNextPage"
            name="i-lucide-loader-circle"
            class="h-4 w-4 animate-spin text-muted-foreground"
            :aria-label="t('tasks.loadingMore')"
          />
        </div>
      </div>

      <div
        v-if="canShowCreate && !column.loading && !column.error"
        class="mt-2 shrink-0"
      >
        <UButton
          icon="i-lucide-plus"
          :label="t('tasks.kanban.createTask')"
          color="neutral"
          variant="ghost"
          block
          size="sm"
          class="justify-start text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
          @click="emit('create', { id: column.id, title: column.title })"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.kanban-task-enter-active {
  transition:
    opacity 320ms ease-out,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.kanban-task-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.96);
}

.kanban-task-move {
  transition: transform 200ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .kanban-task-enter-active,
  .kanban-task-move {
    transition: none;
  }
}
</style>
