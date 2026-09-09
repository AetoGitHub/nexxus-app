/**
 * Sube un archivo directo a Firebase Storage vía el webhook de n8n
 * (`upload-firebase-general`). El backend nunca recibe el archivo crudo:
 * solo la URL resultante que este composable devuelve.
 *
 * Contrato confirmado contra el webhook: `path` es el directorio destino
 * (sin nombre de archivo), el archivo va en el campo `file` del
 * multipart/form-data con su nombre final ya resuelto, y la respuesta es
 * `{ url: string }`.
 */
export function useFirebaseUpload() {
  const { public: { n8nUploadUrl } } = useRuntimeConfig()

  async function uploadFile(file: File, directory: string, fileName: string): Promise<string> {
    const body = new FormData()
    body.append('file', file, fileName)

    const response = await $fetch<{ url: string }>(n8nUploadUrl as string, {
      method: 'POST',
      query: { path: directory },
      body,
    })

    return response.url
  }

  return { uploadFile }
}
