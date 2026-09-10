/**
 * Fuerza la descarga de un archivo remoto (potencialmente cross-origin) con el
 * nombre indicado, en vez de dejar que el navegador lo abra/previsualice.
 *
 * Requiere que el origen permita CORS para `fetch`. Si no (p. ej. el bucket
 * de Firebase Storage no tiene CORS configurado), cae a abrirlo en una
 * pestaña nueva para que el usuario pueda guardarlo desde ahí.
 */
export async function downloadFileFromUrl(url: string, fileName: string): Promise<void> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('download_failed')
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(objectUrl)
  }
  catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
