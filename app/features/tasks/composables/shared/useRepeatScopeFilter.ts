export type RepeatScopeMode = 'latest' | 'all'

/**
 * Qué se ve de las tareas repetitivas en «Pendiente» (Kanban) y en «Próximas» (lista). El backend genera sus ocurrencias con
 * meses de anticipación, así que por defecto se pide `repeats=latest` (una por serie: la próxima por vencer):
 * - `latest`: una por serie (default, botón sin seleccionar).
 * - `all`: todas las ocurrencias (`repeats=all`, botón seleccionado).
 *
 * Vive aparte de `TaskListFilters` a propósito: solo debe afectar a esa columna/sección y a su contador, no al resto. Cada
 * sitio tiene su propio estado (`key`) y se limpia al cerrar sesión (ver `useAuth`).
 */
export function useRepeatScopeFilter(key: string) {
  const mode = useState<RepeatScopeMode>(`repeat-scope-mode-${key}`, () => 'latest')

  const query = computed<Record<string, string>>(() => ({ repeats: mode.value }))

  return { mode, query }
}
