<script setup lang="ts">
import type { RepeatScopeMode } from '~/features/tasks/composables/shared/useRepeatScopeFilter'

/**
 * Interruptor de las repetitivas: sin seleccionar muestra una por serie (estado base); seleccionado, todas las ocurrencias.
 */
const mode = defineModel<RepeatScopeMode>('mode', { required: true })

const { t } = useI18n()

const isAll = computed(() => mode.value === 'all')

function toggle() {
  mode.value = isAll.value ? 'latest' : 'all'
}
</script>

<template>
  <UTooltip :text="t('tasks.repeatScope.all')">
    <UButton
      icon="i-lucide-repeat"
      size="xs"
      square
      class="shrink-0"
      :color="isAll ? 'primary' : 'neutral'"
      :variant="isAll ? 'solid' : 'ghost'"
      :aria-label="t('tasks.repeatScope.all')"
      :aria-pressed="isAll"
      @click="toggle"
    />
  </UTooltip>
</template>
