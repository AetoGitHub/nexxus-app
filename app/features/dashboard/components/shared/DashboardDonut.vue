<script setup lang="ts">
import { TONE_STROKE } from '~/features/dashboard/utils/dashboard.util'

/** Naranja de las altas: queda entre el ámbar de las normales y el rojo de las urgentes. */
const HIGH_STROKE = '#ea580c'

/** Dona con el reparto de tareas por prioridad: rápidas (R), normales (N), altas (A) y urgentes (U). */
const props = withDefaults(defineProps<{
  quick: number
  normal: number
  high: number
  urgent: number
  size?: number
}>(), {
  size: 32,
})

const RADIUS = 14
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const segments = computed(() => {
  const parts = [
    { key: 'quick', value: props.quick, color: TONE_STROKE.good },
    { key: 'normal', value: props.normal, color: TONE_STROKE.warning },
    { key: 'high', value: props.high, color: HIGH_STROKE },
    { key: 'urgent', value: props.urgent, color: TONE_STROKE.danger },
  ]
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1
  let offset = 0

  return parts
    .filter(part => part.value > 0)
    .map((part) => {
      const length = (part.value / total) * CIRCUMFERENCE
      const segment = { ...part, length, offset }
      offset += length
      return segment
    })
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 36 36"
    class="block shrink-0"
    aria-hidden="true"
  >
    <circle
      cx="18"
      cy="18"
      :r="RADIUS"
      fill="none"
      stroke-width="5"
      class="stroke-muted"
    />
    <circle
      v-for="segment in segments"
      :key="segment.key"
      cx="18"
      cy="18"
      :r="RADIUS"
      fill="none"
      :stroke="segment.color"
      stroke-width="5"
      :stroke-dasharray="`${segment.length} ${CIRCUMFERENCE - segment.length}`"
      :stroke-dashoffset="-segment.offset"
      transform="rotate(-90 18 18)"
    />
  </svg>
</template>
