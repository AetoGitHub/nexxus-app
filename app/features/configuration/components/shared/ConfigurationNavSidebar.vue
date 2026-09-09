<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { ConfigurationNavItem, ConfigurationSectionId } from '~/features/configuration/types/configuration.types'

defineProps<{
  items: ConfigurationNavItem[]
  activeId: ConfigurationSectionId
}>()

const emit = defineEmits<{
  select: [id: ConfigurationSectionId]
}>()

const { t, locale, setLocale } = useI18n()
const { user, logout } = useAuth()
const { indicator: realtimeIndicator } = useRealtimeStatus()

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
  <div class="shrink-0 min-w-0">
    <div class="md:hidden border-b border-border bg-card">
      <div class="px-4 pt-3 pb-2">
        <p class="text-sm font-semibold text-foreground">
          {{ t('configuration.navTitle') }}
        </p>
        <p class="text-[11px] text-muted-foreground mt-0.5">
          {{ t('configuration.navSubtitle') }}
        </p>
      </div>
      <nav
        class="flex gap-2 overflow-x-auto px-4 pb-3"
        :aria-label="t('configuration.navTitle')"
      >
        <UButton
          v-for="item in items"
          :key="item.id"
          :icon="item.icon"
          :label="t(item.labelKey)"
          size="sm"
          :color="activeId === item.id ? 'primary' : 'neutral'"
          :variant="activeId === item.id ? 'subtle' : 'outline'"
          class="shrink-0"
          @click="emit('select', item.id)"
        />
      </nav>
    </div>

    <aside class="hidden md:flex w-60 shrink-0 border-r border-border bg-card flex-col h-full">
      <div class="px-5 py-4 border-b border-border">
        <div class="text-sm font-semibold text-foreground">
          {{ t('configuration.navTitle') }}
        </div>
        <div class="text-[11px] text-muted-foreground mt-0.5">
          {{ t('configuration.navSubtitle') }}
        </div>
      </div>

      <nav class="flex-1 p-2 space-y-0.5 overflow-y-auto">
        <UButton
          v-for="item in items"
          :key="item.id"
          :icon="item.icon"
          :label="t(item.labelKey)"
          color="neutral"
          :variant="activeId === item.id ? 'subtle' : 'ghost'"
          class="w-full justify-start"
          :class="activeId === item.id
            ? 'bg-aeto-teal-light text-aeto-teal-dark font-medium hover:bg-aeto-teal-light'
            : 'text-muted-foreground'"
          @click="emit('select', item.id)"
        />
      </nav>

      <div class="p-2 border-t border-border">
        <button
          type="button"
          class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          @click="backToHub"
        >
          <UIcon name="i-lucide-arrow-left" class="h-4 w-4 shrink-0" />
          <span class="flex-1 text-left">{{ t('configuration.backToHub') }}</span>
        </button>
      </div>

      <div class="p-2 border-t border-border">
        <UDropdownMenu
          :items="userMenuItems"
          :content="{ side: 'top', align: 'start', sideOffset: 8 }"
          :ui="{ content: 'w-52' }"
        >
          <button
            type="button"
            :title="displayName"
            class="w-full flex items-center gap-2.5 rounded-md p-1.5 hover:bg-muted transition-colors"
          >
            <span class="relative shrink-0">
              <span
                class="inline-flex items-center justify-center rounded-full font-semibold text-white select-none w-8 h-8 text-[12.8px] leading-none"
                style="background-color: #f59e0b"
              >
                {{ initials }}
              </span>
            </span>
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
          </button>
        </UDropdownMenu>
      </div>
    </aside>
  </div>
</template>
