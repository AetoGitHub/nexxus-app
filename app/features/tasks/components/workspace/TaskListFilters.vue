<script setup lang="ts">
import type { TaskListFilters, TaskType } from '~/features/tasks/types/task.types'

const filters = defineModel<TaskListFilters>({ required: true })

const { t } = useI18n()
const { projects, items: projectItems } = useProjectsDropdown()

type VisibleTaskType = Extract<TaskType, 'puesto' | 'manual' | 'repeat' | 'trigger'>

const TYPE_OPTIONS: { value: VisibleTaskType, dotClass: string }[] = [
  { value: 'puesto', dotClass: 'bg-info' },
  { value: 'manual', dotClass: 'bg-success' },
  { value: 'repeat', dotClass: 'bg-secondary' },
  { value: 'trigger', dotClass: 'bg-warning' },
]

const projectSelectItems = computed(() => [
  { label: t('tasks.filterAll'), value: 'all' },
  ...projectItems.value,
])

const selectedProject = computed({
  get: () => filters.value.project ?? 'all',
  set: (value: number | 'all') => {
    filters.value = {
      ...filters.value,
      project: value === 'all' ? undefined : value,
    }
  },
})

function toggleType(type: VisibleTaskType) {
  filters.value = {
    ...filters.value,
    type: filters.value.type === type ? undefined : type,
  }
}

function setBooleanFilter(key: 'overdue' | 'completed' | 'multiple_close', value: boolean) {
  filters.value = {
    ...filters.value,
    [key]: value || undefined,
  }
}
</script>

<template>
  <div class="mb-2 rounded-lg border border-border bg-card px-3 py-2 flex items-start gap-3 flex-wrap h-full box-border">
    <UFormField :label="t('tasks.filterType')">
      <div class="flex h-8 items-center gap-2 flex-wrap">
        <UButton
          v-for="option in TYPE_OPTIONS"
          :key="option.value"
          color="neutral"
          variant="outline"
          size="sm"
          class="h-8 rounded-full px-3 transition-colors"
          :class="filters.type === option.value
            ? 'bg-muted ring-1 ring-primary'
            : 'bg-card'"
          :aria-pressed="filters.type === option.value"
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

    <span class="hidden sm:block h-8 w-px bg-border self-end" aria-hidden="true" />

    <UFormField :label="t('tasks.filterProject')" class="min-w-36">
      <USelect
        v-model="selectedProject"
        :items="projectSelectItems"
        :placeholder="t('tasks.filterProjectPlaceholder')"
        :loading="projects.isPending.value"
        size="sm"
        class="w-48"
      />
    </UFormField>

    <span class="hidden sm:block h-8 w-px bg-border self-end" aria-hidden="true" />

    <div class="flex items-center gap-4 flex-wrap h-8 self-end">
      <label class="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <USwitch
          size="sm"
          :model-value="!!filters.overdue"
          @update:model-value="setBooleanFilter('overdue', $event)"
        />
        {{ t('tasks.filterOverdue') }}
      </label>

      <label class="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <USwitch
          size="sm"
          :model-value="!!filters.completed"
          @update:model-value="setBooleanFilter('completed', $event)"
        />
        {{ t('tasks.filterCompleted') }}
      </label>

      <label class="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <USwitch
          size="sm"
          :model-value="!!filters.multiple_close"
          @update:model-value="setBooleanFilter('multiple_close', $event)"
        />
        {{ t('tasks.filterMultipleClose') }}
      </label>
    </div>
  </div>
</template>
