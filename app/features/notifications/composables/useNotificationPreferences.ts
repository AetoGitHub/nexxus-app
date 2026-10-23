import { useQueryClient } from '@tanstack/vue-query'
import { profileConfigurationQueryKey } from '~/features/auth/composables/useProfileConfiguration'
import {
  NOTIFICATION_PREFERENCE_KEYS,
  type NotificationPreferenceKey,
  type ProfileConfiguration,
} from '~/shared/types/auth.types'

/**
 * Preferencias de notificaciones de la cuenta (8 interruptores de `profile_configurations`).
 * Cada cambio manda un PATCH con solo ese campo; se aplica de inmediato y, si el backend falla, el interruptor vuelve a como estaba.
 */
export function useNotificationPreferences() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const { configuration, setConfiguration } = useProfileConfigurationStore()
  const toast = useToast()
  const { t } = useI18n()

  /** Interruptores que se están guardando (cada uno bloquea solo el suyo). */
  const savingKeys = ref<NotificationPreferenceKey[]>([])

  /** Una preferencia ausente (sesión guardada antes de existir) cuenta como encendida, igual que el valor por defecto del backend. */
  const preferences = computed(() =>
    Object.fromEntries(
      NOTIFICATION_PREFERENCE_KEYS.map(key => [key, configuration.value?.[key] !== false]),
    ) as Record<NotificationPreferenceKey, boolean>,
  )

  function isSaving(key: NotificationPreferenceKey) {
    return savingKeys.value.includes(key)
  }

  /** Escribe un solo campo en el store de sesión y en la caché de la configuración. */
  function applyLocally(key: NotificationPreferenceKey, value: boolean) {
    const current = configuration.value
    if (!current) {
      return
    }

    const next: ProfileConfiguration = { ...current, [key]: value }
    setConfiguration(next)
    queryClient.setQueryData(profileConfigurationQueryKey, next)
  }

  async function setPreference(key: NotificationPreferenceKey, value: boolean) {
    if (!configuration.value || isSaving(key)) {
      return
    }

    const previous = preferences.value[key]
    if (previous === value) {
      return
    }

    applyLocally(key, value)
    savingKeys.value = [...savingKeys.value, key]

    try {
      await $api('/api/auth/profiles/config/update/', {
        method: 'PATCH',
        body: { [key]: value },
      })
    }
    catch (error) {
      applyLocally(key, previous)
      toast.add({
        title: t('taskSettings.notificationPreferences.errorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    }
    finally {
      savingKeys.value = savingKeys.value.filter(item => item !== key)
    }
  }

  return {
    preferences,
    isSaving,
    setPreference,
  }
}
