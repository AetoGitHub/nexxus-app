/**
 * Modo admin/manager de grupo para las vistas de tareas: agrega `admin`
 * (y `group` cuando aplica) a los endpoints de tareas/notificaciones.
 * Estado global (vía useState) para que persista entre vistas (lista,
 * kanban, calendario) sin necesidad de pasarlo por props.
 */
export function useTaskAdminView() {
  const { isSuperuser, managedGroupId, managedGroupName } = useAuth()

  const isGroupManager = computed(() => managedGroupId.value != null)

  const isAdminActive = useState('task-admin-view-admin-active', () => false)
  const isGroupActive = useState('task-admin-view-group-active', () => false)

  // Si la sesión cambia y el usuario deja de tener el rol, apagamos el toggle.
  watch(isSuperuser, (value) => {
    if (!value) isAdminActive.value = false
  })
  watch(isGroupManager, (value) => {
    if (!value) isGroupActive.value = false
  })

  const adminQuery = computed<{ admin?: true, group?: number }>(() => {
    if (isGroupActive.value && managedGroupId.value != null) {
      return { admin: true, group: managedGroupId.value }
    }
    if (isAdminActive.value) {
      return { admin: true }
    }
    return {}
  })

  function toggleAdmin() {
    if (!isSuperuser.value) return
    isAdminActive.value = !isAdminActive.value
  }

  function toggleGroup() {
    if (!isGroupManager.value) return
    isGroupActive.value = !isGroupActive.value
  }

  return {
    isSuperuser,
    isGroupManager,
    managedGroupName,
    isAdminActive,
    isGroupActive,
    adminQuery,
    toggleAdmin,
    toggleGroup,
  }
}
