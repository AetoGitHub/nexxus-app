<script setup lang="ts">
import CeoReportPage from '~/features/ceo-report/components/shared/CeoReportPage.vue'
import CeoSparkline from '~/features/ceo-report/components/shared/CeoSparkline.vue'
import type { CeoKpiRow, CeoReport } from '~/features/ceo-report/types/ceo-report.types'

defineProps<{
  report: CeoReport
  pageNumber: number
  rows: CeoKpiRow[]
  intro: boolean
}>()

const { t } = useI18n()

const TREND_ARROW = { up: '↗', down: '↘', stable: '→' } as const
</script>

<template>
  <CeoReportPage
    :page-number="pageNumber"
    :period-label="report.meta.periodLabel"
  >
    <div class="cr-page__body">
      <div class="cr-eyebrow">
        {{ t('ceoReport.kpis.eyebrow') }}
      </div>
      <h2 class="cr-title">
        {{ intro ? t('ceoReport.kpis.title') : t('ceoReport.kpis.continued') }}
      </h2>
      <div class="cr-title-rule" />
      <hr class="cr-hr">

      <div
        v-if="intro"
        class="cr-hero"
      >
        <div>
          <div class="cr-hero__label">
            {{ t('ceoReport.kpis.mainIndicator') }}
          </div>
          <div class="cr-hero__value">
            {{ report.hero.value }}<small>%</small>
          </div>
          <div class="cr-hero__caption">
            {{ t('ceoReport.kpis.completionRate') }}
          </div>
          <span class="cr-hero__tag">{{ t(`ceoReport.rating.${report.hero.rating}`).toUpperCase() }}</span>
          <div
            v-if="report.hero.deltaLabel"
            class="cr-hero__delta"
          >
            {{ report.hero.deltaLabel }}
          </div>
        </div>
        <div class="cr-hero__side">
          <div
            v-for="item in report.hero.side"
            :key="item.label"
          >
            <div class="cr-hero__side-label">
              {{ item.label }}
            </div>
            <div>
              <span class="cr-hero__side-value">{{ item.value }}</span>
              <span
                v-if="item.deltaLabel"
                class="cr-hero__side-delta"
                :class="`cr-tone-${item.tone}`"
              >{{ item.deltaLabel }}</span>
            </div>
          </div>
        </div>
      </div>

      <p
        v-if="intro && report.hero.summary"
        class="cr-summary"
      >
        {{ report.hero.summary }}
      </p>

      <div class="cr-kpi-list">
        <div
          v-for="kpi in rows"
          :key="kpi.key"
          class="cr-kpi"
        >
          <div>
            <div class="cr-kpi__label">
              {{ kpi.label }}
            </div>
            <div
              class="cr-kpi__value"
              :class="{ 'cr-kpi__value--green': kpi.accent === 'green' }"
            >
              {{ kpi.value }}
            </div>
            <div
              v-if="kpi.goalLabel"
              class="cr-kpi__goal"
            >
              {{ kpi.goalLabel }}
            </div>
            <div
              v-if="kpi.progress != null"
              class="cr-bar cr-kpi__bar"
            >
              <span
                :style="{ width: `${kpi.progress}%`, background: kpi.accent === 'green' ? '#16a34a' : '#28ceab' }"
              />
            </div>
            <span
              v-if="kpi.trend"
              class="cr-trend"
            >{{ TREND_ARROW[kpi.trend] }} {{ kpi.trendLabel }}</span>
            <CeoSparkline
              v-if="kpi.series?.length"
              class="cr-kpi__spark"
              :series="kpi.series"
              :width="120"
              :height="30"
              :color="kpi.accent === 'green' ? '#16a34a' : '#28ceab'"
            />
          </div>
          <div class="cr-kpi__body">
            <template v-if="kpi.whatHappened">
              <div class="cr-kpi__q">
                {{ t('ceoReport.kpis.whatHappened') }}
              </div>
              <p class="cr-kpi__a">
                {{ kpi.whatHappened }}
              </p>
            </template>
            <template v-if="kpi.whatItMeans">
              <div class="cr-kpi__q">
                {{ t('ceoReport.kpis.whatItMeans') }}
              </div>
              <p class="cr-kpi__a">
                {{ kpi.whatItMeans }}
              </p>
            </template>
          </div>
        </div>
      </div>
    </div>
  </CeoReportPage>
</template>
