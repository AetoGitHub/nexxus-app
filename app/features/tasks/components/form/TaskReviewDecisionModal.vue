<script setup lang="ts">
import type { ReviewDecisionStatus } from '~/features/tasks/types/task.types'
import { useCloseEvidence } from '~/features/tasks/composables/form/useCloseEvidence'
import { useCloseTaskProcess } from '~/features/tasks/composables/form/useCloseTaskProcess'
import TaskCloseEvidenceField from '~/features/tasks/components/form/TaskCloseEvidenceField.vue'
import { useRejectTaskProcess } from '~/features/tasks/composables/form/useRejectTaskProcess'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  taskId: number
  targetStatus: ReviewDecisionStatus
}>()

const emit = defineEmits<{
  success: []
}>()

const { t } = useI18n()
const { mutateAsync: closeProcess, isPending: isClosePending } = useCloseTaskProcess()
const { mutateAsync: rejectProcess, isPending: isRejectPending } = useRejectTaskProcess()

const comment = ref('')
/** La evidencia solo aplica al completar (el cierre pasa por /process/close/); rechazar no la pide. */
const isCompleting = computed(() => props.targetStatus === 'complete')
const evidence = useCloseEvidence(() => props.taskId, () => open.value && isCompleting.value)

const isPending = computed(() => isClosePending.value || isRejectPending.value || evidence.isUploading.value)
const canConfirm = computed(() => !isCompleting.value || evidence.canSubmit.value)

const modalTitle = computed(() =>
  props.targetStatus === 'rejected'
    ? t('tasks.processReview.modalTitleRejected')
    : t('tasks.processReview.modalTitleComplete'),
)

const confirmLabel = computed(() =>
  props.targetStatus === 'rejected'
    ? t('tasks.processReview.confirmRejected')
    : t('tasks.processReview.confirmComplete'),
)

const confirmColor = computed(() =>
  props.targetStatus === 'rejected' ? 'error' : 'primary',
)

function reset() {
  comment.value = ''
  evidence.reset()
}

watch(open, (isOpen) => {
  if (!isOpen) {
    reset()
  }
})

async function onConfirm() {
  const trimmedComment = comment.value.trim() || undefined

  try {
    if (props.targetStatus === 'rejected') {
      await rejectProcess({
        task: props.taskId,
        comment: trimmedComment,
      })
    }
    else {
      const images = await evidence.upload()
      if (images === null) {
        return
      }
      await closeProcess({
        task: props.taskId,
        status: 'complete',
        comment: trimmedComment,
        images: images.length ? images : undefined,
      })
    }
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
    :title="modalTitle"
    :description="t('tasks.processReview.modalDescription')"
    :ui="{
      content: 'sm:max-w-lg',
      footer: 'justify-end',
    }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField
          :label="`${t('tasks.processReview.comment')} (${t('tasks.processReview.optional')})`"
          name="comment"
        >
          <UTextarea
            v-model="comment"
            :placeholder="t('tasks.processReview.commentPlaceholder')"
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <TaskCloseEvidenceField
          v-if="isCompleting"
          :files="evidence.files.value"
          :required="evidence.needsEvidence.value"
          :satisfied="evidence.taskRequiresFile.value && evidence.hasEvidence.value"
          :disabled="isPending"
          @add="evidence.addFiles"
          @remove="evidence.removeFile"
        />
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
        :label="confirmLabel"
        :color="confirmColor"
        :loading="isPending"
        :disabled="isPending || !canConfirm"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
