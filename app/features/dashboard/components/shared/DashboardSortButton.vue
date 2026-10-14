<script setup lang="ts">
import { nextOrdering } from '~/features/dashboard/composables/useDashboardTableState'

/**
 * Flecha de orden junto al encabezado de una columna. Sin orden activo muestra ↕ apagada; con él, ↑ (ascendente) o ↓
 * (descendente). Al pulsarla pide el siguiente orden (`campo` / `-campo`) y la tabla se vuelve a pedir al backend.
 */
const props = withDefaults(defineProps<{
  /** Valor de `ordering` de la columna (el que acepta el backend). */
  field: string
  /** Orden actual de la tabla. */
  ordering: string
  /** Nombre de la columna, para el tooltip y el lector de pantalla. */
  label: string
  /** Menor es mejor (nombre, TPR): la primera pulsación ordena de menor a mayor. */
  ascendingFirst?: boolean
}>(), {
  ascendingFirst: false,
})

const emit = defineEmits<{
  sort: [ordering: string]
}>()

const { t } = useI18n()

const active = computed(() => props.ordering === props.field || props.ordering === `-${props.field}`)
const descending = computed(() => props.ordering === `-${props.field}`)

const icon = computed(() => {
  if (!active.value) {
    return 'i-lucide-arrow-up-down'
  }
  return descending.value ? 'i-lucide-arrow-down' : 'i-lucide-arrow-up'
})

const title = computed(() => {
  if (!active.value) {
    return t('dashboard.table.sortBy', { column: props.label })
  }
  return t(descending.value ? 'dashboard.table.sortedDesc' : 'dashboard.table.sortedAsc', { column: props.label })
})
</script>

<template>
  <button
    type="button"
    class="inline-flex size-4 shrink-0 items-center justify-center rounded-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aeto-teal"
    :class="active ? 'text-aeto-teal' : 'text-muted-foreground/60 hover:text-foreground'"
    :title="title"
    :aria-label="title"
    @click="emit('sort', nextOrdering(ordering, field, ascendingFirst))"
  >
    <UIcon
      :name="icon"
      class="size-3"
      aria-hidden="true"
    />
  </button>
</template>
