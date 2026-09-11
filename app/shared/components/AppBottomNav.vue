<script setup lang="ts">
const { t } = useI18n()
const { tasksItems, bottomNavItems, isActive, navigate } = useAppNav()

const moreOpen = ref(false)

/** Resalta "Más" cuando la ruta activa vive solo dentro de la hoja (admin, grupo, proyecto, ajustes...). */
const isMoreActive = computed(() =>
  tasksItems.value.some(item => item.bottomNav === false && isActive(item)),
)

function closeMore() {
  moreOpen.value = false
}
</script>

<template>
  <nav
    class="md:hidden fixed bottom-0 inset-x-0 z-50 flex items-stretch justify-around border-t border-sidebar-border bg-sidebar px-1 pb-[env(safe-area-inset-bottom)] h-[calc(60px+env(safe-area-inset-bottom))]"
    :aria-label="t('sidebar.bottomNav')"
  >
    <!-- Botones nativos: tab bar icono+label en columna; UButton no encaja bien aquí. -->
    <button
      v-for="item in bottomNavItems"
      :key="item.labelKey"
      type="button"
      class="relative flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-md transition-colors min-w-0"
      :class="isActive(item)
        ? 'text-aeto-teal-dark'
        : 'text-muted-foreground'"
      :aria-label="t(item.labelKey)"
      :aria-current="isActive(item) ? 'page' : undefined"
      :disabled="!item.to"
      @click="navigate(item)"
    >
      <span class="relative inline-flex">
        <UIcon :name="item.icon" class="h-5 w-5" />
        <span
          v-if="item.badge"
          class="absolute -top-1.5 -right-2 inline-flex items-center justify-center text-[9px] font-semibold px-1 rounded-full min-w-[15px] h-[15px] text-neutral-900"
          style="background-color: #f59e0b"
        >
          {{ item.badge }}
        </span>
      </span>
      <span class="text-[10px] leading-none font-medium truncate max-w-full px-0.5">
        {{ t(item.labelKey) }}
      </span>
      <span
        v-if="isActive(item)"
        class="absolute top-0 left-3 right-3 h-0.5 rounded-b bg-aeto-teal"
        aria-hidden="true"
      />
    </button>

    <button
      type="button"
      class="relative flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-md transition-colors min-w-0"
      :class="isMoreActive ? 'text-aeto-teal-dark' : 'text-muted-foreground'"
      :aria-label="t('sidebar.more')"
      :aria-current="isMoreActive ? 'page' : undefined"
      @click="moreOpen = true"
    >
      <UIcon name="i-lucide-menu" class="h-5 w-5" />
      <span class="text-[10px] leading-none font-medium truncate max-w-full px-0.5">
        {{ t('sidebar.more') }}
      </span>
      <span
        v-if="isMoreActive"
        class="absolute top-0 left-3 right-3 h-0.5 rounded-b bg-aeto-teal"
        aria-hidden="true"
      />
    </button>
  </nav>

  <USlideover
    v-model:open="moreOpen"
    side="bottom"
    :title="t('sidebar.more')"
    :ui="{ content: 'max-h-[80dvh] rounded-t-xl' }"
  >
    <template #body>
      <AppNavList @navigate="closeMore" />
    </template>
  </USlideover>
</template>
