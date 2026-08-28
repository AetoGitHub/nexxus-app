<script setup lang="ts">
import { useMarkNotificationRead } from '~/features/notifications/composables/useMarkNotificationRead'
import { useNotifications } from '~/features/notifications/composables/useNotifications'
import { useNotificationState } from '~/features/notifications/composables/useNotificationState'
import type { AppNotification } from '~/features/notifications/types/notification.types'
import { NOTIFICATION_PREVIEW_LIMIT } from '~/features/notifications/utils/notification-counts.util'
import NotificationPreviewItem from '~/features/notifications/components/NotificationPreviewItem.vue'

const { t } = useI18n()
const route = useRoute()
const { isLoggedIn } = useAuth()
const { unreadCount, unreadCountLabel } = useNotificationState()
const markRead = useMarkNotificationRead()

const isOpen = ref(false)
const markingId = ref<number | null>(null)

const notificationsAriaLabel = computed(() =>
  unreadCount.value > 0
    ? t('toolbar.notificationsCount', { count: unreadCount.value })
    : t('toolbar.notifications'),
)

const { notifications, notificationsQuery } = useNotifications(
  { page_size: NOTIFICATION_PREVIEW_LIMIT },
  isLoggedIn,
)

const previewNotifications = computed(() =>
  [...notifications.value]
    .sort((a, b) => Number(a.read) - Number(b.read) || Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, NOTIFICATION_PREVIEW_LIMIT),
)

const isLoading = computed(
  () => notificationsQuery.isFetching.value && notificationsQuery.data.value == null,
)

function openTask(taskId: number) {
  const currentQuery = route.path === '/tasks' ? route.query : {}
  void navigateTo({
    path: '/tasks',
    query: {
      ...currentQuery,
      task: String(taskId),
    },
  })
}

async function markAsRead(notificationId: number) {
  markingId.value = notificationId
  try {
    await markRead.mutateAsync(notificationId)
  }
  catch {
    // Toast de error lo maneja useMarkNotificationRead
  }
  finally {
    markingId.value = null
  }
}

async function onOpen(notification: AppNotification) {
  if (!notification.read) {
    await markAsRead(notification.id)
  }

  if (notification.task == null || notification.task <= 0) {
    return
  }

  isOpen.value = false
  openTask(notification.task)
}
</script>

<template>
  <UPopover
    v-model:open="isOpen"
    :content="{ align: 'end', side: 'bottom', sideOffset: 6 }"
    :ui="{ content: 'w-80 sm:w-96 p-0 overflow-hidden' }"
  >
    <UChip
      :show="unreadCount > 0"
      :text="unreadCountLabel"
      size="3xl"
      color="error"
      :ui="{ base: 'text-white h-auto px-1.5 py-0.5 leading-none' }"
    >
      <UButton
        icon="i-lucide-bell"
        color="neutral"
        variant="ghost"
        square
        class="h-9 w-9 text-muted-foreground hover:text-foreground"
        :aria-label="notificationsAriaLabel"
        :title="notificationsAriaLabel"
      />
    </UChip>

    <template #content>
      <div class="flex items-center justify-between gap-3 px-3.5 py-2.5 border-b border-border">
        <p class="text-sm font-semibold text-foreground">
          {{ t('notifications.preview.title') }}
        </p>
        <UBadge
          v-if="unreadCount > 0"
          color="error"
          variant="subtle"
          size="sm"
          :label="t('notifications.preview.unreadCount', { count: unreadCount })"
        />
      </div>

      <div
        v-if="isLoading"
        class="space-y-1.5 p-2"
      >
        <USkeleton
          v-for="n in 4"
          :key="n"
          class="h-14 w-full rounded-md"
        />
      </div>

      <p
        v-else-if="notificationsQuery.isError.value"
        class="text-sm text-error px-3.5 py-6"
      >
        {{ t('notifications.preview.loadError') }}
      </p>

      <p
        v-else-if="!previewNotifications.length"
        class="text-sm text-muted-foreground px-3.5 py-6"
      >
        {{ t('notifications.preview.empty') }}
      </p>

      <div
        v-else
        class="max-h-80 overflow-y-auto p-1.5 space-y-0.5"
      >
        <NotificationPreviewItem
          v-for="notification in previewNotifications"
          :key="notification.id"
          :notification="notification"
          :marking="markingId === notification.id"
          @open="onOpen(notification)"
        />
      </div>
    </template>
  </UPopover>
</template>
