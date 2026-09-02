export interface Company {
  id: number
  name: string
  razon_social: string
  regimen_fiscal: string
  direccion: string
  telefono: string
  organization: number
  created_at: string
}

export interface CompanyContact {
  id: number
  name: string
  phone: string
  email: string
}

export interface CompanyContactPayload {
  name: string
  phone: string
  email: string
}

export interface CompanyDetail extends Company {
  organization_name: string
  contacts: CompanyContact[]
  updated_at: string
}

export interface CreateCompanyPayload {
  name: string
  razon_social: string
  regimen_fiscal: string
  direccion: string
  telefono: string
  organization: number
  contacts: CompanyContactPayload[]
}

export type UpdateCompanyPayload = CreateCompanyPayload

export interface UpdateCompanyVariables {
  id: number
  payload: UpdateCompanyPayload
}
