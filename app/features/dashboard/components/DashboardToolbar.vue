<script setup lang="ts">
import type { DashboardScope } from '~/features/dashboard/types/dashboard.types'

/** Alcance (mis tareas / equipo), filtros y acciones del Dashboard. Por ahora solo cambia el estado visual. */
const scope = defineModel<DashboardScope>('scope', { required: true })

const { t } = useI18n()

const scopes: DashboardScope[] = ['mine', 'team']
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2">
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

      <UButton
        color="neutral"
        variant="soft"
        size="sm"
        icon="i-lucide-filter"
        trailing-icon="i-lucide-chevron-down"
        :label="t('dashboard.toolbar.filters')"
      />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-download"
        :label="t('dashboard.toolbar.download')"
      />
      <UButton
        color="primary"
        size="sm"
        icon="i-lucide-sparkles"
        :label="t('dashboard.toolbar.analyze')"
      />
    </div>
  </div>
</template>
