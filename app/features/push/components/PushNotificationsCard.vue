<script setup lang="ts">
import PushHelpGuide from '~/features/push/components/PushHelpGuide.vue'
import PushNotificationTypes from '~/features/push/components/PushNotificationTypes.vue'
import { usePushDeviceToggle } from '~/features/push/composables/usePushDeviceToggle'
import { usePushPreferences } from '~/features/push/composables/usePushPreferences'
import { detectPushBrowser, isBraveBrowser } from '~/shared/utils/push-support.util'

/**
 * Tarjeta de notificaciones push de ESTE dispositivo. Muestra una sola variante según `PushStatus`:
 * el interruptor cuando se puede activar, o la guía que corresponde cuando no (iOS sin instalar, navegador
 * dentro de otra app, permiso bloqueado, navegador sin soporte).
 */
const { t } = useI18n()
const toast = useToast()
const { copy } = useClipboard()
const typePreferencesEnabled = useRuntimeConfig().public.notificationTypePreferences === true

const { push, status, busy, isOn, available, canToggle, setEnabled } = usePushDeviceToggle()
const { platform, serviceError } = push

const preferencesEnabled = computed(() => status.value != null && status.value !== 'unavailable')
const { preferences } = usePushPreferences(preferencesEnabled)

onMounted(async () => {
  await push.loadVapid()
  await push.refreshLocalState()
})

// Permiso ya dado pero falta registrar este dispositivo: se registra en silencio (sin popup).
watch(status, (value) => {
  if (value === 'granted-not-subscribed') {
    void push.enable({ silent: true })
  }
}, { immediate: true })

const browser = computed(() =>
  import.meta.client ? detectPushBrowser(navigator.userAgent, isBraveBrowser()) : 'chromium',
)

/** El permiso está dado pero el navegador no pudo crear la suscripción: se explica la causa y cómo resolverla. */
const showServiceHelp = computed(() => status.value === 'granted-not-subscribed' && serviceError.value && !busy.value)

const retrying = ref(false)

async function onRetry(kind: 'denied' | 'push-service') {
  retrying.value = true
  try {
    if (kind === 'push-service') {
      await push.enable()
      return
    }
    await push.retryAfterReturn()
    if (push.status.value === 'denied') {
      toast.add({ title: t('pushSettings.help.stillBlocked'), color: 'warning' })
    }
  }
  finally {
    retrying.value = false
  }
}

const installSteps = [
  { icon: 'i-lucide-share', key: 'pushSettings.iosInstall.step1' },
  { icon: 'i-lucide-square-plus', key: 'pushSettings.iosInstall.step2' },
  { icon: 'i-lucide-smartphone', key: 'pushSettings.iosInstall.step3' },
  { icon: 'i-lucide-bell-ring', key: 'pushSettings.iosInstall.step4' },
] as const

async function copyLink() {
  await copy(window.location.href)
  toast.add({ title: t('pushSettings.inApp.copied'), color: 'success' })
}
</script>

<template>
  <section
    v-if="status && status !== 'unavailable'"
    class="space-y-4"
    :aria-label="t('pushSettings.title')"
  >
    <div class="rounded-lg border border-border bg-card p-4 space-y-3">
      <div class="flex items-start gap-3">
        <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <UIcon
            :name="isOn ? 'i-lucide-bell-ring' : 'i-lucide-bell'"
            class="h-5 w-5 text-foreground"
          />
        </span>

        <div class="min-w-0 flex-1">
          <h3 class="text-sm font-semibold text-foreground">
            {{ t('pushSettings.toggle') }}
          </h3>

          <template v-if="status === 'default' || status === 'granted-not-subscribed' || isOn">
            <p class="text-[13px] text-muted-foreground mt-0.5">
              {{ isOn ? t('pushSettings.active') : t('pushSettings.description') }}
            </p>
          </template>

          <template v-else-if="status === 'denied'">
            <p class="text-[13px] font-medium text-error mt-0.5">
              {{ t('pushSettings.denied.title') }}
            </p>
          </template>
        </div>

        <USwitch
          v-if="available"
          :model-value="isOn"
          :disabled="!canToggle"
          :loading="busy"
          :aria-label="t('pushSettings.toggle')"
          @update:model-value="setEnabled"
        />
      </div>

      <UButton
        v-if="isOn && preferences?.push_enabled"
        color="neutral"
        variant="link"
        size="xs"
        class="px-0"
        :label="t('pushSettings.disableEverywhere')"
        :disabled="busy"
        @click="push.disableEverywhere()"
      />

      <!-- Permiso bloqueado -->
      <PushHelpGuide
        v-if="status === 'denied'"
        kind="denied"
        :platform="platform"
        :browser="browser"
        :retrying="retrying"
        @retry="onRetry('denied')"
      />

      <!-- Permiso dado, pero el servicio de push del navegador no respondió -->
      <PushHelpGuide
        v-else-if="showServiceHelp"
        kind="push-service"
        :platform="platform"
        :browser="browser"
        :retrying="retrying"
        @retry="onRetry('push-service')"
      />

      <!-- iPhone/iPad sin instalar -->
      <div
        v-else-if="status === 'ios-needs-install'"
        class="rounded-md bg-muted/60 border border-border p-3 space-y-3"
      >
        <p class="text-[13px] font-medium text-foreground">
          {{ t('pushSettings.iosInstall.title') }}
        </p>
        <ol class="space-y-2">
          <li
            v-for="(step, index) in installSteps"
            :key="step.key"
            class="flex items-start gap-2.5 text-[13px] text-muted-foreground"
          >
            <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background border border-border text-xs font-semibold text-foreground">
              {{ index + 1 }}
            </span>
            <UIcon
              :name="step.icon"
              class="h-4 w-4 shrink-0 mt-1 text-foreground"
            />
            <span class="min-w-0">{{ t(step.key) }}</span>
          </li>
        </ol>
        <p class="text-xs font-medium text-foreground">
          {{ t('pushSettings.iosInstall.note') }}
        </p>
      </div>

      <!-- Navegador dentro de otra app -->
      <div
        v-else-if="status === 'in-app-browser'"
        class="rounded-md bg-muted/60 border border-border p-3 space-y-2"
      >
        <p class="text-[13px] text-foreground">
          {{ t('pushSettings.inApp.message') }}
        </p>
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-copy"
          :label="t('pushSettings.inApp.copy')"
          @click="copyLink"
        />
      </div>

      <!-- Sin soporte -->
      <div
        v-else-if="status === 'unsupported'"
        class="rounded-md bg-muted/60 border border-border p-3"
      >
        <p class="text-[13px] text-foreground">
          {{ t('pushSettings.unsupported') }}
        </p>
      </div>
    </div>

    <PushNotificationTypes v-if="typePreferencesEnabled && preferences?.push_enabled" />
  </section>
</template>
