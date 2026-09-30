import type { TaskTokenByUser } from '~/features/tasks/types/task.types'

/** Nombre a mostrar de quien dio tokens: nombre completo, si no username, si no el texto de respaldo. */
export function tokenGiverName(giver: TaskTokenByUser, fallback: string): string {
  const fullName = `${giver.first_name ?? ''} ${giver.last_name ?? ''}`.trim()
  return fullName || giver.username?.trim() || fallback
}

/**
 * Suma `by` tokens a `me` dentro de `tokens_by_user` (lo crea si aún no había dado ninguno) y
 * mantiene el orden del backend: más tokens primero y, a igualdad, el orden que ya tenían.
 */
export function bumpTokensByUser(
  givers: TaskTokenByUser[],
  me: { id: number, username: string },
  by = 1,
): TaskTokenByUser[] {
  const exists = givers.some(giver => giver.id === me.id)
  const next = exists
    ? givers.map(giver => (giver.id === me.id ? { ...giver, tokens: giver.tokens + by } : giver))
    : [...givers, { id: me.id, username: me.username, first_name: null, last_name: null, tokens: by }]

  return next
    .map((giver, index) => ({ giver, index }))
    .sort((a, b) => b.giver.tokens - a.giver.tokens || a.index - b.index)
    .map(entry => entry.giver)
}
