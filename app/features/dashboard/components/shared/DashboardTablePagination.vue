<script setup lang="ts">
import type { ApiPagination } from '~/features/dashboard/types/dashboard-api.types'

/**
 * Pie de una tabla paginada por el backend: «Mostrando 26–28 de 28» y los controles de página. Solo aparece cuando hay
 * más de una página; con una sola, la tabla se ve igual que sin paginación.
 */
const page = defineModel<number>('page', { required: true })

const props = defineProps<{
  pagination: ApiPagination | null | undefined
  /** Ya se está pidiendo otra página: se bloquean los controles para no encadenar pedidos. */
  loading?: boolean
}>()

const { t } = useI18n()

const visible = computed(() => (props.pagination?.total_pages ?? 0) > 1)

const range = computed(() => {
  const pagination = props.pagination
  if (!pagination) {
    return { from: 0, to: 0 }
  }
  const from = (pagination.page - 1) * pagination.page_size + 1
  return { from, to: Math.min(pagination.page * pagination.page_size, pagination.total) }
})
</script>

<template>
  <div
    v-if="visible && pagination"
    class="mt-3 flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-3 sm:flex-row"
  >
    <p
      class="text-xs text-muted-foreground"
      aria-live="polite"
    >
      {{ t('dashboard.table.range', { from: range.from, to: range.to, total: pagination.total }) }}
    </p>

    <UPagination
      v-model:page="page"
      :total="pagination.total"
      :items-per-page="pagination.page_size"
      :sibling-count="1"
      show-edges
      size="xs"
      :disabled="loading"
    />
  </div>
</template>
