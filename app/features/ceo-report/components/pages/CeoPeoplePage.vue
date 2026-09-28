<script setup lang="ts">
import CeoReportPage from '~/features/ceo-report/components/shared/CeoReportPage.vue'
import type { CeoRating, CeoReport } from '~/features/ceo-report/types/ceo-report.types'
import { initialsOf, RATING_HEX } from '~/features/ceo-report/utils/ceo-report.util'

defineProps<{ report: CeoReport, pageNumber: number }>()

const { t } = useI18n()

const LEGEND: Array<{ rating: CeoRating, range: string }> = [
  { rating: 'excellent', range: '≥85%' },
  { rating: 'good', range: '70-84%' },
  { rating: 'regular', range: '55-69%' },
  { rating: 'critical', range: '<55%' },
]

const CHART_HEIGHT = 60

</script>

<template>
  <CeoReportPage
    :page-number="pageNumber"
    :period-label="report.meta.periodLabel"
  >
    <div class="cr-page__body">
      <div class="cr-eyebrow">
        {{ t('ceoReport.people.eyebrow') }}
      </div>
      <h2 class="cr-title">
        {{ t('ceoReport.people.title') }}
      </h2>
      <div class="cr-title-rule" />
      <hr class="cr-hr">
      <p class="cr-lead">
        {{ report.people.intro }}
      </p>

      <div class="cr-load__head">
        {{ t('ceoReport.people.loadTitle') }}
        <span class="cr-pill-red">{{ t('ceoReport.people.saturated', { n: report.people.saturatedCount }) }}</span>
      </div>
      <div class="cr-load__chart">
        <div
          class="cr-load__goal"
          :style="{ bottom: `${(report.people.loadGoal / 100) * CHART_HEIGHT}px` }"
        >
          {{ t('ceoReport.people.goal', { n: report.people.loadGoal }) }}
        </div>
        <div
          v-for="(bar, index) in report.people.loadBars"
          :key="index"
          class="cr-load__bar"
          :style="{ height: `${(bar.value / 100) * CHART_HEIGHT}px`, background: RATING_HEX[bar.rating] }"
        />
      </div>
      <div class="cr-legend">
        <span
          v-for="item in LEGEND"
          :key="item.rating"
        >
          <i :style="{ background: RATING_HEX[item.rating] }" />{{ t(`ceoReport.rating.${item.rating}`).toUpperCase() }} {{ item.range }}
        </span>
      </div>

      <div class="cr-stats3">
        <div
          v-for="stat in report.people.stats"
          :key="stat.label"
          class="cr-stat3"
          :class="`cr-stat3--${stat.tone}`"
        >
          <b>{{ stat.value }}</b>
          <span>{{ stat.label }}</span>
          <small>{{ stat.names }}</small>
        </div>
      </div>

      <div
        class="cr-people__label"
        style="color: #15803d"
      >
        {{ t('ceoReport.people.top') }}
      </div>
      <div
        v-for="(person, index) in report.people.top"
        :key="person.name"
        class="cr-person cr-person--top"
      >
        <span
          v-if="index < 3"
          class="cr-medal"
          :class="`cr-medal--${index + 1}`"
        >{{ index + 1 }}</span>
        <span
          v-else
          class="cr-person__rank"
        >{{ index + 1 }}°</span>
        <div class="cr-person__who">
          <span
            class="cr-person__avatar"
            :style="{ background: person.avatarColor }"
          >{{ initialsOf(person.name) }}</span>
          <div>
            <div class="cr-person__name">
              {{ person.name }}
            </div>
            <div class="cr-person__team">
              <i :style="{ background: person.teamColor }" />{{ person.team }}
            </div>
          </div>
        </div>
        <div>
          <div class="cr-person__pct cr-c-excellent">
            {{ person.completion }}%
          </div>
          <div class="cr-person__punct">
            {{ t('ceoReport.people.punctuality', { n: person.punctuality }) }}
          </div>
        </div>
        <div>
          <div class="cr-person__tasks">
            {{ t('ceoReport.people.tasks', { n: person.tasks }) }}
          </div>
          <div class="cr-person__over">
            {{ t('ceoReport.people.overdue', { n: person.overdue }) }}
          </div>
        </div>
        <div class="cr-person__note">
          {{ person.note }}
        </div>
      </div>

      <div
        class="cr-people__label"
        style="color: #b91c1c"
      >
        {{ t('ceoReport.people.bottom') }}
      </div>
      <div
        v-for="person in report.people.bottom"
        :key="person.name"
        class="cr-person cr-person--bottom"
      >
        <span class="cr-person__alert">!</span>
        <div class="cr-person__who">
          <span
            class="cr-person__avatar"
            :style="{ background: person.avatarColor }"
          >{{ initialsOf(person.name) }}</span>
          <div>
            <div class="cr-person__name">
              {{ person.name }}
            </div>
            <div class="cr-person__team">
              <i :style="{ background: person.teamColor }" />{{ person.team }}
            </div>
          </div>
        </div>
        <div>
          <div class="cr-person__pct cr-c-critical">
            {{ person.completion }}%
          </div>
          <div class="cr-person__punct">
            {{ t('ceoReport.people.punctuality', { n: person.punctuality }) }}
          </div>
        </div>
        <div>
          <div class="cr-person__tasks">
            {{ t('ceoReport.people.tasks', { n: person.tasks }) }}
          </div>
          <div class="cr-person__over">
            {{ t('ceoReport.people.overdue', { n: person.overdue }) }}
          </div>
        </div>
        <div class="cr-person__note">
          {{ person.note }}
        </div>
        <div class="cr-person__delta">
          {{ person.deltaLabel }}
        </div>
      </div>

      <div class="cr-lock">
        <UIcon
          name="i-lucide-lock"
          class="cr-lock__icon"
        />
        {{ t('ceoReport.people.privacy') }}
      </div>
    </div>
  </CeoReportPage>
</template>
