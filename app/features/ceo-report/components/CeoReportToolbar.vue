<script setup lang="ts">
import type { CeoReportMeta } from '~/features/ceo-report/types/ceo-report.types'

defineProps<{
  /** Opciones del historial: un reporte por período. */
  periodItems: Array<{ value: number, label: string }>
  /** Datos del reporte abierto; `null` mientras no hay uno. */
  meta: CeoReportMeta | null
  periodsLoading?: boolean
  recalculating?: boolean
}>()

const reportId = defineModel<number | null>('reportId', { default: null })

const emit = defineEmits<{
  download: []
  generate: []
  recalculate: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-3 cr-no-print">
    <span class="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#7c3aed] uppercase">
      <UIcon
        name="i-lucide-sliders-horizontal"
        class="h-3.5 w-3.5"
      />
      {{ t('ceoReport.toolbar.filters') }}
    </span>

    <USelect
      v-model="reportId"
      :items="periodItems"
      value-key="value"
      icon="i-lucide-calendar"
      size="sm"
      :loading="periodsLoading"
      :disabled="!periodItems.length"
      :placeholder="t('ceoReport.toolbar.periodPlaceholder')"
      :aria-label="t('ceoReport.toolbar.period')"
      class="w-full sm:w-72"
    />

    <span
      v-if="meta"
      class="rounded-full bg-muted px-3 py-1 text-xs text-foreground"
    >
      {{ meta.scopeLabel }}
    </span>

    <div class="ml-auto flex flex-wrap items-center gap-2">
      <UButton
        v-if="meta"
        :label="t('ceoReport.toolbar.recalculate')"
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="outline"
        size="sm"
        :loading="recalculating"
        @click="emit('recalculate')"
      />
      <UButton
        :label="t('ceoReport.toolbar.generate')"
        icon="i-lucide-plus"
        color="neutral"
        variant="outline"
        size="sm"
        @click="emit('generate')"
      />
      <UButton
        :label="t('ceoReport.toolbar.download')"
        icon="i-lucide-download"
        color="primary"
        size="sm"
        :disabled="!meta"
        @click="emit('download')"
      />
    </div>
  </div>
</template>
