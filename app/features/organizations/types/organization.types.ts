export interface Organization {
  id: number
  name: string
  created_at: string
}

export interface OrganizationDetail extends Organization {
  updated_at: string
}

export interface CreateOrganizationPayload {
  name: string
}

export type UpdateOrganizationPayload = CreateOrganizationPayload

export interface UpdateOrganizationVariables {
  id: number
  payload: UpdateOrganizationPayload
}
