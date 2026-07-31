<script setup lang="ts">
import type { Task } from '~/features/tasks/types/task.types'
import TaskItem from '~/features/tasks/components/list/TaskItem.vue'
import TaskSectionBadgeFallback from '~/features/tasks/components/shared/TaskSectionBadgeFallback.vue'

withDefaults(
  defineProps<{
    title: string
    dotColor: string
    tasks: Task[]
    count?: number
    loading?: boolean
    error?: boolean
    selectedTaskId?: number | null
    /** Badge de status en cada fila. */
    showStatus?: boolean
    /** Botón crear tarea al pie de la sección. */
    showCreate?: boolean
  }>(),
  {
    count: undefined,
    loading: false,
    error: false,
    selectedTaskId: null,
    showStatus: false,
    showCreate: false,
  },
)

const emit = defineEmits<{
  select: [taskId: number]
  create: []
}>()

const { t } = useI18n()
</script>

<template>
  <UCollapsible :default-open="true">
    <template #default="{ open }">
      <button
        type="button"
        class="mb-2 w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[#EDEDED] transition-colors dark:hover:bg-muted/50"
      >
        <UIcon
          name="i-lucide-chevron-down"
          class="h-3.5 w-3.5 text-muted-foreground transition-transform"
          :class="{ '-rotate-90': !open }"
        />
        <UBadge
          v-if="count !== undefined"
          :label="count.toString()"
          size="md"
          class="text-white ring-0 shrink-0"
          :style="{ backgroundColor: dotColor }"
        />
        <TaskSectionBadgeFallback v-else />
        <span class="text-xs font-semibold uppercase tracking-wider text-foreground">
          {{ title }}
        </span>
      </button>
    </template>

    <template #content>
      <div v-if="loading" class="space-y-1.5">
        <USkeleton v-for="n in 3" :key="n" class="h-11 w-full rounded-lg" />
      </div>

      <p v-else-if="error" class="rounded-lg border border-border bg-card px-4 py-4 text-sm text-error">
        {{ t('tasks.loadError') }}
      </p>

      <template v-else>
        <p
          v-if="!tasks.length"
          class="rounded-lg border border-border bg-card px-4 py-4 text-sm text-muted-foreground"
        >
          {{ t('tasks.empty') }}
        </p>

        <div v-else class="space-y-1.5">
          <TaskItem
            v-for="task in tasks"
            :key="task.id"
            :task="task"
            :selected="selectedTaskId === task.id"
            :show-status="showStatus"
            @select="emit('select', $event)"
          />
        </div>

        <div
          v-if="showCreate"
          class="mt-1.5 rounded-lg border border-border bg-card"
        >
          <UButton
            icon="i-lucide-plus"
            :label="t('tasks.kanban.createTask')"
            color="neutral"
            variant="ghost"
            block
            size="sm"
            class="justify-start text-muted-foreground hover:bg-muted/50"
            @click="emit('create')"
          />
        </div>
      </template>
    </template>
  </UCollapsible>
</template>
