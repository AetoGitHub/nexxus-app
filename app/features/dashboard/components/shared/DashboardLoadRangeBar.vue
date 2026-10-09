<script setup lang="ts">
import { useTooltipTouchTap } from '~/features/dashboard/composables/useTooltipTouchTap'
import type { DashboardTone } from '~/features/dashboard/types/dashboard.types'
import { NO_DATA, TONE_BG, TONE_TEXT } from '~/features/dashboard/utils/dashboard.util'

/** Persona dentro de un rango de la distribución de carga. */
export interface LoadRangePerson {
  id: number
  name: string
  value: number | null
}

/**
 * Fila de un rango de la distribución de carga: etiqueta, barra horizontal y número de personas. Es una barra horizontal
 * (no una columna) porque con pocas categorías llena el ancho sin separarse ni engordar, en escritorio y en celular. La
 * longitud de la barra es cuántas personas caen en el rango; el tooltip (hover, teclado o tap en pantallas táctiles) las lista
 * con su porcentaje.
 */
const props = defineProps<{
  label: string
  limits: string
  tone: DashboardTone | null
  people: LoadRangePerson[]
  /** Largo de la barra de 0 a 100 (% del ancho de la pista). */
  width: number
}>()

const { t } = useI18n()

const { open, onPointerDown, endTouchTap, onUpdateOpen, onClick } = useTooltipTouchTap()

function percent(value: number | null): string {
  return value == null ? NO_DATA : `${Math.round(value)}%`
}

const summary = computed(() => `${props.label} ${props.limits}: ${t('dashboard.load.people', props.people.length)}`)
</script>

<template>
  <UTooltip
    :open="open"
    :content="{ side: 'top', align: 'start', sideOffset: 4 }"
    :ui="{ content: 'h-auto max-w-[280px] items-start p-2.5' }"
    @update:open="onUpdateOpen"
  >
    <button
      type="button"
      class="grid w-full grid-cols-[6.5rem_1fr_2rem] items-center gap-3 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aeto-teal sm:grid-cols-[9rem_1fr_2.5rem]"
      :aria-label="summary"
      @pointerdown.capture="onPointerDown"
      @pointerup="endTouchTap"
      @pointercancel="endTouchTap"
      @click="onClick"
    >
      <span class="min-w-0">
        <span class="block truncate text-[11px] font-medium uppercase tracking-wide text-foreground/80">
          {{ label }}
        </span>
        <span class="block truncate text-[10px] text-muted-foreground">
          {{ limits }}
        </span>
      </span>

      <span class="h-5 rounded bg-muted/60">
        <span
          v-if="people.length"
          class="block h-full rounded"
          :class="tone ? TONE_BG[tone] : 'bg-muted-foreground/40'"
          :style="{ width: `${Math.max(width, 2)}%` }"
        />
      </span>

      <span
        class="text-right font-mono text-sm font-bold tabular-nums"
        :class="tone && people.length ? TONE_TEXT[tone] : 'text-muted-foreground'"
      >
        {{ people.length }}
      </span>
    </button>

    <template #content>
      <div class="space-y-1.5 text-left">
        <p class="text-xs font-semibold text-foreground">
          {{ label }} <span class="font-normal text-muted-foreground">{{ limits }}</span>
        </p>
        <p class="text-[11px] text-muted-foreground">
          {{ t('dashboard.load.people', people.length) }}
        </p>
        <ul
          v-if="people.length"
          class="max-h-56 space-y-1 overflow-y-auto"
        >
          <li
            v-for="person in people"
            :key="person.id"
            class="flex items-center justify-between gap-3 text-xs"
          >
            <span class="min-w-0 truncate text-foreground">{{ person.name }}</span>
            <span
              class="shrink-0 font-mono font-semibold tabular-nums"
              :class="tone ? TONE_TEXT[tone] : 'text-muted-foreground'"
            >
              {{ percent(person.value) }}
            </span>
          </li>
        </ul>
      </div>
    </template>
  </UTooltip>
</template>
