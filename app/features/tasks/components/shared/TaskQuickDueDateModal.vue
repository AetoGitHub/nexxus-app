<script setup lang="ts">
import TaskDatePicker from '~/features/tasks/components/shared/TaskDatePicker.vue'
import { useUpdateTaskLimitDate } from '~/features/tasks/composables/form/useUpdateTaskLimitDate'
import { dateInputToLimitISO } from '~/features/tasks/utils/form/task-form.util'

/**
 * Atajo desde la tarjeta / fila: cambiar solo la fecha límite sin abrir la tarea. Solo hoy o fechas futuras; guarda con
 * PATCH /api/tasks/:id/update/ ({ limit_date }) y la mutación avisa del resultado (toast) y refresca las listas.
 */
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  taskId: number
  taskName: string
  /** limit_date actual (ISO) o null. */
  currentLimitDate: string | null
}>()

const { t } = useI18n()
const { mutateAsync: updateLimitDate, isPending } = useUpdateTaskLimitDate()

/** YYYY-MM-DD de una fecha en hora local. */
function toDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Fecha actual de la tarea en YYYY-MM-DD (el límite es fin de día UTC: se toma su día en UTC). */
const currentDateInput = computed(() => {
  if (!props.currentLimitDate) {
    return ''
  }
  const date = new Date(props.currentLimitDate)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
})

/** Mínimo: hoy (los días pasados no se pueden elegir). */
const minDate = computed(() => toDateInput(new Date()))
const selectedDate = ref('')

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }
  // Propone su fecha actual si es de hoy en adelante; vencida o sin fecha → hoy.
  selectedDate.value = currentDateInput.value && currentDateInput.value >= minDate.value
    ? currentDateInput.value
    : minDate.value
}, { immediate: true })

const canConfirm = computed(() =>
  !!selectedDate.value
  && selectedDate.value >= minDate.value
  && selectedDate.value !== currentDateInput.value,
)

async function onConfirm() {
  if (!canConfirm.value) {
    return
  }
  try {
    await updateLimitDate({
      taskId: props.taskId,
      payload: { limit_date: dateInputToLimitISO(selectedDate.value) },
    })
    open.value = false
  }
  catch {
    // El toast de error lo muestra la mutación.
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tasks.quickDue.title')"
    :description="taskName"
    :ui="{ content: 'sm:max-w-sm', footer: 'justify-end' }"
  >
    <template #body>
      <UFormField
        :label="t('tasks.quickDue.label')"
        :help="t('tasks.quickDue.help')"
        name="limitDate"
        required
      >
        <TaskDatePicker
          v-model="selectedDate"
          :min="minDate"
          :disabled="isPending"
        />
      </UFormField>
    </template>

    <template #footer="{ close }">
      <UButton
        :label="t('tasks.form.cancel')"
        color="neutral"
        variant="outline"
        :disabled="isPending"
        @click="close()"
      />
      <UButton
        :label="t('tasks.quickDue.save')"
        icon="i-lucide-calendar-check"
        color="primary"
        :loading="isPending"
        :disabled="isPending || !canConfirm"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
