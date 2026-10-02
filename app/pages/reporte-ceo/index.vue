<script setup lang="ts">
import CeoReportDocument from '~/features/ceo-report/components/CeoReportDocument.vue'
import CeoReportGenerateModal from '~/features/ceo-report/components/CeoReportGenerateModal.vue'
import CeoReportToolbar from '~/features/ceo-report/components/CeoReportToolbar.vue'
import { useCeoReportView } from '~/features/ceo-report/composables/useCeoReportView'
import { useGenerateReport } from '~/features/ceo-report/composables/useGenerateReport'
import { useReportDetail } from '~/features/ceo-report/composables/useReportDetail'
import { useReports } from '~/features/ceo-report/composables/useReports'
import type { GenerateReportPayload } from '~/features/ceo-report/types/ceo-report-api.types'
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
const { view } = useCeoReportView(() => detailQuery.data.value)

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
        :style="{ zoom }"
      >
        <CeoReportDocument
          :report="view"
          @create-task="notifyPending"
        />
      </div>
    </div>

    <CeoReportGenerateModal
      v-model:open="isGenerateOpen"
      :loading="generate.isPending.value"
      @submit="onGenerate"
    />
  </div>
</template>
