<script setup lang="ts">
import TaskWeekCalendar from '~/features/tasks/components/shared/TaskWeekCalendar.vue'
import { useUpdateTaskLimitDate } from '~/features/tasks/composables/form/useUpdateTaskLimitDate'
import { dateInputToLimitDay } from '~/features/tasks/utils/form/task-form.util'

/**
 * Atajo de fecha límite desde la tarjeta / fila: un calendario pequeño (`TaskWeekCalendar`, semana en curso pintada)
 * se abre debajo de la fecha con el día actual de la tarea marcado; un clic en otro día lo guarda
 * (PATCH /api/tasks/:id/update/ { limit_date: "YYYY-MM-DD" }) y avisa con un toast que dice a qué día quedó.
 * Solo hoy (en CDMX) o después; una tarea vencida abre en el mes de hoy. Si el backend responde 400, el mensaje queda
 * bajo el calendario y no se cierra. El slot es el botón de la fecha (disparador).
 */
const props = defineProps<{
  taskId: number
  /** Día límite actual (YYYY-MM-DD en CDMX, `limit_day`) o null. */
  currentLimitDay: string | null
}>()

const { t } = useI18n()
const { mutateAsync: updateLimitDate, isPending } = useUpdateTaskLimitDate()

const open = ref(false)
const errorMessage = ref('')
const today = computed(() => businessToday())

watch(open, (isOpen) => {
  if (isOpen) {
    errorMessage.value = ''
  }
})

async function onPick(day: string | null) {
  if (isPending.value) {
    return
  }
  // Volver a tocar el día ya marcado (llega null) o elegir el mismo: no hay cambio, solo se cierra.
  if (!day || day === props.currentLimitDay) {
    open.value = false
    return
  }
  if (day < today.value) {
    return
  }
  errorMessage.value = ''
  try {
    // El toast de "Vencimiento actualizado" (con el día nuevo) lo muestra la mutación.
    await updateLimitDate({ taskId: props.taskId, payload: { limit_date: dateInputToLimitDay(day) } })
    open.value = false
  }
  catch (error) {
    errorMessage.value = parseFetchError(error)
  }
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ side: 'bottom', align: 'end', sideOffset: 4, collisionPadding: 8 }"
  >
    <slot />

    <template #content>
      <!-- Los clics del calendario no deben llegar a la tarjeta (abrirla o arrastrarla). -->
      <div
        class="relative p-2"
        @click.stop
        @mousedown.stop
        @pointerdown.stop
      >
        <TaskWeekCalendar
          :model-value="currentLimitDay"
          :min="today"
          :disabled="isPending"
          @pick="onPick"
        >
          <template #footer>
            <p
              v-if="errorMessage"
              class="max-w-60 px-1 pt-1 text-xs text-error"
            >
              {{ errorMessage }}
            </p>
            <div
              v-else
              class="flex items-center justify-between gap-3 px-1 pt-1 text-[11px] text-muted-foreground"
            >
              <span class="inline-flex items-center gap-1.5">
                <span class="size-2.5 rounded-sm bg-primary/30" />
                {{ t('tasks.quickDue.currentWeek') }}
              </span>
              <span>{{ t('tasks.quickDue.help') }}</span>
            </div>
          </template>
        </TaskWeekCalendar>
        <div
          v-if="isPending"
          class="absolute inset-0 flex items-center justify-center rounded-md bg-background/60"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-5 animate-spin text-muted-foreground"
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>
