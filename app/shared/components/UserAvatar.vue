<script setup lang="ts">
import { readableTextColor } from '~/features/auth/utils/profile-appearance.util'

/**
 * Círculo de un usuario: su imagen de perfil si tiene; si no, su color de fondo con las iniciales; y si no tiene ninguno,
 * `fallbackColor` con las iniciales (lo de siempre). Si la imagen no carga, cae al color o al fallback.
 * Las clases (anillo, borde, márgenes) se pasan directo al círculo.
 */
const props = withDefaults(
  defineProps<{
    /** Con el id se busca su imagen / color; sin id es un círculo de iniciales. */
    userId?: number | null
    initials: string
    /** Diámetro en px. */
    size?: number
    /** Tamaño de las iniciales en px; por defecto, proporcional al diámetro. */
    fontSize?: number
    /** Color de fondo cuando el usuario no tiene imagen ni color propio. */
    fallbackColor?: string
  }>(),
  {
    userId: null,
    size: 32,
    fontSize: undefined,
    fallbackColor: '#64748b',
  },
)

const appearance = useProfileAppearance(() => props.userId)

const imageFailed = ref(false)
watch(() => appearance.value?.image, () => {
  imageFailed.value = false
})

const image = computed(() => (imageFailed.value ? null : appearance.value?.image ?? null))
const backgroundColor = computed(() => appearance.value?.color ?? props.fallbackColor)
const textColor = computed(() => (appearance.value?.color ? readableTextColor(appearance.value.color) : '#ffffff'))
const resolvedFontSize = computed(() => props.fontSize ?? Math.max(9, Math.round(props.size * 0.4)))
</script>

<template>
  <span
    class="inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold leading-none"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor,
      color: textColor,
      fontSize: `${resolvedFontSize}px`,
    }"
  >
    <img
      v-if="image"
      :src="image"
      alt=""
      draggable="false"
      loading="lazy"
      class="size-full object-cover"
      @error="imageFailed = true"
    >
    <template v-else>{{ initials }}</template>
  </span>
</template>
