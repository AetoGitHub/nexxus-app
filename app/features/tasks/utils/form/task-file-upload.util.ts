/**
 * Directorio de Storage para archivos de mensajes de una tarea:
 * erp/task/{organization_id}/{company_id}/{task_id}/messages
 */
export function buildTaskMessageUploadDirectory(
  organizationId: number,
  companyId: number,
  taskId: number,
): string {
  return `erp/task/${organizationId}/${companyId}/${taskId}/messages`
}

/**
 * Directorio de Storage para documentos generales de una tarea (TaskFile):
 * erp/task/{organization_id}/{company_id}/{task_id}/documents
 */
export function buildTaskDocumentsUploadDirectory(
  organizationId: number,
  companyId: number,
  taskId: number,
): string {
  return `erp/task/${organizationId}/${companyId}/${taskId}/documents`
}

/**
 * Nombre final del archivo subido: {timestamp_ms}_{nombre_original}.
 * El timestamp evita colisiones entre archivos con el mismo nombre.
 */
export function buildTaskUploadFileName(originalName: string): string {
  return `${Date.now()}_${originalName}`
}

/**
 * Directorio de Storage para imágenes de una subtarea creada junto con la tarea:
 * erp/task/{organization_id}/{company_id}/subtasks/{subtask_key}
 * Sin task_id porque las subtareas se suben antes de que la tarea exista
 * (van dentro del propio body de POST /api/tasks/create/); `subtaskKey` es un
 * identificador local generado en el formulario para esa fila.
 */
export function buildTaskSubtaskUploadDirectory(
  organizationId: number,
  companyId: number,
  subtaskKey: string,
): string {
  return `erp/task/${organizationId}/${companyId}/subtasks/${subtaskKey}`
}
