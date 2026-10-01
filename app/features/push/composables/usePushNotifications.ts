import { useQueryClient } from '@tanstack/vue-query'
import { notificationPreferencesQueryKey } from '~/features/push/composables/usePushPreferences'
import type {
  CreatePushSubscriptionPayload,
  NotificationPreferences,
  VapidPublicKeyResponse,
} from '~/features/push/types/push.types'
import {
  getCurrentSubscription,
  readDeviceOptOut,
  subscribeThisDevice,
  writeDeviceOptOut,
} from '~/features/push/utils/push-device.util'
import {
  detectPushPlatform,
  hasPushApi,
  isInstalledApp,
  readPushEnvironment,
  resolvePushStatus,
} from '~/shared/utils/push-support.util'

interface VapidState {
  /** `null` mientras no se ha consultado. */
  available: boolean | null
  publicKey: string
}

function currentPermission(): NotificationPermission {
  return 'Notification' in window ? Notification.permission : 'default'
}

/**
 * Notificaciones push del sistema en ESTE dispositivo: estado, activar, desactivar y sincronizar la suscripción
 * con el backend. El estado se calcula una sola vez aquí (`status`) y se comparte entre componentes.
 */
export function usePushNotifications() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const { user, isLoggedIn } = useAuth()
  const toast = useToast()
  const { t } = useI18n()

  const vapid = useState<VapidState>('push-vapid', () => ({ available: null, publicKey: '' }))
  const permission = useState<NotificationPermission>('push-permission', () => 'default')
  const hasSubscription = useState<boolean>('push-has-subscription', () => false)
  const deviceOptedOut = useState<boolean>('push-device-opted-out', () => false)
  const busy = useState<boolean>('push-busy', () => false)
  /** El servicio de push del navegador no respondió en el último intento (p. ej. Brave sin servicios de Google). */
  const serviceError = useState<boolean>('push-service-error', () => false)

  const environment = import.meta.client ? readPushEnvironment() : null

  const status = computed(() => {
    if (!import.meta.client || !environment) {
      return null
    }
    return resolvePushStatus({
      vapidAvailable: vapid.value.available,
      env: environment,
      standalone: isInstalledApp(),
      hasPush: hasPushApi(),
      permission: permission.value,
      hasSubscription: hasSubscription.value,
      deviceOptedOut: deviceOptedOut.value,
    })
  })

  const platform = computed(() => (environment ? detectPushPlatform(environment) : 'desktop'))

  /** El servicio de push del navegador (FCM/Mozilla/Apple) no respondió: lo más común es una configuración del navegador. */
  function pushErrorDescription(error: unknown): string {
    if (error instanceof Error && error.message === 'push_unavailable') {
      return t('pushSettings.errors.unavailable')
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      return t('pushSettings.errors.pushService')
    }
    return parseFetchError(error)
  }

  /** Lee el permiso y la suscripción actuales del navegador (no pide nada). */
  async function refreshLocalState() {
    permission.value = currentPermission()
    deviceOptedOut.value = readDeviceOptOut(user.value?.id)
    if (hasPushApi() && permission.value === 'granted') {
      hasSubscription.value = (await getCurrentSubscription()) != null
    }
    else {
      hasSubscription.value = false
    }
  }

  /** Clave pública VAPID. 404 = el servidor no tiene push configurado: la sección se oculta. */
  async function loadVapid() {
    if (vapid.value.available != null) {
      return vapid.value
    }
    try {
      const response = await $api<VapidPublicKeyResponse>('/api/notifications/push/vapid_public_key/')
      vapid.value = { available: Boolean(response.public_key), publicKey: response.public_key }
    }
    catch {
      vapid.value = { available: false, publicKey: '' }
    }
    return vapid.value
  }

  async function registerSubscription(subscription: PushSubscription) {
    const json = subscription.toJSON()
    const payload: CreatePushSubscriptionPayload = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: json.keys?.p256dh ?? '',
        auth: json.keys?.auth ?? '',
      },
      platform: detectPushPlatform(readPushEnvironment()),
      user_agent: navigator.userAgent,
    }
    await $api('/api/notifications/push/subscriptions/create/', { method: 'POST', body: payload })
  }

  /** Quita este dispositivo del backend y del navegador, sin tocar `push_enabled` (que es de todo el usuario). */
  async function removeThisDevice() {
    const subscription = await getCurrentSubscription()
    if (!subscription) {
      return
    }
    try {
      await $api('/api/notifications/push/subscriptions/delete/', {
        method: 'DELETE',
        body: { endpoint: subscription.endpoint },
      })
    }
    finally {
      await subscription.unsubscribe().catch(() => {})
    }
  }

  /**
   * Activar en este dispositivo. DEBE llamarse directamente desde un clic del usuario: el permiso se pide
   * en la primera instrucción (iOS y Firefox bloquean pedirlo después de otros `await` o fuera de un gesto).
   */
  async function enable(options: { silent?: boolean } = {}) {
    if (busy.value || !hasPushApi()) {
      return false
    }
    busy.value = true
    let subscription: PushSubscription | null = null

    try {
      const result = await Notification.requestPermission()
      permission.value = result
      if (result !== 'granted') {
        return false
      }

      const { publicKey, available } = await loadVapid()
      if (!available) {
        throw new Error('push_unavailable')
      }

      subscription = await subscribeThisDevice(publicKey)
      await registerSubscription(subscription)
      await $api<NotificationPreferences>('/api/notifications/preferences/update/', {
        method: 'PATCH',
        body: { push_enabled: true },
      })

      writeDeviceOptOut(user.value?.id, false)
      deviceOptedOut.value = false
      hasSubscription.value = true
      serviceError.value = false
      void queryClient.invalidateQueries({ queryKey: notificationPreferencesQueryKey })
      toast.add({ title: t('pushSettings.toast.enabled'), color: 'success' })
      return true
    }
    catch (error) {
      // Sin suscripciones a medias: si falló el registro en el backend se cancela también en el navegador.
      await subscription?.unsubscribe().catch(() => {})
      hasSubscription.value = false
      serviceError.value = error instanceof DOMException && error.name === 'AbortError'
      // Los intentos automáticos (al abrir o al volver a la pestaña) no molestan con avisos: la guía ya explica el problema.
      if (!options.silent) {
        toast.add({
          title: t('pushSettings.errors.enableTitle'),
          description: pushErrorDescription(error),
          color: 'error',
        })
      }
      return false
    }
    finally {
      busy.value = false
    }
  }

  /**
   * El usuario vuelve a la pestaña (tras cambiar un ajuste del navegador): se relee el permiso y, si ya está dado
   * pero la suscripción falló antes, se reintenta en silencio. El popup no vuelve a salir porque el permiso ya está dado.
   */
  async function retryAfterReturn() {
    if (busy.value || !import.meta.client || !hasPushApi()) {
      return
    }
    await refreshLocalState()
    if (permission.value === 'granted' && !hasSubscription.value && !deviceOptedOut.value && serviceError.value) {
      void enable({ silent: true })
    }
  }

  /** Apagar solo ESTE dispositivo (DELETE + unsubscribe). El resto de dispositivos del usuario siguen igual. */
  async function disable() {
    if (busy.value) {
      return
    }
    busy.value = true
    try {
      await removeThisDevice()
      writeDeviceOptOut(user.value?.id, true)
      deviceOptedOut.value = true
      hasSubscription.value = false
      toast.add({ title: t('pushSettings.toast.disabled'), color: 'neutral' })
    }
    catch (error) {
      toast.add({
        title: t('pushSettings.errors.disableTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    }
    finally {
      busy.value = false
    }
  }

  /** Apagar en TODOS los dispositivos del usuario (`push_enabled=false`) y quitar también este. */
  async function disableEverywhere() {
    if (busy.value) {
      return
    }
    busy.value = true
    try {
      await $api('/api/notifications/preferences/update/', {
        method: 'PATCH',
        body: { push_enabled: false },
      })
      await removeThisDevice().catch(() => {})
      writeDeviceOptOut(user.value?.id, true)
      deviceOptedOut.value = true
      hasSubscription.value = false
      void queryClient.invalidateQueries({ queryKey: notificationPreferencesQueryKey })
      toast.add({ title: t('pushSettings.toast.disabledEverywhere'), color: 'neutral' })
    }
    catch (error) {
      toast.add({
        title: t('pushSettings.errors.disableTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    }
    finally {
      busy.value = false
    }
  }

  /**
   * Mantiene la suscripción vigente en el backend (en cada arranque con sesión):
   * - con suscripción en el navegador, la vuelve a mandar (es idempotente por `endpoint`);
   * - sin suscripción pero con `push_enabled`, suscribe de nuevo sin popup (el permiso ya está dado).
   */
  async function syncSubscription() {
    if (!isLoggedIn.value || !import.meta.client) {
      return
    }

    const { available, publicKey } = await loadVapid()
    await refreshLocalState()
    if (!available || !hasPushApi() || permission.value !== 'granted' || deviceOptedOut.value) {
      return
    }

    try {
      let subscription = await getCurrentSubscription()

      if (!subscription) {
        const preferences = await queryClient.fetchQuery({
          queryKey: notificationPreferencesQueryKey,
          queryFn: () => $api<NotificationPreferences>('/api/notifications/preferences/'),
        })
        if (!preferences.push_enabled) {
          return
        }
        subscription = await subscribeThisDevice(publicKey)
      }

      await registerSubscription(subscription)
      hasSubscription.value = true
    }
    catch {
      // El siguiente arranque lo reintenta; no se molesta al usuario con un error de fondo.
    }
  }

  return {
    status,
    platform,
    busy,
    serviceError,
    vapid,
    refreshLocalState,
    retryAfterReturn,
    loadVapid,
    enable,
    disable,
    disableEverywhere,
    syncSubscription,
  }
}
