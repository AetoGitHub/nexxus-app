<script setup lang="ts">
/**
 * Estados de un bloque del Dashboard: cargando, error (con reintento), vacío o contenido.
 * Cada bloque lo usa por separado para que uno que falla no tape a los demás.
 */
withDefaults(defineProps<{
  loading?: boolean
  /** Mensaje de error ya traducido; vacío si no hay error. */
  error?: string
  empty?: boolean
  emptyText?: string
  /** Hay datos viejos en pantalla mientras llegan los nuevos. */
  refreshing?: boolean
}>(), {
  loading: false,
  error: '',
  empty: false,
  emptyText: '',
  refreshing: false,
})

defineEmits<{
  retry: []
}>()

const { t } = useI18n()
</script>

<template>
  <div
    v-if="loading"
    class="space-y-2"
    role="status"
    :aria-label="t('dashboard.state.loading')"
  >
    <slot name="loading">
      <USkeleton class="h-24 w-full rounded-lg" />
    </slot>
  </div>

  <div
    v-else-if="error"
    class="flex flex-col items-start gap-2 rounded-lg border border-error/30 bg-error/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    role="alert"
  >
    <p class="text-error">
      {{ error }}
    </p>
    <UButton
      color="neutral"
      variant="outline"
      size="xs"
      icon="i-lucide-refresh-cw"
      :label="t('dashboard.state.retry')"
      @click="$emit('retry')"
    />
  </div>

  <p
    v-else-if="empty"
    class="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground"
  >
    {{ emptyText }}
  </p>

  <div
    v-else
    class="transition-opacity"
    :class="refreshing ? 'opacity-60' : ''"
    :aria-busy="refreshing"
  >
    <slot />
  </div>
</template>
