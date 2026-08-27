<script setup lang="ts">
import type { AppNotification } from '~/features/notifications/types/notification.types'
import {
  notificationIcon,
  notificationKeyLabelPath,
} from '~/features/notifications/utils/notification-key.util'
import { formatDateTime } from '~/shared/utils/date'

const props = defineProps<{
  notification: AppNotification
  expanded?: boolean
  marking?: boolean
}>()

const emit = defineEmits<{
  select: []
  openTask: [taskId: number]
}>()

const { t, locale } = useI18n()

const icon = computed(() => notificationIcon(props.notification.key))
const keyLabel = computed(() => t(notificationKeyLabelPath(props.notification.key)))
const createdAt = computed(() => formatDateTime(props.notification.created_at, locale.value))
const canOpenTask = computed(() => props.notification.task != null && props.notification.task > 0)

function goToTask() {
  if (props.notification.task == null) {
    return
  }
  emit('openTask', props.notification.task)
}
</script>

<template>
  <div
    class="border border-border rounded-lg relative bg-card overflow-hidden border-l-[3px]"
    :class="notification.read ? 'border-l-border' : 'border-l-primary bg-muted/30'"
  >
    <UButton
      color="neutral"
      variant="ghost"
      class="w-full justify-start rounded-none px-3.5 py-3 h-auto"
      :loading="marking"
      :aria-expanded="expanded"
      :aria-label="t('taskSettings.notificationsPanel.select')"
      @click="emit('select')"
    >
      <span class="flex items-start gap-3 min-w-0 w-full text-left">
        <span
          class="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted"
        >
          <UIcon
            :name="icon"
            class="h-4 w-4 text-foreground"
          />
          <span
            v-if="!notification.read"
            class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary"
            :aria-label="t('taskSettings.notificationsPanel.unread')"
          />
        </span>

        <span class="min-w-0 flex-1">
          <span class="flex items-start justify-between gap-2">
            <span class="text-[13px] font-medium text-foreground leading-snug">
              {{ notification.message }}
            </span>
            <UBadge
              color="neutral"
              variant="subtle"
              size="sm"
              class="shrink-0"
              :label="keyLabel"
            />
          </span>
          <span class="mt-1 block text-[12px] text-muted-foreground">
            {{ createdAt }}
          </span>
        </span>
      </span>
    </UButton>

    <div
      v-if="expanded"
      class="px-3.5 pb-3 pt-1 border-t border-border"
    >
      <UButton
        v-if="canOpenTask"
        icon="i-lucide-arrow-up-right"
        size="sm"
        :label="t('taskSettings.notificationsPanel.openTask')"
        class="bg-aeto-teal hover:opacity-90 text-white"
        @click="goToTask"
      />
      <p
        v-else
        class="text-[12px] text-muted-foreground py-1"
      >
        {{ t('taskSettings.notificationsPanel.noTask') }}
      </p>
    </div>
  </div>
</template>
