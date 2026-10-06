<script setup lang="ts">
import type { MetricKey } from '~/features/dashboard/types/dashboard.types'

/**
 * Texto de una métrica con un ícono ⓘ y un tooltip con su nombre completo y qué mide.
 * Abre con hover, con foco de teclado (`tab`) y con tap en pantallas táctiles. Los textos viven en
 * `dashboard.metrics.<metric>.title|description` (i18n).
 *
 * @example <MetricTooltip metric="tct">TCT</MetricTooltip>
 */
const props = defineProps<{
  metric: MetricKey
}>()

// Los atributos (clases de tipografía, truncado...) van al botón, que es lo que se ve.
defineOptions({ inheritAttrs: false })

const { t } = useI18n()

const title = computed(() => t(`dashboard.metrics.${props.metric}.title`))
const description = computed(() => t(`dashboard.metrics.${props.metric}.description`))

const open = ref(false)

/**
 * En touch no hay hover: el tap debe abrir y cerrar el tooltip. El tooltip de Reka cierra al hacer clic en su
 * disparador, así que mientras dura un tap se ignoran sus cierres y el tap lo maneja este componente.
 * El `pointerdown` va en captura para marcar el tap antes que los manejadores de Reka.
 */
let touchTap = false
let touchTimer: ReturnType<typeof setTimeout> | undefined

function onPointerDown(event: PointerEvent) {
  clearTimeout(touchTimer)
  touchTap = event.pointerType === 'touch'
}

/** El clic llega justo después de soltar el dedo; pasado ese momento los cierres de Reka (tap afuera, etc.) vuelven a valer. */
function endTouchTap() {
  clearTimeout(touchTimer)
  touchTimer = setTimeout(() => {
    touchTap = false
  }, 100)
}

function onUpdateOpen(value: boolean) {
  if (touchTap) {
    return
  }
  open.value = value
}

function onClick() {
  if (touchTap) {
    open.value = !open.value
  }
}

onBeforeUnmount(() => clearTimeout(touchTimer))
</script>

<template>
  <UTooltip
    :open="open"
    :content="{ side: 'top', align: 'center', sideOffset: 6 }"
    :ui="{ content: 'h-auto max-w-[280px] items-start p-2.5' }"
    @update:open="onUpdateOpen"
  >
    <button
      v-bind="$attrs"
      type="button"
      class="inline-flex max-w-full cursor-help items-center gap-1 rounded-sm text-[length:inherit] [font:inherit] [letter-spacing:inherit] [text-transform:inherit] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aeto-teal"
      @pointerdown.capture="onPointerDown"
      @pointerup="endTouchTap"
      @pointercancel="endTouchTap"
      @click="onClick"
    >
      <span class="min-w-0 truncate">
        <slot />
      </span>
      <UIcon
        name="i-lucide-info"
        class="size-3 shrink-0 opacity-60"
        aria-hidden="true"
      />
    </button>

    <template #content>
      <div class="space-y-1 text-left">
        <p class="text-xs font-semibold text-foreground">
          {{ title }}
        </p>
        <p class="text-xs font-normal normal-case tracking-normal text-muted-foreground">
          {{ description }}
        </p>
      </div>
    </template>
  </UTooltip>
</template>
