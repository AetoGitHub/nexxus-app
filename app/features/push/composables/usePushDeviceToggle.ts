import { usePushNotifications } from '~/features/push/composables/usePushNotifications'

/**
 * Interruptor de las notificaciones push de ESTE dispositivo. Lo comparten la tarjeta de Configuración y el menú de
 * la campana: ambos leen el mismo estado (`usePushNotifications` lo guarda en `useState`), así que siempre coinciden.
 */
export function usePushDeviceToggle() {
  const push = usePushNotifications()
  const { status, busy } = push

  const isOn = computed(() =>
    status.value === 'granted-subscribed' || (status.value === 'granted-not-subscribed' && busy.value),
  )

  /** Hay un interruptor que mostrar: en el resto de estados (iOS sin instalar, navegador sin soporte...) solo cabe una guía. */
  const available = computed(() =>
    status.value === 'default' || status.value === 'granted-not-subscribed' || status.value === 'denied' || isOn.value,
  )

  // Con el permiso dado pero sin suscripción (p. ej. el registro falló) se puede reintentar: el popup no vuelve a salir.
  const canToggle = computed(() =>
    !busy.value && (status.value === 'default' || status.value === 'granted-not-subscribed' || isOn.value),
  )

  /** El permiso se pide dentro de este manejador, que debe correr directamente en el clic/tap del usuario. */
  function setEnabled(value: boolean) {
    if (value) {
      void push.enable()
    }
    else {
      void push.disable()
    }
  }

  return { push, status, busy, isOn, available, canToggle, setEnabled }
}
