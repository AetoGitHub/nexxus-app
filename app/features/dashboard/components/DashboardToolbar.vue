<script setup lang="ts">
import DashboardPeriodPicker from '~/features/dashboard/components/DashboardPeriodPicker.vue'
import { useProjectsDropdown } from '~/features/tasks/composables/shared/useProjectsDropdown'
import type {
  DashboardCompare,
  DashboardDateRange,
  DashboardPeriod,
  DashboardScope,
} from '~/features/dashboard/types/dashboard.types'
import { isValidDateRange } from '~/features/dashboard/utils/dashboard-filters.util'

/**
 * Filtros globales del Dashboard: alcance (Mis tareas / Equipo), periodo o rango personalizado, comparativa y proyectos.
 * Aplican a los KPI, la carga y los proyectos (y «Mis tareas» y los proyectos también a Rendimiento individual).
 */
const scope = defineModel<DashboardScope>('scope', { required: true })
const period = defineModel<DashboardPeriod>('period', { required: true })
/** `true` cuando se usa el rango personalizado en lugar de uno de los periodos. */
const customActive = defineModel<boolean>('customActive', { required: true })
const range = defineModel<DashboardDateRange>('range', { required: true })
/** Periodo concreto elegido con el filtro por periodo (una semana, mes, trimestre o año anterior); `null` = el actual. */
const periodRange = defineModel<DashboardDateRange | null>('periodRange', { required: true })
const compare = defineModel<DashboardCompare>('compare', { required: true })
const projectIds = defineModel<number[]>('projectIds', { required: true })

const { t } = useI18n()

/** Acciones que aún no tienen backend. */
const wipActions = [
  { key: 'download', icon: 'i-lucide-download', variant: 'outline' },
  { key: 'analyze', icon: 'i-lucide-sparkles', variant: 'soft' },
] as const

const scopes:DashboardScope[] = ['mine', 'team']
const periods: DashboardPeriod[] = ['week', 'month', 'quarter', 'year']

const compareItems = computed(() =>
  (['none', 'previous', 'last_year'] as const).map(value => ({
    value,
    label: t(`dashboard.toolbar.compare.${value}`),
  })),
)

const { allItems: projectItems } = useProjectsDropdown({ enabled: true })

const projectsLabel = computed(() => {
  const count = projectIds.value.length
  if (count === 0) {
    return t('dashboard.toolbar.projects.all')
  }
  if (count === 1) {
    return projectItems.value.find(item => item.value === projectIds.value[0])?.label
      ?? t('dashboard.toolbar.projects.count', { count })
  }
  return t('dashboard.toolbar.projects.count', { count })
})

/** Mensaje mientras el rango está incompleto o al revés: no se pide nada hasta que sea válido. */
const rangeError = computed(() => {
  if (!customActive.value || isValidDateRange(range.value.start, range.value.end)) {
    return ''
  }
  return range.value.start && range.value.end
    ? t('dashboard.toolbar.rangeInvalid')
    : t('dashboard.toolbar.rangeIncomplete')
})

function selectPeriod(item: DashboardPeriod) {
  customActive.value = false
  // Otro tipo de periodo: el elegido antes (p. ej. una semana) ya no corresponde.
  periodRange.value = null
  period.value = item
}

function selectCustom() {
  periodRange.value = null
  customActive.value = true
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-center gap-2">
      <div
        class="inline-flex rounded-lg bg-muted p-0.5"
        role="group"
        :aria-label="t('dashboard.toolbar.scopeLabel')"
      >
        <button
          v-for="item in scopes"
          :key="item"
          type="button"
          class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
          :class="scope === item
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'"
          :aria-pressed="scope === item"
          @click="scope = item"
        >
          {{ t(`dashboard.toolbar.scope.${item}`) }}
        </button>
      </div>

      <div
        class="inline-flex rounded-lg bg-muted p-0.5"
        role="group"
        :aria-label="t('dashboard.toolbar.periodLabel')"
      >
        <button
          v-for="item in periods"
          :key="item"
          type="button"
          class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
          :class="!customActive && period === item
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'"
          :aria-pressed="!customActive && period === item"
          @click="selectPeriod(item)"
        >
          {{ t(`dashboard.periods.${item}`) }}
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
          :class="customActive
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'"
          :aria-pressed="customActive"
          @click="selectCustom"
        >
          {{ t('dashboard.periods.custom') }}
        </button>
      </div>

      <USelect
        v-model="compare"
        :items="compareItems"
        value-key="value"
        size="sm"
        icon="i-lucide-git-compare-arrows"
        class="w-60"
        :aria-label="t('dashboard.toolbar.compareLabel')"
      />

      <USelectMenu
        v-model="projectIds"
        multiple
        value-key="value"
        :items="projectItems"
        size="sm"
        icon="i-lucide-folder-kanban"
        class="w-52"
        :search-input="{ placeholder: t('dashboard.toolbar.projects.search') }"
        :aria-label="t('dashboard.toolbar.projects.label')"
      >
        <span class="truncate">
          {{ projectsLabel }}
        </span>
      </USelectMenu>

      <div class="ml-auto flex flex-wrap items-center gap-2">
        <DashboardPeriodPicker
          v-model:range="periodRange"
          :period="period"
          :disabled="customActive"
        />

        <!-- Sin backend todavía: botones deshabilitados con la etiqueta WIP; el tooltip explica por qué. -->
        <UTooltip
          v-for="action in wipActions"
          :key="action.key"
          :text="`${t('common.wip.label')}. ${t('common.wip.description')}`"
        >
          <span class="inline-flex">
            <UButton
              color="neutral"
              :variant="action.variant"
              size="sm"
              :icon="action.icon"
              :label="t(`dashboard.toolbar.${action.key}`)"
              disabled
            >
              <template #trailing>
                <WipBadge compact />
              </template>
            </UButton>
          </span>
        </UTooltip>
      </div>
    </div>

    <div
      v-if="customActive"
      class="flex flex-wrap items-center gap-2"
    >
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        {{ t('dashboard.toolbar.dateRange') }}
        <AppDateRangePicker
          v-model="range"
          size="sm"
          :week-starts-on="0"
          :aria-label="t('dashboard.toolbar.dateRange')"
        />
      </div>
      <p
        v-if="rangeError"
        class="text-xs text-error"
        role="alert"
      >
        {{ rangeError }}
      </p>
    </div>
  </div>
</template>
