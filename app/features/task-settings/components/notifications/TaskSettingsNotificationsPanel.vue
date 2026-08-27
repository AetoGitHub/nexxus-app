<script setup lang="ts">
import { useMarkNotificationRead } from '~/features/notifications/composables/useMarkNotificationRead'
import { useNotifications } from '~/features/notifications/composables/useNotifications'
import type {
  AppNotification,
  NotificationListFilters,
  NotificationReadTab,
} from '~/features/notifications/types/notification.types'
import { NOTIFICATION_FILTER_KEYS } from '~/features/notifications/utils/notification-key.util'
import TaskSettingsNotificationCard from '~/features/task-settings/components/notifications/TaskSettingsNotificationCard.vue'

const { t } = useI18n()
const markRead = useMarkNotificationRead()

const readTab = ref<NotificationReadTab>('all')
const selectedKey = ref<string>('all')
const expandedId = ref<number | null>(null)
/** Sigue visible en “No leídas” hasta colapsar o elegir otra. */
const stickyNotification = ref<AppNotification | null>(null)

const filters = computed<NotificationListFilters>(() => ({
  read: readTab.value === 'all' ? undefined : readTab.value === 'read',
  key: selectedKey.value === 'all' ? undefined : selectedKey.value,
}))

const { notifications, notificationsQuery } = useNotifications(filters)

const displayedNotifications = computed(() => {
  const items = notifications.value
  const sticky = stickyNotification.value
  if (!sticky) {
    return items
  }

  const index = items.findIndex(item => item.id === sticky.id)
  if (index >= 0) {
    const next = [...items]
    next[index] = { ...items[index]!, ...sticky }
    return next
  }

  if (expandedId.value !== sticky.id) {
    return items
  }

  return [sticky, ...items]
})

const tabs: { id: NotificationReadTab, labelKey: string }[] = [
  { id: 'all', labelKey: 'taskSettings.notificationsPanel.tabs.all' },
  { id: 'unread', labelKey: 'taskSettings.notificationsPanel.tabs.unread' },
  { id: 'read', labelKey: 'taskSettings.notificationsPanel.tabs.read' },
]

const keyItems = computed(() => [
  { label: t('taskSettings.notificationsPanel.filterKeyAll'), value: 'all' },
  ...NOTIFICATION_FILTER_KEYS.map(key => ({
    label: t(`taskSettings.notificationsPanel.keys.${key}`),
    value: key,
  })),
])

const isLoading = computed(
  () => notificationsQuery.isFetching.value && notificationsQuery.data.value == null,
)

async function onSelect(notification: AppNotification) {
  if (expandedId.value === notification.id) {
    expandedId.value = null
    stickyNotification.value = null
    return
  }

  expandedId.value = notification.id
  stickyNotification.value = notification

  if (notification.read) {
    return
  }

  try {
    await markRead.mutateAsync(notification.id)
    if (stickyNotification.value?.id !== notification.id) {
      return
    }
    stickyNotification.value = {
      ...stickyNotification.value,
      read: true,
      read_at: stickyNotification.value.read_at ?? new Date().toISOString(),
    }
  }
  catch {
    // Toast de error lo maneja useMarkNotificationRead
  }
}

function openTask(taskId: number) {
  void navigateTo({
    path: '/tasks',
    query: { task: String(taskId) },
  })
}

watch([readTab, selectedKey], () => {
  expandedId.value = null
  stickyNotification.value = null
})
</script>

<template>
  <div class="space-y-6">
    <div class="min-w-0">
      <h2 class="text-xl font-bold text-foreground">
        {{ t('taskSettings.notificationsPanel.title') }}
      </h2>
      <p class="text-sm text-muted-foreground mt-1">
        {{ t('taskSettings.notificationsPanel.subtitle') }}
      </p>
    </div>

    <div class="flex items-start gap-2.5 rounded-lg bg-muted/60 border border-border px-3.5 py-3">
      <UIcon
        name="i-lucide-info"
        class="h-4 w-4 shrink-0 text-muted-foreground mt-0.5"
      />
      <p class="text-[13px] text-muted-foreground leading-relaxed">
        {{ t('taskSettings.notificationsPanel.infoBanner') }}
      </p>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="border-b border-border flex-1">
        <div class="flex gap-5">
          <UButton
            v-for="tab in tabs"
            :key="tab.id"
            color="neutral"
            variant="link"
            class="relative px-0 pb-2.5 rounded-none"
            :class="readTab === tab.id
              ? 'text-foreground font-medium'
              : 'text-muted-foreground'"
            :label="t(tab.labelKey)"
            :ui="{
              base: readTab === tab.id
                ? 'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary'
                : '',
            }"
            @click="readTab = tab.id"
          />
        </div>
      </div>

      <UFormField
        :label="t('taskSettings.notificationsPanel.filterKey')"
        class="sm:w-52"
      >
        <USelect
          v-model="selectedKey"
          :items="keyItems"
          class="w-full"
        />
      </UFormField>
    </div>

    <div v-if="isLoading" class="space-y-2">
      <USkeleton
        v-for="n in 4"
        :key="n"
        class="h-16 w-full rounded-lg"
      />
    </div>

    <p
      v-else-if="notificationsQuery.isError.value"
      class="text-sm text-error py-4"
    >
      {{ t('taskSettings.notificationsPanel.loadError') }}
    </p>

    <p
      v-else-if="!displayedNotifications.length"
      class="text-sm text-muted-foreground py-4"
    >
      {{ t('taskSettings.notificationsPanel.empty') }}
    </p>

    <div
      v-else
      class="space-y-2"
    >
      <TaskSettingsNotificationCard
        v-for="notification in displayedNotifications"
        :key="notification.id"
        :notification="notification"
        :expanded="expandedId === notification.id"
        @select="onSelect(notification)"
        @open-task="openTask"
      />
    </div>
  </div>
</template>
