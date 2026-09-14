<script setup lang="ts">
import { useDeleteTaskProcess } from '~/features/tasks/composables/form/useDeleteTaskProcess'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  taskId: number
}>()

const emit = defineEmits<{
  success: []
}>()

const { t } = useI18n()
const { mutateAsync: deleteProcess, isPending } = useDeleteTaskProcess()

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
    await deleteProcess({
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
    :title="t('tasks.processDelete.modalTitle')"
    :description="t('tasks.processDelete.modalDescription')"
    :ui="{
      content: 'sm:max-w-lg',
      footer: 'justify-end',
    }"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="t('tasks.processDelete.irreversibleTitle')"
          :description="t('tasks.processDelete.irreversibleDescription')"
        />

        <UFormField
          :label="`${t('tasks.processDelete.comment')} (${t('tasks.processDelete.optional')})`"
          name="comment"
        >
          <UTextarea
            v-model="comment"
            :placeholder="t('tasks.processDelete.commentPlaceholder')"
            :rows="3"
            class="w-full"
          />
        </UFormField>
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
        :label="t('tasks.processDelete.confirm')"
        color="error"
        :loading="isPending"
        :disabled="isPending"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
