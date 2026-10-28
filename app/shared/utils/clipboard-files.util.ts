const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
}

/** Nombre genérico que el navegador le pone a una captura pegada («image.png»), o ninguno. */
const GENERIC_NAME = /^image\.[a-z0-9]+$/i

function pad(value: number) {
  return String(value).padStart(2, '0')
}

/** `captura-2026-10-28-153012.png`: un nombre que se distingue en el chat y en la lista de adjuntos. */
function screenshotName(type: string, index: number, now: Date) {
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const extension = EXTENSION_BY_TYPE[type] ?? 'png'
  return `captura-${stamp}${index > 0 ? `-${index + 1}` : ''}.${extension}`
}

/**
 * Archivos que trae un evento de pegado (una captura de pantalla, una imagen copiada, archivos copiados del explorador).
 * Si el portapapeles también trae texto, se devuelve `[]` y el pegado sigue su curso normal: copiar celdas de Excel o un
 * texto con formato no debe convertirse en adjunto. Las capturas llegan siempre como «image.png»; se renombran con la
 * fecha y la hora para que varias en el mismo mensaje no se confundan.
 */
export function pastedFiles(event: ClipboardEvent, now = new Date()): File[] {
  const data = event.clipboardData
  if (!data || data.files.length === 0) {
    return []
  }
  if (data.getData('text/plain').trim() !== '') {
    return []
  }

  return Array.from(data.files).map((file, index) =>
    !file.name || GENERIC_NAME.test(file.name)
      ? new File([file], screenshotName(file.type, index, now), { type: file.type, lastModified: now.getTime() })
      : file,
  )
}
