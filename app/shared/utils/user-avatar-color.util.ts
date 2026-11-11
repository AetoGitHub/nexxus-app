/**
 * Paleta única del círculo de usuario cuando su perfil no tiene imagen ni color propio. Cada persona tiene siempre el
 * mismo color (por su id) en toda la app: header, tarjetas, sidebar, chat, historial, configuración, dashboard…
 */
export const USER_AVATAR_COLORS = [
  '#f59e0b',
  '#28ceab',
  '#4c6ef5',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
  '#db2777',
  '#65a30d',
] as const

/** Color fijo del usuario (sin imagen ni color en su perfil). */
export function userAvatarColor(id: number): string {
  return USER_AVATAR_COLORS[Math.abs(id) % USER_AVATAR_COLORS.length]!
}
