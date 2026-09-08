<script setup lang="ts">
import type { Task } from '~/features/tasks/types/task.types'
import TaskArchivedRow from '~/features/tasks/components/kanban/TaskArchivedRow.vue'
import TaskSectionBadgeFallback from '~/features/tasks/components/shared/TaskSectionBadgeFallback.vue'

const props = withDefaults(
  defineProps<{
    tasks: Task[]
    count?: number
    loading?: boolean
    error?: boolean
    selectedTaskId?: number | null
    hasNextPage?: boolean
    isFetchingNextPage?: boolean
  }>(),
  {
    count: undefined,
    loading: false,
    error: false,
    selectedTaskId: null,
    hasNextPage: false,
    isFetchingNextPage: false,
  },
)

const emit = defineEmits<{
  select: [taskId: number]
  loadMore: []
}>()

const { t } = useI18n()
const loadMoreSentinel = useTemplateRef<HTMLElement>('loadMoreSentinel')

useIntersectionObserver(loadMoreSentinel, ([entry]) => {
  if (entry?.isIntersecting && props.hasNextPage && !props.isFetchingNextPage) {
    emit('loadMore')
  }
})
</script>

<template>
  <UCollapsible :default-open="false">
    <template #default="{ open }">
      <button
        type="button"
        class="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-muted-foreground transition-colors hover:text-foreground"
      >
        <UIcon
          name="i-lucide-chevron-down"
          class="h-3.5 w-3.5 shrink-0 transition-transform"
          :class="{ '-rotate-90': !open }"
        />
        <UBadge
          v-if="count !== undefined"
          :label="count.toString()"
          size="sm"
          class="text-white ring-0 shrink-0"
          style="background-color: #9ca3af"
        />
        <TaskSectionBadgeFallback v-else />
        <span class="text-xs font-semibold tracking-wide">
          {{ t('tasks.kanban.columns.archived') }}
        </span>
      </button>
    </template>

    <template #content>
      <div class="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-card p-2">
        <div v-if="loading" class="space-y-1.5">
          <USkeleton v-for="n in 3" :key="n" class="h-11 w-full rounded-lg" />
        </div>

        <p v-else-if="error" class="px-2 py-4 text-center text-sm text-error">
          {{ t('tasks.loadError') }}
        </p>

        <template v-else>
          <p
            v-if="!tasks.length"
            class="px-2 py-4 text-center text-sm text-muted-foreground"
          >
            {{ t('tasks.empty') }}
          </p>

          <TransitionGroup
            v-else
            name="archived-row"
            tag="div"
            class="space-y-1.5"
          >
            <TaskArchivedRow
              v-for="task in tasks"
              :key="task.id"
              :task="task"
              :selected="selectedTaskId === task.id"
              @select="emit('select', $event)"
            />
          </TransitionGroup>

          <div
            v-if="hasNextPage || isFetchingNextPage"
            ref="loadMoreSentinel"
            class="flex justify-center py-2"
          >
            <UIcon
              v-if="isFetchingNextPage"
              name="i-lucide-loader-circle"
              class="h-4 w-4 animate-spin text-muted-foreground"
              :aria-label="t('tasks.loadingMore')"
            />
          </div>
        </template>
      </div>
    </template>
  </UCollapsible>
</template>

<style scoped>
.archived-row-enter-active {
  transition:
    opacity 320ms ease-out,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.archived-row-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.archived-row-move {
  transition: transform 250ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .archived-row-enter-active,
  .archived-row-move {
    transition: none;
  }
}
</style>
