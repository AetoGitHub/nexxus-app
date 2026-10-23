export interface AuthCompany {
  id: number
  name: string
}

export interface AuthOrganization {
  id: number
  name: string
  companies: AuthCompany[]
}

export interface AuthManagedGroup {
  id: number
  name: string
}

export interface AuthProject {
  id: number
  name: string
}

export interface AuthUser {
  id: number
  username: string
  is_superuser: boolean
  managed_groups: AuthManagedGroup[]
  projects: AuthProject[]
  selected_company: AuthCompany | null
  /** El backend lo manda en true con contraseña temporal: hasta cambiarla solo deja usar el cambio de contraseña. */
  must_change_password?: boolean
}

export type ProfileDefaultView = 'list' | 'kanban' | 'calendar'

/** Interruptores de notificaciones del perfil (todos vienen en true por defecto). */
export const NOTIFICATION_PREFERENCE_KEYS = [
  'enable_token_notifications',
  'enable_message_notifications',
  'enable_phase_notifications',
  'enable_approval_notifications',
  'enable_tag_notifications',
  'enable_task_created_notifications',
  'enable_mention_notifications',
  'enable_notification_sound',
] as const

export type NotificationPreferenceKey = (typeof NOTIFICATION_PREFERENCE_KEYS)[number]

/** Ausentes en sesiones guardadas antes de existir: se leen como encendidos. */
export type NotificationPreferences = Partial<Record<NotificationPreferenceKey, boolean>>

export interface ProfileConfiguration extends NotificationPreferences {
  id: number
  enable_puesto_tasks: boolean
  enable_manual_tasks: boolean
  enable_repeat_tasks: boolean
  enable_trigger_tasks: boolean
  default_view: ProfileDefaultView
  show_system_messages: boolean
  /** Fondo del círculo del usuario: color `#RRGGBB` y URL de imagen. Vacío o ausente (sesión anterior) = sin valor. */
  background_color?: string | null
  background_image?: string | null
}

/** Lo que edita la pantalla de configuración; el fondo del perfil no se manda (el backend solo cambia lo que llega). */
export type UpdateProfileConfigurationPayload = Omit<ProfileConfiguration, 'id' | 'background_color' | 'background_image'>

export interface AuthLoginResponse {
  token: string
  user: AuthUser
  organization: AuthOrganization
  profile_configurations: ProfileConfiguration
}

export interface AuthSession {
  token: string
  user: AuthUser
  organization: AuthOrganization
  profile_configurations: ProfileConfiguration
}

export interface AuthLoginRequest {
  username: string
  password: string
}

export interface AuthPasswordChangeRequest {
  current_password: string
  new_password: string
}

export interface WsTicketResponse {
  ticket: string
  expires_in: number
}
