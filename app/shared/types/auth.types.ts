export interface AuthCompany {
  id: number
  name: string
}

export interface AuthOrganization {
  id: number
  name: string
  companies: AuthCompany[]
}

export interface AuthUser {
  id: number
  username: string
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
}

export type UpdateProfileConfigurationPayload = Omit<ProfileConfiguration, 'id'>

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
