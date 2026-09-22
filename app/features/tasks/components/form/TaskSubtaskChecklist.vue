<script setup lang="ts">
import type { SelectItem } from '@nuxt/ui'
import type { SubTaskDetail } from '~/features/tasks/types/task.types'
import { useCompleteSubtask } from '~/features/tasks/composables/form/useCompleteSubtask'
import { useCreateSubtask } from '~/features/tasks/composables/form/useCreateSubtask'

/**
 * Checklist de subtareas del detalle de una tarea ya existente: barra de
 * progreso + filas con checkbox, y alta inline. Vive fuera del toggle de
 * edición del resto del slideover (se puede marcar sin entrar a "Editar"),
 * pero respeta los mismos permisos vía `disabled`.
 */
const props = withDefaults(
  defineProps<{
    taskId: number
    subtasks: SubTaskDetail[]
    /** Tarea archivada/completada: solo lectura (sin toggle ni alta). */
    disabled?: boolean
    userItems?: SelectItem[]
    usersLoading?: boolean
  }>(),
  {
    disabled: false,
    userItems: () => [],
    usersLoading: false,
  },
)

const { t } = useI18n()
const toast = useToast()

const { mutateAsync: completeSubtask } = useCompleteSubtask()
const { mutateAsync: createSubtask, isPending: isCreating } = useCreateSubtask()

/** Estado optimista mientras viaja el PATCH y se revalida el detalle. */
const pendingCompleted = ref<Record<number, boolean>>({})

const rows = computed(() =>
  props.subtasks.map(subtask => ({
    ...subtask,
    completed: pendingCompleted.value[subtask.id] ?? subtask.completed,
  })),
)

const total = computed(() => rows.value.length)
const completedCount = computed(() => rows.value.filter(row => row.completed).length)

function clearPending(subtaskId: number) {
  const next = { ...pendingCompleted.value }
  delete next[subtaskId]
  pendingCompleted.value = next
}

async function toggleCompleted(subtaskId: number, value: boolean | 'indeterminate') {
  if (props.disabled) {
    return
  }
  const completed = value === true
  pendingCompleted.value = { ...pendingCompleted.value, [subtaskId]: completed }
  try {
    await completeSubtask({
      subtaskId,
      taskId: props.taskId,
      payload: { completed },
    })
  }
  catch (error) {
    toast.add({
      title: t('tasks.form.subtasks.completeErrorTitle'),
      description: parseFetchError(error),
      color: 'error',
    })
  }
  finally {
    clearPending(subtaskId)
  }
}

const isAdding = ref(false)
const newShortDescription = ref('')
const newAssignedTo = ref<number | undefined>(undefined)

function openAddRow() {
  isAdding.value = true
}

function cancelAdd() {
  isAdding.value = false
  newShortDescription.value = ''
  newAssignedTo.value = undefined
}

async function submitNewSubtask() {
  const shortDescription = newShortDescription.value.trim()
  if (!shortDescription || isCreating.value) {
    return
  }
  try {
    await createSubtask({
      taskId: props.taskId,
      payload: {
        task: props.taskId,
        short_description: shortDescription,
        assigned_to: newAssignedTo.value ?? null,
      },
    })
    // Se deja la fila abierta para encadenar altas, como en el resto del form.
    newShortDescription.value = ''
    newAssignedTo.value = undefined
  }
  catch (error) {
    toast.add({
      title: t('tasks.form.subtasks.createErrorTitle'),
      description: parseFetchError(error),
      color: 'error',
    })
  }
}
</script>

<template>
  <div
    v-if="total || !disabled"
    class="space-y-2"
  >
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-medium text-foreground">
        {{ t('tasks.form.subtasks.label') }}
      </p>
      <span
        v-if="total"
        class="shrink-0 text-xs font-medium tabular-nums text-muted-foreground"
      >{{ completedCount }}/{{ total }}</span>
    </div>

    <UProgress
      v-if="total"
      :model-value="completedCount"
      :max="total"
      color="success"
      size="sm"
    />

    <ul
      v-if="total"
      class="space-y-0.5"
    >
      <li
        v-for="row in rows"
        :key="row.id"
        class="flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/40"
      >
        <UCheckbox
          :model-value="row.completed"
          :disabled="disabled"
          color="success"
          :aria-label="row.short_description"
          @update:model-value="(value) => toggleCompleted(row.id, value)"
        />
        <span
          class="min-w-0 flex-1 truncate text-sm transition-colors"
          :class="row.completed
            ? 'text-muted-foreground line-through'
            : 'text-foreground'"
          :title="row.short_description"
        >{{ row.short_description }}</span>
        <span
          v-if="row.assigned_to_name"
          class="shrink-0 text-xs text-muted-foreground"
        >{{ row.assigned_to_name }}</span>
        <span
          v-else
          class="shrink-0 text-xs italic text-muted-foreground/60"
        >{{ t('tasks.form.subtasks.unassigned') }}</span>
      </li>
    </ul>

    <p
      v-else-if="!disabled"
      class="text-xs text-muted-foreground"
    >
      {{ t('tasks.form.subtasks.empty') }}
    </p>

    <template v-if="!disabled">
      <UButton
        v-if="!isAdding"
        icon="i-lucide-plus"
        color="neutral"
        variant="ghost"
        size="xs"
        :label="t('tasks.form.subtasks.add')"
        @click="openAddRow"
      />
      <div
        v-else
        class="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-2 sm:flex-row sm:items-center"
      >
        <UInput
          v-model="newShortDescription"
          autofocus
          :placeholder="t('tasks.form.subtasks.namePlaceholder')"
          :disabled="isCreating"
          class="w-full sm:flex-1"
          @keydown.enter.prevent="submitNewSubtask"
          @keydown.esc="cancelAdd"
        />
        <USelectMenu
          v-model="newAssignedTo"
          value-key="value"
          :items="userItems"
          :placeholder="t('tasks.form.subtasks.assignPlaceholder')"
          :loading="usersLoading"
          :disabled="isCreating"
          icon="i-lucide-user-search"
          class="w-full sm:w-44"
        />
        <div class="flex shrink-0 items-center gap-1">
          <UButton
            icon="i-lucide-check"
            color="primary"
            variant="solid"
            size="xs"
            square
            :loading="isCreating"
            :disabled="!newShortDescription.trim()"
            :aria-label="t('tasks.form.subtasks.save')"
            @click="submitNewSubtask"
          />
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            :aria-label="t('tasks.form.subtasks.cancel')"
            @click="cancelAdd"
          />
        </div>
      </div>
    </template>
  </div>
</template>
