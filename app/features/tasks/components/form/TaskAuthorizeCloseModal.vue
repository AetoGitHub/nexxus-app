<script setup lang="ts">
import { useAuthorizeCloseApproval } from '~/features/tasks/composables/form/useAuthorizeCloseApproval'
import { useCloseEvidence } from '~/features/tasks/composables/form/useCloseEvidence'
import TaskCloseEvidenceNotice from '~/features/tasks/components/form/TaskCloseEvidenceNotice.vue'

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
 * bloquean, así que ahí no se avisa ni se bloquea.
 */
const isLastApproval = computed(() => {
  const approvals = evidence.detail.data.value?.close_approvals
  if (!approvals) {
    return false
  }
  return !approvals.some(approval => approval.id !== props.approvalId && !approval.closed)
})
const missingEvidence = computed(() => isLastApproval.value && evidence.needsEvidence.value)

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
    <template
      v-if="missingEvidence"
      #body
    >
      <TaskCloseEvidenceNotice />
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
        :label="t('tasks.toUpdate.authorize.submit')"
        color="warning"
        :loading="isPending"
        :disabled="isPending || missingEvidence"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
