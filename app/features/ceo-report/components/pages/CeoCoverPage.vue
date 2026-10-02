<script setup lang="ts">
import CeoAiPending from '~/features/ceo-report/components/shared/CeoAiPending.vue'
import CeoReportPage from '~/features/ceo-report/components/shared/CeoReportPage.vue'
import type { CeoReport } from '~/features/ceo-report/types/ceo-report.types'
import { RATING_HEX } from '~/features/ceo-report/utils/ceo-report.util'

const props = defineProps<{ report: CeoReport }>()

const { t } = useI18n()

/** Línea de autoría bajo el veredicto: solo con lo que la IA entregó. */
const verdictMeta = computed(() => {
  const { narrative, meta } = props.report
  return [
    narrative?.generatedAt ? t('ceoReport.cover.generated', { date: narrative.generatedAt }) : '',
    t('ceoReport.cover.period', { period: meta.periodLabel }),
    t('ceoReport.ai.brand'),
    narrative?.model ?? '',
  ].filter(Boolean).join(' · ')
})
</script>

<template>
  <CeoReportPage
    dark
    gradient-bar
    hide-footer
  >
    <div class="cr-page__body">
      <header class="cr-cover__header">
        <img
          src="/logos/Nexxus_Tasks_DarkMode.png"
          alt="Nexxus Tasks"
        >
        <span class="cr-cover__conf">{{ report.meta.confidentialityLabel }}</span>
      </header>

      <div class="cr-cover__hero">
        <div class="cr-cover__kicker">
          {{ t('ceoReport.cover.kicker') }}
        </div>
        <h1 class="cr-cover__h1">
          {{ t('ceoReport.cover.results') }}
          <span class="cr-cover__h1-serif">{{ report.meta.periodLabel }}</span>
        </h1>
        <p class="cr-cover__scope">
          {{ t('ceoReport.cover.scope', {
            scope: t('ceoReport.cover.scopeFull'),
            teams: t('ceoReport.cover.teamsCount', { n: report.meta.teamsCount }, report.meta.teamsCount),
            tasks: t('ceoReport.cover.tasksCount', { n: report.meta.tasksCount }, report.meta.tasksCount),
          }) }}
        </p>
      </div>

      <div class="cr-cover__verdict">
        <div class="cr-eyebrow">
          {{ t('ceoReport.cover.verdict') }}
        </div>
        <template v-if="report.narrative?.verdict">
          <p class="cr-cover__verdict-text">
            {{ report.narrative.verdict }}
          </p>
          <div class="cr-cover__verdict-meta">
            {{ verdictMeta }}
          </div>
        </template>
        <CeoAiPending
          v-else
          class="cr-cover__pending"
        />
      </div>

      <div class="cr-cover__bottom">
        <div class="cr-cover__meta">
          {{ t('ceoReport.cover.generated', { date: report.meta.generatedAt }) }}
          · {{ t('ceoReport.cover.period', { period: report.meta.periodLabel }) }}
          · {{ t('ceoReport.cover.comparison', { value: report.meta.comparisonLabel }) }}
        </div>
        <div
          class="cr-cover__pill"
          :style="{ '--cr-pill': RATING_HEX[report.hero.rating] }"
        >
          <span class="cr-cover__pill-dot" />
          <span class="cr-cover__pill-value">{{ report.hero.value }}%</span>
          <span class="cr-cover__pill-tag">{{ t(`ceoReport.rating.${report.hero.rating}`).toUpperCase() }}</span>
          <span class="cr-cover__pill-text">{{ t('ceoReport.cover.completion') }}</span>
        </div>
      </div>
    </div>
  </CeoReportPage>
</template>
