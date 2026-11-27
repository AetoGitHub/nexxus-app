import type { PermissionBlocks, PermissionModule } from '~/shared/types/auth.types'

/**
 * Plantilla de permisos (GET /api/auth/permissions/presets/). `company` null = general (se aplica en cualquier
 * compañía); con id, solo se aplica en esa compañía.
 */
export interface PermissionPreset extends PermissionBlocks {
  id: number
  name: string
  company: number | null
  company_name: string | null
}

/** Módulos que guarda un Preset App (el backend rechaza cualquier otro bloque con 400). */
export const PRESET_APP_MODULES = ['task', 'settings'] as const satisfies readonly PermissionModule[]

export type PresetAppModule = (typeof PRESET_APP_MODULES)[number]

export type PresetAppBlocks = Pick<PermissionBlocks, PresetAppModule>

/**
 * Preset App (GET /api/auth/permissions/presets_app/): plantilla de `task` y `settings` de una compañía, con dueño
 * (`profile`, quien la creó). Solo se aplica a usuarios de esa compañía.
 */
export interface PresetApp extends PresetAppBlocks {
  id: number
  name: string
  company: number
  company_name: string
  profile: number
  profile_name: string
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
