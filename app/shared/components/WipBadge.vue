<script setup lang="ts">
/**
 * Etiqueta «Trabajo en proceso» / «Work in progress» para lo que aún no está conectado al backend. Siempre visible (no
 * depende del hover, así que también se ve en pantallas táctiles y la leen los lectores de pantalla). `compact` usa el
 * texto corto «WIP» para botones y espacios chicos.
 */
withDefaults(
  defineProps<{
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)

const { t } = useI18n()
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-amber-700 dark:text-amber-400"
    :title="t('common.wip.label')"
  >
    <UIcon
      name="i-lucide-construction"
      class="size-3"
      aria-hidden="true"
    />
    {{ compact ? t('common.wip.short') : t('common.wip.label') }}
  </span>
</template>
