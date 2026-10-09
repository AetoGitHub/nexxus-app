<script setup lang="ts">
import CeoReportPage from '~/features/ceo-report/components/shared/CeoReportPage.vue'
import type { CeoDecision, CeoReport } from '~/features/ceo-report/types/ceo-report.types'

defineProps<{
  report: CeoReport
  pageNumber: number
  part: 'summary' | 'decisions'
}>()

const emit = defineEmits<{ createTask: [decision: CeoDecision] }>()

const { t } = useI18n()
</script>

<template>
  <CeoReportPage
    v-if="report.closing"
    :page-number="pageNumber"
    :period-label="report.meta.periodLabel"
  >
    <div class="cr-page__body">
      <template v-if="part === 'summary'">
        <div class="cr-eyebrow">
          {{ t('ceoReport.closing.eyebrow') }}
        </div>
        <h2
          class="cr-title"
          style="font-size: 32px"
        >
          {{ report.closing.title }}
        </h2>
        <div class="cr-title-rule" />

        <blockquote
          v-if="report.closing.quote"
          class="cr-quote"
        >
          {{ report.closing.quote }}
        </blockquote>

        <div class="cr-prose">
          <p
            v-for="paragraph in report.closing.paragraphs"
            :key="paragraph"
          >
            {{ paragraph }}
          </p>
        </div>
      </template>

      <template v-else>
        <div class="cr-eyebrow cr-eyebrow--purple">
          {{ report.closing.decisionsEyebrow }}
        </div>
        <h2 class="cr-title">
          {{ t('ceoReport.closing.decisionsTitle') }}
        </h2>
        <div class="cr-title-rule" />

        <article
          v-for="decision in report.closing.decisions"
          :key="decision.index"
          class="cr-decision"
        >
          <div class="cr-decision__idx">
            {{ decision.index }}
          </div>
          <h3 class="cr-decision__title">
            {{ decision.title }}
            <small
              v-if="decision.needsReview"
              class="cr-no-print"
            >· {{ t('ceoReport.closing.needsReview') }}</small>
          </h3>
          <p class="cr-decision__text">
            {{ decision.description }}
          </p>
          <div class="cr-decision__meta">
            <div>
              <small>{{ t('ceoReport.closing.assignedTo') }}</small>
              <span>{{ decision.assignee }}</span>
            </div>
            <div>
              <small>{{ t('ceoReport.closing.metric') }}</small>
              <span>{{ decision.metric }}</span>
            </div>
            <div>
              <small>{{ t('ceoReport.closing.date') }}</small>
              <span>{{ decision.date }}</span>
            </div>
            <button
              type="button"
              class="cr-decision__btn cr-no-print"
              @click="emit('createTask', decision)"
            >
              {{ t('ceoReport.closing.createTask') }}
            </button>
          </div>
        </article>

        <p class="cr-disclaimer">
          {{ report.closing.disclaimer }}
        </p>
      </template>
    </div>
  </CeoReportPage>
</template>
