import type { PermissionBlocks, PermissionModule } from '~/shared/types/auth.types'

/** Plantilla de permisos (GET /api/auth/permissions/presets/). */
export interface PermissionPreset extends PermissionBlocks {
  id: number
  name: string
}

/** Lista paginada por cursor (sin `count`). */
export interface CursorPage<T> {
  next: string | null
  previous: string | null
  results: T[]
}

/** Cambios por bloque y campo (lo que se manda en un PATCH). */
export type PermissionBlocksPatch = {
  [M in PermissionModule]?: Partial<PermissionBlocks[M]>
}

/** Campo editable de un módulo (checkbox de la matriz). */
export interface PermissionFieldDef {
  key: string
  labelKey: string
  /** Aún sin uso en la app (dashboard create/update/delete). */
  comingSoon?: boolean
}

export interface PermissionModuleDef {
  id: PermissionModule
  icon: string
  /** Etiqueta propia del switch `allow` (por defecto «Acceso al módulo»). */
  allowLabelKey?: string
  fields: PermissionFieldDef[]
}
