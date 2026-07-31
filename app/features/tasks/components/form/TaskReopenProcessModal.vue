<script setup lang="ts">
import { useReopenTaskProcess } from '~/features/tasks/composables/form/useReopenTaskProcess'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  taskId: number
}>()

const emit = defineEmits<{
  success: []
}>()

const { t } = useI18n()
const { mutateAsync: reopenProcess, isPending } = useReopenTaskProcess()

const comment = ref('')
// TODO: reactivar cuando Cloudinary esté listo
// const images = ref<File[] | null | undefined>(null)

function reset() {
  comment.value = ''
  // images.value = null
}

watch(open, (isOpen) => {
  if (!isOpen) {
    reset()
  }
})

async function onConfirm() {
  try {
    await reopenProcess({
      task: props.taskId,
      comment: comment.value.trim() || undefined,
      // images: files.length ? files : undefined,
    })
    open.value = false
    emit('success')
  }
  catch {
    // El toast de error ya se muestra en la mutación.
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tasks.processReopen.modalTitle')"
    :description="t('tasks.processReopen.modalDescription')"
    :ui="{
      content: 'sm:max-w-lg',
      footer: 'justify-end',
    }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField
          :label="`${t('tasks.processReopen.comment')} (${t('tasks.processReopen.optional')})`"
          name="comment"
        >
          <UTextarea
            v-model="comment"
            :placeholder="t('tasks.processReopen.commentPlaceholder')"
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <!-- TODO: reactivar cuando Cloudinary esté listo
        <UFormField
          :label="`${t('tasks.processReopen.images')} (${t('tasks.processReopen.optional')})`"
          name="images"
        >
          <UFileUpload
            v-model="images"
            multiple
            accept="image/svg+xml,image/png,image/jpeg,.svg,.png,.jpg,.jpeg"
            :label="t('tasks.processReopen.dropLabel')"
            :description="t('tasks.processReopen.dropDescription')"
            class="w-full min-h-48"
          />
        </UFormField>
        -->
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        :label="t('tasks.form.cancel')"
        color="neutral"
        variant="outline"
        :disabled="isPending"
        @click="close()"
      />
      <UButton
        :label="t('tasks.processReopen.confirm')"
        color="primary"
        :loading="isPending"
        :disabled="isPending"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
