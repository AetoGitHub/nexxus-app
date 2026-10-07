import { FetchError } from 'ofetch'
import type { WsTicketResponse } from '~/shared/types/auth.types'

export function useWsTicket() {
  const { $api } = useNuxtApp()

  function requestTicket() {
    return $api<WsTicketResponse>('/api/auth/ws_ticket/', {
      method: 'POST',
    })
  }

  /**
   * Un 4403 también llega al cerrar sesión en otro dispositivo (el Token es uno por usuario). Con una petición REST se ve
   * si la sesión sigue valiendo: si responde 401, el plugin `api` cierra la sesión local y manda al login, igual que
   * con cualquier otro 401. Devuelve `false` solo si la sesión ya no vale; un fallo de red no cuenta como revocada.
   */
  async function isSessionStillValid(): Promise<boolean> {
    try {
      await requestTicket()
      return true
    }
    catch (error) {
      return !(error instanceof FetchError && error.status === 401)
    }
  }

  return { requestTicket, isSessionStillValid }
}
