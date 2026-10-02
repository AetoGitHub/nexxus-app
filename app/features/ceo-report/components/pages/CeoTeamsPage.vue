<script setup lang="ts">
import CeoReportPage from '~/features/ceo-report/components/shared/CeoReportPage.vue'
import CeoSparkline from '~/features/ceo-report/components/shared/CeoSparkline.vue'
import type { CeoReport, CeoTeam } from '~/features/ceo-report/types/ceo-report.types'
import { RATING_HEX } from '~/features/ceo-report/utils/ceo-report.util'

defineProps<{
  report: CeoReport
  pageNumber: number
  items: CeoTeam[]
  intro: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <CeoReportPage
    :page-number="pageNumber"
    :period-label="report.meta.periodLabel"
  >
    <div class="cr-page__body">
      <div class="cr-eyebrow">
        {{ t('ceoReport.teams.eyebrow') }}
      </div>
      <h2 class="cr-title">
        {{ intro ? t('ceoReport.teams.title') : t('ceoReport.teams.continued') }}
      </h2>
      <div class="cr-title-rule" />
      <hr class="cr-hr">
      <p
        v-if="intro && report.teams.intro"
        class="cr-lead"
      >
        {{ report.teams.intro }}
      </p>

      <div style="margin-top: 14px">
        <div
          v-for="team in items"
          :key="team.name"
          class="cr-team"
          :class="{ 'cr-team--compact': !team.reason }"
        >
          <div>
            <div class="cr-team__name">
              <span
                class="cr-dot"
                :style="{ background: team.color }"
              />
              {{ team.name }}
            </div>
            <div
              v-if="team.people != null"
              class="cr-team__people"
            >
              {{ t('ceoReport.teams.people', { n: team.people }) }}
            </div>
            <span
              class="cr-badge"
              :class="`cr-badge--${team.rating}`"
              style="margin-left: 19px"
            >{{ t(`ceoReport.rating.${team.rating}`) }}</span>
          </div>

          <div>
            <div
              class="cr-team__pct"
              :class="`cr-c-${team.rating}`"
            >
              {{ team.completion }}%
            </div>
            <div class="cr-bar cr-team__pct-bar">
              <span
                :style="{ width: `${team.completion}%`, background: RATING_HEX[team.rating] }"
              />
            </div>
            <div class="cr-team__punct">
              {{ team.punctuality == null
                ? t('ceoReport.teams.punctualityNone')
                : t('ceoReport.teams.punctuality', { n: team.punctuality }) }}
            </div>
          </div>

          <div v-if="team.series?.length">
            <CeoSparkline
              :series="team.series"
              :width="74"
              :height="26"
              :color="RATING_HEX[team.rating]"
            />
            <div class="cr-team__spark-cap">
              {{ t('ceoReport.teams.months') }}
            </div>
          </div>

          <div class="cr-team__stats">
            <div>{{ t('ceoReport.teams.tasks', { n: team.tasks }, team.tasks) }}</div>
            <div
              v-if="team.overdue != null"
              class="is-bad"
            >
              {{ t('ceoReport.teams.overdue', { n: team.overdue }) }}
            </div>
            <div class="is-muted">
              {{ t('ceoReport.teams.avg', { value: team.avgResolution }) }}
            </div>
          </div>

          <div
            v-if="team.reason"
            class="cr-tint"
            :class="`cr-tint--${team.rating}`"
          >
            <div
              class="cr-tint__title"
              :style="{ color: RATING_HEX[team.rating] }"
            >
              {{ team.reasonTitle }}
            </div>
            <div class="cr-tint__text">
              {{ team.reason }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </CeoReportPage>
</template>
