<script setup lang="ts">
import { parseMentions } from '~/shared/utils/mention.util'

/**
 * Texto guardado con menciones (`@[Nombre](id)`) pintado con chips `@Nombre`; el token crudo nunca se muestra.
 * Va dentro de un contenedor con `whitespace-pre-wrap` (mensajes, descripciones) que conserva los saltos de línea.
 */
const props = withDefaults(
  defineProps<{
    text: string | null | undefined
    /** `own`: sobre la burbuja de color propio (texto blanco). */
    tone?: 'default' | 'own'
  }>(),
  {
    tone: 'default',
  },
)

const segments = computed(() => parseMentions(props.text ?? ''))
</script>

<template>
  <span><template v-for="(segment, index) in segments" :key="index"><span
    v-if="segment.type === 'mention'"
    class="mention-chip"
    :class="{ 'mention-chip--own': tone === 'own' }"
    :title="`@${segment.name}`"
  >@{{ segment.name }}</span><template v-else>{{ segment.text }}</template></template></span>
</template>

<style>
/* Chip de una mención: sin padding horizontal, para que el editor (que pinta el mismo resaltado detrás del texto) y
   el texto guardado midan igual. */
.mention-chip {
  border-radius: 0.375rem;
  background: color-mix(in oklab, var(--ui-primary, #14b8a6) 18%, transparent);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--ui-primary, #14b8a6) 35%, transparent);
  font-weight: 500;
}

.mention-chip--own {
  background: rgb(255 255 255 / 0.22);
  box-shadow: 0 0 0 1px rgb(255 255 255 / 0.35);
}
</style>
