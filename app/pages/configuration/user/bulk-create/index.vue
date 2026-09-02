<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui'
import UserBulkCreateForm from '~/features/users/components/UserBulkCreateForm.vue'

definePageMeta({ middleware: 'auth', layout: false })

const { t } = useI18n()

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
  {
    label: t('configuration.user.list.title'),
    icon: 'i-lucide-users',
    to: '/configuration/user',
  },
  {
    label: t('configuration.user.bulkCreate.title'),
  },
])

useSeoMeta({
  title: () => t('configuration.user.bulkCreate.title'),
})
</script>

<template>
  <div class="min-h-dvh bg-background text-foreground">
    <AppHubHeader home-to="/configuration" />

    <main class="px-3 py-5 sm:px-4 lg:px-5">
      <div class="mx-auto max-w-6xl space-y-5">
        <UBreadcrumb :items="breadcrumbs" />

        <div>
          <h1 class="text-xl font-semibold text-highlighted">
            {{ t('configuration.user.bulkCreate.title') }}
          </h1>
          <p class="mt-1 text-sm text-muted">
            {{ t('configuration.user.bulkCreate.subtitle') }}
          </p>
        </div>

        <UserBulkCreateForm />
      </div>
    </main>
  </div>
</template>
