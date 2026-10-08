import {
  USER_IMAGE_URL_MAX_LENGTH,
  buildUserImageDirectory,
  buildUserImageFileName,
} from '~/features/users/utils/user-appearance.util'

/**
 * Sube la foto de un usuario a Firebase (vía n8n) y devuelve su URL, que es lo único que recibe el backend
 * (`background_image`). Si falla avisa con un toast y devuelve `null`: el llamador no debe guardar el usuario.
 */
export function useUserImageUpload() {
  const { uploadFile } = useFirebaseUpload()
  const toast = useToast()
  const { t } = useI18n()

  const isUploading = ref(false)

  async function uploadUserImage(file: File, organizationId: number): Promise<string | null> {
    isUploading.value = true
    try {
      const url = await uploadFile(file, buildUserImageDirectory(organizationId), buildUserImageFileName(file.name))
      if (url.length > USER_IMAGE_URL_MAX_LENGTH) {
        throw new Error('image_url_too_long')
      }
      return url
    }
    catch (error) {
      toast.add({
        title: t('configuration.user.appearance.uploadErrorTitle'),
        description: error instanceof Error && error.message === 'image_url_too_long'
          ? t('configuration.user.appearance.urlTooLong')
          : parseFetchError(error),
        color: 'error',
        icon: 'i-lucide-circle-alert',
      })
      return null
    }
    finally {
      isUploading.value = false
    }
  }

  return { uploadUserImage, isUploading }
}
