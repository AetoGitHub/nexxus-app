import type { MaybeRefOrGetter } from 'vue'

/**
 * Filtra en cliente contra la primera página; si no hay match,
 * expone el término ya debounced para buscar en la API.
 */
export function useLocalFirstSearch<T extends { label: string }>(
  searchTerm: MaybeRefOrGetter<string>,
  localItems: MaybeRefOrGetter<T[]>,
  debounceMs = 300,
) {
  const term = computed(() => toValue(searchTerm).trim())
  const debouncedTerm = refDebounced(term, debounceMs)

  const filteredLocal = computed(() => {
    const items = toValue(localItems)
    if (!term.value) {
      return items
    }
    const query = term.value.toLowerCase()
    return items.filter(item => item.label.toLowerCase().includes(query))
  })

  const remoteSearch = computed(() => {
    if (!debouncedTerm.value || debouncedTerm.value !== term.value) {
      return undefined
    }
    return filteredLocal.value.length === 0 ? debouncedTerm.value : undefined
  })

  const isAwaitingRemote = computed(() =>
    term.value.length > 0
    && filteredLocal.value.length === 0
    && !remoteSearch.value,
  )

  return { term, filteredLocal, remoteSearch, isAwaitingRemote }
}
