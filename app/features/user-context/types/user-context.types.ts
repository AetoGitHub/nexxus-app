export interface UpdateUserContextPayload {
  selected_company: number
}

export interface UpdateUserContextVariables {
  id: number
  payload: UpdateUserContextPayload
}

export interface UserContextResponse {
  id: number
  selected_company: number
}

export interface EditingUserContext {
  profileId: number
  currentCompanyId: number | null
}
