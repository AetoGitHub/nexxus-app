<script setup lang="ts">
/**
 * Marca una sección que todavía no está conectada al backend. Patrón:
 * 1. Etiqueta «Trabajo en proceso» siempre visible en la esquina (no depende del hover).
 * 2. El contenido queda atenuado e inerte (sin clics ni foco): es una maqueta, no datos reales.
 * 3. Al pasar el cursor, enfocar con teclado o tocar (en pantallas táctiles), un velo con desenfoque explica el estado.
 * Los números de ejemplo no deben presentarse como reales: dentro va solo estructura (esqueletos o guiones).
 */
const props = withDefaults(
  defineProps<{
    /** Texto del velo; por omisión, la descripción genérica de i18n. */
    description?: string
  }>(),
  {
    description: undefined,
  },
)

const { t } = useI18n()

// En touch no hay hover: el toque abre y cierra el velo; Escape lo cierra.
const revealed = ref(false)
const text = computed(() => props.description ?? t('common.wip.description'))
</script>

<template>
  <div
    class="group relative isolate overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-aeto-teal"
    role="group"
    tabindex="0"
    :aria-label="`${t('common.wip.label')}. ${text}`"
    @click="revealed = !revealed"
    @keydown.escape="revealed = false"
    @keydown.enter.prevent="revealed = !revealed"
    @blur="revealed = false"
  >
    <div
      class="pointer-events-none select-none opacity-80 saturate-50"
      inert
      aria-hidden="true"
    >
      <slot />
    </div>

    <WipBadge class="absolute right-3 top-3 z-10" />

    <div
      class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-background/50 px-4 text-center opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      :class="revealed ? 'opacity-100' : ''"
    >
      <UIcon
        name="i-lucide-construction"
        class="size-6 text-amber-600 dark:text-amber-400"
        aria-hidden="true"
      />
      <p class="text-sm font-semibold text-foreground">
        {{ t('common.wip.label') }}
      </p>
      <p class="max-w-xs text-xs text-muted-foreground">
        {{ text }}
      </p>
    </div>
  </div>
</template>
