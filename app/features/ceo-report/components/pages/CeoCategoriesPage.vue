<script setup lang="ts">
import CeoReportPage from '~/features/ceo-report/components/shared/CeoReportPage.vue'
import type { CeoReport } from '~/features/ceo-report/types/ceo-report.types'
import { RATING_HEX } from '~/features/ceo-report/utils/ceo-report.util'

defineProps<{ report: CeoReport, pageNumber: number }>()

const { t } = useI18n()
</script>

<template>
  <CeoReportPage
    :page-number="pageNumber"
    :period-label="report.meta.periodLabel"
  >
    <div class="cr-page__body">
      <div class="cr-eyebrow">
        {{ t('ceoReport.categories.eyebrow') }}
      </div>
      <h2 class="cr-title">
        {{ t('ceoReport.categories.title') }}
      </h2>
      <div class="cr-title-rule" />
      <hr class="cr-hr">
      <p class="cr-lead">
        {{ report.categories.intro }}
      </p>

      <div style="margin-top: 14px">
        <div
          v-for="cat in report.categories.items"
          :key="cat.name"
          class="cr-cat"
        >
          <div>
            <div class="cr-cat__name">
              {{ cat.name }}
            </div>
            <span
              v-for="team in cat.teams"
              :key="team"
              class="cr-chip"
            >{{ team }}</span>
          </div>

          <div>
            <div
              class="cr-cat__pct"
              :class="`cr-c-${cat.rating}`"
            >
              {{ cat.completion }}%
            </div>
            <div class="cr-bar cr-cat__bar">
              <span :style="{ width: `${cat.completion}%`, background: RATING_HEX[cat.rating] }" />
            </div>
          </div>

          <div>
            <div
              class="cr-cat__over"
              :class="`cr-tint--${cat.rating}`"
            >
              <b :class="`cr-c-${cat.rating}`">{{ cat.overdue }}</b>
              <span :class="`cr-c-${cat.rating}`">{{ t('ceoReport.categories.overdue') }}</span>
            </div>
            <div
              class="cr-cat__avg"
              :class="`cr-c-${cat.rating}`"
              style="margin-top: 5px; text-align: center"
            >
              {{ cat.avgResolution }} <small>{{ t('ceoReport.categories.avg') }}</small>
            </div>
          </div>

          <div
            class="cr-tint"
            :class="`cr-tint--${cat.rating}`"
          >
            <div
              class="cr-tint__title"
              :style="{ color: RATING_HEX[cat.rating] }"
            >
              {{ cat.reasonTitle }}
            </div>
            <div class="cr-tint__text">
              {{ cat.reason }}
            </div>
          </div>
        </div>
      </div>

      <div
        v-for="alert in report.categories.alerts"
        :key="alert.text"
        class="cr-alert"
        :class="`cr-alert--${alert.tone}`"
      >
        <UIcon
          :name="alert.tone === 'bad' ? 'i-lucide-triangle-alert' : 'i-lucide-check'"
          class="cr-alert__icon"
        />
        {{ alert.text }}
      </div>
    </div>
  </CeoReportPage>
</template>
