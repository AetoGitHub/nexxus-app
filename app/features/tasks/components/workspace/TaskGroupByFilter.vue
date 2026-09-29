<script setup lang="ts">
import type { TaskGroupBy } from '~/features/tasks/types/task.types'

const groupBy = defineModel<TaskGroupBy>({ required: true })

const props = withDefaults(
  defineProps<{
    /** Oculta el label y chips de «Ver por» (mantiene el contenedor y el slot). */
    hideOptions?: boolean
    /** Versión compacta (un solo select) para la barra mobile. */
    compact?: boolean
    /** Opciones no aplicables a la vista activa. */
    exclude?: TaskGroupBy[]
  }>(),
  {
    hideOptions: false,
    compact: false,
    exclude: () => [],
  },
)

const { t } = useI18n()

const options: { value: TaskGroupBy, icon: string, labelKey: string }[] = [
  { value: 'all', icon: 'i-lucide-layers', labelKey: 'tasks.groupBy.all' },
  { value: 'status', icon: 'i-lucide-flag', labelKey: 'tasks.groupBy.status' },
  { value: 'due', icon: 'i-lucide-calendar-days', labelKey: 'tasks.groupBy.due' },
  { value: 'project', icon: 'i-lucide-folder-kanban', labelKey: 'tasks.groupBy.project' },
  { value: 'group', icon: 'i-lucide-users', labelKey: 'tasks.groupBy.group' },
  { value: 'user', icon: 'i-lucide-user', labelKey: 'tasks.groupBy.user' },
]

const visibleOptions = computed(() =>
  options.filter(option => !props.exclude.includes(option.value)),
)

const selectItems = computed(() =>
  visibleOptions.value.map(option => ({
    label: t(option.labelKey),
    value: option.value,
    icon: option.icon,
  })),
)

const activeOption = computed(() => options.find(option => option.value === groupBy.value))
</script>

<template>
  <USelect
    v-if="compact"
    v-model="groupBy"
    :items="selectItems"
    :icon="activeOption?.icon"
    size="sm"
    class="h-8 min-w-0 flex-1"
    :aria-label="t('tasks.viewBy')"
  >
    <template #default>
      <span class="truncate">
        <span class="text-muted-foreground">{{ t('tasks.viewBy') }}</span>
        {{ activeOption ? t(activeOption.labelKey) : '' }}
      </span>
    </template>
  </USelect>

  <div
    v-else
    class="rounded-lg border border-border bg-card px-3 py-2 flex gap-2 items-center flex-wrap"
  >
    <template v-if="!hideOptions">
      <span class="text-xs text-muted-foreground mr-1">
        {{ t('tasks.viewBy') }}
      </span>
      <div class="contents">
        <UButton
          v-for="option in visibleOptions"
          :key="option.value"
          color="neutral"
          variant="outline"
          size="sm"
          class="text-xs px-3 py-1 h-auto rounded-full border"
          :class="groupBy === option.value
            ? 'border-violet-600 bg-violet-600 text-white font-semibold hover:bg-violet-600'
            : 'border-border bg-transparent text-muted-foreground font-medium'"
          :icon="option.icon"
          :label="t(option.labelKey)"
          @click="() => { groupBy = option.value }"
        />
      </div>
    </template>
    <div class="ml-auto">
      <slot />
    </div>
  </div>
</template>
