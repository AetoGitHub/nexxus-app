<script setup lang="ts">
import type { Ref } from 'vue'
import DashboardCollaboratorsTable from '~/features/dashboard/components/DashboardCollaboratorsTable.vue'
import DashboardKpiCard from '~/features/dashboard/components/DashboardKpiCard.vue'
import DashboardKpiHero from '~/features/dashboard/components/DashboardKpiHero.vue'
import DashboardLoadDistribution from '~/features/dashboard/components/DashboardLoadDistribution.vue'
import DashboardNexxtepActivity from '~/features/dashboard/components/DashboardNexxtepActivity.vue'
import DashboardToolbar from '~/features/dashboard/components/DashboardToolbar.vue'
import DashboardTopicsTable from '~/features/dashboard/components/DashboardTopicsTable.vue'
import DashboardBlockState from '~/features/dashboard/components/shared/DashboardBlockState.vue'
import {
  useDashboardKpis,
  useDashboardLoadDistribution,
  useDashboardPeople,
  useDashboardPeopleExport,
  useDashboardProjects,
} from '~/features/dashboard/composables/useDashboardApi'
import { useDashboardTableState } from '~/features/dashboard/composables/useDashboardTableState'
import type {
  DashboardCompare,
  DashboardDateRange,
  DashboardPeriod,
  DashboardScope,
} from '~/features/dashboard/types/dashboard.types'
import { defaultCustomRange, isValidDateRange } from '~/features/dashboard/utils/dashboard-filters.util'
import { buildDashboardKpis } from '~/features/dashboard/utils/dashboard-kpi.util'

// Protected route: redirects to /login when not authenticated.
definePageMeta({ middleware: 'auth' })

const { t } = useI18n()

useSeoMeta({
  title: () => t('dashboard.title'),
})

// Filtros globales: aplican a los KPI, la distribución de carga, el rendimiento individual y los proyectos.
const period = ref<DashboardPeriod>('week')
const compare = ref<DashboardCompare>('previous')
// «Mis tareas» (`my_tasks`) y los proyectos (`project`) aplican a todos los bloques.
const scope = ref<DashboardScope>('team')
const projectIds = ref<number[]>([])
// Usuario elegido (`user`): recalcula todos los bloques con sus tareas. No convive con «Mis tareas» (`my_tasks`).
const userId = ref<number | null>(null)
// Rango personalizado: reemplaza al periodo en los bloques globales; solo se pide cuando está completo y es válido.
const customActive = ref(false)
const customRange = ref<DashboardDateRange>(defaultCustomRange())
// Periodo concreto del filtro por periodo (p. ej. una semana anterior): se pide como rango, igual que el personalizado.
const periodRange = ref<DashboardDateRange | null>(null)
// El campo del rango emite cada tecla (p. ej. al escribir un año): se espera a que termine de teclear antes de pedir datos.
const settledCustomRange = refDebounced(customRange, 400)
const validRange = computed(() => {
  if (!customActive.value) {
    return periodRange.value
  }
  return isValidDateRange(settledCustomRange.value.start, settledCustomRange.value.end) ? settledCustomRange.value : null
})
const globalEnabled = computed(() => !customActive.value || validRange.value != null)
const myTasks = computed(() => scope.value === 'mine')

// Cada bloque pide lo suyo: al cambiar un filtro solo se vuelven a pedir los que dependen de él.
const globalFilters = { period, range: validRange, myTasks, projectIds, userId, enabled: globalEnabled }

// «Mis tareas» ya es el usuario en sesión: elegir ese alcance suelta el usuario (el backend responde 400 con ambos).
watch(scope, (value) => {
  if (value === 'mine') {
    userId.value = null
  }
})

