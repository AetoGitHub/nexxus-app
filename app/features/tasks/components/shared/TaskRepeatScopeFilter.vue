<script setup lang="ts">
import { parseDate } from '@internationalized/date'
import type { RepeatScopeMode, RepeatScopeRange } from '~/features/tasks/composables/shared/useRepeatScopeFilter'

/**
 * Botones rápidos de las repetitivas (como los de la columna Completado): una por serie · todas · esta semana · rango.
 */
const mode = defineModel<RepeatScopeMode>('mode', { required: true })
const range = defineModel<RepeatScopeRange | null>('range', { required: true })

const { t, locale } = useI18n()
const popoverOpen = ref(false)

const calendarValue = computed({
  get: () => range.value ?? undefined,
  set: (value) => {
    if (!value?.start || !value?.end) {
      return
    }
    range.value = { start: value.start, end: value.end }
    mode.value = 'range'
    popoverOpen.value = false
  },
})

const formatter = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', timeZone: 'UTC' }))

const rangeLabel = computed(() => {
  if (!range.value) {
    return null
  }
  const start = formatter.value.format(new Date(`${range.value.start.toString()}T00:00:00Z`))
  const end = formatter.value.format(new Date(`${range.value.end.toString()}T00:00:00Z`))
  return `${start} – ${end}`
})

const rangeTooltip = computed(() => rangeLabel.value ?? t('tasks.repeatScope.range'))

function openRangePicker() {
  if (!range.value) {
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const todayDate = parseDate(iso)
    range.value = { start: todayDate, end: todayDate }
  }
  popoverOpen.value = true
}

const simpleOptions: { value: Exclude<RepeatScopeMode, 'range'>, icon: string, labelKey: string }[] = [
  { value: 'latest', icon: 'i-lucide-repeat-1', labelKey: 'tasks.repeatScope.latest' },
  { value: 'all', icon: 'i-lucide-repeat', labelKey: 'tasks.repeatScope.all' },
  { value: 'week', icon: 'i-lucide-calendar-days', labelKey: 'tasks.repeatScope.week' },
]
</script>

<template>
  <div
    class="flex items-center gap-1 shrink-0"
    role="group"
    :aria-label="t('tasks.repeatScope.label')"
  >
    <UTooltip
      v-for="option in simpleOptions"
      :key="option.value"
      :text="t(option.labelKey)"
    >
      <UButton
        :icon="option.icon"
        size="xs"
        square
        :color="mode === option.value ? 'primary' : 'neutral'"
        :variant="mode === option.value ? 'solid' : 'ghost'"
        :aria-label="t(option.labelKey)"
        :aria-pressed="mode === option.value"
        @click="mode = option.value"
      />
    </UTooltip>

    <UPopover v-model:open="popoverOpen">
      <UTooltip :text="rangeTooltip">
        <UButton
          icon="i-lucide-calendar-range"
          size="xs"
          square
          :color="mode === 'range' ? 'primary' : 'neutral'"
          :variant="mode === 'range' ? 'solid' : 'ghost'"
          :aria-label="rangeTooltip"
          :aria-pressed="mode === 'range'"
          @click="openRangePicker"
        />
      </UTooltip>

      <template #content>
        <UCalendar
          v-model="calendarValue"
          range
          class="p-2"
        />
      </template>
    </UPopover>
  </div>
</template>
