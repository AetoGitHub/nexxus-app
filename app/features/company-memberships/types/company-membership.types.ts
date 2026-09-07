export interface CompanyMembership {
  id: number
  profile: number
  company: number
}

export interface UserCompanyMembership {
  id: number
  company: number
  company_name: string
  created_at: string
}

export interface CreateCompanyMembershipPayload {
  profile: number
  company: number
}

export interface UpdateCompanyMembershipPayload {
  company: number
}

export interface UpdateCompanyMembershipVariables {
  id: number
  payload: UpdateCompanyMembershipPayload
}

export interface EditingCompanyMembership {
  id: number
  company: number
  companyName: string
}

export interface NewCompanyMembershipContext {
  profileId: number
  existingCompanyIds: number[]
}
