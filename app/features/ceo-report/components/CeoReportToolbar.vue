<script setup lang="ts">
import type { CeoReportMeta } from '~/features/ceo-report/types/ceo-report.types'

defineProps<{ meta: CeoReportMeta }>()

const emit = defineEmits<{ download: [] }>()

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

    <span class="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-foreground">
      <UIcon
        name="i-lucide-calendar"
        class="h-3.5 w-3.5"
      />
      {{ meta.periodLabel }}
    </span>
    <span class="rounded-full bg-muted px-3 py-1 text-xs text-foreground">
      {{ t('ceoReport.toolbar.compare', { n: 3 }) }}
    </span>
    <span class="rounded-full bg-muted px-3 py-1 text-xs text-foreground">
      {{ t('ceoReport.toolbar.allTeams') }}
    </span>
    <span class="inline-flex items-center gap-1.5 rounded-full bg-[#7c3aed]/10 px-3 py-1 text-xs font-medium text-[#7c3aed]">
      <UIcon
        name="i-lucide-sparkles"
        class="h-3.5 w-3.5"
      />
      {{ t('ceoReport.toolbar.ai') }}
    </span>

    <UButton
      :label="t('ceoReport.toolbar.change')"
      icon="i-lucide-sliders-horizontal"
      color="neutral"
      variant="outline"
      size="xs"
    />

    <UButton
      class="ml-auto"
      :label="t('ceoReport.toolbar.download')"
      icon="i-lucide-download"
      color="primary"
      @click="emit('download')"
    />
  </div>
</template>
