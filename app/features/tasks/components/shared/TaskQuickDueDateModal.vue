<script setup lang="ts">
import TaskDatePicker from '~/features/tasks/components/shared/TaskDatePicker.vue'
import { useUpdateTaskLimitDate } from '~/features/tasks/composables/form/useUpdateTaskLimitDate'
import { dateInputToLimitDay } from '~/features/tasks/utils/form/task-form.util'

/**
 * Atajo desde la tarjeta / fila: cambiar solo la fecha límite sin abrir la tarea. Solo hoy o fechas futuras (en CDMX);
 * guarda con PATCH /api/tasks/:id/update/ ({ limit_date: "YYYY-MM-DD" }) y la mutación avisa del resultado y refresca
 * las listas. Si el backend responde 400, el mensaje se queda en el modal y no se cierra.
 */
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  taskId: number
  taskName: string
  /** Día límite actual (YYYY-MM-DD en CDMX, `limit_day`) o null. */
  currentLimitDay: string | null
}>()

const { t } = useI18n()
const { mutateAsync: updateLimitDate, isPending } = useUpdateTaskLimitDate()

/** Mínimo: hoy en CDMX (hoy sí se puede elegir; los días anteriores no). */
const minDate = computed(() => businessToday())
const selectedDate = ref('')
const errorMessage = ref('')

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }
  errorMessage.value = ''
  // Propone su día actual si es de hoy en adelante; vencida o sin fecha → hoy.
  const current = props.currentLimitDay
  selectedDate.value = current && current >= minDate.value ? current : minDate.value
}, { immediate: true })

watch(selectedDate, () => {
  errorMessage.value = ''
})

const canConfirm = computed(() =>
  !!selectedDate.value
  && selectedDate.value >= minDate.value
  && selectedDate.value !== props.currentLimitDay,
)

async function onConfirm() {
  if (!canConfirm.value) {
    return
  }
  errorMessage.value = ''
  try {
    await updateLimitDate({
      taskId: props.taskId,
      payload: { limit_date: dateInputToLimitDay(selectedDate.value) },
    })
    open.value = false
  }
  catch (error) {
    // 400 (fecha pasada, o anterior a la fecha de inicio): el mensaje del backend se queda aquí y el modal sigue abierto.
    errorMessage.value = parseFetchError(error)
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
        :help="errorMessage ? undefined : t('tasks.quickDue.help')"
        :error="errorMessage || undefined"
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
