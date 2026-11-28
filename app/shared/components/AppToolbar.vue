<script setup lang="ts">
import NotificationPreviewMenu from '~/features/notifications/components/NotificationPreviewMenu.vue'

const { t } = useI18n()
const { user, organization, logout } = useAuth()
const { collapsed, toggle } = useSidebar()
const colorMode = useColorMode()
const route = useRoute()

const displayName = computed(() => user.value?.username ?? t('user.fallback'))
const initials = computed(() => getInitials(displayName.value))

const { activeGroupId, managedGroups, activeProjectId, userProjects } = useTaskAdminView()

const activeGroupName = computed(() =>
  managedGroups.value.find(group => group.id === activeGroupId.value)?.name ?? null,
)

const activeProjectName = computed(() =>
  userProjects.value.find(project => project.id === activeProjectId.value)?.name ?? null,
)

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
  if (route.path.startsWith('/tasks/admin')) {
    return t('sidebar.adminTasks')
  }
  if (route.path.startsWith('/tasks/group')) {
    return activeGroupName.value
      ? t('toolbar.groupModuleName', { name: activeGroupName.value })
      : t('sidebar.groupTasks')
  }
  if (route.path.startsWith('/tasks/project')) {
    return activeProjectName.value
      ? t('toolbar.projectModuleName', { name: activeProjectName.value })
      : t('sidebar.projectTasks')
  }
  if (route.path === '/tasks') {
    return t('sidebar.myTasks')
  }
  if (route.path.startsWith('/settings')) {
    return t('settings.title')
  }
  return t('toolbar.moduleName')
})

const nexxaCount = 3

const isDark = computed(() => colorMode.value === 'dark')

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

/** Empresa seleccionada de la sesión: va en el botón de la izquierda (maqueta UX-04). */
const companyName = computed(() => user.value?.selected_company?.name ?? null)
const organizationName = computed(() => organization.value?.name ?? null)
const companyOpen = ref(false)

/**
 * Las páginas del workspace de tareas ya muestran su título como encabezado de página: ahí el topbar no repite el
 * nombre del módulo. En el resto (dashboard, reporte, configuración…) se conserva como antes.
 */
const showModuleName = computed(() => {
  const path = route.path
  return !(path === '/tasks' || path.startsWith('/tasks/project') || path.startsWith('/tasks/group'))
})

/**
 * Buscador global de la maqueta (tareas, proyectos o personas). Oculto de momento: el backend aún no filtra tareas
 * por texto fuera del backlog. Al encenderlo se ve igual que en la maqueta (con el atajo ⌘K / Ctrl+K).
 */
const searchEnabled = false
const search = ref('')
const searchInput = useTemplateRef<HTMLInputElement>('searchInput')
const mobileSearchOpen = ref(false)
const isMac = computed(() => import.meta.client && /Mac|iPhone|iPad/.test(navigator.platform))

defineShortcuts({
  meta_k: () => {
    if (searchEnabled) {
      searchInput.value?.focus()
    }
  },
})

const profileOpen = ref(false)
</script>

