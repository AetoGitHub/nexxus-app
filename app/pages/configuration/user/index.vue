<script setup lang="ts">
import UserChangePasswordDialog from '~/features/users/components/UserChangePasswordDialog.vue'
import UserCreateDialog from '~/features/users/components/UserCreateDialog.vue'
import UserListTable from '~/features/users/components/UserListTable.vue'
import UserUpdateDialog from '~/features/users/components/UserUpdateDialog.vue'

definePageMeta({ middleware: 'auth', layout: false })

const { t } = useI18n()

useSeoMeta({
  title: () => t('configuration.user.list.title'),
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
        <UserCreateDialog />
      </template>
    </UDashboardToolbar>

    <main class="flex min-h-0 flex-1 flex-col px-3 py-4 sm:px-4 lg:px-5">
      <UserListTable class="min-h-0 flex-1" />
      <UserUpdateDialog />
      <UserChangePasswordDialog />
    </main>
  </div>
</template>
