/** Perfil de usuario (GET /api/auth/profiles/). */
export interface AuthProfile {
  id: number
  username: string
  first_name?: string
  last_name?: string
  selected_company: number | null
  /** Fondo del círculo del usuario; `null` o vacío si no tiene configuración. */
  background_color?: string | null
  background_image?: string | null
}
