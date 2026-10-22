import type { MaybeRefOrGetter } from 'vue'
import { useTaskDetail } from '~/features/tasks/composables/form/useTaskDetail'
import { useTaskMessages } from '~/features/tasks/composables/form/useTaskMessages'
import {
  buildTaskCloseUploadDirectory,
  buildTaskUploadFileName,
} from '~/features/tasks/utils/form/task-file-upload.util'
import { useFirebaseUpload } from '~/shared/composables/useFirebaseUpload'

/**
 * Evidencia (archivos) al cerrar una tarea con `requires_close_file`.
 *
 * El backend acepta el cierre si la tarea ya tiene evidencia (un archivo en un mensaje no borrado del chat, o una imagen
 * adjunta a un paso previo del proceso, p. ej. al mandar a revisión) o si el cierre trae al menos un archivo en `images`
 * (URLs de Firebase). Aquí se decide si hace falta pedirlo (`needsEvidence`), se juntan los archivos elegidos y se
 * suben a Firebase al confirmar (`upload`). Las consultas solo corren mientras `active` sea `true`.
 */
export function useCloseEvidence(
  taskId: MaybeRefOrGetter<number>,
  active: MaybeRefOrGetter<boolean>,
) {
  const { t } = useI18n()
  const toast = useToast()
  const { organization, selectedCompanyId } = useAuth()
  const { uploadFile } = useFirebaseUpload()

  const activeTaskId = computed(() => (toValue(active) ? toValue(taskId) : null))
  const detail = useTaskDetail(activeTaskId)
  const { messages } = useTaskMessages(activeTaskId)

  const files = ref<File[]>([])
  const isUploading = ref(false)

  /** La tarea exige evidencia. El detalle del backend todavía puede no mandar el campo: entonces se asume que no. */
  const taskRequiresFile = computed(() => detail.data.value?.requires_close_file === true)
  /** Misma regla del backend: archivo en un mensaje no borrado del chat o imagen de un paso previo del proceso. */
  const hasEvidence = computed(() =>
    messages.value.some(message => !message.deleted && (message.files?.length ?? 0) > 0)
    || (detail.data.value?.process_tasks ?? []).some(step => (step.images?.length ?? 0) > 0),
  )
  /** Hay que adjuntar al menos un archivo para poder cerrar. */
  const needsEvidence = computed(() => taskRequiresFile.value && !hasEvidence.value)
  const canSubmit = computed(() => !needsEvidence.value || files.value.length > 0)

  function addFiles(list: File[]) {
    files.value = [...files.value, ...list]
  }

  function removeFile(index: number) {
    files.value = files.value.filter((_, position) => position !== index)
  }

  function reset() {
    files.value = []
  }

  /** Sube los archivos elegidos y devuelve sus URLs; `null` si falló (el aviso ya se mostró). */
  async function upload(): Promise<string[] | null> {
    if (!files.value.length) {
      return []
    }

    const organizationId = organization.value?.id
    const companyId = selectedCompanyId.value
    if (organizationId == null || companyId == null) {
      toast.add({
        title: t('tasks.messenger.attachments.uploadErrorTitle'),
        description: t('tasks.messenger.attachments.missingContext'),
        color: 'error',
      })
      return null
    }

    const directory = buildTaskCloseUploadDirectory(organizationId, companyId, toValue(taskId))
    isUploading.value = true
    try {
      return await Promise.all(
        files.value.map(file => uploadFile(file, directory, buildTaskUploadFileName(file.name))),
      )
    }
    catch (error) {
      toast.add({
        title: t('tasks.messenger.attachments.uploadErrorTitle'),
        description: parseFetchError(error),
        color: 'error',
      })
      return null
    }
    finally {
      isUploading.value = false
    }
  }

  return {
    files,
    isUploading,
    detail,
    taskRequiresFile,
    hasEvidence,
    needsEvidence,
    canSubmit,
    addFiles,
    removeFile,
    reset,
    upload,
  }
}
