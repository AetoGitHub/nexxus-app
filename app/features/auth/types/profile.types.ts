/** Perfil de usuario (GET /api/auth/profiles/). */
export interface AuthProfile {
  id: number
  username: string
  first_name?: string
  last_name?: string
  selected_company: number | null
}
