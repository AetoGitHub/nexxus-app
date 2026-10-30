/**
 * Filtro «Asignadas a mí» del backlog («Mi backlog»): manda ?assigned_to=<mi id> a la lista y al contador del backlog.
 * El estado es uno solo para la Lista y el Kanban (se ve igual en ambas vistas) y vive en memoria: se limpia al cerrar sesión.
 */
export function useBacklogMine() {
  const { user } = useAuth()
  const mine = useState<boolean>('backlog-mine', () => false)

  /** Query extra del backlog; sin el filtro (o sin sesión) no se agrega nada y la caché es la de siempre. */
  const extraQuery = computed<Record<string, string> | undefined>(() =>
    mine.value && user.value?.id != null ? { assigned_to: String(user.value.id) } : undefined,
  )

  return { mine, extraQuery }
}
