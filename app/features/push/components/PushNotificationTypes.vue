<script setup lang="ts">
import { usePushPreferences } from '~/features/push/composables/usePushPreferences'
import {
  NOTIFICATION_GROUPS,
  notificationTypesByGroup,
} from '~/features/notifications/utils/notification-types.util'

/**
 * FASE 2 (detrás del flag `notificationTypePreferences`): qué tipos de notificación llegan por push.
 * Cada interruptor lee `preferences.keys[clave] ?? true` y manda SOLO esa clave. No filtra nada en el front:
 * quien decide qué push se envía es el backend. La campana dentro de la app sigue mostrando todo.
 */
const { t } = useI18n()
const { preferences, update } = usePushPreferences()

function isActive(key: string): boolean {
  return preferences.value?.keys[key] ?? true
}

function onToggle(key: string, value: boolean) {
  update.mutate({ keys: { [key]: value } })
}
</script>

<template>
  <div class="rounded-lg border border-border bg-card p-4 space-y-4">
    <div>
      <h3 class="text-sm font-semibold text-foreground">
        {{ t('pushSettings.types.title') }}
      </h3>
      <p class="text-[13px] text-muted-foreground mt-0.5">
        {{ t('pushSettings.types.description') }}
      </p>
    </div>

    <div
      v-for="group in NOTIFICATION_GROUPS"
      :key="group"
      class="space-y-1"
    >
      <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {{ t(`notificationTypes.groups.${group}`) }}
      </p>
      <div
        v-for="type in notificationTypesByGroup(group)"
        :key="type.key"
        class="flex items-center gap-3 rounded-md px-1 py-1.5"
      >
        <UIcon
          :name="type.icon"
          class="h-4 w-4 shrink-0 text-muted-foreground"
          :class="type.iconClass"
        />
        <span class="min-w-0 flex-1 text-sm text-foreground">
          {{ t(`notificationTypes.labels.${type.key}`) }}
        </span>
        <USwitch
          :model-value="isActive(type.key)"
          :aria-label="t(`notificationTypes.labels.${type.key}`)"
          @update:model-value="onToggle(type.key, $event)"
        />
      </div>
    </div>
  </div>
</template>
