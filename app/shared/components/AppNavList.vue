<script setup lang="ts">
import type { AppNavChild, AppNavItem } from '~/shared/composables/useAppNav'

/**
 * Lista de navegación de tareas (sidebar desktop colapsable, o expandida
 * dentro de la hoja "Más" en mobile). Cada sección (Tareas, Tareas
 * administrativas, Tareas por grupo/proyecto) es su propio desplegable
 * independiente: un ítem con `children` se expande en línea como acordeón.
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
const { navSections, isActive, navigate, isChildActive, navigateToChild } = useAppNav()

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
  <!-- Menú agrupado como en la maqueta UX-04: TRABAJO · EQUIPO · ANÁLISIS · Ajustes. -->
  <div class="flex flex-col">
    <div
      v-for="(section, sectionIndex) in navSections"
      :key="section.id"
      class="flex flex-col gap-0.5"
      :class="sectionIndex > 0 ? 'pt-3' : ''"
    >
      <span
        v-if="!collapsed"
        class="px-2 pb-1 text-[11px] leading-[14px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80"
      >
        {{ t(section.labelKey) }}
      </span>
      <span
        v-else-if="sectionIndex > 0"
        class="mx-3 mb-1 border-t border-sidebar-border"
        aria-hidden="true"
      />

    <template
      v-for="item in section.items"
      :key="item.labelKey"
    >
      <!-- «Proyectos»: bloque propio (privados primero y luego los de la empresa), en su lugar del menú. -->
      <AppPrivateProjects
        v-if="item.projectsBlock"
        embedded
        :collapsed="collapsed"
        @navigate="emit('navigate')"
      />
      <template v-else>
      <UTooltip
        :text="collapsed ? t(item.labelKey) : undefined"
        :content="{ side: 'right', sideOffset: 8 }"
      >
        <button
          type="button"
          :aria-label="t(item.labelKey)"
          :aria-current="isActive(item) ? 'page' : undefined"
          class="w-full h-9 flex items-center text-[13px] rounded-[10px] transition-colors relative"
          :class="[
            collapsed ? 'justify-center px-0' : 'gap-2.5 px-2',
            isActive(item)
              ? 'bg-aeto-teal-light text-aeto-teal-dark font-semibold'
              : 'text-muted-foreground font-medium hover:bg-muted hover:text-foreground',
          ]"
          @click="onItemClick(item)"
        >
          <span class="relative">
            <UIcon :name="item.icon" class="size-[18px] shrink-0" />
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

      <div
        v-if="!collapsed && item.children?.length && isExpanded(item)"
        class="mt-1 space-y-0.5"
      >
        <button
          v-for="child in item.children"
          :key="child.to"
          type="button"
          :aria-label="child.label"
          :aria-current="isChildActive(child) ? 'page' : undefined"
          class="w-full h-8 flex items-center gap-3 pl-9 pr-2 text-[13px] rounded-[10px] transition-colors relative"
          :class="isChildActive(child)
            ? 'bg-aeto-teal-light text-aeto-teal-dark font-semibold'
            : 'text-muted-foreground font-medium hover:bg-muted hover:text-foreground'"
          @click="onChildClick(child)"
        >
          <span class="flex-1 text-left truncate">{{ child.label }}</span>
        </button>
      </div>
      </template>
    </template>
    </div>
  </div>
</template>
