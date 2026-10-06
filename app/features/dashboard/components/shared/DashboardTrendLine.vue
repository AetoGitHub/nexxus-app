<script setup lang="ts">
import type { DashboardTone } from '~/features/dashboard/types/dashboard.types'
import { TONE_STROKE, buildTrendSegments } from '~/features/dashboard/utils/dashboard.util'

/** Mini gráfica de tendencia (línea). Ocupa el ancho disponible si no se indica `width`. Los `null` cortan la línea. */
const props = withDefaults(defineProps<{
  series: (number | null)[]
  tone?: DashboardTone
  height?: number
  /** Ancho fijo en px; sin él la línea se estira al contenedor. */
  width?: number
}>(), {
  tone: 'good',
  height: 20,
  width: undefined,
})

const VIEW_WIDTH = 100

const viewWidth = computed(() => props.width ?? VIEW_WIDTH)
const segments = computed(() => buildTrendSegments(props.series, viewWidth.value, props.height))
</script>

<template>
  <svg
    :width="width ?? '100%'"
    :height="height"
    :viewBox="`0 0 ${viewWidth} ${height}`"
    preserveAspectRatio="none"
    class="block"
    aria-hidden="true"
  >
    <polyline
      v-for="(points, index) in segments"
      :key="index"
      :points="points"
      fill="none"
      :stroke="TONE_STROKE[tone]"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>
