<script setup lang="ts">
import { createEmptyMoreTaskRow, type MoreTaskFormRow } from '~/features/tasks/utils/form/task-form.util'

/**
 * «Más tareas»: nombres de tareas extra que se crean junto con esta, con el mismo cuerpo
 * (`more_tasks` del backend). Se pueden agregar tantas como se quiera.
 */
withDefaults(
  defineProps<{
    disabled?: boolean
    /** En backlog solo se copia el proyecto: la nota no menciona fechas ni asignados. */
    backlog?: boolean
  }>(),
  {
    disabled: false,
    backlog: false,
  },
)

const rows = defineModel<MoreTaskFormRow[]>('rows', { default: () => [] })

const { t } = useI18n()

function addRow() {
  rows.value = [...rows.value, createEmptyMoreTaskRow()]
}

function removeRow(key: string) {
  rows.value = rows.value.filter(row => row.key !== key)
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-medium text-foreground">
        {{ t('tasks.form.moreTasks.label') }}
        <span class="font-normal text-muted-foreground">({{ t('tasks.form.moreTasks.optional') }})</span>
      </p>
      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="outline"
        size="xs"
        :label="t('tasks.form.moreTasks.add')"
        :disabled="disabled"
        @click="addRow"
      />
    </div>

    <div
      v-if="rows.length"
      class="space-y-2"
    >
      <p class="text-xs text-muted-foreground">
        {{ t(backlog ? 'tasks.form.moreTasks.hintBacklog' : 'tasks.form.moreTasks.hint') }}
      </p>
      <div
        v-for="row in rows"
        :key="row.key"
        class="flex items-start gap-2"
      >
        <UInput
          v-model="row.name"
          :placeholder="t('tasks.form.moreTasks.namePlaceholder')"
          :disabled="disabled"
          autofocus
          class="w-full"
        />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          square
          :disabled="disabled"
          :aria-label="t('tasks.form.moreTasks.remove')"
          @click="removeRow(row.key)"
        />
      </div>
    </div>
  </div>
</template>