<template>
  <!-- Topbar de la maqueta UX-04: empresa · buscador ⌘K · (espacio) · avisos · tema · avatar. -->
  <header
    class="h-14 shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 bg-background border-b border-border relative"
  >
    <UButton
      color="neutral"
      variant="ghost"
      square
      class="hidden md:inline-flex size-9 rounded-[10px] text-muted-foreground hover:text-foreground"
      :icon="collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
      :title="collapsed ? t('toolbar.showMenu') : t('toolbar.hideMenu')"
      :aria-label="collapsed ? t('toolbar.showMenu') : t('toolbar.hideMenu')"
      @click="toggle"
    />

    <!-- Empresa seleccionada (el cambio de empresa vive en Configuración; aquí solo se consulta). -->
    <UPopover
      v-if="companyName"
      v-model:open="companyOpen"
      :content="{ side: 'bottom', align: 'start', sideOffset: 8 }"
      :ui="{ content: 'w-[min(18rem,calc(100vw-1.5rem))] p-3' }"
    >
      <button
        type="button"
        class="h-9 min-w-0 max-w-[45vw] sm:max-w-64 shrink inline-flex items-center gap-2 px-3 rounded-[10px] border border-border-strong bg-card text-[13px] font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :aria-label="t('toolbar.companyAria', { name: companyName })"
      >
        <span class="truncate">{{ companyName }}</span>
        <UIcon
          name="i-lucide-chevron-down"
          class="size-4 shrink-0 text-muted-foreground transition-transform"
          :class="companyOpen ? 'rotate-180' : ''"
        />
      </button>

      <template #content>
        <dl class="space-y-2 text-[13px]">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-building-2" class="size-4 shrink-0 text-muted-foreground" />
            <dt class="text-muted-foreground">
              {{ t('user.profile.company') }}
            </dt>
            <dd class="ml-auto min-w-0 truncate font-medium text-foreground">
              {{ companyName }}
            </dd>
          </div>
          <div
            v-if="organizationName"
            class="flex items-center gap-2"
          >
            <UIcon name="i-lucide-network" class="size-4 shrink-0 text-muted-foreground" />
            <dt class="text-muted-foreground">
              {{ t('user.profile.organization') }}
            </dt>
            <dd class="ml-auto min-w-0 truncate font-medium text-foreground">
              {{ organizationName }}
            </dd>
          </div>
        </dl>
      </template>
    </UPopover>

    <!-- Nombre del módulo: solo fuera del workspace de tareas (ahí el título va en la página). -->
    <div
      v-if="showModuleName"
      class="hidden sm:block min-w-0 truncate text-sm font-semibold text-foreground"
    >
      {{ moduleName }}
    </div>

    <template v-if="searchEnabled">
      <label
        class="hidden md:flex flex-[0_1_360px] min-w-0 items-center gap-2 h-9 px-2.5 rounded-[10px] border border-border-strong bg-input text-muted-foreground focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30"
      >
        <UIcon name="i-lucide-search" class="size-[18px] shrink-0" />
        <input
          ref="searchInput"
          v-model="search"
          type="search"
          :placeholder="t('toolbar.searchPlaceholder')"
          :aria-label="t('toolbar.searchAria')"
          class="flex-1 min-w-0 bg-transparent border-0 outline-none text-[13px] text-foreground placeholder:text-muted-foreground"
        >
        <kbd class="h-5 px-1.5 rounded-md border border-border font-mono text-[11px] grid place-items-center">
          {{ isMac ? '⌘K' : 'Ctrl K' }}
        </kbd>
      </label>
      <UButton
        color="neutral"
        variant="ghost"
        square
        icon="i-lucide-search"
        class="md:hidden size-9 rounded-[10px] text-muted-foreground"
        :aria-label="t('toolbar.searchAria')"
        @click="mobileSearchOpen = !mobileSearchOpen"
      />
    </template>

    <span class="flex-1" />

    <div class="flex items-center gap-1 sm:gap-2 shrink-0">

      <!-- Oculto de momento: aún no funciona -->
      <UChip
        v-if="false"
        :show="nexxaCount > 0"
        :text="nexxaCount"
        size="3xl"
        color="error"
        :ui="{ base: 'text-white h-auto px-1.5 py-0.5 leading-none' }"
      >
        <UButton
          icon="i-lucide-bot"
          color="neutral"
          variant="ghost"
          square
          class="h-9 w-9 text-muted-foreground hover:text-foreground"
          :aria-label="t('toolbar.nexxa')"
          :title="t('toolbar.nexxa')"
        />
      </UChip>

      <NotificationPreviewMenu />

      <ClientOnly>
        <button
          type="button"
          :aria-label="t('toolbar.toggleTheme')"
          :title="t('toolbar.toggleTheme')"
          class="size-9 inline-flex items-center justify-center rounded-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition"
          @click="toggleTheme"
        >
          <UIcon :name="isDark ? 'i-lucide-sun' : 'i-lucide-moon'" class="size-[18px]" />
        </button>
        <template #fallback>
          <div class="h-9 w-9" />
        </template>
      </ClientOnly>

      <div class="ml-1">
        <UPopover
          v-model:open="profileOpen"
          :content="{ side: 'bottom', align: 'end', sideOffset: 8 }"
          :ui="{ content: 'w-[min(20rem,calc(100vw-1.5rem))] p-4' }"
        >
          <button
            type="button"
            :aria-label="t('user.viewProfile')"
            class="inline-flex rounded-full transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <UserAvatar
              :user-id="user?.id"
              :initials="initials"
              :size="32"
              :font-size="12.8"
            />
          </button>

          <template #content>
            <UserProfileCard @edit="profileOpen = false">
              <UButton
                :label="t('common.logout')"
                icon="i-lucide-log-out"
                color="error"
                variant="ghost"
                block
                @click="logout"
              />
            </UserProfileCard>
          </template>
        </UPopover>
      </div>
    </div>

    <!-- Móvil: el buscador se abre a todo el ancho bajo el topbar. -->
    <div
      v-if="searchEnabled && mobileSearchOpen"
      class="md:hidden absolute inset-x-0 top-full z-30 p-2 bg-background border-b border-border"
    >
      <UInput
        v-model="search"
        icon="i-lucide-search"
        autofocus
        class="w-full"
        :placeholder="t('toolbar.searchPlaceholder')"
        :aria-label="t('toolbar.searchAria')"
      />
    </div>
  </header>
</template>
