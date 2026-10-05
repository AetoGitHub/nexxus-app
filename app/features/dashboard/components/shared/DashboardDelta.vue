<script setup lang="ts">
import type { DashboardDelta } from '~/features/dashboard/types/dashboard.types'
import { TONE_TEXT } from '~/features/dashboard/utils/dashboard.util'

/** Variación contra el periodo anterior: flecha + valor, coloreada por semáforo. */
defineProps<{
  delta: DashboardDelta
}>()
</script>

<template>
  <span
    class="inline-flex items-center gap-0.5 font-mono text-[11px] font-medium whitespace-nowrap"
    :class="TONE_TEXT[delta.tone]"
  >
    <UIcon
      :name="delta.direction === 'up' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
      class="size-3"
    />
    {{ delta.value }}
  </span>
</template>
