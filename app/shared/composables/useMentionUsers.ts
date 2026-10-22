import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import { sanitizeMentionName } from '~/shared/utils/mention.util'
import { matchesSearch } from '~/shared/utils/search-text.util'

/** Perfil de GET /api/auth/profiles/ (solo lo que usa el autocompletado de menciones). */
export interface MentionProfile {
  id: number
  username: string
  first_name: string
  last_name: string
  company_memberships?: { company: number, company_name?: string }[]
}

/** Nombre que va dentro del token: «Nombre Apellido»; si no hay ninguno de los dos, el username. */
export function mentionDisplayName(profile: Pick<MentionProfile, 'username' | 'first_name' | 'last_name'>): string {
  const fullName = sanitizeMentionName(`${profile.first_name ?? ''} ${profile.last_name ?? ''}`)
  return fullName || sanitizeMentionName(profile.username ?? '')
}

const DEBOUNCE_MS = 250
const PAGE_SIZE = 30

/**
 * Usuarios que se pueden mencionar al teclear `@`.
 *
 * GET /api/auth/profiles/?organization=<organización de la sesión>&username=<término>
 * El backend filtra `username` por first_name (icontains), así que se manda la primera palabra del término y el resto
 * («hector mor») se afina en el cliente. Con debounce de 250 ms y cancelando la petición anterior. Se excluye al
 * usuario en sesión y, si se conoce la compañía del proyecto de la tarea, a quien no pertenezca a ella (el backend
 * rechaza con 400 mencionar a alguien de fuera).
 */
export function useMentionUsers(companyId: MaybeRefOrGetter<number | null | undefined>) {
  const { $api } = useNuxtApp()
  const { user, organization } = useAuth()

  const results = ref<MentionProfile[]>([])
  const isLoading = ref(false)

  let timer: ReturnType<typeof setTimeout> | null = null
  let controller: AbortController | null = null

  function cancel() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    controller?.abort()
    controller = null
    isLoading.value = false
  }

  function isMentionable(profile: MentionProfile, term: string): boolean {
    if (profile.id === user.value?.id) {
      return false
    }
    const company = toValue(companyId)
    const memberships = profile.company_memberships
    if (company != null && memberships && !memberships.some(membership => membership.company === company)) {
      return false
    }
    return matchesSearch(`${profile.first_name} ${profile.last_name} ${profile.username}`, term)
  }

  async function run(term: string) {
    const organizationId = organization.value?.id
    if (organizationId == null) {
      results.value = []
      isLoading.value = false
      return
    }

    controller?.abort()
    const current = new AbortController()
    controller = current

    try {
      const firstWord = term.trim().split(/\s+/)[0] ?? ''
      const response = await $api<PaginatedResponse<MentionProfile>>('/api/auth/profiles/', {
        query: {
          organization: organizationId,
          ...(firstWord ? { username: firstWord } : {}),
          page_size: PAGE_SIZE,
        },
        signal: current.signal,
      })
      if (current.signal.aborted) {
        return
      }
      results.value = (response.results ?? []).filter(profile => isMentionable(profile, term))
      isLoading.value = false
    }
    catch {
      if (current.signal.aborted) {
        return
      }
      // Un fallo del buscador no debe romper el input: se muestra «Sin resultados».
      results.value = []
      isLoading.value = false
    }
  }

  /** Busca con debounce; `immediate` salta la espera (primera apertura al teclear «@»). */
  function search(term: string, immediate = false) {
    if (timer) {
      clearTimeout(timer)
    }
    isLoading.value = true
    timer = setTimeout(() => {
      timer = null
      void run(term)
    }, immediate ? 0 : DEBOUNCE_MS)
  }

  onScopeDispose(cancel)

  return { results, isLoading, search, cancel }
}
