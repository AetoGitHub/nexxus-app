import type { PermissionBlocks, PermissionModule } from '~/shared/types/auth.types'
import type { PermissionBlocksPatch, PermissionModuleDef } from '~/features/permissions/types/permissions.types'

/** Módulos y sus checkboxes, en el orden en que se muestran. */
export const PERMISSION_MODULES: PermissionModuleDef[] = [
  {
    id: 'task',
    icon: 'i-lucide-square-check-big',
    fields: [
      { key: 'can_view', labelKey: 'permissions.fields.task.can_view' },
      { key: 'can_create', labelKey: 'permissions.fields.task.can_create' },
      { key: 'can_update', labelKey: 'permissions.fields.task.can_update' },
      { key: 'can_delete', labelKey: 'permissions.fields.task.can_delete' },
      { key: 'can_view_all', labelKey: 'permissions.fields.task.can_view_all' },
      { key: 'can_view_approvals', labelKey: 'permissions.fields.task.can_view_approvals' },
    ],
  },
  {
    id: 'report',
    icon: 'i-lucide-file-chart-column',
    fields: [
      { key: 'can_view', labelKey: 'permissions.fields.report.can_view' },
      { key: 'can_generate', labelKey: 'permissions.fields.report.can_generate' },
      { key: 'can_update', labelKey: 'permissions.fields.report.can_update' },
    ],
  },
  {
    id: 'dashboard',
    icon: 'i-lucide-layout-dashboard',
    fields: [
      { key: 'can_view', labelKey: 'permissions.fields.dashboard.can_view' },
      { key: 'can_create', labelKey: 'permissions.fields.dashboard.can_create', comingSoon: true },
      { key: 'can_update', labelKey: 'permissions.fields.dashboard.can_update', comingSoon: true },
      { key: 'can_delete', labelKey: 'permissions.fields.dashboard.can_delete', comingSoon: true },
    ],
  },
  {
    id: 'settings',
    icon: 'i-lucide-settings',
    fields: [
      { key: 'can_projects', labelKey: 'permissions.fields.settings.can_projects' },
      { key: 'can_groups', labelKey: 'permissions.fields.settings.can_groups' },
      { key: 'can_general', labelKey: 'permissions.fields.settings.can_general' },
    ],
  },
]

const MODULE_IDS: PermissionModule[] = PERMISSION_MODULES.map(module => module.id)

/** Todo permitido (lo mismo que hace el backend con lo que no se manda al crear una plantilla). */
export function allowAllBlocks(): PermissionBlocks {
  const blocks = {} as Record<PermissionModule, Record<string, boolean>>
  for (const module of PERMISSION_MODULES) {
    blocks[module.id] = { allow: true }
    for (const field of module.fields) {
      blocks[module.id][field.key] = true
    }
  }
  return blocks as unknown as PermissionBlocks
}

/** Copia solo los 4 bloques (sin id/name/profile…), para usarla como borrador editable. */
export function pickBlocks(source: PermissionBlocks): PermissionBlocks {
  const blocks = {} as Record<PermissionModule, Record<string, boolean>>
  for (const id of MODULE_IDS) {
    blocks[id] = { ...(source[id] as unknown as Record<string, boolean>) }
  }
  return blocks as unknown as PermissionBlocks
}

/** Solo los bloques y campos que cambiaron; `null` si no hay cambios. */
export function diffBlocks(original: PermissionBlocks, draft: PermissionBlocks): PermissionBlocksPatch | null {
  const patch: Record<string, Record<string, boolean>> = {}
  for (const id of MODULE_IDS) {
    const before = original[id] as unknown as Record<string, boolean>
    const after = draft[id] as unknown as Record<string, boolean>
    for (const [key, value] of Object.entries(after)) {
      if (before?.[key] !== value) {
        patch[id] ??= {}
        patch[id][key] = value
      }
    }
  }
  return Object.keys(patch).length ? patch as PermissionBlocksPatch : null
}
