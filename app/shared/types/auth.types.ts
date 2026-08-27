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

export interface AuthLoginResponse {
  token: string
  user: AuthUser
  organization: AuthOrganization
}

export interface AuthSession {
  token: string
  user: AuthUser
  organization: AuthOrganization
}

export interface AuthLoginRequest {
  username: string
  password: string
}

export interface WsTicketResponse {
  ticket: string
  expires_in: number
}
