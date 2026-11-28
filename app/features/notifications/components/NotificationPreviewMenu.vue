<script setup lang="ts">
import { useMarkNotificationRead } from '~/features/notifications/composables/useMarkNotificationRead'
import { useMarkAllNotificationsRead } from '~/features/notifications/composables/useMarkAllNotificationsRead'
import { useNotifications } from '~/features/notifications/composables/useNotifications'
import { useNotificationState } from '~/features/notifications/composables/useNotificationState'
import type { AppNotification } from '~/features/notifications/types/notification.types'
import { NOTIFICATION_PREVIEW_LIMIT } from '~/features/notifications/utils/notification-counts.util'
import NotificationPreviewItem from '~/features/notifications/components/NotificationPreviewItem.vue'
import PushDeviceSwitch from '~/features/push/components/PushDeviceSwitch.vue'

const { t } = useI18n()
const route = useRoute()
const { isLoggedIn } = useAuth()
const { unreadCount, unreadCountLabel } = useNotificationState()
const markRead = useMarkNotificationRead()
// Atajo «Marcar todas como leídas» (el mismo de Configuración → Notificaciones): invalida lista y contadores.
const markAllRead = useMarkAllNotificationsRead()

function onMarkAllRead() {
  markAllRead.mutate()
}

const isOpen = ref(false)
const markingId = ref<number | null>(null)

const notificationsAriaLabel = computed(() =>
  unreadCount.value > 0
    ? t('toolbar.notificationsCount', { count: unreadCount.value })
    : t('toolbar.notifications'),
)

// Se piden más de las que se muestran: el backend también manda las que el usuario apagó (`show: false`) y esas no se
// pintan; con solo 8 a veces quedaban menos y más viejas.
const { notifications, notificationsQuery } = useNotifications(
  { page_size: NOTIFICATION_PREVIEW_LIMIT * 4 },
  isLoggedIn,
)

/**
 * Lo más reciente primero (hasta hoy), sin importar si está leída: antes las no leídas iban arriba y una vieja sin leer
 * (p. ej. de octubre) tapaba los cambios de hoy. Las no leídas se distinguen por el punto y el fondo.
 */
const previewNotifications = computed(() =>
  [...notifications.value]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id)
    .slice(0, NOTIFICATION_PREVIEW_LIMIT),
)

const isLoading = computed(
  () => notificationsQuery.isFetching.value && notificationsQuery.data.value == null,
)

function goToAllNotifications() {
  isOpen.value = false
  void navigateTo({ path: '/tasks/settings', query: { section: 'notifications' } })
}

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
    :content="{ align: 'end', side: 'bottom', sideOffset: 6, collisionPadding: 8 }"
    :ui="{ content: 'w-[min(24rem,calc(100vw-1rem))] p-0 overflow-hidden' }"
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
        class="h-9 w-9 rounded-[10px] text-muted-foreground hover:text-foreground"
        :aria-label="notificationsAriaLabel"
        :title="notificationsAriaLabel"
      />
    </UChip>

    <template #content>
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3.5 py-2.5 border-b border-border">
        <div class="flex items-center gap-2 min-w-0">
          <p class="text-sm font-semibold text-foreground">
            {{ t('notifications.preview.title') }}
          </p>
          <PushDeviceSwitch />
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <UTooltip
            v-if="unreadCount > 0"
            :text="t('taskSettings.notificationsPanel.markAllRead')"
          >
            <UButton
              icon="i-lucide-check-check"
              color="primary"
              variant="soft"
              size="xs"
              square
              class="ring-1 ring-primary/30"
              :aria-label="t('taskSettings.notificationsPanel.markAllRead')"
              :loading="markAllRead.isPending.value"
              :disabled="markAllRead.isPending.value"
              @click="onMarkAllRead"
            />
          </UTooltip>
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            trailing-icon="i-lucide-arrow-up-right"
            :label="t('notifications.preview.viewAll')"
            @click="goToAllNotifications"
          />
          <UBadge
            v-if="unreadCount > 0"
            color="error"
            variant="subtle"
            size="sm"
            :label="t('notifications.preview.unreadCount', { count: unreadCount })"
          />
        </div>
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
        class="max-h-[min(20rem,calc(100dvh-9rem))] overflow-y-auto overscroll-contain p-1.5 space-y-0.5"
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
