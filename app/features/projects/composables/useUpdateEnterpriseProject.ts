import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { UpdateEnterpriseProjectPayload } from '~/features/projects/types/project.types'
import { parseFetchError } from '~/shared/utils/error-message.util'

/**
 * Actualiza un proyecto de empresa vía PATCH
 * /api/enterprise/projects/:id/update/.
 */
export function useUpdateEnterpriseProject() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateEnterpriseProjectPayload
    }) =>
      $api(`/api/enterprise/projects/${id}/update/`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['enterprise-projects'] })
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.add({
        title: t('taskSettings.projectModal.updatedTitle'),
        description: t('taskSettings.projectModal.updatedDescription'),
        color: 'success',
      })
    },
    onError: (error) => {
      toast.add({
        title: t('taskSettings.projectModal.updateErrorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
    },
  })
}
