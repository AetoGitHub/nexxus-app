<script setup lang="ts">
import DashboardPeriodPicker from '~/features/dashboard/components/DashboardPeriodPicker.vue'
import { useProjectsDropdown } from '~/features/tasks/composables/shared/useProjectsDropdown'
import { useUsersDropdown } from '~/features/tasks/composables/shared/useUsersDropdown'
import type {
  DashboardCompare,
  DashboardDateRange,
  DashboardPeriod,
  DashboardScope,
} from '~/features/dashboard/types/dashboard.types'
import { isValidDateRange } from '~/features/dashboard/utils/dashboard-filters.util'

/**
 * Filtros globales del Dashboard: alcance (Mis tareas / Equipo), periodo o rango personalizado, comparativa, proyectos y
 * usuario. Aplican a los KPI, la carga, Rendimiento individual y los proyectos. El usuario recalcula todo el dashboard con
 * las tareas de esa persona (no es el buscador de las tablas, que solo reduce sus filas).
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
/** Usuario elegido (`user=<id>`); `null` = todo el equipo. */
const userId = defineModel<number | null>('userId', { required: true })

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
    // «vs semana/mes/trimestre/año anterior» según el periodo; con rango personalizado queda «vs periodo anterior».
    label: value === 'previous' && !customActive.value
      ? t(`dashboard.toolbar.compare.previous_${period.value}`)
      : t(`dashboard.toolbar.compare.${value}`),
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

const userSearchTerm = ref('')
// `admin`: todos los miembros de la compañía (con o sin grupo), los mismos que lista Rendimiento individual.
const { users: usersQuery, items: fetchedUserItems, allItems: knownUserItems, isSearching: isSearchingUsers } = useUsersDropdown(
  true,
  { searchTerm: userSearchTerm, admin: true },
)

/** El usuario elegido siempre está en la lista, aunque la búsqueda actual no lo incluya (si no, el selector mostraría el id). */
const userItems = computed(() => {
  const items = fetchedUserItems.value
  const selected = userId.value
  if (selected == null || items.some(item => item.value === selected)) {
    return items
  }
  const known = knownUserItems.value.find(item => item.value === selected)
  return known ? [known, ...items] : items
})

/** En «Mis tareas» ya solo se ven las del usuario en sesión: el backend rechaza `user` junto con `my_tasks`. */
const userDisabled = computed(() => scope.value === 'mine')

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
        :title="t('dashboard.toolbar.periodLabel')"
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

      <USelectMenu
        :model-value="userId ?? undefined"
        v-model:search-term="userSearchTerm"
        value-key="value"
        :items="userItems"
        :loading="usersQuery.isPending.value"
        :disabled="userDisabled"
        :title="userDisabled ? t('dashboard.toolbar.user.disabledMine') : undefined"
        size="sm"
        icon="i-lucide-user-search"
        class="w-52"
        :placeholder="t('dashboard.toolbar.user.all')"
        :search-input="{ placeholder: t('dashboard.toolbar.user.search'), loading: isSearchingUsers }"
        :aria-label="t('dashboard.toolbar.user.label')"
        clear
        ignore-filter
        @update:model-value="userId = ($event as number | undefined) ?? null"
      />

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
