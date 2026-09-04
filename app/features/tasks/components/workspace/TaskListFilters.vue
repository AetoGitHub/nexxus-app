<script setup lang="ts">
import type { TaskListFilters, TaskType } from '~/features/tasks/types/task.types'

const filters = defineModel<TaskListFilters>({ required: true })
const search = defineModel<string>('search', { required: true })

withDefaults(
  defineProps<{
    /** Layout vertical (sheet mobile). */
    stacked?: boolean
    /** Oculta el input de búsqueda (cuando ya está en la barra superior). */
    hideSearch?: boolean
    /** Alinea switches y selector de vista al inicio. */
    alignControlsStart?: boolean
  }>(),
  {
    stacked: false,
    hideSearch: false,
    alignControlsStart: false,
  },
)

const { t } = useI18n()
const { projects, items: projectItems } = useProjectsDropdown()

type VisibleTaskType = Extract<TaskType, 'puesto' | 'manual' | 'repeat' | 'trigger'>

const TYPE_OPTIONS: { value: VisibleTaskType, dotClass: string }[] = [
  { value: 'puesto', dotClass: 'bg-info' },
  { value: 'manual', dotClass: 'bg-success' },
  { value: 'repeat', dotClass: 'bg-secondary' },
  { value: 'trigger', dotClass: 'bg-warning' },
]

const projectSelectItems = computed(() =>
  withEmptySelectItems(projectItems.value, t('common.noData'), {
    pending: projects.isPending.value,
  }),
)

const selectedTypes = computed(() => filters.value.type ?? [])

/** Sin tipos filtrados = "Todos" activo. */
const isAllTypesActive = computed(() => !selectedTypes.value.length)

const selectedProjects = computed({
  get: () => filters.value.project ?? [],
  set: (value: number[]) => {
    filters.value = {
      ...filters.value,
      project: value.length ? value : undefined,
    }
  },
})

function isTypeActive(type: VisibleTaskType) {
  return selectedTypes.value.includes(type)
}

function toggleType(type: VisibleTaskType) {
  const current = selectedTypes.value
  const next = current.includes(type)
    ? current.filter(value => value !== type)
    : [...current, type]

  // Si quedaron todos los tipos → equivalente a "All" (sin param type)
  const allSelected = TYPE_OPTIONS.every(option => next.includes(option.value))

  filters.value = {
    ...filters.value,
    type: !next.length || allSelected ? undefined : next,
  }
}

/** Selecciona "Todos" → limpia tipos (query sin `type`). */
function selectAllTypes() {
  filters.value = {
    ...filters.value,
    type: undefined,
  }
}

type BooleanFilterKey = 'overdue' | 'completed' | 'multiple_close'

const BOOLEAN_FILTERS: { key: BooleanFilterKey, labelKey: string }[] = [
  { key: 'overdue', labelKey: 'tasks.filterOverdue' },
  { key: 'completed', labelKey: 'tasks.filterCompleted' },
  { key: 'multiple_close', labelKey: 'tasks.filterMultipleClose' },
]

function isBooleanFilterActive(key: BooleanFilterKey) {
  return filters.value[key] === true
}

/** Se conserva `false` para que el query lo envíe explícitamente. */
function setBooleanFilter(key: BooleanFilterKey, value: boolean) {
  filters.value = {
    ...filters.value,
    [key]: value,
  }
}
</script>

<template>
  <div
    class="rounded-lg border border-border bg-card box-border"
    :class="stacked
      ? 'flex flex-col gap-4 px-3 py-3'
      : 'mb-2 px-3 py-2 flex items-end gap-3 flex-wrap h-full'"
  >
    <UFormField
      v-if="!hideSearch"
      :label="t('tasks.filterSearch')"
      :class="stacked ? 'w-full' : undefined"
    >
      <UInput
        v-model="search"
        icon="i-lucide-search"
        size="sm"
        :class="stacked ? 'w-full' : 'w-52'"
        :placeholder="t('toolbar.searchPlaceholder')"
      />
    </UFormField>

    <span
      v-if="!stacked && !hideSearch"
      class="hidden sm:block h-8 w-px bg-border self-end"
      aria-hidden="true"
    />

    <UFormField
      :label="t('tasks.filterType')"
      :class="stacked ? 'w-full' : undefined"
    >
      <div
        class="flex items-center gap-2 flex-wrap"
        :class="stacked ? 'min-h-8' : 'h-8'"
      >
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          class="h-8 rounded-full px-3 transition-colors"
          :class="isAllTypesActive
            ? 'bg-muted ring-1 ring-primary'
            : 'bg-card'"
          :aria-pressed="isAllTypesActive"
          @click="selectAllTypes"
        >
          {{ t('tasks.filterAll') }}
        </UButton>

        <UButton
          v-for="option in TYPE_OPTIONS"
          :key="option.value"
          color="neutral"
          variant="outline"
          size="sm"
          class="h-8 rounded-full px-3 transition-colors"
          :class="isTypeActive(option.value)
            ? 'bg-muted ring-1 ring-primary'
            : 'bg-card'"
          :aria-pressed="isTypeActive(option.value)"
          @click="toggleType(option.value)"
        >
          <span
            class="size-1.5 rounded-full"
            :class="option.dotClass"
            aria-hidden="true"
          />
          {{ t(`tasks.types.${option.value}`) }}
        </UButton>
      </div>
    </UFormField>

    <span
      v-if="!stacked"
      class="hidden sm:block h-8 w-px bg-border self-end"
      aria-hidden="true"
    />

    <UFormField
      :label="t('tasks.filterProject')"
      :class="stacked ? 'w-full' : 'min-w-36'"
    >
      <USelect
        v-model="selectedProjects"
        multiple
        :items="projectSelectItems"
        :placeholder="t('tasks.filterProjectPlaceholder')"
        :loading="projects.isPending.value"
        size="sm"
        :class="stacked ? 'w-full' : 'w-48'"
      />
    </UFormField>

    <span
      v-if="!stacked"
      class="hidden sm:block h-8 w-px bg-border self-end"
      aria-hidden="true"
    />

    <div
      class="flex min-w-0"
      :class="stacked
        ? 'w-full flex-col items-stretch gap-3'
        : alignControlsStart
          ? 'shrink-0 items-center gap-4'
          : 'ml-auto shrink-0 items-center gap-4'"
    >
      <div
        class="flex flex-wrap gap-4"
        :class="stacked
          ? 'flex-col items-stretch gap-3'
          : 'h-8 items-center'"
      >
        <USwitch
          v-for="booleanFilter in BOOLEAN_FILTERS"
          :key="booleanFilter.key"
          size="sm"
          :label="t(booleanFilter.labelKey)"
          :model-value="isBooleanFilterActive(booleanFilter.key)"
          :ui="{ label: 'text-xs text-muted-foreground' }"
          @update:model-value="setBooleanFilter(booleanFilter.key, $event === true)"
        />
      </div>

      <div v-if="$slots.default" :class="stacked ? 'w-full pt-1' : 'max-w-full'">
        <slot />
      </div>
    </div>
  </div>
</template>
