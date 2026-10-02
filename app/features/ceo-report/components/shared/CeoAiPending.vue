<script setup lang="ts">
/**
 * Estado «IA en preparación»: marca de forma inequívoca que el texto aún no existe, con líneas
 * esqueleto en lugar de contenido. Nunca muestra texto de ejemplo ni cifras.
 */
withDefaults(defineProps<{ lines?: number }>(), { lines: 4 })

const { t } = useI18n()

const LINE_WIDTHS = [100, 92, 96, 60]
</script>

<template>
  <div
    class="cr-ai-pending"
    role="group"
    aria-busy="true"
    :aria-label="t('ceoReport.ai.ariaLabel')"
  >
    <span class="cr-ai-pending__badge">
      <span aria-hidden="true">✦</span> {{ t('ceoReport.ai.badge') }}
    </span>
    <div
      class="cr-ai-pending__lines"
      aria-hidden="true"
    >
      <span
        v-for="(width, index) in LINE_WIDTHS.slice(0, lines)"
        :key="index"
        class="cr-ai-pending__line"
        :style="{ width: `${width}%` }"
      />
    </div>
    <p class="cr-ai-pending__caption">
      {{ t('ceoReport.ai.caption') }}
    </p>
  </div>
</template>
