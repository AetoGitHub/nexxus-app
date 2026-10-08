/** Perfil de usuario (GET /api/auth/profiles/). */
export interface AuthProfile {
  id: number
  username: string
  first_name?: string
  last_name?: string
  email?: string
  corporate_email?: string
  /** Solo en el detalle del perfil (`GET /api/auth/profiles/<id>/`). */
  company_memberships?: { id: number, company: number, company_name: string }[]
  managed_groups?: { id: number, name: string }[]
  member_groups?: { id: number, name: string }[]
  projects?: { id: number, name: string }[]
  selected_company: number | null
  /** Fondo del círculo del usuario; `null` o vacío si no tiene configuración. */
  background_color?: string | null
  background_image?: string | null
}
