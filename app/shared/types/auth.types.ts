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
}

export type ProfileDefaultView = 'list' | 'kanban' | 'calendar'

export interface ProfileConfiguration {
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

export interface WsTicketResponse {
  ticket: string
  expires_in: number
}
