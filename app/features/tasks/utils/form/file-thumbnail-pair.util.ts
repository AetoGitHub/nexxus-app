import { THUMBNAIL_SUFFIX } from '~/shared/utils/file-thumbnail.util'

/**
 * Las miniaturas viajan en la misma lista de URLs que los archivos (`files`), porque cada URL de Firebase lleva su propio
 * token y la de la miniatura no se puede calcular a partir de la del archivo. Se emparejan por la ruta del objeto, que va
 * dentro de la URL: la miniatura de `.../123_informe.pdf` es `.../123_informe.pdf.thumb.png`.
 */

/** Ruta del objeto dentro de la URL de Firebase (decodificada y sin el token). */
function objectPath(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname)
  }
  catch {
    return url
  }
}

export interface FilesWithThumbnails {
  /** Archivos para mostrar: sin las miniaturas que acompañan a otro archivo de la lista. */
  files: string[]
  /** URL del archivo → URL de su miniatura. */
  thumbnails: Record<string, string>
}

/**
 * Separa los archivos de sus miniaturas. Una miniatura solo se oculta si su archivo está en la misma lista: un archivo
 * que el usuario subió con nombre `*.thumb.png` y sin pareja se sigue viendo como cualquier otro.
 */
export function splitFilesAndThumbnails(urls: string[]): FilesWithThumbnails {
  const urlByPath = new Map(urls.map(url => [objectPath(url), url]))
  const thumbnails: Record<string, string> = {}
  const hidden = new Set<string>()

  for (const url of urls) {
    const path = objectPath(url)
    if (!path.endsWith(THUMBNAIL_SUFFIX)) {
      continue
    }
    const fileUrl = urlByPath.get(path.slice(0, -THUMBNAIL_SUFFIX.length))
    if (fileUrl && fileUrl !== url) {
      thumbnails[fileUrl] = url
      hidden.add(url)
    }
  }

  return { files: urls.filter(url => !hidden.has(url)), thumbnails }
}

/** Quita un archivo de la lista junto con su miniatura (si la tiene), para no dejar miniaturas huérfanas. */
export function removeFileWithThumbnail(urls: string[], fileUrl: string): string[] {
  const thumbnail = splitFilesAndThumbnails(urls).thumbnails[fileUrl]
  return urls.filter(url => url !== fileUrl && url !== thumbnail)
}
