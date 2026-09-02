<script setup lang="ts">
import OrganizationCreateDialog from '~/features/organizations/components/OrganizationCreateDialog.vue'
import OrganizationListTable from '~/features/organizations/components/OrganizationListTable.vue'
import OrganizationUpdateDialog from '~/features/organizations/components/OrganizationUpdateDialog.vue'

definePageMeta({ middleware: 'auth', layout: false })

const { t } = useI18n()

useSeoMeta({
  title: () => t('configuration.organization.list.title'),
})
</script>

<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
    <AppHubHeader home-to="/configuration" />

    <UDashboardToolbar
      :ui="{
        right: 'flex min-w-0 flex-1 items-center justify-end gap-2',
      }"
    >
      <template #right>
        <OrganizationCreateDialog />
      </template>
    </UDashboardToolbar>

    <main class="flex min-h-0 flex-1 flex-col px-3 py-4 sm:px-4 lg:px-5">
      <OrganizationListTable class="min-h-0 flex-1" />
      <OrganizationUpdateDialog />
    </main>
  </div>
</template>
