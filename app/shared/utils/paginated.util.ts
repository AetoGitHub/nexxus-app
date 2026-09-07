import type { InfiniteData } from '@tanstack/vue-query'
import type { PaginatedResponse } from '~/shared/types/api.types'

function isInfiniteData<T>(
  data: unknown,
): data is InfiniteData<PaginatedResponse<T>> {
  return !!data
    && typeof data === 'object'
    && 'pages' in data
    && Array.isArray((data as InfiniteData<PaginatedResponse<T>>).pages)
}

/** Extrae `results` de páginas infinitas, respuestas paginadas o arrays crudos. */
export function extractResults<T>(
  data: PaginatedResponse<T> | InfiniteData<PaginatedResponse<T>> | T[] | undefined | null,
): T[] {
  if (!data) {
    return []
  }
  if (Array.isArray(data)) {
    return data
  }
  if (isInfiniteData<T>(data)) {
    return data.pages.flatMap(page => page.results ?? [])
  }
  return data.results ?? []
}

/** Convierte un `next` absoluto de DRF a path relativo para `$api`. */
export function toRelativeApiUrl(url: string): string {
  try {
    const parsedUrl = new URL(url)
    return `${parsedUrl.pathname}${parsedUrl.search}`
  }
  catch {
    return url
  }
}

/** Siguiente pageParam a partir del `next` paginado del backend. */
export function getPaginatedNextPageParam<T>(
  lastPage: PaginatedResponse<T>,
): string | undefined {
  return lastPage.next ? toRelativeApiUrl(lastPage.next) : undefined
}
