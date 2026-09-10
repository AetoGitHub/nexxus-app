<script setup lang="ts">
import type { AppNavChild, AppNavItem } from '~/shared/composables/useAppNav'

/**
 * Lista de navegación de tareas (sidebar desktop colapsable, o expandida
 * dentro de la hoja "Más" en mobile). Ítems con `children` (ej. Tareas por
 * grupo/proyecto) se expanden en línea como acordeón, no como popover.
 */
withDefaults(
  defineProps<{
    /** Modo icon-only (solo aplica en el sidebar desktop). */
    collapsed?: boolean
  }>(),
  {
    collapsed: false,
  },
)

const emit = defineEmits<{
  /** Se emite tras navegar a un ítem/hijo (para cerrar la hoja mobile). */
  navigate: []
}>()

const { t } = useI18n()
const { tasksItems, isActive, navigate, isChildActive, navigateToChild } = useAppNav()

/** Sin override explícito, un ítem con hijos arranca expandido si ya está activo. */
const expandedOverrides = ref<Record<string, boolean>>({})

function isExpanded(item: AppNavItem): boolean {
  return expandedOverrides.value[item.labelKey] ?? isActive(item)
}

function onItemClick(item: AppNavItem) {
  if (!item.children?.length) {
    navigate(item)
    emit('navigate')
    return
  }
  expandedOverrides.value = {
    ...expandedOverrides.value,
    [item.labelKey]: !isExpanded(item),
  }
}

function onChildClick(child: AppNavChild) {
  navigateToChild(child)
  emit('navigate')
}
</script>

<template>
  <div class="space-y-0.5">
    <template
      v-for="item in tasksItems"
      :key="item.labelKey"
    >
      <UTooltip
        :text="collapsed ? t(item.labelKey) : undefined"
        :content="{ side: 'right', sideOffset: 8 }"
      >
        <button
          type="button"
          :aria-label="t(item.labelKey)"
          class="w-full flex items-center py-2 text-sm rounded-md transition-colors relative"
          :class="[
            collapsed ? 'justify-center px-0' : 'gap-3 px-3',
            isActive(item)
              ? 'bg-aeto-teal-light text-aeto-teal-dark font-medium'
              : 'text-sidebar-foreground hover:bg-muted',
            !collapsed && item.indent && 'pl-9',
          ]"
          @click="onItemClick(item)"
        >
          <span
            v-if="isActive(item)"
            class="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-aeto-teal"
          />
          <span class="relative">
            <UIcon :name="item.icon" class="h-4 w-4 shrink-0" />
            <span
              v-if="collapsed && item.badge"
              class="absolute -top-1 -right-1 h-2 w-2 rounded-full"
              style="background-color: #f59e0b"
            />
          </span>
          <template v-if="!collapsed">
            <span class="flex-1 text-left">{{ t(item.labelKey) }}</span>
            <span
              v-if="item.badge"
              class="inline-flex items-center justify-center text-[10px] font-semibold px-1.5 rounded-full min-w-[18px] h-[18px] text-neutral-900"
              style="background-color: #f59e0b"
            >
              {{ item.badge }}
            </span>
            <UIcon
              v-if="item.children?.length"
              name="i-lucide-chevron-right"
              class="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform"
              :class="{ 'rotate-90': isExpanded(item) }"
            />
          </template>
        </button>
      </UTooltip>

      <template v-if="!collapsed && item.children?.length && isExpanded(item)">
        <button
          v-for="child in item.children"
          :key="child.to"
          type="button"
          :aria-label="child.label"
          class="w-full flex items-center gap-3 py-2 pl-9 pr-3 text-sm rounded-md transition-colors relative"
          :class="isChildActive(child)
            ? 'bg-aeto-teal-light text-aeto-teal-dark font-medium'
            : 'text-sidebar-foreground hover:bg-muted'"
          @click="onChildClick(child)"
        >
          <span
            v-if="isChildActive(child)"
            class="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-aeto-teal"
          />
          <span class="flex-1 text-left truncate">{{ child.label }}</span>
        </button>
      </template>
    </template>
  </div>
</template>
