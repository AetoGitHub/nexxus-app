<script setup lang="ts">
import { useUnarchiveTaskProcess } from '~/features/tasks/composables/form/useUnarchiveTaskProcess'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  taskId: number
}>()

const emit = defineEmits<{
  success: []
}>()

const { t } = useI18n()
const { mutateAsync: unarchiveProcess, isPending } = useUnarchiveTaskProcess()

const comment = ref('')

function reset() {
  comment.value = ''
}

watch(open, (isOpen) => {
  if (!isOpen) {
    reset()
  }
})

async function onConfirm() {
  try {
    await unarchiveProcess({
      task: props.taskId,
      comment: comment.value.trim() || undefined,
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
    :title="t('tasks.processUnarchive.modalTitle')"
    :description="t('tasks.processUnarchive.modalDescription')"
    :ui="{
      content: 'sm:max-w-lg',
      footer: 'justify-end',
    }"
  >
    <template #body>
      <UFormField
        :label="`${t('tasks.processUnarchive.comment')} (${t('tasks.processUnarchive.optional')})`"
        name="comment"
      >
        <UTextarea
          v-model="comment"
          :placeholder="t('tasks.processUnarchive.commentPlaceholder')"
          :rows="3"
          class="w-full"
        />
      </UFormField>
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
        :label="t('tasks.processUnarchive.confirm')"
        color="primary"
        :loading="isPending"
        :disabled="isPending"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
