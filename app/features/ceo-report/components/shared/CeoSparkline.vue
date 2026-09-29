<script setup lang="ts">
import { buildSparklinePoints, sparklineEnd } from '~/features/ceo-report/utils/ceo-report.util'

const props = withDefaults(defineProps<{
  series: number[]
  width?: number
  height?: number
  color?: string
}>(), {
  width: 100,
  height: 32,
  color: '#28ceab',
})

const points = computed(() => buildSparklinePoints(props.series, props.width, props.height))
const end = computed(() => sparklineEnd(props.series, props.width, props.height))
</script>

<template>
  <svg
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    class="block"
    aria-hidden="true"
  >
    <polyline
      :points="points"
      fill="none"
      :stroke="color"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle
      :cx="end.x"
      :cy="end.y"
      r="2.4"
      :fill="color"
    />
  </svg>
</template>
