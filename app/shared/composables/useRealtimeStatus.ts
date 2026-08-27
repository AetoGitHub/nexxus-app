export type RealtimeStatus =
  | 'offline'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'

/** Semáforo del túnel: verde conectado, amarillo conectando, gris sin conexión. */
export type RealtimeIndicator = 'online' | 'pending' | 'offline'

/**
 * Estado del túnel de tiempo real compartido por toda la app: el socket que
 * mantiene la conexión lo publica y el sidebar solo lo lee.
 */
export function useRealtimeStatus() {
  const status = useState<RealtimeStatus>('realtime-status', () => 'offline')

  const indicator = computed<RealtimeIndicator>(() => {
    switch (status.value) {
      case 'connected':
        return 'online'
      case 'connecting':
      case 'reconnecting':
        return 'pending'
      default:
        return 'offline'
    }
  })

  const isConnected = computed(() => status.value === 'connected')

  return { status, indicator, isConnected }
}
