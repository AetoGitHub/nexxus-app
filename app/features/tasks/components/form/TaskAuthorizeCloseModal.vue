<script setup lang="ts">
import { useAuthorizeCloseApproval } from '~/features/tasks/composables/form/useAuthorizeCloseApproval'
import { useCloseEvidence } from '~/features/tasks/composables/form/useCloseEvidence'
import TaskCloseEvidenceField from '~/features/tasks/components/form/TaskCloseEvidenceField.vue'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  taskId: number
  approvalId: number
}>()

const emit = defineEmits<{
  success: []
}>()

const { t } = useI18n()
const { mutateAsync: authorizeCloseApproval, isPending } = useAuthorizeCloseApproval()
const evidence = useCloseEvidence(() => props.taskId, () => open.value)

/**
 * El backend solo exige la evidencia a la aprobación que completa la tarea (la última); las anteriores no se
 * bloquean, así que ahí no se muestra el campo.
 */
const isLastApproval = computed(() => {
  const approvals = evidence.detail.data.value?.close_approvals
  if (!approvals) {
    return false
  }
  return !approvals.some(approval => approval.id !== props.approvalId && !approval.closed)
})
const needsEvidence = computed(() => isLastApproval.value && evidence.needsEvidence.value)
const showEvidence = computed(() => isLastApproval.value && evidence.taskRequiresFile.value)
const isBusy = computed(() => isPending.value || evidence.isUploading.value)
const canConfirm = computed(() => !needsEvidence.value || evidence.files.value.length > 0)

watch(open, (isOpen) => {
  if (!isOpen) {
    evidence.reset()
  }
})

async function onConfirm() {
  const images = showEvidence.value ? await evidence.upload() : []
  if (images === null) {
    return
  }

  try {
    await authorizeCloseApproval({ approvalId: props.approvalId, images })
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
    <template
      v-if="showEvidence"
      #body
    >
      <TaskCloseEvidenceField
        :files="evidence.files.value"
        :required="needsEvidence"
        :satisfied="evidence.hasEvidence.value"
        :disabled="isBusy"
        @add="evidence.addFiles"
        @remove="evidence.removeFile"
      />
    </template>

    <template #footer="{ close }">
      <UButton
        :label="t('tasks.form.cancel')"
        color="neutral"
        variant="outline"
        :disabled="isBusy"
        @click="close()"
      />
      <UButton
        :label="t('tasks.toUpdate.authorize.submit')"
        color="warning"
        :loading="isBusy"
        :disabled="isBusy || !canConfirm"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
