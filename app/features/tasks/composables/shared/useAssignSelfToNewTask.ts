/**
 * Preferencia persistida (localStorage) del switch "Agregarme a mí" al crear
 * una tarea: si está en `true`, el formulario de tarea nueva se precarga con
 * el usuario logueado en "Asignado a". Se recuerda entre sesiones.
 */
export function useAssignSelfToNewTask() {
  return useLocalStorage('nexxus-tasks-assign-self-on-create', true)
}
