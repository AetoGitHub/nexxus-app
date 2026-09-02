<script setup lang="ts">
import type { SelectItem } from '@nuxt/ui'
import type {
  RepeatFrequency,
  RepeatMonth,
  RepeatWeekOfMonth,
  RepeatWeekday,
  TaskRepeatConfig,
} from '~/features/tasks/types/task.types'
import { normalizeRepeatConfig } from '~/features/tasks/utils/form/repeat-config.util'

const config = defineModel<TaskRepeatConfig>({ required: true })

withDefaults(
  defineProps<{
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const { t } = useI18n()

const frequencyItems: SelectItem[] = [
  { label: t('tasks.form.repeat.frequency.daily'), value: 'daily' },
  { label: t('tasks.form.repeat.frequency.weekly'), value: 'weekly' },
  { label: t('tasks.form.repeat.frequency.monthly'), value: 'monthly' },
  { label: t('tasks.form.repeat.frequency.yearly'), value: 'yearly' },
]

const weekdayItems: SelectItem[] = [
  { label: t('tasks.form.repeat.weekdays.1'), value: 1 },
  { label: t('tasks.form.repeat.weekdays.2'), value: 2 },
  { label: t('tasks.form.repeat.weekdays.3'), value: 3 },
  { label: t('tasks.form.repeat.weekdays.4'), value: 4 },
  { label: t('tasks.form.repeat.weekdays.5'), value: 5 },
  { label: t('tasks.form.repeat.weekdays.6'), value: 6 },
  { label: t('tasks.form.repeat.weekdays.7'), value: 7 },
]

const weekOfMonthItems: SelectItem[] = [
  { label: t('tasks.form.repeat.weekOfMonth.1'), value: 1 },
  { label: t('tasks.form.repeat.weekOfMonth.2'), value: 2 },
  { label: t('tasks.form.repeat.weekOfMonth.3'), value: 3 },
  { label: t('tasks.form.repeat.weekOfMonth.4'), value: 4 },
  { label: t('tasks.form.repeat.weekOfMonth.last'), value: -1 },
]

const monthItems: SelectItem[] = [
  { label: t('tasks.form.repeat.months.1'), value: 1 },
  { label: t('tasks.form.repeat.months.2'), value: 2 },
  { label: t('tasks.form.repeat.months.3'), value: 3 },
  { label: t('tasks.form.repeat.months.4'), value: 4 },
  { label: t('tasks.form.repeat.months.5'), value: 5 },
  { label: t('tasks.form.repeat.months.6'), value: 6 },
  { label: t('tasks.form.repeat.months.7'), value: 7 },
  { label: t('tasks.form.repeat.months.8'), value: 8 },
  { label: t('tasks.form.repeat.months.9'), value: 9 },
  { label: t('tasks.form.repeat.months.10'), value: 10 },
  { label: t('tasks.form.repeat.months.11'), value: 11 },
  { label: t('tasks.form.repeat.months.12'), value: 12 },
]

const showWeekday = computed(() => config.value.frequency !== 'daily')
const showWeekOfMonth = computed(() =>
  config.value.frequency === 'monthly' || config.value.frequency === 'yearly',
)
const showMonth = computed(() => config.value.frequency === 'yearly')

const frequencyModel = computed({
  get: () => config.value.frequency,
  set: (value: RepeatFrequency) => {
    config.value = normalizeRepeatConfig({ ...config.value, frequency: value })
  },
})

const weekdayModel = computed({
  get: () => config.value.weekday ?? undefined,
  set: (value: RepeatWeekday | undefined) => {
    config.value = normalizeRepeatConfig({ ...config.value, weekday: value ?? null })
  },
})

const weekOfMonthModel = computed({
  get: () => config.value.week_of_month ?? undefined,
  set: (value: RepeatWeekOfMonth | undefined) => {
    config.value = normalizeRepeatConfig({ ...config.value, week_of_month: value ?? null })
  },
})

const monthModel = computed({
  get: () => config.value.on_month ?? undefined,
  set: (value: RepeatMonth | undefined) => {
    config.value = normalizeRepeatConfig({ ...config.value, on_month: value ?? null })
  },
})

const everyModel = computed({
  get: () => config.value.every,
  set: (value: number | undefined) => {
    config.value = normalizeRepeatConfig({ ...config.value, every: value ?? 1 })
  },
})
</script>

<template>
  <div class="rounded-lg border border-aeto-teal/30 bg-aeto-teal-light/30 p-4 space-y-4">
    <div>
      <p class="text-sm font-medium text-foreground">
        {{ t('tasks.form.repeat.title') }}
      </p>
      <p class="text-xs text-muted-foreground mt-1">
        {{ t('tasks.form.repeat.description') }}
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField
        :label="t('tasks.form.repeat.frequencyLabel')"
        name="repeatFrequency"
        :required="!disabled"
      >
        <USelect
          v-model="frequencyModel"
          :items="frequencyItems"
          :disabled="disabled"
          class="w-full"
        />
      </UFormField>

      <UFormField
        :label="t('tasks.form.repeat.everyLabel')"
        name="repeatEvery"
        :required="!disabled"
        :help="t(`tasks.form.repeat.everyHelp.${config.frequency}`)"
      >
        <UInputNumber
          v-model="everyModel"
          :min="1"
          :increment="false"
          :decrement="false"
          :disabled="disabled"
          class="w-full"
        />
      </UFormField>
    </div>

    <div
      v-if="showWeekday || showWeekOfMonth || showMonth"
      class="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      <UFormField
        v-if="showMonth"
        :label="t('tasks.form.repeat.monthLabel')"
        name="repeatMonth"
        :required="!disabled"
      >
        <USelect
          v-model="monthModel"
          :items="monthItems"
          :disabled="disabled"
          class="w-full"
        />
      </UFormField>

      <UFormField
        v-if="showWeekOfMonth"
        :label="t('tasks.form.repeat.weekOfMonthLabel')"
        name="repeatWeekOfMonth"
        :required="!disabled"
      >
        <USelect
          v-model="weekOfMonthModel"
          :items="weekOfMonthItems"
          :disabled="disabled"
          class="w-full"
        />
      </UFormField>

      <UFormField
        v-if="showWeekday"
        :label="t('tasks.form.repeat.weekdayLabel')"
        name="repeatWeekday"
        :required="!disabled"
      >
        <USelect
          v-model="weekdayModel"
          :items="weekdayItems"
          :disabled="disabled"
          class="w-full"
        />
      </UFormField>
    </div>
  </div>
</template>
