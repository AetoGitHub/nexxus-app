<script setup lang="ts">
import OrganizationCreateDialog from '~/features/organizations/components/OrganizationCreateDialog.vue'
import OrganizationListTable from '~/features/organizations/components/OrganizationListTable.vue'
import OrganizationUpdateDialog from '~/features/organizations/components/OrganizationUpdateDialog.vue'
import CompanyCreateDialog from '~/features/companies/components/CompanyCreateDialog.vue'
import CompanyListTable from '~/features/companies/components/CompanyListTable.vue'
import CompanyUpdateDialog from '~/features/companies/components/CompanyUpdateDialog.vue'
import CompanyMembershipCreateDialog from '~/features/company-memberships/components/CompanyMembershipCreateDialog.vue'
import CompanyMembershipUpdateDialog from '~/features/company-memberships/components/CompanyMembershipUpdateDialog.vue'
import UserContextUpdateDialog from '~/features/user-context/components/UserContextUpdateDialog.vue'
import UserChangePasswordDialog from '~/features/users/components/UserChangePasswordDialog.vue'
import UserCreateDialog from '~/features/users/components/UserCreateDialog.vue'
import UserListTable from '~/features/users/components/UserListTable.vue'
import UserUpdateDialog from '~/features/users/components/UserUpdateDialog.vue'
import ConfigurationNavSidebar from '~/features/configuration/components/shared/ConfigurationNavSidebar.vue'
import type { ConfigurationNavItem, ConfigurationSectionId } from '~/features/configuration/types/configuration.types'

definePageMeta({ middleware: 'auth', layout: false })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

function parseSection(value: unknown): ConfigurationSectionId {
  return value === 'company' || value === 'user' ? value : 'organization'
}

const activeSection = ref<ConfigurationSectionId>(parseSection(route.query.section))

watch(() => route.query.section, (value) => {
  activeSection.value = parseSection(value)
})

function onSelectSection(id: ConfigurationSectionId) {
  activeSection.value = id
  void router.replace({ query: { ...route.query, section: id } })
}

const navItems: ConfigurationNavItem[] = [
  { id: 'organization', labelKey: 'configuration.nav.organization', icon: 'i-lucide-building-2' },
  { id: 'company', labelKey: 'configuration.nav.company', icon: 'i-lucide-briefcase' },
  { id: 'user', labelKey: 'configuration.nav.user', icon: 'i-lucide-user' },
]

useSeoMeta({
  title: () => t(`configuration.${activeSection.value}.list.title`),
})
</script>

<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
    <AppHubHeader home-to="/configuration" />

    <div class="flex min-h-0 flex-1 flex-col md:flex-row md:overflow-hidden">
      <ConfigurationNavSidebar
        :items="navItems"
        :active-id="activeSection"
        @select="onSelectSection"
      />

      <div class="flex min-h-0 flex-1 flex-col md:overflow-hidden">
        <template v-if="activeSection === 'organization'">
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
        </template>

        <template v-else-if="activeSection === 'company'">
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
        </template>

        <template v-else>
          <UDashboardToolbar
            :ui="{
              right: 'flex min-w-0 flex-1 items-center justify-end gap-2',
            }"
          >
            <template #right>
              <UButton
                to="/configuration/user/bulk-create"
                color="neutral"
                variant="outline"
                icon="i-lucide-users"
                :label="t('configuration.user.bulkCreate.action')"
              />
              <UserCreateDialog />
            </template>
          </UDashboardToolbar>

          <main class="flex min-h-0 flex-1 flex-col px-3 py-4 sm:px-4 lg:px-5">
            <UserListTable class="min-h-0 flex-1" />
            <UserUpdateDialog />
            <UserChangePasswordDialog />
            <CompanyMembershipCreateDialog />
            <CompanyMembershipUpdateDialog />
            <UserContextUpdateDialog />
          </main>
        </template>
      </div>
    </div>
  </div>
</template>
