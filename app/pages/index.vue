<script setup lang="ts">
// Protected route: redirects to /login when not authenticated.
// Landing/Hub tras el login: selector de módulos.
definePageMeta({ middleware: 'auth', layout: false })

const { t } = useI18n()
const { can } = usePermissions()
const showTasks = computed(() => can('task', 'view'))
const showConfiguration = computed(() => can('settings', 'general'))

useSeoMeta({
  title: () => t('hub.title'),
})
</script>

<template>
  <div class="min-h-dvh flex flex-col bg-background text-foreground">
    <AppHubHeader />

    <main class="flex-1 flex flex-col items-center justify-center px-6">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-foreground">
          {{ t('hub.title') }}
        </h1>
        <p class="text-sm text-muted-foreground mt-1">
          {{ t('hub.subtitle') }}
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 w-full max-w-2xl">
        <AppModuleCard
          v-if="showTasks"
          to="/tasks"
          icon="i-lucide-square-check-big"
          :title="t('hub.tasksTitle')"
          :description="t('hub.tasksDescription')"
        />
        <AppModuleCard
          v-if="showConfiguration"
          to="/configuration"
          icon="i-lucide-settings"
          :title="t('hub.configurationTitle')"
          :description="t('hub.configurationDescription')"
        />
      </div>

      <p
        v-if="!showTasks && !showConfiguration"
        class="mt-2 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <UIcon
          name="i-lucide-lock"
          class="h-4 w-4"
        />
        {{ t('permissions.noModules') }}
      </p>
    </main>
  </div>
</template>
