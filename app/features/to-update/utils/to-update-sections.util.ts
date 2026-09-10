import type { ToUpdateSectionId } from '~/features/to-update/types/to-update.types'

/** Definición estática de secciones (colores y labels). */
export const TO_UPDATE_SECTION_META: Record<
  ToUpdateSectionId,
  { labelKey: string, color: string, defaultOpen?: boolean, collapsible?: boolean }
> = {
  unattended: {
    labelKey: 'tasks.toUpdate.sections.unattended',
    color: '#8b5cf6',
    defaultOpen: false,
    collapsible: true,
  },
  pending: {
    labelKey: 'tasks.toUpdate.sections.pending',
    color: '#6b7280',
  },
  urgent: {
    labelKey: 'tasks.toUpdate.sections.urgent',
    color: '#dc2626',
  },
  delayed: {
    labelKey: 'tasks.toUpdate.sections.delayed',
    color: '#f97316',
  },
  critical: {
    labelKey: 'tasks.toUpdate.sections.critical',
    color: '#991b1b',
  },
  accepted: {
    labelKey: 'tasks.toUpdate.sections.accepted',
    color: '#28ceab',
  },
}

export const TO_UPDATE_SECTION_ORDER: ToUpdateSectionId[] = [
  'unattended',
  'pending',
  'urgent',
  'delayed',
  'critical',
  'accepted',
]
