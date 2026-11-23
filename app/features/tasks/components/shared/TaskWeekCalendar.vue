<script setup lang="ts">
import { parseDate, startOfWeek, type CalendarDate, type DateValue } from '@internationalized/date'

/**
 * Calendario de fecha límite de tareas (atajo de la tarjeta, formulario y modales de mover vencimiento):
 * - la semana en curso (domingo a sábado, en CDMX, igual que la columna Pendiente) va pintada;
 * - el día elegido conserva el relleno del calendario;
 * - abre en el mes del día elegido, o en el de hoy si ese día ya pasó (una tarea vencida en septiembre no abre en
 *   septiembre, donde no se ve la semana actual).
 * Emite `pick` con el día (YYYY-MM-DD) o `null` si se volvió a tocar el día ya elegido (el calendario lo deselecciona).
 */
const props = withDefaults(
  defineProps<{
    /** Día elegido (YYYY-MM-DD) o vacío. */
    modelValue?: string | null
    min?: string
    max?: string
    disabled?: boolean
  }>(),
  {
    modelValue: null,
    min: undefined,
    max: undefined,
    disabled: false,
  },
)

const emit = defineEmits<{
  pick: [day: string | null]
}>()

const { t } = useI18n()

const today = computed(() => businessToday())

const selected = computed<CalendarDate | undefined>(() =>
  props.modelValue ? parseDate(props.modelValue) : undefined,
)
const minValue = computed(() => (props.min ? parseDate(props.min) : undefined))
const maxValue = computed(() => (props.max ? parseDate(props.max) : undefined))

/** Mes con el que abre: el del día elegido si es de hoy en adelante; si no (vencida o sin fecha), el de hoy (o el mínimo). */
const initialMonth = computed<CalendarDate>(() => {
  if (props.modelValue && props.modelValue >= today.value) {
    return parseDate(props.modelValue)
  }
  const base = props.min && props.min > today.value ? props.min : today.value
  return parseDate(base)
})

const currentWeek = computed(() => {
  const start = startOfWeek(parseDate(today.value), 'en-US')
  return { start, end: start.add({ days: 6 }) }
})

function isInCurrentWeek(day: DateValue): boolean {
  return day.compare(currentWeek.value.start) >= 0 && day.compare(currentWeek.value.end) <= 0
}

function isSelected(day: DateValue): boolean {
  return selected.value != null && day.compare(selected.value) === 0
}

function onUpdate(value: unknown) {
  const day = (value as CalendarDate | undefined)?.toString()
  emit('pick', day ?? null)
}
</script>

<template>
  <div>
    <UCalendar
      :model-value="selected"
      :default-placeholder="initialMonth"
      :min-value="minValue"
      :max-value="maxValue"
      size="sm"
      :disabled="disabled"
      @update:model-value="onUpdate"
    >
      <template #day="{ day }">
        <span
          class="flex size-full items-center justify-center rounded-md"
          :class="isInCurrentWeek(day) && !isSelected(day) ? 'bg-primary/15 font-semibold text-primary' : ''"
        >
          {{ day.day }}
        </span>
      </template>
    </UCalendar>
    <slot name="footer">
      <div class="flex items-center gap-1.5 px-1 pt-1 text-[11px] text-muted-foreground">
        <span class="size-2.5 rounded-sm bg-primary/30" />
        {{ t('tasks.quickDue.currentWeek') }}
      </div>
    </slot>
  </div>
</template>
