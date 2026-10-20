<script setup lang="ts">
import { useReturnTaskProcess } from '~/features/tasks/composables/form/useReturnTaskProcess'
import type { ReturnTaskProcessTarget } from '~/features/tasks/types/task.types'

/**
 * Confirmación al regresar una tarea a un estatus anterior (Pendiente → Backlog): comentario opcional y
 * POST al endpoint de regreso. Lo abren el drag & drop del Kanban y el botón del footer del detalle.
 */
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  taskId: number
  target: ReturnTaskProcessTarget
}>()

const emit = defineEmits<{
  success: []
}>()

const { t } = useI18n()
const { mutateAsync: returnProcess, isPending } = useReturnTaskProcess()

const comment = ref('')

watch(open, (isOpen) => {
  if (!isOpen) {
    comment.value = ''
  }
})

async function onConfirm() {
  try {
    await returnProcess({
      task: props.taskId,
      target: props.target,
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
    :title="t(`tasks.processReturn.${target}.modalTitle`)"
    :description="t(`tasks.processReturn.${target}.modalDescription`)"
    :ui="{
      content: 'sm:max-w-lg',
      footer: 'justify-end',
    }"
  >
    <template #body>
      <UFormField
        :label="`${t('tasks.processReturn.comment')} (${t('tasks.processReturn.optional')})`"
        name="comment"
      >
        <UTextarea
          v-model="comment"
          :placeholder="t('tasks.processReturn.commentPlaceholder')"
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
        :label="t(`tasks.processReturn.${target}.confirm`)"
        color="primary"
        :loading="isPending"
        :disabled="isPending"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
