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
  company: number
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
