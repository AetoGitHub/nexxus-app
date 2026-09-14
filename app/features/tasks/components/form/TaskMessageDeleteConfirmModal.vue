<script setup lang="ts">
import { useDeleteTaskMessage } from '~/features/tasks/composables/form/useDeleteTaskMessage'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  messageId: number
  taskId: number
}>()

const emit = defineEmits<{
  success: []
}>()

const { t } = useI18n()
const { mutateAsync: deleteMessage, isPending } = useDeleteTaskMessage()

async function onConfirm() {
  try {
    await deleteMessage({ id: props.messageId, task: props.taskId })
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
    :title="t('tasks.messenger.deleteConfirmTitle')"
    :description="t('tasks.messenger.deleteConfirmDescription')"
    :ui="{
      content: 'sm:max-w-lg',
      footer: 'justify-end',
    }"
  >
    <template #footer="{ close }">
      <UButton
        :label="t('tasks.form.cancel')"
        color="neutral"
        variant="outline"
        :disabled="isPending"
        @click="close()"
      />
      <UButton
        :label="t('tasks.messenger.deleteConfirm')"
        color="error"
        :loading="isPending"
        :disabled="isPending"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
