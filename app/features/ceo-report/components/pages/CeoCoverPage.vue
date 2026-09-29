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
            scope: report.meta.scopeLabel,
            teams: t('ceoReport.cover.teamsCount', { n: report.meta.teamsCount }, report.meta.teamsCount),
            tasks: t('ceoReport.cover.tasksCount', { n: report.meta.tasksCount }, report.meta.tasksCount),
          }) }}
        </p>
      </div>

      <div
        v-if="report.verdict"
        class="cr-cover__verdict"
      >
        <div class="cr-eyebrow">
          {{ t('ceoReport.cover.verdict') }}
        </div>
        <p>{{ report.verdict }}</p>
      </div>

      <div class="cr-cover__bottom">
        <div class="cr-cover__meta">
          {{ t('ceoReport.cover.generated', { date: report.meta.generatedAt }) }}
          · {{ t('ceoReport.cover.period', { period: report.meta.periodLabel }) }}
          · {{ t('ceoReport.cover.comparison', { value: report.meta.comparisonLabel }) }}
          <template v-if="report.meta.aiModel">
            <br>{{ report.meta.aiModel }}
          </template>
        </div>
        <div class="cr-cover__pill">
          <span class="cr-cover__pill-dot" />
          <span class="cr-cover__pill-value">{{ report.hero.value }}%</span>
          <span class="cr-cover__pill-tag">{{ t(`ceoReport.rating.${report.hero.rating}`).toUpperCase() }}</span>
          <span class="cr-cover__pill-text">{{ t('ceoReport.cover.completion') }}</span>
        </div>
      </div>
    </div>
  </CeoReportPage>
</template>
