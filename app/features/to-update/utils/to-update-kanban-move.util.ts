import type { ToUpdateSectionId } from '~/features/to-update/types/to-update.types'
import { TO_UPDATE_SECTION_ORDER } from '~/features/to-update/utils/to-update-sections.util'

const SECTION_SET = new Set<string>(TO_UPDATE_SECTION_ORDER)

function isToUpdateSectionId(id: string | number): id is ToUpdateSectionId {
  return typeof id === 'string' && SECTION_SET.has(id)
}

/**
 * Solo permite avanzar un paso en la cadena lineal:
 * pending → urgent → delayed → critical → accepted.
 */
export function isToUpdateLinearMove(
  fromColumnId: string | number,
  toColumnId: string | number,
): boolean {
  if (!isToUpdateSectionId(fromColumnId) || !isToUpdateSectionId(toColumnId)) {
    return false
  }

  const fromIndex = TO_UPDATE_SECTION_ORDER.indexOf(fromColumnId)
  const toIndex = TO_UPDATE_SECTION_ORDER.indexOf(toColumnId)

  return fromIndex >= 0 && toIndex === fromIndex + 1
}
