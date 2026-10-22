import type { MaybeRefOrGetter } from 'vue'
import { useEnterpriseProjects } from '~/features/projects/composables/useEnterpriseProjects'

/**
 * Compañía del proyecto de una tarea (la que limita a quién se puede mencionar). Sale del listado de proyectos de la
 * empresa; mientras no cargue, o si el proyecto no aparece, se usa la compañía seleccionada en sesión.
 */
export function useMentionCompany(projectId: MaybeRefOrGetter<number | null | undefined>) {
  const { projects, companyId: selectedCompanyId } = useEnterpriseProjects()

  return computed<number | null>(() => {
    const id = toValue(projectId)
    const project = id == null ? undefined : projects.value.find(item => item.id === id)
    return project?.company ?? selectedCompanyId.value ?? null
  })
}
