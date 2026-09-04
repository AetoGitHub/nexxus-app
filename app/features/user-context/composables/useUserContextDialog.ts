import type { EditingUserContext } from '~/features/user-context/types/user-context.types'

export function useUserContextDialog() {
  const editingContext = useState<EditingUserContext | null>('user-context-editing', () => null)

  function openDialog(context: EditingUserContext) {
    editingContext.value = context
  }

  function closeDialog() {
    editingContext.value = null
  }

  return {
    editingContext: readonly(editingContext),
    isOpen: computed(() => editingContext.value != null),
    openDialog,
    closeDialog,
  }
}
