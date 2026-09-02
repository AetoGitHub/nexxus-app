export function useCompanyDialog() {
  const selectedId = useState<number | null>('company-edit-id', () => null)

  function openDialog(id: number) {
    selectedId.value = id
  }

  function closeDialog() {
    selectedId.value = null
  }

  const isOpen = computed(() => selectedId.value != null)

  return {
    selectedId: readonly(selectedId),
    isOpen,
    openDialog,
    closeDialog,
  }
}
