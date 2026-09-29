<script setup lang="ts">
import CeoReportPage from '~/features/ceo-report/components/shared/CeoReportPage.vue'
import type { CeoReport } from '~/features/ceo-report/types/ceo-report.types'
import { initialsOf, ratingFromScore, RATING_HEX } from '~/features/ceo-report/utils/ceo-report.util'

defineProps<{ report: CeoReport, pageNumber: number }>()

const { t } = useI18n()
</script>

<template>
  <CeoReportPage
    :page-number="pageNumber"
    :period-label="report.meta.periodLabel"
  >
    <div class="cr-page__hero-dark">
      <div class="cr-eyebrow">
        {{ t('ceoReport.nexxtep.eyebrow') }}
      </div>
      <h2 class="cr-title">
        {{ t('ceoReport.nexxtep.title') }}
      </h2>
      <div class="cr-title-rule" />
      <div class="cr-nx-stats">
        <div
          v-for="stat in report.nexxtep.stats"
          :key="stat.label"
          class="cr-nx-stat"
        >
          <b>{{ stat.value }}</b>
          <span>{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <div class="cr-page__body">
      <div class="cr-eyebrow">
        {{ t('ceoReport.nexxtep.executives') }}
      </div>

      <div
        v-for="exec in report.nexxtep.executives"
        :key="exec.name"
        class="cr-exec"
      >
        <div class="cr-person__who">
          <span
            class="cr-person__avatar"
            :style="{ background: exec.avatarColor }"
          >{{ initialsOf(exec.name) }}</span>
          <div>
            <div class="cr-person__name">
              {{ exec.name }}
            </div>
            <div class="cr-person__team">
              {{ exec.team }}
            </div>
          </div>
        </div>
        <span style="color: #28ceab">→</span>
        <span class="cr-exec__virtual">{{ exec.virtualName }}</span>
        <span class="cr-exec__mono">{{ t('ceoReport.nexxtep.managements', { n: exec.managements }) }}</span>
        <div class="cr-exec__auto">
          <div class="cr-bar">
            <span :style="{ width: `${exec.autonomy}%`, background: RATING_HEX[ratingFromScore(exec.autonomy)] }" />
          </div>
          <span :style="{ color: RATING_HEX[ratingFromScore(exec.autonomy)] }">{{ exec.autonomy }}%</span>
        </div>
        <span
          class="cr-exec__mono"
          style="color: #dc2626"
        >{{ t('ceoReport.nexxtep.escalations', { n: exec.escalations }) }}</span>
        <span
          class="cr-prio"
          :class="`cr-prio--${exec.priority}`"
        >{{ t(`ceoReport.nexxtep.priority.${exec.priority}`).toUpperCase() }}</span>
      </div>

      <div class="cr-note-purple">
        {{ report.nexxtep.note }}
      </div>
    </div>
  </CeoReportPage>
</template>
