<script setup lang="ts">
import { useProfileAppearance, useProfileInitials } from '~/features/auth/composables/useProfileAppearance'
import { readableTextColor } from '~/features/auth/utils/profile-appearance.util'
import type { ProfileAppearance } from '~/features/auth/utils/profile-appearance.util'

/**
 * Círculo de un usuario: su imagen de perfil si tiene; si no, su color de fondo con las iniciales; y si no tiene ninguno,
 * `fallbackColor` con las iniciales (lo de siempre). Si la imagen no carga, cae al color o al fallback.
 * Las clases (anillo, borde, márgenes) se pasan directo al círculo.
 */
const props = withDefaults(
  defineProps<{
    /** Con el id se busca su imagen / color; sin id es un círculo de iniciales. */
    userId?: number | null
    /** Apariencia explícita (vista previa de un formulario); si se pasa, no se busca por `userId`. */
    appearance?: ProfileAppearance | null
    /** Respaldo mientras no se conozcan el nombre y apellido del usuario (con `userId` se usan las iniciales reales). */
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
    appearance: undefined,
    size: 32,
    fontSize: undefined,
    fallbackColor: '#64748b',
  },
)

const looked = useProfileAppearance(() => props.userId)
const realInitials = useProfileInitials(() => props.userId)
const displayInitials = computed(() => realInitials.value ?? props.initials)
const resolved = computed(() => (props.appearance !== undefined ? props.appearance : looked.value))

const imageFailed = ref(false)
watch(() => resolved.value?.image, () => {
  imageFailed.value = false
})

const image = computed(() => (imageFailed.value ? null : resolved.value?.image ?? null))
const backgroundColor = computed(() => resolved.value?.color ?? props.fallbackColor)
const textColor = computed(() => (resolved.value?.color ? readableTextColor(resolved.value.color) : '#ffffff'))
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
    <template v-else>{{ displayInitials }}</template>
  </span>
</template>
