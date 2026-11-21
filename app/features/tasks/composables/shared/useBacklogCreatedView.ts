/**
 * Botón «Creadas por mí» de la columna Backlog del Kanban: cambia la consulta de esa columna a
 * GET /created/ (tareas que creé y en las que no estoy asignado). Vive en memoria: se limpia al cerrar sesión.
 */
export function useBacklogCreatedView() {
  const created = useState<boolean>('backlog-created', () => false)
  return { created }
}
