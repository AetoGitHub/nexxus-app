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

// Iconos de la maqueta UX-04 (lista con palomitas, capas, calendario).
const allViews: { value: TaskView, icon: string, labelKey: string }[] = [
  { value: 'list', icon: 'i-lucide-list-checks', labelKey: 'tasks.views.list' },
  { value: 'kanban', icon: 'i-lucide-layers', labelKey: 'tasks.views.kanban' },
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
  <!-- Pestañas subrayadas de la maqueta UX-04: la activa en blanco/negro con línea teal abajo. -->
  <nav
    class="flex h-10 items-stretch gap-1"
    :aria-label="t('tasks.views.label')"
  >
    <button
      v-for="viewOption in views"
      :key="viewOption.value"
      type="button"
      class="-mb-px flex items-center gap-1.5 border-b-2 px-3 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset"
      :class="model === viewOption.value
        ? 'border-primary font-semibold text-foreground'
        : 'border-transparent font-medium text-muted-foreground hover:text-foreground'"
      :aria-current="model === viewOption.value ? 'page' : undefined"
      @click="model = viewOption.value"
    >
      <UIcon :name="viewOption.icon" class="size-4 shrink-0" />
      {{ t(viewOption.labelKey) }}
    </button>
  </nav>
</template>
