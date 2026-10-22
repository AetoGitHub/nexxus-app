/** Minúsculas y sin acentos: «Operación» y «operacion» se comparan igual en un buscador. */
export function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** `true` si el texto contiene la búsqueda (sin importar acentos ni mayúsculas); una búsqueda vacía coincide con todo. */
export function matchesSearch(text: string | null | undefined, query: string): boolean {
  const needle = normalizeSearchText(query)
  return !needle || normalizeSearchText(text).includes(needle)
}
