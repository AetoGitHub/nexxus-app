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
}

export interface CreateUserPayload {
  username: string
  password: string
  first_name: string
  last_name: string
  email: string
  corporate_email: string
  whatsapp: string
}

export type UpdateUserPayload = Omit<CreateUserPayload, 'password'>

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
  email: string
  whatsapp: string
}

export interface BulkCreateUsersPayload {
  organization: number
  company: number
  users: BulkCreateUserItem[]
}
