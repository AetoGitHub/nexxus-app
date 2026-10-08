<script setup lang="ts">
import { parseDate } from '@internationalized/date'
import type { CalendarDate } from '@internationalized/date'
import type { DateRange } from 'reka-ui'

/**
 * Rango de fechas con el `UInputDate` de Nuxt UI en modo `range` (los dos días se escriben en el propio campo) y un
 * popover con el calendario de rango (patrón «date range picker» de la documentación de Nuxt UI). El valor son dos días
 * `YYYY-MM-DD`; vacíos mientras el rango está incompleto. Reemplaza al par de campos «Desde» / «Hasta».
 */
defineOptions({ inheritAttrs: false })

const model = defineModel<{ start: string, end: string }>({ required: true })

const props = withDefaults(
  defineProps<{
    /** Primer y último día elegibles en el calendario (`YYYY-MM-DD`). */
    min?: string
    max?: string
    size?: 'xs' | 'sm' | 'md' | 'lg'
    disabled?: boolean
    /** Primer día de la semana en el calendario (0 = domingo); por omisión el del idioma. */
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  }>(),
  {
    min: undefined,
    max: undefined,
    size: 'md',
    disabled: false,
    weekStartsOn: undefined,
  },
)

const { t, locale } = useI18n()

const inputDate = useTemplateRef<{ inputsRef?: { $el?: HTMLElement }[] }>('inputDate')
const open = ref(false)

// Dos meses lado a lado cuando hay espacio; uno en pantallas angostas (un popover de dos meses no cabe en un celular).
const wide = useMediaQuery('(min-width: 640px)')

function toCalendarDate(value: string): CalendarDate | undefined {
  if (!value) {
    return undefined
  }
  try {
    return parseDate(value)
  }
  catch {
    return undefined
  }
}

/** Mientras escribes, el campo emite el rango a medias (un lado vacío): se guarda así para que la pantalla avise «rango incompleto». */
const range = computed<DateRange>({
  get: () => ({ start: toCalendarDate(model.value.start), end: toCalendarDate(model.value.end) }),
  set: (value) => {
    model.value = { start: value?.start?.toString() ?? '', end: value?.end?.toString() ?? '' }
  },
})

/** Con el calendario, el popover se cierra al completar el rango (el primer clic solo elige el inicio). */
function onCalendarUpdate(value: DateRange | null) {
  range.value = value ?? { start: undefined, end: undefined }
  if (value?.start && value?.end) {
    open.value = false
  }
}

const minDate = computed(() => toCalendarDate(props.min ?? ''))
const maxDate = computed(() => toCalendarDate(props.max ?? ''))
</script>

<template>
  <UInputDate
    ref="inputDate"
    v-model="range"
    v-bind="$attrs"
    range
    :size="size"
    :disabled="disabled"
    :locale="locale"
    :min-value="minDate"
    :max-value="maxDate"
  >
    <template #trailing>
      <UPopover
        v-model:open="open"
        :reference="inputDate?.inputsRef?.[0]?.$el"
      >
        <UButton
          type="button"
          color="neutral"
          variant="link"
          size="sm"
          icon="i-lucide-calendar"
          class="px-0"
          :disabled="disabled"
          :aria-label="t('common.selectDateRange')"
        />

        <template #content>
          <UCalendar
            :model-value="range"
            range
            class="p-2"
            :number-of-months="wide ? 2 : 1"
            :min-value="minDate"
            :max-value="maxDate"
            :locale="locale"
            :week-starts-on="weekStartsOn"
            @update:model-value="onCalendarUpdate"
          />
        </template>
      </UPopover>
    </template>
  </UInputDate>
</template>
