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
import PermissionsAdminPanel from '~/features/permissions/components/PermissionsAdminPanel.vue'
import ConfigurationNavSidebar from '~/features/configuration/components/shared/ConfigurationNavSidebar.vue'
import ConfigurationSelectOrganizationPrompt from '~/features/configuration/components/shared/ConfigurationSelectOrganizationPrompt.vue'
import { useOrganizationsDropdown } from '~/features/organizations/composables/useOrganizationsDropdown'
import { useCompaniesDropdown } from '~/features/companies/composables/useCompaniesDropdown'
import type { ConfigurationNavItem, ConfigurationSectionId } from '~/features/configuration/types/configuration.types'

definePageMeta({ middleware: ['auth', 'permission'], permission: ['master'], layout: false })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

/** Compartido entre Organización y Compañía: filtra ambas tablas por organización. */
const organizationFilterId = ref<number | null>(null)
const { items: organizationFilterItems } = useOrganizationsDropdown()

/**
 * Solo aplica en la sección Compañía. `companyNameSearch` alimenta las
 * sugerencias del select (mientras se escribe); la tabla solo se filtra al
 * elegir una opción (`companyFilterId` -> nombre de esa opción).
 */
const companyFilterId = ref<number | null>(null)
const companyNameSearch = ref('')
const debouncedCompanyNameSearch = refDebounced(companyNameSearch, 300)
const { items: companyFilterItems, isPending: companyFilterItemsPending } = useCompaniesDropdown({
  organizationId: () => organizationFilterId.value,
  searchTerm: debouncedCompanyNameSearch,
})

/**
 * El select resetea el término de búsqueda al elegir una opción, lo que
 * dispara un refetch (sin ese filtro) que puede dejar de incluir la
 * compañía recién elegida — y entonces el select cae a mostrar el ID crudo.
 * Este cache conserva su {label, value} para que siga mostrando el nombre
 * (y alimentando el filtro de la tabla) sin depender de la búsqueda vigente.
 */
const selectedCompanyItem = ref<{ label: string, value: number } | null>(null)

watch(companyFilterId, (id) => {
  if (id == null) {
    selectedCompanyItem.value = null
    return
  }
  const match = companyFilterItems.value.find(item => item.value === id)
  if (match) {
    selectedCompanyItem.value = match
  }
})

const companySelectItems = computed(() => {
  const selected = selectedCompanyItem.value
  if (selected && !companyFilterItems.value.some(item => item.value === selected.value)) {
    return [selected, ...companyFilterItems.value]
  }
  return companyFilterItems.value
})

const selectedCompanyName = computed(() => selectedCompanyItem.value?.label ?? '')

/** Sin organización la tabla de compañías no se muestra: no debe quedar un filtro de compañía huérfano. */
watch(organizationFilterId, (id) => {
  if (id == null) {
    companyFilterId.value = null
    companyNameSearch.value = ''
  }
})

/** Preselecciona en el bulk-create la organización/compañía ya elegidas acá (si las hay). */
const bulkCreateTo = computed(() => {
  const query: Record<string, string> = {}
  if (organizationFilterId.value != null) {
    query.organization = String(organizationFilterId.value)
  }
  if (companyFilterId.value != null) {
    query.company = String(companyFilterId.value)
  }
  return { path: '/configuration/user/bulk-create', query }
})

/**
 * Cada pestaña solo con su permiso de Configuración master (`master.can_organizations / can_companies / can_users`);
 * Permisos solo para superusers. Sin permiso la pestaña no se muestra (ni en solo lectura) y se abre la primera visible.
 */
const { can, isSuperuser } = usePermissions()

const ALL_NAV_ITEMS: ConfigurationNavItem[] = [
  { id: 'organization', labelKey: 'configuration.nav.organization', icon: 'i-lucide-building-2' },
  { id: 'company', labelKey: 'configuration.nav.company', icon: 'i-lucide-briefcase' },
  { id: 'user', labelKey: 'configuration.nav.user', icon: 'i-lucide-user' },
  { id: 'permissions', labelKey: 'configuration.nav.permissions', icon: 'i-lucide-shield-check' },
]

function isSectionAllowed(id: ConfigurationSectionId): boolean {
  switch (id) {
    case 'organization':
      return can('master', 'organizations')
    case 'company':
      return can('master', 'companies')
    case 'user':
      return can('master', 'users')
    case 'permissions':
      return isSuperuser.value
  }
}

const navItems = computed(() => ALL_NAV_ITEMS.filter(item => isSectionAllowed(item.id)))

function firstAllowedSection(): ConfigurationSectionId | null {
  return navItems.value[0]?.id ?? null
}

function parseSection(value: unknown): ConfigurationSectionId | null {
  const id = value as ConfigurationSectionId
  return ALL_NAV_ITEMS.some(item => item.id === id) && isSectionAllowed(id) ? id : firstAllowedSection()
}

const activeSection = ref<ConfigurationSectionId | null>(parseSection(route.query.section))

watch(() => route.query.section, (value) => {
  activeSection.value = parseSection(value)
})

// Si cambian los permisos con la pantalla abierta, no se queda en una pestaña que ya no tiene.
watch(navItems, () => {
  if (!activeSection.value || !isSectionAllowed(activeSection.value)) {
    activeSection.value = firstAllowedSection()
  }
})

function onSelectSection(id: ConfigurationSectionId) {
  activeSection.value = id
  void router.replace({ query: { ...route.query, section: id } })
}

useSeoMeta({
  title: () => {
    if (!activeSection.value) {
      return t('configuration.title')
    }
    return activeSection.value === 'permissions'
      ? t('permissions.title')
      : t(`configuration.${activeSection.value}.list.title`)
  },
})
</script>

