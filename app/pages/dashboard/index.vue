<script setup lang="ts">
import DashboardCollaboratorsTable from '~/features/dashboard/components/DashboardCollaboratorsTable.vue'
import DashboardKpiCard from '~/features/dashboard/components/DashboardKpiCard.vue'
import DashboardKpiHero from '~/features/dashboard/components/DashboardKpiHero.vue'
import DashboardLoadDistribution from '~/features/dashboard/components/DashboardLoadDistribution.vue'
import DashboardNexxtepActivity from '~/features/dashboard/components/DashboardNexxtepActivity.vue'
import DashboardToolbar from '~/features/dashboard/components/DashboardToolbar.vue'
import DashboardTopicsTable from '~/features/dashboard/components/DashboardTopicsTable.vue'
import { DASHBOARD_MOCK } from '~/features/dashboard/mocks/dashboard.mock'
import type { DashboardPeriod, DashboardScope } from '~/features/dashboard/types/dashboard.types'

// Protected route: redirects to /login when not authenticated.
definePageMeta({ middleware: 'auth' })

const { t } = useI18n()

useSeoMeta({
  title: () => t('dashboard.title'),
})

// Template sin conexión al backend: todo sale de DASHBOARD_MOCK. El alcance y el periodo solo cambian el estado visual.
const dashboard = DASHBOARD_MOCK
const scope = ref<DashboardScope>('team')
const period = ref<DashboardPeriod>('month')
</script>

<template>
  <div class="space-y-4 p-4 md:p-6">
    <DashboardToolbar v-model:scope="scope" />

    <DashboardKpiHero :kpi="dashboard.hero" />

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <DashboardKpiCard
        v-for="kpi in dashboard.kpis"
        :key="kpi.key"
        :kpi="kpi"
      />
    </div>

    <DashboardLoadDistribution :load="dashboard.load" />

    <DashboardCollaboratorsTable
      v-model:period="period"
      :collaborators="dashboard.collaborators"
    />

    <DashboardTopicsTable :topics="dashboard.topics" />

    <DashboardNexxtepActivity :nexxtep="dashboard.nexxtep" />
  </div>
</template>