// Búsqueda, orden y página de cada tabla (los resuelve el backend). La página vuelve a 1 con cualquier filtro global.
const resetTablePageOn = [userId, scope, period, compare, projectIds, validRange, customActive]
const peopleTable = useDashboardTableState({ defaultOrdering: '-tct', resetOn: resetTablePageOn })
const projectsTable = useDashboardTableState({ defaultOrdering: '-tct', resetOn: resetTablePageOn })
const { search: peopleSearch, ordering: peopleOrdering, page: peoplePage, params: peopleParams } = peopleTable
const { search: projectsSearch, ordering: projectsOrdering, page: projectsPage, params: projectsParams } = projectsTable

// Otra compañía: el usuario elegido ya no es miembro (403) y la búsqueda de la anterior no aplica.
const { selectedCompanyId } = useAuth()
watch(selectedCompanyId, () => {
  userId.value = null
  peopleTable.reset()
  projectsTable.reset()
})

const kpisQuery = useDashboardKpis({ ...globalFilters, compare })
const loadQuery = useDashboardLoadDistribution(globalFilters)
const peopleQuery = useDashboardPeople({ ...globalFilters, compare }, peopleParams)
const projectsQuery = useDashboardProjects({ ...globalFilters, compare }, projectsParams)
const fetchAllPeople = useDashboardPeopleExport({ ...globalFilters, compare }, peopleParams)

const kpiSet = computed(() => (kpisQuery.data.value ? buildDashboardKpis(kpisQuery.data.value.kpis) : null))

/** Con datos viejos en pantalla un error no los tapa del todo: se muestra el error y el reintento. */
function errorOf(query: { isError: Ref<boolean>, errorMessage: Ref<string> }): string {
  return query.isError.value ? query.errorMessage.value : ''
}
</script>

<template>
  <div class="space-y-4 p-4 md:p-6">
    <DashboardToolbar
      v-model:scope="scope"
      v-model:period="period"
      v-model:custom-active="customActive"
      v-model:range="customRange"
      v-model:period-range="periodRange"
      v-model:compare="compare"
      v-model:project-ids="projectIds"
      v-model:user-id="userId"
    />

    <DashboardBlockState
      :loading="kpisQuery.isPending.value"
      :error="errorOf(kpisQuery)"
      :refreshing="kpisQuery.isPlaceholderData.value"
      @retry="kpisQuery.refetch()"
    >
      <template #loading>
        <USkeleton class="h-20 w-full rounded-xl" />
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <USkeleton
            v-for="n in 5"
            :key="n"
            class="h-28 rounded-xl"
          />
        </div>
      </template>

      <div
        v-if="kpiSet"
        class="space-y-4"
      >
        <DashboardKpiHero :kpi="kpiSet.hero" />

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <DashboardKpiCard
            v-for="kpi in kpiSet.cards"
            :key="kpi.key"
            :kpi="kpi"
          />
        </div>
      </div>
    </DashboardBlockState>

    <DashboardLoadDistribution
      :load="loadQuery.data.value"
      :loading="loadQuery.isPending.value"
      :refreshing="loadQuery.isPlaceholderData.value"
      :error="errorOf(loadQuery)"
      @retry="loadQuery.refetch()"
    />

    <DashboardCollaboratorsTable
      v-model:search="peopleSearch"
      v-model:ordering="peopleOrdering"
      v-model:page="peoplePage"
      :fetch-all="fetchAllPeople"
      :data="peopleQuery.data.value"
      :loading="peopleQuery.isPending.value"
      :refreshing="peopleQuery.isPlaceholderData.value"
      :error="errorOf(peopleQuery)"
      @retry="peopleQuery.refetch()"
    />

    <DashboardTopicsTable
      v-model:search="projectsSearch"
      v-model:ordering="projectsOrdering"
      v-model:page="projectsPage"
      :data="projectsQuery.data.value"
      :loading="projectsQuery.isPending.value"
      :refreshing="projectsQuery.isPlaceholderData.value"
      :error="errorOf(projectsQuery)"
      @retry="projectsQuery.refetch()"
    />

    <!-- Sin backend todavía: maqueta marcada como trabajo en proceso. -->
    <DashboardNexxtepActivity />
  </div>
</template>
