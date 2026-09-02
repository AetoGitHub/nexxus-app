export interface UserProfile {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  corporate_email: string
  whatsapp: string
  selected_company: number | null
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