<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
    <AppHubHeader />

    <div class="flex min-h-0 flex-1 flex-col md:flex-row md:overflow-hidden">
      <ConfigurationNavSidebar
        :items="navItems"
        :active-id="activeSection ?? 'organization'"
        @select="onSelectSection"
      />

      <div class="flex min-h-0 flex-1 flex-col md:overflow-hidden">
        <template v-if="activeSection === 'organization'">
          <UDashboardToolbar
            :ui="{
              left: 'flex min-w-0 flex-1 items-center gap-2',
              right: 'flex min-w-0 flex-1 items-center justify-end gap-2',
            }"
          >
            <template #left>
              <USelectMenu
                v-model="organizationFilterId"
                :items="organizationFilterItems"
                value-key="value"
                :placeholder="t('configuration.organization.filters.organizationPlaceholder')"
                icon="i-lucide-building-2"
                clear
                class="w-full sm:w-56"
              />
            </template>
            <template #right>
              <OrganizationCreateDialog />
            </template>
          </UDashboardToolbar>

          <main class="flex min-h-0 flex-1 flex-col px-3 py-4 sm:px-4 lg:px-5">
            <OrganizationListTable
              v-if="organizationFilterId != null"
              class="min-h-0 flex-1"
              :organization-id="organizationFilterId"
            />
            <ConfigurationSelectOrganizationPrompt
              v-else
              :message="t('configuration.organization.filters.selectPrompt')"
            />
            <OrganizationUpdateDialog />
          </main>
        </template>

        <template v-else-if="activeSection === 'company'">
          <UDashboardToolbar
            :ui="{
              left: 'flex min-w-0 flex-1 flex-wrap items-center gap-2',
              right: 'flex min-w-0 flex-1 items-center justify-end gap-2',
            }"
          >
            <template #left>
              <USelectMenu
                v-model="organizationFilterId"
                :items="organizationFilterItems"
                value-key="value"
                :placeholder="t('configuration.company.filters.organizationPlaceholder')"
                icon="i-lucide-building-2"
                clear
                class="w-full sm:w-56"
              />
              <USelectMenu
                v-model="companyFilterId"
                v-model:search-term="companyNameSearch"
                :items="companySelectItems"
                :loading="companyFilterItemsPending"
                :disabled="organizationFilterId == null"
                value-key="value"
                :placeholder="t('configuration.company.filters.companyPlaceholder')"
                icon="i-lucide-search"
                ignore-filter
                clear
                class="w-full sm:w-56"
                @clear="companyNameSearch = ''"
              />
            </template>
            <template #right>
              <CompanyCreateDialog />
            </template>
          </UDashboardToolbar>

          <main class="flex min-h-0 flex-1 flex-col px-3 py-4 sm:px-4 lg:px-5">
            <CompanyListTable
              v-if="organizationFilterId != null"
              class="min-h-0 flex-1"
              :organization-id="organizationFilterId"
              :name-search="selectedCompanyName"
            />
            <ConfigurationSelectOrganizationPrompt
              v-else
              :message="t('configuration.company.filters.selectPrompt')"
            />
            <CompanyUpdateDialog />
          </main>
        </template>

        <template v-else-if="activeSection === 'permissions'">
          <!-- Mismo selector de organización que Organización/Compañía/Usuarios: filtra la lista de usuarios. -->
          <UDashboardToolbar
            :ui="{
              left: 'flex min-w-0 flex-1 items-center gap-2',
              right: 'flex min-w-0 flex-1 items-center justify-end gap-2',
            }"
          >
            <template #left>
              <USelectMenu
                v-model="organizationFilterId"
                :items="organizationFilterItems"
                value-key="value"
                :placeholder="t('configuration.user.filters.organizationPlaceholder')"
                icon="i-lucide-building-2"
                clear
                class="w-full sm:w-56"
              />
            </template>
          </UDashboardToolbar>

          <PermissionsAdminPanel :organization-id="organizationFilterId" />
        </template>

        <template v-else-if="activeSection === 'user'">
          <UDashboardToolbar
            :ui="{
              left: 'flex min-w-0 flex-1 items-center gap-2',
              right: 'flex min-w-0 flex-1 items-center justify-end gap-2',
            }"
          >
            <template #left>
              <USelectMenu
                v-model="organizationFilterId"
                :items="organizationFilterItems"
                value-key="value"
                :placeholder="t('configuration.user.filters.organizationPlaceholder')"
                icon="i-lucide-building-2"
                clear
                class="w-full sm:w-56"
              />
            </template>
            <template #right>
              <UButton
                :to="bulkCreateTo"
                color="neutral"
                variant="outline"
                icon="i-lucide-users"
                :label="t('configuration.user.bulkCreate.action')"
              />
              <UserCreateDialog />
            </template>
          </UDashboardToolbar>

          <main class="flex min-h-0 flex-1 flex-col px-3 py-4 sm:px-4 lg:px-5">
            <UserListTable
              v-if="organizationFilterId != null"
              class="min-h-0 flex-1"
              :organization-id="organizationFilterId"
            />
            <ConfigurationSelectOrganizationPrompt
              v-else
              :message="t('configuration.user.filters.selectPrompt')"
            />
            <UserChangePasswordDialog />
            <CompanyMembershipCreateDialog />
            <CompanyMembershipUpdateDialog />
            <UserContextUpdateDialog />
          </main>
        </template>

        <!-- Acceso a Configuración master pero sin ninguna pestaña permitida. -->
        <div
          v-else
          class="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UIcon
              name="i-lucide-lock"
              class="h-6 w-6"
            />
          </div>
          <p class="max-w-sm text-sm text-muted-foreground">
            {{ t('permissions.masterEmpty') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
