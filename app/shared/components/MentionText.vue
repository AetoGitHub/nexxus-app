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

const { user } = useAuth()

const segments = computed(() => parseMentions(props.text ?? ''))

/** La mención es al usuario logueado: su chip usa el color de acento (`--mention-me`) y los demás el normal. */
function isMe(id: number): boolean {
  return user.value != null && user.value.id === id
}
</script>

<template>
  <span><template v-for="(segment, index) in segments" :key="index"><span
    v-if="segment.type === 'mention'"
    class="mention-chip"
    :class="{ 'mention-chip--own': tone === 'own', 'mention-chip--me': isMe(segment.id) }"
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

/* Sobre la burbuja propia (fondo de color) un chip más claro que el fondo le quita contraste al texto blanco: aquí el
   chip se oscurece, para que el nombre siga legible, y lleva un borde claro que lo separa de la burbuja. */
.mention-chip--own {
  background: rgb(0 0 0 / 0.42);
  box-shadow: 0 0 0 1px rgb(255 255 255 / 0.4);
  font-weight: 600;
}

/* Mención al usuario logueado: acento ámbar con texto oscuro (AA en claro, oscuro y sobre la burbuja propia). Va al
   final para ganarle al estilo de la burbuja propia. */
.mention-chip--me {
  background: var(--mention-me-fill);
  box-shadow: 0 0 0 1px var(--mention-me);
  color: var(--mention-me-foreground);
  font-weight: 700;
}
</style>
