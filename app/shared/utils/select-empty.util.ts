import type { SelectItem } from '@nuxt/ui'

/** Item deshabilitado: USelect no tiene slot empty y el menú queda en una línea. */
export const SELECT_EMPTY_VALUE = '__empty__'

/** Si no hay opciones (y no está cargando), muestra un ítem no seleccionable. */
export function withEmptySelectItems(
  items: SelectItem[],
  emptyLabel: string,
  options?: { pending?: boolean },
): SelectItem[] {
  if (options?.pending || items.length > 0) {
    return items
  }

  return [{
    label: emptyLabel,
    value: SELECT_EMPTY_VALUE,
    disabled: true,
  }]
}
