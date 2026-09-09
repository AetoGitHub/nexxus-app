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
 * Nombre final del archivo subido: {timestamp_ms}_{nombre_original}.
 * El timestamp evita colisiones entre archivos con el mismo nombre.
 */
export function buildTaskUploadFileName(originalName: string): string {
  return `${Date.now()}_${originalName}`
}
