<script setup lang="ts">
import type { SelectItem } from '@nuxt/ui'
import type { SubTaskDetail } from '~/features/tasks/types/task.types'
import { useCompleteSubtask } from '~/features/tasks/composables/form/useCompleteSubtask'
import { useCreateSubtask } from '~/features/tasks/composables/form/useCreateSubtask'
import { useDeleteSubtask } from '~/features/tasks/composables/form/useDeleteSubtask'
import { useUpdateSubtask } from '~/features/tasks/composables/form/useUpdateSubtask'

/**
 * Checklist de subtareas del detalle de una tarea ya existente: barra de
 * progreso + filas con checkbox. El check de completado se puede marcar
 * siempre (fuera del toggle de edición del resto del slideover); agregar y
 * renombrar subtareas, en cambio, solo aplica en modo edición (`editing`).
 * Todo respeta además `disabled` (tarea archivada/completada).
 */
const props = withDefaults(
  defineProps<{
    taskId: number
    subtasks: SubTaskDetail[]
    /** Tarea archivada/completada: solo lectura (sin toggle, alta ni edición). */
    disabled?: boolean
    /** Modo edición del resto de la tarea: habilita alta y edición de subtareas. */
    editing?: boolean
    userItems?: SelectItem[]
    usersLoading?: boolean
  }>(),
  {
    disabled: false,
    editing: false,
    userItems: () => [],
    usersLoading: false,
  },
)

const { t } = useI18n()
const toast = useToast()

const { mutateAsync: completeSubtask } = useCompleteSubtask()
const { mutateAsync: createSubtask, isPending: isCreating } = useCreateSubtask()
const { mutateAsync: updateSubtask, isPending: isUpdating } = useUpdateSubtask()
const { mutateAsync: deleteSubtask } = useDeleteSubtask()

/** Estado optimista mientras viaja el DELETE y se revalida el detalle. */
const deletingIds = ref<Set<number>>(new Set())

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
/** Alta y edición de filas: solo en modo edición de la tarea. */
const canManage = computed(() => props.editing && !props.disabled)

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

/** Edición inline: renombrar/reasignar una subtarea existente. */
const editingId = ref<number | null>(null)
const editShortDescription = ref('')
const editAssignedTo = ref<number | undefined>(undefined)

function openEditRow(row: SubTaskDetail) {
  editingId.value = row.id
  editShortDescription.value = row.short_description
  editAssignedTo.value = row.assigned_to ?? undefined
}

function cancelEdit() {
  editingId.value = null
  editShortDescription.value = ''
  editAssignedTo.value = undefined
}

async function submitEditSubtask() {
  const subtaskId = editingId.value
  const shortDescription = editShortDescription.value.trim()
  if (subtaskId == null || !shortDescription || isUpdating.value) {
    return
  }
  try {
    await updateSubtask({
      subtaskId,
      taskId: props.taskId,
      payload: {
        task: props.taskId,
        short_description: shortDescription,
        long_description: '',
        comment: '',
        assigned_to: editAssignedTo.value ?? null,
      },
    })
    cancelEdit()
  }
  catch (error) {
    toast.add({
      title: t('tasks.form.subtasks.updateErrorTitle'),
      description: parseFetchError(error),
      color: 'error',
    })
  }
}

async function removeSubtask(subtaskId: number) {
  deletingIds.value = new Set(deletingIds.value).add(subtaskId)
  try {
    await deleteSubtask({ subtaskId, taskId: props.taskId })
    if (editingId.value === subtaskId) {
      cancelEdit()
    }
  }
  catch (error) {
    toast.add({
      title: t('tasks.form.subtasks.deleteErrorTitle'),
      description: parseFetchError(error),
      color: 'error',
    })
  }
  finally {
    const next = new Set(deletingIds.value)
    next.delete(subtaskId)
    deletingIds.value = next
  }
}
</script>

<template>
  <div
    v-if="total || canManage"
    class="space-y-2 rounded-lg border border-border bg-muted/40 p-3"
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
      >
        <div
          v-if="editingId === row.id"
          class="flex flex-col gap-2 rounded-lg border border-border bg-card p-2 sm:flex-row sm:items-center"
        >
          <UInput
            v-model="editShortDescription"
            autofocus
            :placeholder="t('tasks.form.subtasks.namePlaceholder')"
            :disabled="isUpdating"
            class="w-full sm:flex-1"
            @keydown.enter.prevent="submitEditSubtask"
            @keydown.esc="cancelEdit"
          />
          <USelectMenu
            v-model="editAssignedTo"
            value-key="value"
            :items="userItems"
            :placeholder="t('tasks.form.subtasks.assignPlaceholder')"
            :loading="usersLoading"
            :disabled="isUpdating"
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
              :loading="isUpdating"
              :disabled="!editShortDescription.trim()"
              :aria-label="t('tasks.form.subtasks.save')"
              @click="submitEditSubtask"
            />
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              :aria-label="t('tasks.form.subtasks.cancel')"
              @click="cancelEdit"
            />
          </div>
        </div>

        <div
          v-else
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
          <UButton
            v-if="canManage"
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            :aria-label="t('tasks.form.subtasks.edit')"
            @click="openEditRow(row)"
          />
          <UButton
            v-if="canManage"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            square
            :loading="deletingIds.has(row.id)"
            :disabled="deletingIds.has(row.id)"
            :aria-label="t('tasks.form.subtasks.delete')"
            @click="removeSubtask(row.id)"
          />
        </div>
      </li>
    </ul>

    <p
      v-else-if="canManage"
      class="text-xs text-muted-foreground"
    >
      {{ t('tasks.form.subtasks.empty') }}
    </p>

    <template v-if="canManage">
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
        class="flex flex-col gap-2 rounded-lg border border-border bg-card p-2 sm:flex-row sm:items-center"
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
