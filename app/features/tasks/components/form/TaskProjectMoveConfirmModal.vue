<script setup lang="ts">
import { useUpdateTaskProject } from '~/features/tasks/composables/form/useUpdateTaskProject'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  taskId: number
  projectId: number
  fromProjectName: string
  toProjectName: string
}>()

const emit = defineEmits<{
  success: []
}>()

const { t } = useI18n()
const { mutateAsync: updateProject, isPending } = useUpdateTaskProject()

async function onConfirm() {
  try {
    await updateProject({
      taskId: props.taskId,
      payload: {
        project: props.projectId,
      },
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
    :title="t('tasks.kanban.projectMove.confirmTitle')"
    :description="t('tasks.kanban.projectMove.confirmDescription', {
      from: fromProjectName,
      to: toProjectName,
    })"
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
        :label="t('tasks.kanban.projectMove.confirm')"
        color="primary"
        :loading="isPending"
        :disabled="isPending"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
