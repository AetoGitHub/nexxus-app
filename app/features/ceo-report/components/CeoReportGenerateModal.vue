<script setup lang="ts">
import type { GenerateReportPayload, ReportPeriodType } from '~/features/ceo-report/types/ceo-report-api.types'
import { defaultPeriodRange } from '~/features/ceo-report/utils/ceo-report-adapter.util'

defineProps<{ loading?: boolean }>()

const emit = defineEmits<{ submit: [payload: Omit<GenerateReportPayload, 'company'>] }>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()

const PERIOD_TYPES: ReportPeriodType[] = ['monthly', 'weekly', 'daily']

const periodTypeItems = computed(() =>
  PERIOD_TYPES.map(value => ({ value, label: t(`ceoReport.periodTypes.${value}`) })),
)

function initialState() {
  const range = defaultPeriodRange('monthly')
  return {
    period_type: 'monthly' as ReportPeriodType,
    period_start: range.start,
    period_end: range.end,
    force: false,
  }
}

const state = reactive(initialState())

/** Al cambiar el tipo, se propone el último período completo de ese tipo. */
watch(() => state.period_type, (type) => {
  const range = defaultPeriodRange(type)
  state.period_start = range.start
  state.period_end = range.end
})

watch(open, (isOpen) => {
  if (isOpen) {
    Object.assign(state, initialState())
  }
})

/** Los dos días del periodo como un solo rango para el campo. */
const periodRange = computed({
  get: () => ({ start: state.period_start, end: state.period_end }),
  set: (value: { start: string, end: string }) => {
    state.period_start = value.start
    state.period_end = value.end
  },
})

const hasRangeError = computed(() =>
  !!state.period_start && !!state.period_end && state.period_end < state.period_start,
)
const canSubmit = computed(() => !!state.period_start && !!state.period_end && !hasRangeError.value)

function onSubmit() {
  if (!canSubmit.value) {
    return
  }
  emit('submit', {
    period_type: state.period_type,
    period_start: state.period_start,
    period_end: state.period_end,
    force: state.force,
  })
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('ceoReport.generate.title')"
    :description="t('ceoReport.generate.description')"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField :label="t('ceoReport.generate.periodType')">
          <USelect
            v-model="state.period_type"
            :items="periodTypeItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('ceoReport.generate.period')"
          :error="hasRangeError ? t('ceoReport.generate.invalidRange') : undefined"
        >
          <AppDateRangePicker
            v-model="periodRange"
            class="w-full"
          />
        </UFormField>

        <UCheckbox
          v-model="state.force"
          :label="t('ceoReport.generate.force')"
        />

        <div class="flex justify-end gap-2">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            :label="t('ceoReport.generate.cancel')"
            @click="open = false"
          />
          <UButton
            type="submit"
            :label="t('ceoReport.generate.submit')"
            :loading="loading"
            :disabled="!canSubmit"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
