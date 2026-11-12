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
      { key: 'can_voice', labelKey: 'permissions.fields.task.can_voice' },
      { key: 'can_view_history', labelKey: 'permissions.fields.task.can_view_history' },
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
      { key: 'can_view_groups', labelKey: 'permissions.fields.settings.can_view_groups' },
      { key: 'can_create_groups', labelKey: 'permissions.fields.settings.can_create_groups' },
      { key: 'can_update_groups', labelKey: 'permissions.fields.settings.can_update_groups' },
    ],
  },
  {
    id: 'master',
    icon: 'i-lucide-building-2',
    allowLabelKey: 'permissions.fields.master.allow',
    fields: [
      { key: 'can_organizations', labelKey: 'permissions.fields.master.can_organizations' },
      { key: 'can_companies', labelKey: 'permissions.fields.master.can_companies' },
      { key: 'can_users', labelKey: 'permissions.fields.master.can_users' },
    ],
  },
]

const MODULE_IDS: PermissionModule[] = PERMISSION_MODULES.map(module => module.id)

/** Todo negado: así arranca una plantilla nueva (el backend deja en false lo que no se manda). */
export function denyAllBlocks(): PermissionBlocks {
  const blocks = {} as Record<PermissionModule, Record<string, boolean>>
  for (const module of PERMISSION_MODULES) {
    blocks[module.id] = { allow: false }
    for (const field of module.fields) {
      blocks[module.id][field.key] = false
    }
  }
  return blocks as unknown as PermissionBlocks
}

/** Copia solo los 5 bloques (sin id/name/profile…), para usarla como borrador editable. */
export function pickBlocks(source: PermissionBlocks): PermissionBlocks {
  const blocks = {} as Record<PermissionModule, Record<string, boolean>>
  const empty = denyAllBlocks()
  for (const id of MODULE_IDS) {
    // Un bloque que el backend aún no manda (p. ej. un módulo nuevo) arranca negado en vez de romper la matriz.
    blocks[id] = {
      ...(empty[id] as unknown as Record<string, boolean>),
      ...((source[id] ?? {}) as unknown as Record<string, boolean>),
    }
  }
  return blocks as unknown as PermissionBlocks
}

/** Solo los bloques y campos que cambiaron; `null` si no hay cambios. */
export function diffBlocks(source: PermissionBlocks, draft: PermissionBlocks): PermissionBlocksPatch | null {
  // Normalizado igual que el borrador: un bloque ausente cuenta como «todo negado», no como cambio.
  const original = pickBlocks(source)
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
