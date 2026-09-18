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
