<script setup lang="ts">
import { TONE_STROKE } from '~/features/dashboard/utils/dashboard.util'

/** Dona con el reparto de tareas por esfuerzo (rápidas, normales y complejas). */
const props = withDefaults(defineProps<{
  quick: number
  normal: number
  complex: number
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
    { key: 'complex', value: props.complex, color: TONE_STROKE.danger },
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
