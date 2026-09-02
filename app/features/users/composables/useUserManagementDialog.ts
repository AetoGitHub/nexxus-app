export function useUserManagementDialog() {
  const editUserId = useState<number | null>('user-edit-id', () => null)
  const passwordUserId = useState<number | null>('user-password-id', () => null)

  function openEditDialog(id: number) {
    passwordUserId.value = null
    editUserId.value = id
  }

  function closeEditDialog() {
    editUserId.value = null
  }

  function openPasswordDialog(id: number) {
    editUserId.value = null
    passwordUserId.value = id
  }

  function closePasswordDialog() {
    passwordUserId.value = null
  }

  return {
    editUserId: readonly(editUserId),
    passwordUserId: readonly(passwordUserId),
    isEditOpen: computed(() => editUserId.value != null),
    isPasswordOpen: computed(() => passwordUserId.value != null),
    openEditDialog,
    closeEditDialog,
    openPasswordDialog,
    closePasswordDialog,
  }
}
