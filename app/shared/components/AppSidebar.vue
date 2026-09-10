<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { AppNavItem } from '~/shared/composables/useAppNav'

const { t, locale, setLocale } = useI18n()
const { user, logout } = useAuth()
const { collapsed } = useSidebar()
const { tasksItems, isActive, navigate, isChildActive, navigateToChild } = useAppNav()
const { indicator: realtimeIndicator } = useRealtimeStatus()

/**
 * Ítems con `children` (ej. Tareas por grupo) se expanden en línea, no como
 * popover. Sin override explícito, arrancan expandidos si ya están activos.
 */
const expandedOverrides = ref<Record<string, boolean>>({})

function isExpanded(item: AppNavItem): boolean {
  return expandedOverrides.value[item.labelKey] ?? isActive(item)
}

function onItemClick(item: AppNavItem) {
  if (!item.children?.length) {
    navigate(item)
    return
  }
  expandedOverrides.value = {
    ...expandedOverrides.value,
    [item.labelKey]: !isExpanded(item),
  }
}

// TODO: sustituir por el nombre/rol reales cuando el modelo de usuario los exponga.
const displayName = computed(() => user.value?.username ?? t('user.fallback'))
const displayRole = computed(() => t('user.roleManager'))
const initials = computed(() => getInitials(displayName.value))

const realtimeDot = computed(() => {
  switch (realtimeIndicator.value) {
    case 'online':
      return { dotClass: 'bg-success', label: t('realtime.connected') }
    case 'pending':
      return { dotClass: 'bg-warning', label: t('realtime.connecting') }
    default:
      return { dotClass: 'bg-neutral-400', label: t('realtime.offline') }
  }
})

const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: t('settings.language.title'),
      icon: 'i-lucide-languages',
      type: 'label',
    },
    {
      label: 'ES',
      type: 'checkbox',
      checked: locale.value === 'es',
      onUpdateChecked(checked) {
        if (checked) {
          void setLocale('es')
        }
      },
    },
    {
      label: 'EN',
      type: 'checkbox',
      checked: locale.value === 'en',
      onUpdateChecked(checked) {
        if (checked) {
          void setLocale('en')
        }
      },
    },
  ],
  [
    {
      label: t('common.logout'),
      icon: 'i-lucide-log-out',
      color: 'error',
      onSelect: () => {
        logout()
      },
    },
  ],
])

function backToHub() {
  void navigateTo('/')
}
</script>

<template>
  <aside
    class="hidden md:flex shrink-0 flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-200"
    :class="collapsed ? 'w-16' : 'w-60'"
  >
    <div
      class="h-16 flex items-center border-b border-sidebar-border"
      :class="collapsed ? 'justify-center px-0' : 'px-5'"
    >
      <NexxusLogo :collapsed="collapsed" class="h-9" />
    </div>

    <div v-if="!collapsed" class="px-5 pt-4 pb-2">
      <div class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {{ t('sidebar.sectionTasks') }}
      </div>
    </div>
    <div v-else class="pt-4" />

    <nav class="flex-1 overflow-y-auto px-3">
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
              @click="navigateToChild(child)"
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
    </nav>

    <div class="p-2 border-t border-sidebar-border">
      <UTooltip
        :text="collapsed ? t('sidebar.backToHub') : undefined"
        :content="{ side: 'right', sideOffset: 8 }"
      >
        <button
          type="button"
          :aria-label="t('sidebar.backToHub')"
          class="w-full flex items-center py-2 text-sm rounded-md transition-colors text-sidebar-foreground hover:bg-muted"
          :class="collapsed ? 'justify-center px-0' : 'gap-3 px-3'"
          @click="backToHub"
        >
          <UIcon name="i-lucide-arrow-left" class="h-4 w-4 shrink-0" />
          <span v-if="!collapsed" class="flex-1 text-left">{{ t('sidebar.backToHub') }}</span>
        </button>
      </UTooltip>
    </div>

    <div class="p-2 border-t border-sidebar-border">
      <UDropdownMenu
        :items="userMenuItems"
        :content="{ side: 'top', align: 'start', sideOffset: 8 }"
        :ui="{ content: 'w-52' }"
      >
        <button
          type="button"
          :title="displayName"
          class="w-full flex items-center gap-2.5 rounded-md p-1.5 hover:bg-muted transition-colors"
          :class="collapsed ? 'justify-center' : ''"
        >
          <span class="relative shrink-0">
            <span
              class="inline-flex items-center justify-center rounded-full font-semibold text-white select-none w-8 h-8 text-[12.8px] leading-none"
              style="background-color: #f59e0b"
            >
              {{ initials }}
            </span>
            <span
              v-if="collapsed"
              class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-sidebar transition-colors"
              :class="realtimeDot.dotClass"
              :title="realtimeDot.label"
            />
          </span>
          <template v-if="!collapsed">
            <div class="flex-1 min-w-0 text-left">
              <div class="text-[13px] font-semibold text-foreground truncate">
                {{ displayName }}
              </div>
              <div class="text-[11px] text-muted-foreground truncate">
                {{ displayRole }}
              </div>
            </div>
            <span
              class="h-2.5 w-2.5 shrink-0 rounded-full transition-colors"
              :class="realtimeDot.dotClass"
              :title="realtimeDot.label"
            />
            <span class="sr-only">{{ realtimeDot.label }}</span>
            <UIcon
              name="i-lucide-chevrons-up-down"
              class="h-4 w-4 shrink-0 text-muted-foreground"
            />
          </template>
        </button>
      </UDropdownMenu>
    </div>
  </aside>
</template>
