<script setup lang="ts">
import CeoReportPage from '~/features/ceo-report/components/shared/CeoReportPage.vue'
import type { CeoReport } from '~/features/ceo-report/types/ceo-report.types'

defineProps<{ report: CeoReport, pageNumber: number }>()

const { t } = useI18n()
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
        {{ t('ceoReport.insights.title') }}
      </h2>
      <div class="cr-title-rule" />
      <hr class="cr-hr">

      <article
        v-for="item in report.insights.items"
        :key="item.index"
        class="cr-insight"
      >
        <span class="cr-insight__idx">{{ item.index }}</span>
        <div style="flex: 1">
          <div class="cr-insight__tag">
            {{ item.index }} ·
          </div>
          <p class="cr-insight__text">
            {{ item.text }}
          </p>
        </div>

        <div class="cr-insight__visual">
          <template v-if="item.visual.kind === 'bars'">
            <div
              v-for="bar in item.visual.items"
              :key="bar.label"
              class="cr-insight__row"
            >
              <div>
                <span>{{ bar.label }}</span>
                <span :class="bar.tone === 'good' ? 'cr-tone-good' : 'cr-tone-bad'">{{ bar.value }}%</span>
              </div>
              <div class="cr-bar">
                <span
                  :style="{ width: `${bar.value}%`, background: bar.tone === 'good' ? '#28ceab' : '#dc2626' }"
                />
              </div>
            </div>
          </template>

          <template v-else-if="item.visual.kind === 'stat'">
            <div
              class="cr-insight__big"
              :class="item.visual.tone === 'bad' ? 'cr-tone-bad' : 'cr-tone-good'"
            >
              {{ item.visual.value }}
            </div>
            <div class="cr-insight__cap">
              {{ item.visual.caption }}
            </div>
          </template>

          <template v-else>
            <div
              class="cr-insight__big"
              style="color: #28ceab"
            >
              {{ item.visual.left.value }}
            </div>
            <div class="cr-insight__cap">
              {{ item.visual.left.caption }}
            </div>
            <div
              class="cr-insight__big"
              style="color: #f59e0b; margin-top: 10px"
            >
              {{ item.visual.right.value }}
            </div>
            <div class="cr-insight__cap">
              {{ item.visual.right.caption }}
            </div>
          </template>
        </div>
      </article>

      <div class="cr-footnote">
        {{ report.insights.footnote }}
      </div>
    </div>
  </CeoReportPage>
</template>
