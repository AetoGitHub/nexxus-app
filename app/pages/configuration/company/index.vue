<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: false })

const { t } = useI18n()

useSeoMeta({
  title: () => t('configuration.company.title'),
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background text-foreground">
    <AppHubHeader home-to="/configuration" />

    <main class="flex-1 flex items-center justify-center px-6">
      <p class="text-xl font-semibold text-foreground">
        {{ t('configuration.company.placeholder') }}
      </p>
    </main>
  </div>
</template>
