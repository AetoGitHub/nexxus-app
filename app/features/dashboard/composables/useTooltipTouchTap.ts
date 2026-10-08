/**
 * Estado de un tooltip controlado que también abre y cierra con un tap en pantallas táctiles (sin hover).
 * El tooltip de Reka cierra al hacer clic en su disparador, así que mientras dura un tap se ignoran sus cierres y el
 * tap lo maneja este composable. El `pointerdown` debe ir en captura para marcar el tap antes que los manejadores de Reka.
 *
 * @example
 * const { open, onPointerDown, endTouchTap, onUpdateOpen, onClick } = useTooltipTouchTap()
 * // <UTooltip :open="open" @update:open="onUpdateOpen">
 * //   <button @pointerdown.capture="onPointerDown" @pointerup="endTouchTap" @pointercancel="endTouchTap" @click="onClick" />
 */
export function useTooltipTouchTap() {
  const open = ref(false)

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

  return { open, onPointerDown, endTouchTap, onUpdateOpen, onClick }
}
