<script setup lang="ts">
import { useNotificationSound } from '~/features/notifications/composables/useNotificationSound'
import type { NotificationSoundId } from '~/features/notifications/types/notification-sound.types'

const { t } = useI18n()
const toast = useToast()
const {
  sounds,
  selectedSoundId,
  playingSoundId,
  setNotificationSound,
  toggleNotificationSoundPreview,
} = useNotificationSound()

function selectSound(id: NotificationSoundId) {
  if (selectedSoundId.value === id) {
    return
  }

  setNotificationSound(id)
  toast.add({
    title: t('taskSettings.general.notificationSound.savedTitle'),
    description: t('taskSettings.general.notificationSound.savedDescription'),
    color: 'success',
  })
}
</script>

<template>
  <section class="space-y-2">
    <div class="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
      {{ t('taskSettings.general.notificationSound.section') }}
    </div>
    <div class="text-[11px] text-muted-foreground">
      {{ t('taskSettings.general.notificationSound.help') }}
    </div>

    <div class="bg-card border border-border rounded-xl divide-y divide-border">
      <div
        v-for="sound in sounds"
        :key="sound.id"
        class="flex items-center gap-1 px-2 py-1.5"
        :class="selectedSoundId === sound.id ? 'bg-muted/40' : ''"
      >
        <UButton
          color="neutral"
          variant="ghost"
          class="flex-1 justify-start"
          :icon="selectedSoundId === sound.id ? 'i-lucide-circle-check' : 'i-lucide-circle'"
          :label="t(sound.labelKey)"
          :loading-auto="false"
          @click="selectSound(sound.id)"
        />
        <UButton
          color="neutral"
          variant="ghost"
          square
          class="rounded-full bg-aeto-teal text-white hover:bg-aeto-teal hover:opacity-90 hover:text-white"
          :icon="playingSoundId === sound.id ? 'i-lucide-square' : 'i-lucide-play'"
          :loading-auto="false"
          :aria-label="playingSoundId === sound.id
            ? t('taskSettings.general.notificationSound.stop')
            : t('taskSettings.general.notificationSound.play')"
          :title="playingSoundId === sound.id
            ? t('taskSettings.general.notificationSound.stop')
            : t('taskSettings.general.notificationSound.play')"
          @click="toggleNotificationSoundPreview(sound.id)"
        />
      </div>
    </div>
  </section>
</template>
