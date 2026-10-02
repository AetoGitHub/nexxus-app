<script setup lang="ts">
import CeoPerformanceDistribution from '~/features/ceo-report/components/shared/CeoPerformanceDistribution.vue'
import CeoReportPage from '~/features/ceo-report/components/shared/CeoReportPage.vue'
import type { CeoReport } from '~/features/ceo-report/types/ceo-report.types'
import { initialsOf, ratingFromScore } from '~/features/ceo-report/utils/ceo-report.util'

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
        {{ t('ceoReport.people.eyebrow') }}
      </div>
      <h2 class="cr-title">
        {{ t('ceoReport.people.title') }}
      </h2>
      <div class="cr-title-rule" />
      <hr class="cr-hr">
      <p
        v-if="report.people.intro"
        class="cr-lead"
      >
        {{ report.people.intro }}
      </p>

      <CeoPerformanceDistribution :distribution="report.people.distribution" />

      <div
        v-if="report.people.stats?.length"
        class="cr-stats3"
      >
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
        :class="{ 'cr-person--compact': !person.note }"
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
            <div
              v-if="person.team"
              class="cr-person__team"
            >
              <i :style="{ background: person.teamColor }" />{{ person.team }}
            </div>
          </div>
        </div>
        <div>
          <div
            class="cr-person__pct"
            :class="`cr-c-${ratingFromScore(person.completion)}`"
          >
            {{ person.completion }}%
          </div>
          <div class="cr-person__punct">
            {{ person.punctuality == null
              ? t('ceoReport.people.punctualityNone')
              : t('ceoReport.people.punctuality', { n: person.punctuality }) }}
          </div>
        </div>
        <div>
          <div class="cr-person__tasks">
            {{ t('ceoReport.people.tasks', { n: person.tasks }, person.tasks) }}
          </div>
          <div
            v-if="person.overdue != null"
            class="cr-person__over"
          >
            {{ t('ceoReport.people.overdue', { n: person.overdue }) }}
          </div>
        </div>
        <div
          v-if="person.note"
          class="cr-person__note"
        >
          {{ person.note }}
        </div>
      </div>

      <div
        v-if="report.people.bottom.length"
        class="cr-people__label"
        style="color: #b91c1c"
      >
        {{ t('ceoReport.people.bottom') }}
      </div>
      <div
        v-for="person in report.people.bottom"
        :key="person.name"
        class="cr-person cr-person--bottom"
        :class="{ 'cr-person--compact': !person.note }"
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
            <div
              v-if="person.team"
              class="cr-person__team"
            >
              <i :style="{ background: person.teamColor }" />{{ person.team }}
            </div>
          </div>
        </div>
        <div>
          <div
            class="cr-person__pct"
            :class="`cr-c-${ratingFromScore(person.completion)}`"
          >
            {{ person.completion }}%
          </div>
          <div class="cr-person__punct">
            {{ person.punctuality == null
              ? t('ceoReport.people.punctualityNone')
              : t('ceoReport.people.punctuality', { n: person.punctuality }) }}
          </div>
        </div>
        <div>
          <div class="cr-person__tasks">
            {{ t('ceoReport.people.tasks', { n: person.tasks }, person.tasks) }}
          </div>
          <div
            v-if="person.overdue != null"
            class="cr-person__over"
          >
            {{ t('ceoReport.people.overdue', { n: person.overdue }) }}
          </div>
        </div>
        <div
          v-if="person.note"
          class="cr-person__note"
        >
          {{ person.note }}
        </div>
        <div
          v-if="person.deltaLabel"
          class="cr-person__delta"
        >
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
