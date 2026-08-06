<script setup lang="ts">
import type { TaskView } from '~/features/tasks/types/task.types'

const model = defineModel<TaskView>({ required: true })

const props = withDefaults(
  defineProps<{
    /** Vistas a ocultar (p. ej. calendar en pending-approval). */
    exclude?: TaskView[]
  }>(),
  {
    exclude: () => [],
  },
)

const { t } = useI18n()

const allViews: { value: TaskView, icon: string, labelKey: string }[] = [
  { value: 'list', icon: 'i-lucide-list', labelKey: 'tasks.views.list' },
  { value: 'kanban', icon: 'i-lucide-columns-3', labelKey: 'tasks.views.kanban' },
  { value: 'calendar', icon: 'i-lucide-calendar', labelKey: 'tasks.views.calendar' },
]

const views = computed(() =>
  allViews.filter(view => !props.exclude.includes(view.value)),
)

watch(
  views,
  (available) => {
    if (!available.some(view => view.value === model.value)) {
      model.value = available[0]?.value ?? 'list'
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="inline-flex w-full max-w-full sm:w-auto p-0.5 rounded-md border border-border bg-background">
    <UButton
      v-for="viewOption in views"
      :key="viewOption.value"
      color="neutral"
      variant="ghost"
      size="sm"
      class="flex-1 sm:flex-none px-2.5 py-1 h-auto text-xs rounded justify-center"
      :class="model === viewOption.value
        ? 'bg-aeto-teal-light text-aeto-teal-dark font-semibold hover:bg-aeto-teal-light'
        : 'text-muted-foreground'"
      :icon="viewOption.icon"
      :label="t(viewOption.labelKey)"
      @click="model = viewOption.value"
    />
  </div>
</template>
