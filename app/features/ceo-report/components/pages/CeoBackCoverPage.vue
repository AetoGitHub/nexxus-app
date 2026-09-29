<script setup lang="ts">
import CeoReportPage from '~/features/ceo-report/components/shared/CeoReportPage.vue'
import type { CeoReport } from '~/features/ceo-report/types/ceo-report.types'

defineProps<{ report: CeoReport }>()

const { t } = useI18n()
</script>

<template>
  <CeoReportPage
    dark
    gradient-bar
    hide-footer
  >
    <div class="cr-back">
      <img
        src="/logos/Nexxus_Tasks_DarkMode.png"
        alt="Nexxus Tasks"
      >
      <div class="cr-back__rule" />
      <div class="cr-back__title">
        {{ t('ceoReport.back.title') }}
      </div>
      <div class="cr-back__meta">
        {{ report.meta.periodLabel }} · {{ report.meta.confidentialityLabel }}<br>
        {{ t('ceoReport.cover.generated', { date: report.meta.generatedAt }) }}
        <template v-if="report.meta.aiModel">
          <br>{{ report.meta.aiModel }}
        </template>
      </div>
    </div>
  </CeoReportPage>
</template>
