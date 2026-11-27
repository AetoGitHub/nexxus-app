import type { AuthProfile } from '~/features/auth/types/profile.types'
import { useCompaniesDropdown } from '~/features/companies/composables/useCompaniesDropdown'
import { useProfileCompanyMemberships } from '~/features/company-memberships/composables/useProfileCompanyMemberships'
import { usePermissionProfiles } from '~/features/permissions/composables/usePermissionsAdmin'

export interface SelectOption {
  label: string
  value: number
}

/**
 * Compañías donde se pueden crear Presets App: todas las de la organización si es superuser; si no, solo las de sus
 * membresías (el backend rechaza las demás).
 */
export function usePresetAppCompanies() {
  const { organization, user } = useAuth()
  const { isSuperuser } = usePermissions()

  const all = useCompaniesDropdown({ organizationId: () => organization.value?.id })
  const mine = useProfileCompanyMemberships(() => (isSuperuser.value ? null : user.value?.id ?? null))

  const items = computed<SelectOption[]>(() =>
    isSuperuser.value
      ? all.items.value
      : mine.memberships.value.map(membership => ({ label: membership.company_name, value: membership.company })),
  )
  const isPending = computed(() => (isSuperuser.value ? all.isPending.value : mine.isPending.value))

  return { items, isPending }
}

/** Nombre a mostrar de un perfil: «Nombre Apellido» o, si no tiene, su username. */
export function profileLabel(profile: Pick<AuthProfile, 'username' | 'first_name' | 'last_name'>): string {
  const full = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
  return full ? `${full} (${profile.username})` : profile.username
}

/** Perfiles de la organización de la sesión (para el filtro por dueño y para elegir a quién aplicar). */
export function usePresetAppProfiles() {
  const { organization } = useAuth()
  const query = usePermissionProfiles(() => organization.value?.id)
  const profiles = computed(() => query.data.value ?? [])

  /** Usuarios con membresía en la compañía (a quienes se les puede aplicar un preset de esa compañía). */
  function membersOf(companyId: number | null | undefined): SelectOption[] {
    if (companyId == null) {
      return []
    }
    return profiles.value
      .filter(profile => profile.company_memberships?.some(membership => membership.company === companyId))
      .map(profile => ({ label: profileLabel(profile), value: profile.id }))
  }

  const allOptions = computed<SelectOption[]>(() =>
    profiles.value.map(profile => ({ label: profileLabel(profile), value: profile.id })),
  )

  return { query, profiles, membersOf, allOptions }
}
