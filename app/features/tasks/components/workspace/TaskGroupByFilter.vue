<script setup lang="ts">
import type { TaskGroupBy } from '~/features/tasks/types/task.types'

const groupBy = defineModel<TaskGroupBy>({ required: true })

withDefaults(
  defineProps<{
    /** Oculta el label y chips de «Ver por» (mantiene el contenedor y el slot). */
    hideOptions?: boolean
  }>(),
  {
    hideOptions: false,
  },
)

const { t } = useI18n()

const options: { value: TaskGroupBy, icon: string, labelKey: string }[] = [
  { value: 'all', icon: 'i-lucide-layers', labelKey: 'tasks.groupBy.all' },
  { value: 'due', icon: 'i-lucide-calendar-days', labelKey: 'tasks.groupBy.due' },
  { value: 'project', icon: 'i-lucide-folder-kanban', labelKey: 'tasks.groupBy.project' },
  { value: 'group', icon: 'i-lucide-users', labelKey: 'tasks.groupBy.group' },
  { value: 'user', icon: 'i-lucide-user', labelKey: 'tasks.groupBy.user' },
]
</script>

<template>
  <div class="mb-2 rounded-lg border border-border bg-card px-3 py-2 flex items-center gap-2 flex-wrap">
    <template v-if="!hideOptions">
      <span class="text-xs text-muted-foreground mr-1">{{ t('tasks.viewBy') }}</span>
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="text-xs px-3 py-1 rounded-full border border-[0.5px] inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :class="groupBy === option.value
          ? 'border-violet-600 bg-violet-600 text-white font-semibold'
          : 'border-border bg-transparent text-muted-foreground font-medium hover:text-foreground'"
        @click="groupBy = option.value"
      >
        <UIcon :name="option.icon" class="h-3.5 w-3.5" />
        {{ t(option.labelKey) }}
      </button>
    </template>
    <div class="ml-auto">
      <slot />
    </div>
  </div>
</template>
