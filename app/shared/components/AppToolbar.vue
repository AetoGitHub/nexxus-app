<script setup lang="ts">
const { t } = useI18n()
const { user } = useAuth()
const { collapsed, toggle } = useSidebar()
const colorMode = useColorMode()
const route = useRoute()

const displayName = computed(() => user.value?.username ?? t('user.fallback'))
const initials = computed(() => getInitials(displayName.value))

const moduleName = computed(() => {
  if (route.path.startsWith('/dashboard')) {
    return t('sidebar.dashboard')
  }
  if (route.path.startsWith('/reporte-ceo')) {
    return t('sidebar.reporteCeo')
  }
  if (route.path.startsWith('/tasks/settings')) {
    return t('taskSettings.title')
  }
  if (route.path.startsWith('/tasks/pending-approval')) {
    return t('tasks.toUpdate.title')
  }
  if (route.path.startsWith('/settings')) {
    return t('settings.title')
  }
  return t('toolbar.moduleName')
})

const isDark = computed(() => colorMode.value === 'dark')

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

const search = ref('')
</script>

<template>
  <header
    class="h-14 shrink-0 flex items-center justify-between px-3 sm:px-6 bg-card border-b border-border relative"
  >
    <div class="flex items-center gap-2.5 min-w-0">
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        square
        class="hidden md:inline-flex h-8 w-8 mr-1"
        :icon="collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
        :title="collapsed ? t('toolbar.showMenu') : t('toolbar.hideMenu')"
        @click="toggle"
      />

      <div class="h-8 w-8 rounded-md flex items-center justify-center bg-aeto-teal-light">
        <UIcon name="i-lucide-square-check-big" class="h-4 w-4 text-aeto-teal-dark" />
      </div>

      <div>
        <div class="text-[11px] uppercase tracking-wider text-muted-foreground">
          {{ t('toolbar.module') }}
        </div>
        <div class="text-sm font-bold leading-none text-foreground">
          {{ moduleName }}
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <div class="relative hidden md:block">
        <UIcon
          name="i-lucide-search"
          class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        />
        <input
          v-model="search"
          :placeholder="t('toolbar.searchPlaceholder')"
          class="w-64 pl-9 pr-8 py-1.5 text-sm rounded-md bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
        >
      </div>

      <button
        type="button"
        :aria-label="t('toolbar.nexxa')"
        :title="t('toolbar.nexxa')"
        class="relative h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition"
      >
        <UIcon name="i-lucide-bot" class="h-4 w-4" />
        <span
          class="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full font-mono font-bold text-white animate-pulse w-4 h-4 text-[10px] leading-none"
          style="background-color: #dc2626"
        >
          3
        </span>
      </button>

      <button
        type="button"
        :aria-label="t('toolbar.notifications')"
        class="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition"
      >
        <UIcon name="i-lucide-bell" class="h-4 w-4" />
      </button>

      <ClientOnly>
        <button
          type="button"
          :aria-label="t('toolbar.toggleTheme')"
          class="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition"
          @click="toggleTheme"
        >
          <UIcon :name="isDark ? 'i-lucide-sun' : 'i-lucide-moon'" class="h-4 w-4" />
        </button>
        <template #fallback>
          <div class="h-9 w-9" />
        </template>
      </ClientOnly>

      <div class="ml-1">
        <span
          :title="displayName"
          class="inline-flex items-center justify-center rounded-full font-semibold text-white select-none w-8 h-8 text-[12.8px] leading-none"
          style="background-color: #f59e0b"
        >
          {{ initials }}
        </span>
      </div>
    </div>
  </header>
</template>
