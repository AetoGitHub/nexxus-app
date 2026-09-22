<script setup lang="ts">
import { parseDate } from '@internationalized/date'
import type { KanbanCompleteDateRange, KanbanCompleteFilterMode } from '~/features/tasks/composables/kanban/useKanbanCompleteDateFilter'

const mode = defineModel<KanbanCompleteFilterMode>('mode', { required: true })
const range = defineModel<KanbanCompleteDateRange | null>('range', { required: true })

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

const rangeTooltip = computed(() => rangeLabel.value ?? t('tasks.kanban.completeFilter.range'))

/** Rango inicial del calendario si el usuario nunca ha elegido uno: hoy (hora local). */
function openRangePicker() {
  if (!range.value) {
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const todayDate = parseDate(iso)
    range.value = { start: todayDate, end: todayDate }
  }
  popoverOpen.value = true
}
</script>

<template>
  <div class="flex items-center gap-1">
    <UTooltip :text="t('tasks.kanban.completeFilter.week')">
      <UButton
        icon="i-lucide-calendar-days"
        size="xs"
        square
        :color="mode === 'week' ? 'primary' : 'neutral'"
        :variant="mode === 'week' ? 'solid' : 'ghost'"
        :aria-label="t('tasks.kanban.completeFilter.week')"
        @click="mode = 'week'"
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

    <UTooltip :text="t('tasks.kanban.completeFilter.all')">
      <UButton
        icon="i-lucide-list-checks"
        size="xs"
        square
        :color="mode === 'all' ? 'primary' : 'neutral'"
        :variant="mode === 'all' ? 'solid' : 'ghost'"
        :aria-label="t('tasks.kanban.completeFilter.all')"
        @click="mode = 'all'"
      />
    </UTooltip>

    <span
      v-if="mode === 'range' && rangeLabel"
      class="truncate text-xs text-muted-foreground"
    >{{ rangeLabel }}</span>
  </div>
</template>
