/** Respuesta del webhook de voz de n8n (`nexxus-voz`): la tarea que entendió la IA a partir del audio. */
export interface VoiceTaskResponse {
  name: string
  description: string
  task_type: string
  project_id: number | null
  /** `YYYY-MM-DD`. */
  due_date: string | null
  assignee_ids: number[]
  urgent: boolean
  /** `rapida` | `normal` | `compleja`; el formulario usa `quick` | `normal` | `complex`. */
  effort: string
  subtasks: unknown[]
  in_backlog: boolean
  /** Lo que dijo, en texto. */
  transcript: string
  /** Con `true` no se crea la tarea directo: se muestra el formulario prellenado con las dudas. */
  needs_review: boolean
  ambiguities: string[]
}

/** Persona o proyecto que se le manda a la IA para resolver nombres (`users` / `projects`). */
export interface VoiceTaskCatalogItem {
  id: number
  name: string
}

/** Contexto que se manda junto con el audio. */
export interface VoiceTaskRequestContext {
  userId: number
  users: VoiceTaskCatalogItem[]
  projects: VoiceTaskCatalogItem[]
  defaultProjectId?: number | null
}

export type VoiceRecorderStatus = 'idle' | 'recording' | 'processing'
