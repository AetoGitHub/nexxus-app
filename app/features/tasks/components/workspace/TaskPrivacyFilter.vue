<script setup lang="ts">
/**
 * «Mostrar: Todas | Empresa | Privadas». Tres estados excluyentes (sin valor = todas, `false` = solo la empresa,
 * `true` = solo mis proyectos privados), por eso es un segmentado y no un interruptor.
 */
const model = defineModel<boolean | undefined>({ default: undefined })

const { t } = useI18n()

const options: { value: boolean | undefined, labelKey: string }[] = [
  { value: undefined, labelKey: 'tasks.filterScope.all' },
  { value: false, labelKey: 'tasks.filterScope.company' },
  { value: true, labelKey: 'tasks.filterScope.private' },
]
</script>

<template>
  <!-- Segmentado de la maqueta UX-04: la opción activa en teal suave dentro de un marco de 36 px. -->
  <div
    class="inline-flex h-9 max-w-full shrink-0 rounded-[10px] border border-border-strong bg-card p-[3px] pointer-coarse:h-10"
    role="group"
    :aria-label="t('tasks.filterScope.label')"
  >
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      class="flex flex-1 items-center justify-center rounded-[7px] px-3 text-[13px] whitespace-nowrap transition-colors sm:flex-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      :class="model === option.value
        ? 'bg-aeto-teal-light font-semibold text-aeto-teal-dark'
        : 'font-medium text-muted-foreground hover:text-foreground'"
      :aria-pressed="model === option.value"
      @click="model = option.value"
    >
      {{ t(option.labelKey) }}
    </button>
  </div>
</template>
