<script setup lang="ts">
import { useNotificationPreferences } from '~/features/notifications/composables/useNotificationPreferences'
import type { NotificationPreferenceKey } from '~/shared/types/auth.types'

/** Qué avisos quiere recibir el usuario: un interruptor por tipo de notificación y otro para el sonido. */
const { t } = useI18n()
const { configuration, errorMessage, isPending } = useProfileConfiguration()
const { preferences, isSaving, setPreference } = useNotificationPreferences()

const items: { key: NotificationPreferenceKey, icon: string, labelKey: string, helpKey: string }[] = [
  { key: 'enable_token_notifications', icon: 'i-lucide-pointer', labelKey: 'token', helpKey: 'tokenHelp' },
  { key: 'enable_message_notifications', icon: 'i-lucide-message-circle', labelKey: 'message', helpKey: 'messageHelp' },
  { key: 'enable_phase_notifications', icon: 'i-lucide-refresh-cw', labelKey: 'phase', helpKey: 'phaseHelp' },
  { key: 'enable_approval_notifications', icon: 'i-lucide-shield-check', labelKey: 'approval', helpKey: 'approvalHelp' },
  { key: 'enable_tag_notifications', icon: 'i-lucide-clipboard-check', labelKey: 'tag', helpKey: 'tagHelp' },
  { key: 'enable_task_created_notifications', icon: 'i-lucide-square-plus', labelKey: 'taskCreated', helpKey: 'taskCreatedHelp' },
  { key: 'enable_mention_notifications', icon: 'i-lucide-at-sign', labelKey: 'mention', helpKey: 'mentionHelp' },
  { key: 'enable_notification_sound', icon: 'i-lucide-volume-2', labelKey: 'sound', helpKey: 'soundHelp' },
]
</script>

<template>
  <section class="space-y-2">
    <div>
      <h3 class="text-sm font-semibold text-foreground">
        {{ t('taskSettings.notificationPreferences.title') }}
      </h3>
      <p class="text-[12px] text-muted-foreground mt-0.5">
        {{ t('taskSettings.notificationPreferences.help') }}
      </p>
    </div>

    <UAlert
      v-if="errorMessage && !configuration"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="t('taskSettings.notificationPreferences.loadError')"
      :description="errorMessage"
    />

    <div
      v-else-if="isPending && !configuration"
      class="space-y-2"
    >
      <USkeleton class="h-56 w-full rounded-xl" />
    </div>

    <div
      v-else-if="configuration"
      class="bg-card border border-border rounded-xl px-4 divide-y divide-border"
    >
      <div
        v-for="item in items"
        :key="item.key"
        class="flex items-start justify-between gap-4 py-3"
      >
        <div class="flex items-start gap-3 flex-1 min-w-0">
          <UIcon
            :name="item.icon"
            class="h-4 w-4 shrink-0 text-muted-foreground mt-0.5"
          />
          <div class="min-w-0">
            <p class="text-sm font-medium text-foreground">
              {{ t(`taskSettings.notificationPreferences.items.${item.labelKey}`) }}
            </p>
            <p class="text-[11px] text-muted-foreground mt-0.5">
              {{ t(`taskSettings.notificationPreferences.items.${item.helpKey}`) }}
            </p>
          </div>
        </div>
        <USwitch
          :model-value="preferences[item.key]"
          :disabled="isSaving(item.key)"
          :aria-label="t(`taskSettings.notificationPreferences.items.${item.labelKey}`)"
          class="shrink-0 pt-0.5"
          @update:model-value="setPreference(item.key, Boolean($event))"
        />
      </div>
    </div>
  </section>
</template>
