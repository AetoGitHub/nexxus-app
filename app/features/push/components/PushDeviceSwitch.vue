<script setup lang="ts">
import { usePushDeviceToggle } from '~/features/push/composables/usePushDeviceToggle'

/**
 * Interruptor compacto para activar o desactivar las notificaciones push de este dispositivo (menú de la campana).
 * Solo se muestra cuando se puede activar desde la app; si el permiso está bloqueado aparece apagado y deshabilitado.
 */
const { t } = useI18n()
const { push, status, busy, isOn, available, canToggle, setEnabled } = usePushDeviceToggle()

onMounted(async () => {
  await push.loadVapid()
  await push.refreshLocalState()
})

const tooltip = computed(() =>
  status.value === 'denied' ? t('pushSettings.denied.title') : t('pushSettings.toggle'),
)
</script>

<template>
  <UTooltip
    v-if="available"
    :text="tooltip"
  >
    <USwitch
      size="sm"
      :model-value="isOn"
      :disabled="!canToggle"
      :loading="busy"
      :aria-label="t('pushSettings.toggle')"
      @update:model-value="setEnabled"
    />
  </UTooltip>
</template>
