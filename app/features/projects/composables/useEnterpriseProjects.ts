import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type {
  CreateEnterpriseProjectPayload,
  EnterpriseProject,
} from '~/features/projects/types/project.types'

/**
 * Listado y creación de proyectos de empresa.
 * Con meProyect=true → GET /api/enterprise/projects/?me_proyect=true
 *
 * NOTA: la empresa está fija en 1 por ahora (TODO: derivar de la empresa
 * seleccionada).
 */
export function useEnterpriseProjects(
  meProyect: MaybeRefOrGetter<boolean> = false,
) {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const companyId = 1

  const projectsQuery = useQuery({
    queryKey: computed(() => [
      'enterprise-projects',
      companyId,
      toValue(meProyect) ? 'mine' : 'all',
    ]),
    queryFn: () => {
      const mine = toValue(meProyect)
      return $api<PaginatedResponse<EnterpriseProject>>(
        '/api/enterprise/projects/',
        { query: mine ? { me_proyect: true } : undefined },
      )
    },
  })

  const projects = computed(() => projectsQuery.data.value?.results ?? [])

  const createProject = useMutation({
    mutationFn: (payload: CreateEnterpriseProjectPayload) =>
      $api('/api/enterprise/projects/create/', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-projects'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  return { projectsQuery, projects, createProject, companyId }
}
