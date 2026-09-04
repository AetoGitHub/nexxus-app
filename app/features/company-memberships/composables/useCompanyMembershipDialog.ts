import type { NewCompanyMembershipContext } from '~/features/company-memberships/types/company-membership.types'

export function useCompanyMembershipDialog() {
  const membershipContext = useState<NewCompanyMembershipContext | null>('company-membership-context', () => null)

  function openDialog(context: NewCompanyMembershipContext) {
    membershipContext.value = context
  }

  function closeDialog() {
    membershipContext.value = null
  }

  return {
    membershipContext: readonly(membershipContext),
    isOpen: computed(() => membershipContext.value != null),
    openDialog,
    closeDialog,
  }
}
