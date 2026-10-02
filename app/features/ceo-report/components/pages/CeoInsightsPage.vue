<script setup lang="ts">
import CeoAiPending from '~/features/ceo-report/components/shared/CeoAiPending.vue'
import CeoReportPage from '~/features/ceo-report/components/shared/CeoReportPage.vue'
import type { CeoReport } from '~/features/ceo-report/types/ceo-report.types'

const PENDING_CARDS = 3

const props = withDefaults(defineProps<{
  report: CeoReport
  pageNumber: number
  /** Insights redactados por la IA; sin ellos la hoja muestra las tarjetas «en preparación». */
  items?: Array<{ index: string, text: string }>
  intro?: boolean
  /** Última hoja de insights: lleva el pie de autoría. */
  last?: boolean
}>(), {
  items: undefined,
  intro: true,
  last: true,
})

const { t } = useI18n()

const footnote = computed(() => [
  t('ceoReport.insights.footnote'),
  props.report.narrative?.model,
  t('ceoReport.insights.footnoteTasks', { n: props.report.meta.tasksCount }, props.report.meta.tasksCount),
].filter(Boolean).join(' · '))
</script>

<template>
  <CeoReportPage
    dark
    :page-number="pageNumber"
    :period-label="report.meta.periodLabel"
  >
    <div class="cr-page__body">
      <div class="cr-eyebrow">
        {{ t('ceoReport.insights.eyebrow') }}
      </div>
      <h2 class="cr-title">
        {{ intro ? t('ceoReport.insights.title') : t('ceoReport.insights.continued') }}
      </h2>
      <div class="cr-title-rule" />
      <hr class="cr-hr">

      <template v-if="items">
        <article
          v-for="item in items"
          :key="item.index"
          class="cr-insight"
        >
          <span
            class="cr-insight__idx"
            aria-hidden="true"
          >{{ item.index }}</span>
          <div class="cr-insight__main">
            <div class="cr-insight__tag">
              {{ item.index }} ·
            </div>
            <p class="cr-insight__text">
              {{ item.text }}
            </p>
          </div>
        </article>

        <div
          v-if="last"
          class="cr-footnote"
        >
          {{ footnote }}
        </div>
      </template>

      <template v-else>
        <div
          v-for="n in PENDING_CARDS"
          :key="n"
          class="cr-insight cr-insight--pending"
        >
          <span
            class="cr-insight__idx cr-insight__idx--ghost"
            aria-hidden="true"
          >{{ String(n).padStart(2, '0') }}</span>
          <CeoAiPending :lines="3" />
        </div>
      </template>
    </div>
  </CeoReportPage>
</template>
