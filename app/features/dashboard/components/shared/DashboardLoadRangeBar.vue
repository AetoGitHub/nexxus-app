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
 * Barra de un rango de la distribución de carga: su alto es cuántas personas caen en el rango y el tooltip (hover, teclado
 * o tap en pantallas táctiles) lista a esas personas con su porcentaje.
 */
const props = defineProps<{
  label: string
  limits: string
  tone: DashboardTone | null
  people: LoadRangePerson[]
  /** Alto de la barra de 0 a 100 (% del área del gráfico). */
  height: number
}>()

const { t } = useI18n()

const { open, onPointerDown, endTouchTap, onUpdateOpen, onClick } = useTooltipTouchTap()

function percent(value: number | null): string {
  return value == null ? NO_DATA : `${Math.round(value)}%`
}

const summary = computed(() => `${props.label}: ${t('dashboard.load.people', props.people.length)}`)
</script>

<template>
  <div class="flex h-full min-w-0 flex-1 flex-col items-stretch">
    <div class="flex min-h-0 flex-1 flex-col items-center justify-end">
      <UTooltip
        :open="open"
        :content="{ side: 'top', align: 'center', sideOffset: 6 }"
        :ui="{ content: 'h-auto max-w-[280px] items-start p-2.5' }"
        @update:open="onUpdateOpen"
      >
        <button
          type="button"
          class="flex h-full w-full max-w-24 flex-col items-center justify-end rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aeto-teal"
          :aria-label="summary"
          @pointerdown.capture="onPointerDown"
          @pointerup="endTouchTap"
          @pointercancel="endTouchTap"
          @click="onClick"
        >
          <span
            class="mb-1 font-mono text-sm font-bold tabular-nums"
            :class="tone ? TONE_TEXT[tone] : 'text-muted-foreground'"
          >
            {{ people.length }}
          </span>
          <span
            class="w-full rounded-sm transition-opacity hover:opacity-80"
            :class="tone && people.length ? TONE_BG[tone] : 'bg-muted-foreground/30'"
            :style="{ height: people.length ? `${Math.max(height, 4)}%` : '4px' }"
          />
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
    </div>

    <p class="mt-2 truncate text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {{ label }}
    </p>
    <p class="truncate text-center text-[10px] text-muted-foreground/80">
      {{ limits }}
    </p>
  </div>
</template>
