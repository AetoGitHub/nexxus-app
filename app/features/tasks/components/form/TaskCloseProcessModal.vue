<script setup lang="ts">
import type { CloseTaskProcessStatus } from '~/features/tasks/types/task.types'
import { useCloseEvidence } from '~/features/tasks/composables/form/useCloseEvidence'
import { useCloseTaskProcess } from '~/features/tasks/composables/form/useCloseTaskProcess'
import TaskCloseEvidenceField from '~/features/tasks/components/form/TaskCloseEvidenceField.vue'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  taskId: number
  targetStatus: CloseTaskProcessStatus
}>()

const emit = defineEmits<{
  success: []
}>()

const { t } = useI18n()
const { mutateAsync: closeProcess, isPending } = useCloseTaskProcess()

const comment = ref('')
const evidence = useCloseEvidence(() => props.taskId, () => open.value)
const isBusy = computed(() => isPending.value || evidence.isUploading.value)

const modalTitle = computed(() =>
  props.targetStatus === 'complete'
    ? t('tasks.processClose.modalTitleComplete')
    : t('tasks.processClose.modalTitleInReview'),
)

const confirmLabel = computed(() =>
  props.targetStatus === 'complete'
    ? t('tasks.processClose.confirmComplete')
    : t('tasks.processClose.confirmInReview'),
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
  const images = await evidence.upload()
  if (images === null) {
    return
  }

  try {
    await closeProcess({
      task: props.taskId,
      status: props.targetStatus,
      comment: comment.value.trim() || undefined,
      images: images.length ? images : undefined,
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
    :title="modalTitle"
    :description="t('tasks.processClose.modalDescription')"
    :ui="{
      content: 'sm:max-w-lg',
      footer: 'justify-end',
    }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField
          :label="`${t('tasks.processClose.comment')} (${t('tasks.processClose.optional')})`"
          name="comment"
        >
          <UTextarea
            v-model="comment"
            :placeholder="t('tasks.processClose.commentPlaceholder')"
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <TaskCloseEvidenceField
          :files="evidence.files.value"
          :required="evidence.needsEvidence.value"
          :satisfied="evidence.taskRequiresFile.value && evidence.hasEvidence.value"
          :disabled="isBusy"
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
        :disabled="isBusy"
        @click="close()"
      />
      <UButton
        :label="confirmLabel"
        color="primary"
        :loading="isBusy"
        :disabled="isBusy || !evidence.canSubmit.value"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
