<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: false })

const { t } = useI18n()

useSeoMeta({
  title: () => t('configuration.title'),
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background text-foreground">
    <AppHubHeader />

    <main class="flex-1 flex flex-col items-center justify-center px-6">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-foreground">
          {{ t('hub.title') }}
        </h1>
        <p class="text-sm text-muted-foreground mt-1">
          {{ t('configuration.subtitle') }}
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-3xl">
        <AppModuleCard
          to="/configuration/organization"
          icon="i-lucide-building-2"
          :title="t('configuration.organization.title')"
          :description="t('configuration.organization.description')"
        />
        <AppModuleCard
          to="/configuration/company"
          icon="i-lucide-briefcase"
          :title="t('configuration.company.title')"
          :description="t('configuration.company.description')"
        />
        <AppModuleCard
          to="/configuration/user"
          icon="i-lucide-user"
          :title="t('configuration.user.title')"
          :description="t('configuration.user.description')"
        />
      </div>
    </main>
  </div>
</template>
