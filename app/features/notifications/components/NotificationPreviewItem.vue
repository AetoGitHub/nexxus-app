<script setup lang="ts">
import type { AppNotification } from '~/features/notifications/types/notification.types'
import {
  notificationIcon,
  notificationKeyLabelPath,
} from '~/features/notifications/utils/notification-key.util'
import { formatRelativeTime } from '~/shared/utils/date'

const props = defineProps<{
  notification: AppNotification
  marking?: boolean
}>()

const emit = defineEmits<{
  open: []
}>()

const { t, locale } = useI18n()

const icon = computed(() => notificationIcon(props.notification.key))
const keyLabel = computed(() => t(notificationKeyLabelPath(props.notification.key)))
const createdAt = computed(() => formatRelativeTime(props.notification.created_at, locale.value))
const canOpenTask = computed(() => props.notification.task != null && props.notification.task > 0)
</script>

<template>
  <UButton
    color="neutral"
    variant="ghost"
    class="w-full justify-start h-auto px-2.5 py-2 rounded-md"
    :class="notification.read ? 'opacity-70' : 'bg-muted/50'"
    :disabled="marking"
    :aria-busy="marking"
    :loading="false"
    :loading-auto="false"
    :title="canOpenTask ? t('notifications.preview.openTask') : undefined"
    :ui="{ leading: 'hidden', leadingIcon: 'hidden' }"
    @click="emit('open')"
  >
    <span class="flex items-start gap-2.5 min-w-0 w-full text-left">
      <span class="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <UIcon
          :name="icon"
          class="h-4 w-4 text-foreground"
          :class="marking ? 'opacity-0' : ''"
        />
        <UIcon
          v-if="marking"
          name="i-lucide-loader-circle"
          class="absolute h-4 w-4 animate-spin text-foreground"
        />
        <span
          v-if="!notification.read && !marking"
          class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary"
          :aria-label="t('notifications.preview.unread')"
        />
      </span>

      <span class="min-w-0 flex-1">
        <span class="block text-[13px] font-medium text-foreground leading-snug line-clamp-2">
          {{ notification.message }}
        </span>
        <span class="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>{{ keyLabel }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ createdAt }}</span>
        </span>
      </span>

      <span class="inline-flex h-3.5 w-3.5 shrink-0 mt-1">
        <UIcon
          v-if="canOpenTask"
          name="i-lucide-arrow-up-right"
          class="h-3.5 w-3.5 text-muted-foreground"
        />
      </span>
    </span>
  </UButton>
</template>
