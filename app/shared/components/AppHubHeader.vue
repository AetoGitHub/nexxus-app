<script setup lang="ts">
const { t } = useI18n()
const { logout } = useAuth()
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

withDefaults(
  defineProps<{
    homeTo?: string
  }>(),
  {
    homeTo: '/',
  },
)
</script>

<template>
  <header class="h-16 shrink-0 flex items-center justify-between px-6 border-b border-border">
    <NuxtLink :to="homeTo" class="inline-flex">
      <NexxusLogo class="h-9" />
    </NuxtLink>

    <div class="flex items-center gap-2">
      <ClientOnly>
        <UButton
          :aria-label="t('toolbar.toggleTheme')"
          color="neutral"
          variant="ghost"
          square
          :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
          @click="toggleTheme"
        />
        <template #fallback>
          <div class="h-9 w-9" />
        </template>
      </ClientOnly>

      <UButton
        :aria-label="t('common.logout')"
        color="neutral"
        variant="ghost"
        square
        icon="i-lucide-log-out"
        @click="logout"
      />
    </div>
  </header>
</template>
