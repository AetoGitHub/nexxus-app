import type { UserCompanyMembership } from '~/features/company-memberships/types/company-membership.types'

export interface UserProfile {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  corporate_email: string
  whatsapp: string
  organization: number
  organization_name: string
  selected_company: number | null
  selected_company_name: string | null
  /** Fondo del círculo: vacío o `null` si el perfil no tiene configuración. */
  background_color?: string | null
  background_image?: string | null
  company_memberships: UserCompanyMembership[]
}

export interface UserProfileDetail {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  corporate_email: string
  whatsapp: string
  organization?: number | null
  background_color?: string | null
  background_image?: string | null
}

export interface CreateUserPayload {
  username: string
  password: string
  organization: number
  company: number
  first_name: string
  last_name: string
  email: string
  corporate_email: string
  whatsapp: string
  /** `#rrggbb` o `''` (sin color). */
  background_color?: string
  /** URL de la foto o `''` (sin foto). */
  background_image?: string
}

export interface UpdateUserPayload {
  username: string
  first_name: string
  last_name: string
  email: string
  corporate_email: string
  whatsapp: string
  /** `#rrggbb` o `''` (sin color). */
  background_color?: string
  /** URL de la foto o `''` (sin foto). */
  background_image?: string
}

export interface UpdateUserVariables {
  id: number
  payload: UpdateUserPayload
}

export interface ChangePasswordPayload {
  old_password: string
  password1: string
  password2: string
}

export interface ChangePasswordVariables {
  id: number
  payload: ChangePasswordPayload
}

export interface BulkCreateUserItem {
  username: string
  first_name: string
  last_name: string
  email: string
  whatsapp: string
}

export interface BulkCreateUsersPayload {
  organization: number
  company: number
  users: BulkCreateUserItem[]
}

export interface BulkCreatedUserCredential {
  username: string
  password: string
}
