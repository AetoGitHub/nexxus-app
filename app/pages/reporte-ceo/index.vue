<script setup lang="ts">
import CeoReportDocument from '~/features/ceo-report/components/CeoReportDocument.vue'
import CeoReportToolbar from '~/features/ceo-report/components/CeoReportToolbar.vue'
import { useCeoReportMock } from '~/features/ceo-report/composables/useCeoReportMock'

// Protected route: redirects to /login when not authenticated.
definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const toast = useToast()

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

const { report } = useCeoReportMock()

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
      :meta="report.meta"
      @download="notifyPending"
    />
    <div
      ref="viewport"
      class="min-h-0 flex-1 overflow-y-auto"
    >
      <div :style="{ zoom }">
        <CeoReportDocument
          :report="report"
          @create-task="notifyPending"
        />
      </div>
    </div>
  </div>
</template>
