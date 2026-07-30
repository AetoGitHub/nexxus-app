<script setup lang="ts">
import { parseDate, type CalendarDate } from '@internationalized/date'

const model = defineModel<string>({ default: '' })

const props = defineProps<{
  min?: string
  max?: string
  disabled?: boolean
}>()

const { t, locale } = useI18n()
const popoverOpen = ref(false)

const calendarDate = computed<CalendarDate | undefined>({
  get: () => model.value ? parseDate(model.value) : undefined,
  set: (value) => {
    model.value = value?.toString() ?? ''
    if (value) {
      popoverOpen.value = false
    }
  },
})

const minCalendarDate = computed(() => props.min ? parseDate(props.min) : undefined)
const maxCalendarDate = computed(() => props.max ? parseDate(props.max) : undefined)

const formattedDate = computed(() => {
  if (!model.value) {
    return t('tasks.form.datePlaceholder')
  }

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${model.value}T00:00:00Z`))
})
</script>

<template>
  <UPopover v-model:open="popoverOpen">
    <UButton
      type="button"
      color="neutral"
      variant="subtle"
      icon="i-lucide-calendar"
      :disabled="disabled"
      class="w-full justify-start"
    >
      {{ formattedDate }}
    </UButton>

    <template #content>
      <UCalendar
        v-model="calendarDate"
        :min-value="minCalendarDate"
        :max-value="maxCalendarDate"
        class="p-2"
      />
    </template>
  </UPopover>
</template>
