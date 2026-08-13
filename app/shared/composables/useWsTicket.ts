import type { WsTicketResponse } from '~/shared/types/auth.types'

export function useWsTicket() {
  const { $api } = useNuxtApp()

  function requestTicket() {
    return $api<WsTicketResponse>('/api/auth/ws_ticket/', {
      method: 'POST',
    })
  }

  return { requestTicket }
}
