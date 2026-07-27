<script setup lang="ts">
import { useAuthorizeCloseApproval } from '~/features/tasks/composables/form/useAuthorizeCloseApproval'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  approvalId: number
}>()

const emit = defineEmits<{
  success: []
}>()

const { t } = useI18n()
const { mutateAsync: authorizeCloseApproval, isPending } = useAuthorizeCloseApproval()

async function onConfirm() {
  try {
    await authorizeCloseApproval(props.approvalId)
    open.value = false
    emit('success')
  }
  catch {
    // Toast de error lo maneja useAuthorizeCloseApproval.
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('tasks.toUpdate.authorize.modalTitle')"
    :description="t('tasks.toUpdate.authorize.modalDescription')"
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
        :label="t('tasks.toUpdate.authorize.submit')"
        color="warning"
        :loading="isPending"
        :disabled="isPending"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
