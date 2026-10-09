<script setup lang="ts">
import CeoReportDocument from '~/features/ceo-report/components/CeoReportDocument.vue'
import CeoReportGenerateModal from '~/features/ceo-report/components/CeoReportGenerateModal.vue'
import CeoReportToolbar from '~/features/ceo-report/components/CeoReportToolbar.vue'
import { useCeoReportView } from '~/features/ceo-report/composables/useCeoReportView'
import { useGenerateReport } from '~/features/ceo-report/composables/useGenerateReport'
import { useReportDetail } from '~/features/ceo-report/composables/useReportDetail'
import { useReports } from '~/features/ceo-report/composables/useReports'
import type { GenerateReportPayload } from '~/features/ceo-report/types/ceo-report-api.types'
import type { CeoDecision } from '~/features/ceo-report/types/ceo-report.types'
import TaskNewTaskSlideover from '~/features/tasks/components/form/TaskNewTaskSlideover.vue'
import type { VoiceTaskResponse } from '~/features/tasks/types/voice-task.types'
import { formatReportOption } from '~/features/ceo-report/utils/ceo-report-adapter.util'

// Protected route: redirects to /login when not authenticated.
definePageMeta({ middleware: 'auth' })

const { t, locale } = useI18n()
const toast = useToast()
const { selectedCompanyId } = useAuth()

useSeoMeta({
  title: () => t('ceoReport.title'),
})

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@700&display=swap',
    },
  ],
})

const reportsQuery = useReports({ company: selectedCompanyId })
const { reports } = reportsQuery

/** Reporte abierto: por defecto el más reciente del historial. */
const selectedId = ref<number | null>(null)

watch([reports, selectedCompanyId], () => {
  const stillListed = reports.value.some(item => item.id === selectedId.value)
  if (!stillListed) {
    selectedId.value = reports.value[0]?.id ?? null
  }
}, { immediate: true })

watch(selectedCompanyId, () => {
  selectedId.value = null
})

const detailQuery = useReportDetail(selectedId)
// Texto de IA marcado «por revisar»: no se dibuja hasta que quien lo revisó decide mostrarlo.
const showUnreviewed = ref(false)
watch(selectedId, () => {
  showUnreviewed.value = false
})
const { view } = useCeoReportView(() => detailQuery.data.value, showUnreviewed)

const periodItems = computed(() =>
  reports.value.map(item => ({
    value: item.id,
    label: formatReportOption(item, locale.value, type => t(`ceoReport.periodTypes.${type}`)),
  })),
)

const generate = useGenerateReport()
const isGenerateOpen = ref(false)

async function onGenerate(payload: Omit<GenerateReportPayload, 'company'>) {
  if (selectedCompanyId.value == null) {
    return
  }
  try {
    const report = await generate.mutateAsync({ company: selectedCompanyId.value, ...payload })
    selectedId.value = report.id
    isGenerateOpen.value = false
  }
  catch {
    // El composable presenta el error ya interpretado.
  }
}

function onRecalculate() {
  const report = detailQuery.data.value
  if (!report) {
    return
  }
  generate.mutate({
    company: report.company,
    period_type: report.period_type,
    period_start: report.period_start,
    period_end: report.period_end,
    force: true,
  })
}

const hasTasks = computed(() => (detailQuery.data.value?.metrics.total_tasks ?? 0) > 0)

const viewport = useTemplateRef<HTMLElement>('viewport')
const { width } = useElementSize(viewport)

// Las páginas miden 794px (A4); se escalan para caber en el ancho disponible.
const zoom = computed(() => (width.value ? Math.min(1, (width.value - 32) / 794) : 1))

function notifyPending() {
  toast.add({
    title: t('ceoReport.toast.pendingTitle'),
    description: t('ceoReport.toast.pendingDescription'),
    color: 'info',
  })
}

// «Crear como tarea»: abre el formulario de nueva tarea ya rellenado con la decisión (el mismo que el dictado por voz).
const newTaskOpen = ref(false)
const newTaskId = ref<number | null>(null)
const decisionDraft = ref<VoiceTaskResponse | null>(null)

