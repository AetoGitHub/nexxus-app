import type { MaybeRefOrGetter } from 'vue'
import type { TaskListFilters } from '~/features/tasks/types/task.types'
import type {
  ToUpdateSection,
  ToUpdateSectionId,
} from '~/features/to-update/types/to-update.types'
import {
  TO_UPDATE_SECTION_META,
  TO_UPDATE_SECTION_ORDER,
} from '~/features/to-update/utils/to-update-sections.util'
import { createCompanyTasksApi } from '~/features/tasks/composables/shared/createCompanyTasksApi'
import { useToUpdateCounts } from '~/features/to-update/composables/useToUpdateCounts'
import { extractResults } from '~/shared/utils/paginated.util'

/**
 * Server state de Pending approval (vista Lista) vía TanStack Query.
 *
 * Endpoints: /api/tasks/company/:id/close/{counts|pending|urgent|delayed|critical|accepted}/
 */
export function useToUpdateTasks(filters: MaybeRefOrGetter<TaskListFilters> = {}) {
  const api = createCompanyTasksApi(filters)
  const scope = ['close']

  const { counts } = useToUpdateCounts(filters)
  const pending = api.listQuery([...scope, 'pending'], '/close/pending/')
  const urgent = api.listQuery([...scope, 'urgent'], '/close/urgent/')
  const delayed = api.listQuery([...scope, 'delayed'], '/close/delayed/')
  const critical = api.listQuery([...scope, 'critical'], '/close/critical/')
  const accepted = api.listQuery([...scope, 'accepted'], '/close/accepted/')

  const sectionQueries: Record<ToUpdateSectionId, typeof pending> = {
    pending,
    urgent,
    delayed,
    critical,
    accepted,
  }

  const sections = computed<ToUpdateSection[]>(() => {
    const totals = counts.data.value

    return TO_UPDATE_SECTION_ORDER.map((id) => {
      const sectionQuery = sectionQueries[id]
      const meta = TO_UPDATE_SECTION_META[id]

      return {
        id,
        labelKey: meta.labelKey,
        color: meta.color,
        count: totals?.[id],
        tasks: extractResults(sectionQuery.data.value),
        loading: sectionQuery.isPending.value,
        error: sectionQuery.isError.value,
      }
    })
  })

  return { counts, pending, urgent, delayed, critical, accepted, sections }
}
