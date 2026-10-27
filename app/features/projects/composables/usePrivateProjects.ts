import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type {
  CreatePrivateProjectPayload,
  EnterpriseProject,
  PrivateProject,
  PublishProjectPayload,
} from '~/features/projects/types/project.types'
import { TASK_SUCCESS_TOAST_MS } from '~/features/tasks/utils/task-toast.util'

export const privateProjectsQueryKey = ['enterprise-projects', 'private'] as const

/**
 * Proyectos privados del usuario logueado (`GET /api/enterprise/projects/private/`): solo él los ve, no tienen
 * compañía y no cuentan en dashboard, KPIs ni reportes. Se pueden crear, editar (nombre y color) y volver públicos.
 *
 * La consulta solo corre con sesión iniciada; la caché se limpia al cerrar e iniciar sesión (ver `useAuth`).
 */
export function usePrivateProjects(options: { enabled?: MaybeRefOrGetter<boolean> } = {}) {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const { isLoggedIn, user } = useAuth()
  const toast = useToast()
  const { t } = useI18n()

  const projectsQuery = useQuery({
    // El id del usuario va en la llave: otra cuenta nunca reutiliza esta caché.
    queryKey: computed(() => [...privateProjectsQueryKey, user.value?.id ?? null]),
    queryFn: () => $api<PaginatedResponse<PrivateProject>>('/api/enterprise/projects/private/'),
    enabled: computed(() => isLoggedIn.value && toValue(options.enabled ?? true)),
  })

  /** «Personal» primero; el resto por nombre. */
  const projects = computed(() =>
    [...(projectsQuery.data.value?.results ?? [])].sort((a, b) => {
      const aPersonal = a.name.trim().toLowerCase() === 'personal'
      const bPersonal = b.name.trim().toLowerCase() === 'personal'
      if (aPersonal !== bPersonal) {
        return aPersonal ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    }),
  )

  const privateIds = computed(() => new Set(projects.value.map(project => project.id)))

  function isPrivateProject(projectId: number | null | undefined) {
    return projectId != null && privateIds.value.has(projectId)
  }

  const createProject = useMutation({
    mutationFn: (payload: CreatePrivateProjectPayload) =>
      $api<PrivateProject>('/api/enterprise/projects/private/create/', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async (project) => {
      // Va a la lista de privados, no a la de la compañía.
      queryClient.setQueriesData<PaginatedResponse<PrivateProject>>(
        { queryKey: privateProjectsQueryKey },
        current => current
          ? { ...current, count: (current.count ?? current.results.length) + 1, results: [...current.results, project] }
          : current,
      )
      await queryClient.invalidateQueries({ queryKey: privateProjectsQueryKey })
      toast.add({
        title: t('privateProjects.create.successTitle'),
        description: t('privateProjects.create.successDescription', { name: project.name }),
        color: 'success',
        duration: TASK_SUCCESS_TOAST_MS,
      })
    },
    onError: (error) => {
      toast.add({ title: t('privateProjects.create.errorTitle'), description: parseFetchError(error), color: 'error' })
    },
  })

  const publishProject = useMutation({
    mutationFn: ({ projectId, ...payload }: PublishProjectPayload & { projectId: number }) =>
      $api<EnterpriseProject>(`/api/enterprise/projects/${projectId}/publish/`, {
        method: 'POST',
        body: payload,
      }),
    onSuccess: async (project) => {
      // Sale de «privados» y pasa a los proyectos de su compañía; sus tareas dejan de llevar candado.
      queryClient.setQueriesData<PaginatedResponse<PrivateProject>>(
        { queryKey: privateProjectsQueryKey },
        current => current
          ? { ...current, count: Math.max(0, (current.count ?? current.results.length) - 1), results: current.results.filter(item => item.id !== project.id) }
          : current,
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: privateProjectsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-projects'] }),
        queryClient.invalidateQueries({ queryKey: ['dropdowns', 'projects'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      ])
      toast.add({
        title: t('privateProjects.publish.successTitle'),
        description: t('privateProjects.publish.successDescription', { name: project.name }),
        color: 'success',
        duration: TASK_SUCCESS_TOAST_MS,
      })
    },
    onError: (error) => {
      toast.add({ title: t('privateProjects.publish.errorTitle'), description: parseFetchError(error), color: 'error' })
    },
  })

  return { projectsQuery, projects, privateIds, isPrivateProject, createProject, publishProject }
}
