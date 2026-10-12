import type { TaskRepeatConfig } from '~/features/tasks/types/task.types'

/**
 * Respuesta del webhook de voz de n8n (`nexxus-voz`): la tarea que entendió la IA a partir del audio.
 * Es la forma YA normalizada (`normalizeVoiceTask`): el webhook puede devolver alias (ver el contrato en
 * `voice-task.util.ts`) y el frontend los reduce a estos campos.
 */
export interface VoiceTaskResponse {
  name: string
  description: string
  /** `manual` | `repeat` | `volume` | `multiple_close` (se normalizan alias como `repetitiva` o `recurrente`). */
  task_type: string
  project_id: number | null
  /** `YYYY-MM-DD`. */
  due_date: string | null
  assignee_ids: number[]
  urgent: boolean
  /** `rapida` | `normal` | `compleja` (o `quick` | `normal` | `complex`); vacío si no se mencionó. */
  effort: string
  subtasks: unknown[]
  in_backlog: boolean
  /** Configuración de repetición cuando `task_type` es `repeat`; `null` si el audio no la trae. */
  repeat_config: TaskRepeatConfig | null
  /** La frecuencia no se dijo ni vino del webhook: se tomó un valor por defecto y la persona debe revisarla. */
  repeat_assumed: boolean
  /** Lo que dijo, en texto. */
  transcript: string
  /** Con `true` no se crea la tarea directo: se muestra el formulario prellenado con las dudas. */
  needs_review: boolean
  ambiguities: string[]
}

/** Persona o proyecto que se le manda a la IA para resolver nombres (`users` / `projects`). */
export interface VoiceTaskCatalogItem {
  id: number
  /** Nombre completo (o el nombre del proyecto). */
  name: string
  /** Solo usuarios: nombre de usuario. */
  username?: string
  first_name?: string
  last_name?: string
  /** Solo usuarios: formas cortas con las que suelen nombrarlo («Guillermo», «Franco», «Guillermo Franco»). */
  aliases?: string[]
}

/** Contexto que se manda junto con el audio. */
export interface VoiceTaskRequestContext {
  userId: number
  users: VoiceTaskCatalogItem[]
  projects: VoiceTaskCatalogItem[]
  defaultProjectId?: number | null
}

export type VoiceRecorderStatus = 'idle' | 'recording' | 'processing'
