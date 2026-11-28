<script setup lang="ts">
/**
 * Botón de filtro de la barra de Mis tareas (maqueta UX-04): 36 px, radio 10, borde fuerte y chevron. Activo (hay un
 * valor aplicado) se pinta en teal. Al tocarlo abre un popover con el contenido del filtro (slot por defecto).
 */
const props = withDefaults(
  defineProps<{
    label: string
    active?: boolean
    disabled?: boolean
    /** Explica por qué está deshabilitado (tooltip). */
    disabledReason?: string
    icon?: string
    /** Ancho del popover. */
    contentClass?: string
  }>(),
  {
    active: false,
    disabled: false,
    disabledReason: undefined,
    icon: undefined,
    contentClass: 'w-64',
  },
)

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <UTooltip
    v-if="disabled"
    :text="disabledReason"
    :disabled="!disabledReason"
  >
    <button
      type="button"
      disabled
      class="inline-flex h-9 shrink-0 cursor-default items-center gap-1.5 rounded-[10px] border border-border-strong bg-card pl-3 pr-2.5 text-[13px] font-medium text-foreground opacity-50 pointer-coarse:h-10"
      :aria-label="disabledReason ? `${label}. ${disabledReason}` : label"
    >
      <UIcon v-if="icon" :name="icon" class="size-4 shrink-0" />
      {{ label }}
      <UIcon name="i-lucide-chevron-down" class="size-4 shrink-0" />
    </button>
  </UTooltip>

  <UPopover
    v-else
    v-model:open="open"
    :content="{ side: 'bottom', align: 'start', sideOffset: 6, collisionPadding: 8 }"
    :ui="{ content: `${props.contentClass} max-w-[calc(100vw-1rem)] p-1.5` }"
  >
    <button
      type="button"
      class="inline-flex h-9 max-w-64 shrink-0 items-center gap-1.5 rounded-[10px] border pl-3 pr-2.5 text-[13px] font-medium transition-colors pointer-coarse:h-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      :class="active
        ? 'border-primary bg-aeto-teal-light text-aeto-teal-dark'
        : 'border-border-strong bg-card text-foreground hover:bg-muted'"
      :aria-expanded="open"
    >
      <UIcon v-if="icon" :name="icon" class="size-4 shrink-0" />
      <span class="truncate">{{ label }}</span>
      <UIcon
        name="i-lucide-chevron-down"
        class="size-4 shrink-0 transition-transform"
        :class="open ? 'rotate-180' : ''"
      />
    </button>

    <template #content>
      <slot :close="() => { open = false }" />
    </template>
  </UPopover>
</template>
