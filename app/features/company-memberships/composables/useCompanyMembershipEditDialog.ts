import type { EditingCompanyMembership } from '~/features/company-memberships/types/company-membership.types'

export function useCompanyMembershipEditDialog() {
  const editingMembership = useState<EditingCompanyMembership | null>('company-membership-editing', () => null)

  function openDialog(membership: EditingCompanyMembership) {
    editingMembership.value = membership
  }

  function closeDialog() {
    editingMembership.value = null
  }

  return {
    editingMembership: readonly(editingMembership),
    isOpen: computed(() => editingMembership.value != null),
    openDialog,
    closeDialog,
  }
}
