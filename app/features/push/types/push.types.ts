/** GET /api/notifications/push/vapid_public_key/ */
export interface VapidPublicKeyResponse {
  public_key: string
}

/** GET /api/notifications/preferences/ y PATCH .../preferences/update/ */
export interface NotificationPreferences {
  /** Del usuario (todos sus dispositivos). Apagar solo este dispositivo se hace borrando su suscripción. */
  push_enabled: boolean
  /** Una clave que no aparece cuenta como activada. */
  keys: Record<string, boolean>
  updated_at?: string
}

export interface UpdateNotificationPreferencesPayload {
  push_enabled?: boolean
  /** Se mezcla con lo guardado: solo cambian las claves que se mandan. */
  keys?: Record<string, boolean>
}

/** POST /api/notifications/push/subscriptions/create/ */
export interface CreatePushSubscriptionPayload {
  endpoint: string
  keys: { p256dh: string, auth: string }
  platform: 'android' | 'ios' | 'desktop'
  user_agent: string
}
