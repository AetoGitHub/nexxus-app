/** Lo mínimo que hace falta de una tarea (de lista, kanban o detalle) para saber quién participa. */
interface TaskAccessSource {
  assigned_to?: Array<{ id: number }> | null
  close_approvals?: Array<{ profile: number }> | null
  /** Backlog: aún sin asignar, no tiene participantes. */
  backlog?: boolean
}

/**
 * El usuario es parte de la tarea: está entre los asignados o, en cierre
 * múltiple, entre quienes deben confirmar el cierre.
 */
export function isTaskParticipant(task: TaskAccessSource, userId: number | null | undefined): boolean {
  if (userId == null) {
    return false
  }
  return (task.assigned_to ?? []).some(assignee => assignee.id === userId)
    || (task.close_approvals ?? []).some(approval => approval.profile === userId)
}

/**
 * Puede modificar la tarea (editar, archivar/desarchivar/eliminar, cambiarla de
 * estado al arrastrarla). Quien no es parte solo la consulta. Las tareas de
 * backlog todavía no tienen asignados, así que cualquiera puede gestionarlas.
 */
export function canModifyTask(task: TaskAccessSource, userId: number | null | undefined): boolean {
  return task.backlog === true || isTaskParticipant(task, userId)
}
