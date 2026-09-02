<script setup lang="ts">
import CompanyCreateDialog from '~/features/companies/components/CompanyCreateDialog.vue'
import CompanyListTable from '~/features/companies/components/CompanyListTable.vue'
import CompanyUpdateDialog from '~/features/companies/components/CompanyUpdateDialog.vue'

definePageMeta({ middleware: 'auth', layout: false })

const { t } = useI18n()

useSeoMeta({
  title: () => t('configuration.company.list.title'),
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
        <CompanyCreateDialog />
      </template>
    </UDashboardToolbar>

    <main class="flex min-h-0 flex-1 flex-col px-3 py-4 sm:px-4 lg:px-5">
      <CompanyListTable class="min-h-0 flex-1" />
      <CompanyUpdateDialog />
    </main>
  </div>
</template>
