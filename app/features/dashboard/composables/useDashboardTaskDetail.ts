/**
 * Detalle de una tarea abierto desde el Dashboard (clic en una tarjeta del detalle de TCT / TC). El estado es compartido:
 * la página monta una sola vez el `TaskNewTaskSlideover` y cualquier tarjeta pide abrirlo con `openTask`.
 *
 * Mientras `open` es `true` la lista de tareas que lo abrió se queda abierta (ver `DashboardTaskListButton`), así al cerrar
 * el detalle se puede seguir con el scroll de la lista y abrir la siguiente tarea.
 */
export function useDashboardTaskDetail() {
  const open = useState<boolean>('dashboard-task-detail-open', () => false)
  const taskId = useState<number | null>('dashboard-task-detail-id', () => null)

  function openTask(id: number) {
    taskId.value = id
    open.value = true
  }

  return { open, taskId, openTask }
}
