/**
 * Modo admin/manager de grupo/proyecto para las vistas de tareas: agrega
 * `admin=true` en modo admin, `group=<id>` en modo por grupo, o
 * `admin_project=<id>` en modo por proyecto (mutuamente excluyentes) a los
 * endpoints de tareas/notificaciones.
 *
 * Todo se deriva de la ruta actual (`/tasks/admin`, `/tasks/group/:groupId`,
 * `/tasks/project/:projectId`) en vez de un estado mutable: así cualquier
 * composable, sin importar dónde se use, ve siempre el valor correcto de
 * forma síncrona, sin depender de que una página lo active/desactive en su
 * ciclo de vida (eso causaba un parpadeo donde algunas queries alcanzaban a
 * salir sin el parámetro justo después de montar la página).
 */
export function useTaskAdminView() {
  const route = useRoute()
  const { isSuperuser, managedGroups, isGroupManager, userProjects } = useAuth()

  const isAdminActive = computed(() => isSuperuser.value && route.path.startsWith('/tasks/admin'))

  const activeGroupId = computed(() => {
    if (!route.path.startsWith('/tasks/group/')) {
      return null
    }
    const id = Number(route.params.groupId)
    return managedGroups.value.some(group => group.id === id) ? id : null
  })
  const isGroupActive = computed(() => activeGroupId.value != null)

  const activeProjectId = computed(() => {
    if (!route.path.startsWith('/tasks/project/')) {
      return null
    }
    const id = Number(route.params.projectId)
    return userProjects.value.some(project => project.id === id) ? id : null
  })
  const isProjectActive = computed(() => activeProjectId.value != null)

  const hasProjects = computed(() => userProjects.value.length > 0)

  const adminQuery = computed<{ admin?: true, group?: number, admin_project?: number }>(() => {
    if (isGroupActive.value && activeGroupId.value != null) {
      return { group: activeGroupId.value }
    }
    if (isProjectActive.value && activeProjectId.value != null) {
      return { admin_project: activeProjectId.value }
    }
    if (isAdminActive.value) {
      return { admin: true }
    }
    return {}
  })

  return {
    isSuperuser,
    isGroupManager,
    managedGroups,
    activeGroupId,
    hasProjects,
    userProjects,
    activeProjectId,
    isAdminActive,
    isGroupActive,
    isProjectActive,
    adminQuery,
  }
}
