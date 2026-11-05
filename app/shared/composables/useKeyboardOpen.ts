/**
 * Marca `<html data-keyboard-open>` mientras hay un campo de texto enfocado en un dispositivo táctil (teclado en
 * pantalla). El CSS esconde con eso lo marcado con `data-hide-on-keyboard` (barra inferior, botones flotantes), que de
 * otro modo se apilan sobre el teclado y le quitan espacio a lo que se está escribiendo.
 */
export function useKeyboardOpen() {
  if (import.meta.server) {
    return
  }

  const isTouch = useMediaQuery('(pointer: coarse)')

  function isTextField(el: Element | null): boolean {
    return el instanceof HTMLElement
      && el.matches('textarea, [contenteditable="true"], input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="file"]):not([type="range"])')
  }

  function set(open: boolean) {
    document.documentElement.toggleAttribute('data-keyboard-open', open)
  }

  useEventListener(document, 'focusin', (event) => {
    if (isTouch.value && isTextField(event.target as Element | null)) {
      set(true)
    }
  })

  useEventListener(document, 'focusout', () => {
    // El foco pasa de un campo a otro en medio de un focusout/focusin: se revisa después.
    setTimeout(() => {
      if (!isTextField(document.activeElement)) {
        set(false)
      }
    }, 80)
  })

  onScopeDispose(() => set(false))
}