function onCreateTask(decision: CeoDecision) {
  decisionDraft.value = {
    name: decision.title,
    description: [decision.description, decision.metric !== '—' ? `${t('ceoReport.closing.metric')}: ${decision.metric}` : '']
      .filter(Boolean)
      .join('\n\n'),
    task_type: 'manual',
    project_id: null,
    due_date: decision.dueDate,
    assignee_ids: decision.assigneeId != null ? [decision.assigneeId] : [],
    urgent: false,
    effort: 'normal',
    subtasks: [],
    in_backlog: false,
    transcript: '',
    needs_review: decision.needsReview,
    ambiguities: decision.needsReview ? [t('ceoReport.closing.reviewDecision')] : [],
  }
  newTaskOpen.value = true
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <CeoReportToolbar
      v-model:report-id="selectedId"
      :period-items="periodItems"
      :meta="view?.meta ?? null"
      :periods-loading="reportsQuery.isPending.value && selectedCompanyId != null"
      :recalculating="generate.isPending.value"
      @download="notifyPending"
      @generate="isGenerateOpen = true"
      @recalculate="onRecalculate"
    />

    <div
      ref="viewport"
      class="min-h-0 flex-1 overflow-y-auto"
    >
      <div
        v-if="selectedCompanyId == null"
        class="flex h-full flex-col items-center justify-center gap-2 px-4 py-12 text-center"
      >
        <UIcon
          name="i-lucide-building-2"
          class="text-4xl text-dimmed"
        />
        <h3 class="text-lg font-semibold text-highlighted">
          {{ t('ceoReport.states.noCompany') }}
        </h3>
      </div>

      <div
        v-else-if="reportsQuery.isPending.value || (selectedId != null && detailQuery.isPending.value)"
        class="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8"
      >
        <USkeleton class="h-10 w-full" />
        <USkeleton class="h-64 w-full" />
        <USkeleton class="h-40 w-full" />
      </div>

      <div
        v-else-if="reportsQuery.isError.value || detailQuery.isError.value"
        class="mx-auto max-w-xl px-4 py-8"
      >
        <UAlert
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="t('ceoReport.states.errorTitle')"
          :description="reportsQuery.errorMessage.value || detailQuery.errorMessage.value"
          :actions="[{
            label: t('ceoReport.states.retry'),
            color: 'neutral',
            variant: 'outline',
            icon: 'i-lucide-refresh-cw',
            onClick: () => { reportsQuery.refetch(); detailQuery.refetch() },
          }]"
        />
      </div>

      <div
        v-else-if="!reports.length"
        class="flex h-full flex-col items-center justify-center gap-3 px-4 py-12 text-center"
      >
        <UIcon
          name="i-lucide-file-bar-chart"
          class="text-4xl text-dimmed"
        />
        <h3 class="text-lg font-semibold text-highlighted">
          {{ t('ceoReport.states.emptyTitle') }}
        </h3>
        <p class="max-w-sm text-sm text-muted">
          {{ t('ceoReport.states.emptyDescription') }}
        </p>
        <UButton
          :label="t('ceoReport.toolbar.generate')"
          icon="i-lucide-plus"
          @click="isGenerateOpen = true"
        />
      </div>

      <div
        v-else-if="view && !hasTasks"
        class="flex h-full flex-col items-center justify-center gap-2 px-4 py-12 text-center"
      >
        <UIcon
          name="i-lucide-inbox"
          class="text-4xl text-dimmed"
        />
        <h3 class="text-lg font-semibold text-highlighted">
          {{ t('ceoReport.states.noTasksTitle') }}
        </h3>
        <p class="max-w-sm text-sm text-muted">
          {{ t('ceoReport.states.noTasksDescription') }}
        </p>
      </div>

      <div
        v-else-if="view"
      >
        <UAlert
          v-if="view.aiReview"
          class="mx-auto mt-3 max-w-3xl"
          :color="view.aiReview.state === 'error' ? 'error' : 'warning'"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="view.aiReview.state === 'error' ? t('ceoReport.aiReview.errorTitle') : t('ceoReport.aiReview.reviewTitle')"
          :description="view.aiReview.state === 'error'
            ? (view.aiReview.error || t('ceoReport.aiReview.errorDescription'))
            : t('ceoReport.aiReview.reviewDescription')"
          :actions="view.aiReview.state === 'review'
            ? [{ label: t('ceoReport.aiReview.showAnyway'), color: 'neutral', variant: 'outline', onClick: () => { showUnreviewed = true } }]
            : []"
        >
          <template
            v-if="view.aiReview.warnings.length"
            #description
          >
            <p>{{ t('ceoReport.aiReview.reviewDescription') }}</p>
            <ul class="mt-1 list-disc pl-5">
              <li
                v-for="warning in view.aiReview.warnings"
                :key="warning"
              >
                {{ warning }}
              </li>
            </ul>
          </template>
        </UAlert>

        <UAlert
          v-else-if="showUnreviewed"
          class="mx-auto mt-3 max-w-3xl"
          color="warning"
          variant="subtle"
          icon="i-lucide-eye"
          :title="t('ceoReport.aiReview.reviewTitle')"
          :actions="[{ label: t('ceoReport.aiReview.hide'), color: 'neutral', variant: 'outline', onClick: () => { showUnreviewed = false } }]"
        />

        <div :style="{ zoom }">
          <CeoReportDocument
            :report="view"
            @create-task="onCreateTask"
          />
        </div>
      </div>
    </div>

    <CeoReportGenerateModal
      v-model:open="isGenerateOpen"
      :loading="generate.isPending.value"
      @submit="onGenerate"
    />

    <TaskNewTaskSlideover
      v-model:open="newTaskOpen"
      v-model:task-id="newTaskId"
      :voice-draft="decisionDraft"
    />
  </div>
</template>
