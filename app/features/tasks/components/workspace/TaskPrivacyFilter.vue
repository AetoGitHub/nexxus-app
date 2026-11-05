<script setup lang="ts">
/**
 * «Mostrar: Todas | Empresa | Privadas». Tres estados excluyentes (sin valor = todas, `false` = solo la empresa,
 * `true` = solo mis proyectos privados), por eso es un segmentado y no un interruptor.
 */
const model = defineModel<boolean | undefined>({ default: undefined })

const { t } = useI18n()

const options: { value: boolean | undefined, labelKey: string, icon?: string }[] = [
  { value: undefined, labelKey: 'tasks.filterScope.all' },
  { value: false, labelKey: 'tasks.filterScope.company', icon: 'i-lucide-building-2' },
  { value: true, labelKey: 'tasks.filterScope.private', icon: 'i-lucide-lock' },
]
</script>

<template>
  <div
    class="inline-flex max-w-full p-0.5 rounded-md border border-border bg-background"
    role="group"
    :aria-label="t('tasks.filterScope.label')"
  >
    <UButton
      v-for="option in options"
      :key="String(option.value)"
      color="neutral"
      variant="ghost"
      size="sm"
      class="flex-1 sm:flex-none px-2.5 py-1 h-7 pointer-coarse:h-9 text-xs rounded justify-center"
      :class="model === option.value
        ? 'bg-aeto-teal-light text-aeto-teal-dark font-semibold hover:bg-aeto-teal-light'
        : 'text-muted-foreground'"
      :icon="option.icon"
      :aria-pressed="model === option.value"
      @click="model = option.value"
    >
      {{ t(option.labelKey) }}
    </UButton>
  </div>
</template>
