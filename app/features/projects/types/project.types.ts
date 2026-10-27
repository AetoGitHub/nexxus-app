export interface Project {
  id: number
  name: string
}

export interface ProjectMember {
  id: number
  username: string
  first_name?: string
  last_name?: string
}

/** Proyecto de empresa (GET /api/enterprise/projects/). */
export interface EnterpriseProject {
  id: number
  name: string
  color: string
  /** `null` en un proyecto privado (no pertenece a ninguna compañía). */
  company: number | null
  /** Proyecto privado del usuario: solo él lo ve; sin compañía. */
  is_personal?: boolean
  members: ProjectMember[]
  /** Responsable del proyecto (opcional: los proyectos anteriores no lo tienen). */
  responsible: number | null
  responsible_username?: string
  responsible_first_name?: string
  responsible_last_name?: string
  task_count: number
}

export interface CreateEnterpriseProjectPayload {
  name: string
  company: number
  color: string
  members: number[]
  responsible: number | null
}

/** Proyecto privado (GET /api/enterprise/projects/private/): mismos campos que uno de empresa, con `is_personal: true` y `company: null`. */
export type PrivateProject = EnterpriseProject

export interface CreatePrivateProjectPayload {
  name: string
  /** Color nombrado o hex; opcional. */
  color?: string
}

export interface PublishProjectPayload {
  company: number
}

export interface UpdateEnterpriseProjectPayload {
  name: string
  company: number
  color: string
  members: number[]
  responsible: number | null
}

export interface ThemeColorOption {
  name: string
  hex: string
}

/** Colores nombrados que el backend espera en `color`. */
export const THEME_COLORS: readonly ThemeColorOption[] = [
  { name: 'blue', hex: '#4c6ef5' },
  { name: 'teal', hex: '#28ceab' },
  { name: 'amber', hex: '#f59e0b' },
  { name: 'red', hex: '#ef4444' },
  { name: 'purple', hex: '#8b5cf6' },
  { name: 'green', hex: '#22c55e' },
  { name: 'cyan', hex: '#0ea5e9' },
  { name: 'pink', hex: '#ec4899' },
  { name: 'orange', hex: '#f97316' },
  { name: 'slate', hex: '#64748b' },
] as const

export const DEFAULT_THEME_COLOR = '#64748b'
