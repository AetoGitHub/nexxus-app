import { generateFileThumbnail, thumbnailFileNameFor } from '~/shared/utils/file-thumbnail.util'

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

  /**
   * Sube el archivo y, si es de un tipo con miniatura (PDF, docx/xlsx/pptx y ODF con vista previa embebida), también su
   * miniatura `{fileName}.thumb.png` en el mismo directorio. Devuelve la URL del archivo y, si la hubo, la de la
   * miniatura (que viaja en la misma lista de `files`). Que la miniatura falle nunca hace fallar la subida.
   */
  async function uploadFileWithPreview(file: File, directory: string, fileName: string): Promise<string[]> {
    const [url, thumbnail] = await Promise.all([
      uploadFile(file, directory, fileName),
      generateFileThumbnail(file),
    ])
    if (!thumbnail) {
      return [url]
    }

    const thumbnailName = thumbnailFileNameFor(fileName)
    try {
      const thumbnailUrl = await uploadFile(new File([thumbnail], thumbnailName, { type: 'image/png' }), directory, thumbnailName)
      return [url, thumbnailUrl]
    }
    catch {
      return [url]
    }
  }

  return { uploadFile, uploadFileWithPreview }
}
