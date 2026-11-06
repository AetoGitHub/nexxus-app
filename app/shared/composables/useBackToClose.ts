import type { Ref } from 'vue'

interface PanelEntry {
  /** Nivel de apilado: 1 = el primer panel abierto, 2 = uno abierto encima de ese, etc. */
  level: number
}

/** Paneles abiertos con su entrada de historial, del más viejo al más nuevo (solo táctil). */
const openPanels: PanelEntry[] = []

let guardInstalled = false

/**
 * En el celular «Atrás» (gesto o botón del sistema) debe cerrar el panel que está abierto (hoja, modal, slideover) y no
 * sacar de la pantalla, que es lo que hace por defecto porque abrir un panel no crea una entrada de historial.
 *
 * Al abrirse el panel se agrega una entrada (`?panel=N`, N = nivel de apilado). Si se cierra a mano esa entrada se retira
 * con `router.back()`; si se vuelve atrás con el gesto, el nivel de la URL baja y se cierra el panel. Con paneles
 * apilados cada uno tiene su nivel y «Atrás» cierra primero el de arriba. En escritorio no hace nada.
 *
 * Un panel que ya está abierto al montarse (enlace directo a `?task=`) no agrega entrada: «Atrás» sale como con
 * cualquier enlace.
 *
 * Si el panel se cierra porque se va a navegar a otra pantalla (un enlace dentro de la hoja), hay que cerrarlo con
 * `closeForNavigation()` en vez de poner `open` en `false`: la navegación reemplaza la entrada del panel y no se hace
 * `back()` (cancelaría esa navegación).
 */
export function useBackToClose(open: Ref<boolean>) {
  if (import.meta.server || !window.matchMedia('(pointer: coarse)').matches) {
    return { closeForNavigation: () => { open.value = false } }
  }

  const route = useRoute()
  const router = useRouter()
  let entry: PanelEntry | null = null
  let skipBack = false

  // Ir a otra pantalla desde un panel reemplaza la entrada del panel en vez de apilarse sobre ella: así «Atrás» desde la
  // pantalla nueva vuelve a donde estaba el panel y no queda una entrada muerta (`?panel=1`) en medio.
  if (!guardInstalled) {
    guardInstalled = true
    router.beforeEach((to, from) => {
      if (from.query.panel == null || to.query.panel != null || to.redirectedFrom) {
        return
      }
      // Con el gesto «Atrás» el navegador ya cambió de entrada antes de que corra el guard: eso no es un enlace nuevo.
      const history = window.history.state as { current?: string } | null
      if (history?.current === to.fullPath && to.fullPath !== from.fullPath) {
        return
      }
      return { path: to.path, query: to.query, hash: to.hash, replace: true }
    })
  }

  function forget(current: PanelEntry) {
    const index = openPanels.indexOf(current)
    if (index !== -1) {
      openPanels.splice(index, 1)
    }
  }

  watch(open, (isOpen) => {
    if (isOpen && !entry) {
      entry = { level: openPanels.length + 1 }
      openPanels.push(entry)
      void router.push({ query: { ...route.query, panel: String(entry.level) } })
      return
    }

    if (!isOpen && entry) {
      const current = entry
      entry = null
      forget(current)
      if (skipBack) {
        skipBack = false
        return
      }
      if (Number(route.query.panel) >= current.level) {
        router.back()
      }
    }
  })

  // «Atrás» con el gesto: la URL baja de nivel y se cierran los paneles que quedaron por encima.
  watch(
    () => Number(route.query.panel) || 0,
    (depth) => {
      if (entry && entry.level > depth) {
        const current = entry
        entry = null
        forget(current)
        open.value = false
      }
    },
  )

  onBeforeUnmount(() => {
    if (entry) {
      forget(entry)
      entry = null
    }
  })

  function closeForNavigation() {
    skipBack = entry != null
    open.value = false
  }

  return { closeForNavigation }
}
