<script setup lang="ts">
import type { PushBrowser, PushHelpKind, PushPlatform } from '~/shared/utils/push-support.util'
import { pushSettingsUrl } from '~/shared/utils/push-support.util'

/**
 * Ayuda guiada cuando las notificaciones no se pueden activar desde la app. Una web no puede abrir ni resaltar
 * ajustes del navegador, así que se explica la causa exacta, se da la dirección del ajuste lista para copiar y,
 * al volver a esta pestaña, la app lo detecta sola. El botón de reintento cubre los casos en que no se detecta.
 */
const props = defineProps<{
  kind: PushHelpKind
  platform: PushPlatform
  browser: PushBrowser
  retrying?: boolean
}>()

const emit = defineEmits<{ retry: [] }>()

const { t } = useI18n()
const toast = useToast()
const { copy } = useClipboard()

const settingsUrl = computed(() =>
  import.meta.client ? pushSettingsUrl(props.kind, props.browser, window.location.origin) : null,
)

/** Navegadores de escritorio con pasos para llegar al ajuste pegando la dirección. */
const guided = computed(() =>
  settingsUrl.value != null && (props.browser === 'brave' || (props.kind === 'denied' && ['chrome', 'edge'].includes(props.browser))),
)

/** Pasos numerados. Sin dirección que copiar (Safari, móviles) se muestran las instrucciones manuales de la plataforma. */
const steps = computed<string[]>(() => {
  if (guided.value) {
    const variant = props.kind === 'denied' ? 'denied' : 'braveService'
    return [1, 2, 3, 4].map(n => t(`pushSettings.help.${variant}.step${n}`))
  }

  if (props.kind === 'push-service') {
    return [t('pushSettings.help.otherService')]
  }
  if (props.platform === 'ios') {
    return [t('pushSettings.denied.ios')]
  }
  if (props.platform === 'android') {
    return [t('pushSettings.denied.androidChrome'), t('pushSettings.denied.androidInstalled')]
  }
  const manual = props.browser === 'firefox' || props.browser === 'safari' ? props.browser : 'chromium'
  return [t(`pushSettings.denied.desktop.${manual}`)]
})

async function copySettingsUrl() {
  if (!settingsUrl.value) {
    return
  }
  await copy(settingsUrl.value)
  toast.add({ title: t('pushSettings.help.copied'), color: 'success', duration: 4000 })
}
</script>

<template>
  <div class="rounded-md bg-muted/60 border border-border p-3 space-y-3">
    <p class="text-[13px] font-medium text-foreground">
      {{ kind === 'denied' ? t('pushSettings.denied.description') : t('pushSettings.help.serviceTitle') }}
    </p>

    <ol class="space-y-2">
      <li
        v-for="(step, index) in steps"
        :key="step"
        class="flex items-start gap-2.5 text-[13px] text-muted-foreground"
      >
        <span
          v-if="steps.length > 1 || guided"
          class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background border border-border text-xs font-semibold text-foreground"
        >
          {{ index + 1 }}
        </span>
        <span class="min-w-0 pt-0.5">{{ step }}</span>
      </li>
    </ol>

    <div
      v-if="settingsUrl"
      class="space-y-1.5"
    >
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-copy"
        :label="t('pushSettings.help.copyUrl')"
        @click="copySettingsUrl"
      />
      <code class="block break-all rounded bg-background border border-border px-2 py-1 text-[11px] text-muted-foreground">{{ settingsUrl }}</code>
    </div>

    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <UButton
        color="primary"
        variant="soft"
        size="sm"
        icon="i-lucide-refresh-cw"
        :label="t('pushSettings.help.retry')"
        :loading="retrying"
        @click="emit('retry')"
      />
      <span class="text-xs text-muted-foreground">{{ t('pushSettings.help.auto') }}</span>
    </div>

    <p
      v-if="kind === 'denied'"
      class="text-xs text-muted-foreground"
    >
      {{ t('pushSettings.denied.cannotAsk') }}
    </p>
  </div>
</template>
