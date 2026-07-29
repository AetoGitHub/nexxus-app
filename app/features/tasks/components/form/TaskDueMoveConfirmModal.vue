<script setup lang="ts">
import { useUpdateTaskLimitDate } from '~/features/tasks/composables/form/useUpdateTaskLimitDate'
import { dueDateInputToLimitISO } from '~/features/tasks/utils/kanban/kanban-due-move.util'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  taskId: number
  columnId: 'today' | 'tomorrow'
  limitDateInput: string
}>()

const emit = defineEmits<{
  success: []
}>()

const { t } = useI18n()
const { mutateAsync: updateLimitDate, isPending } = useUpdateTaskLimitDate()

const title = computed(() =>
  props.columnId === 'today'
    ? t('tasks.kanban.dueMove.confirmTodayTitle')
    : t('tasks.kanban.dueMove.confirmTomorrowTitle'),
)

const description = computed(() =>
  props.columnId === 'today'
    ? t('tasks.kanban.dueMove.confirmTodayDescription')
    : t('tasks.kanban.dueMove.confirmTomorrowDescription'),
)

async function onConfirm() {
  try {
    await updateLimitDate({
      taskId: props.taskId,
      payload: {
        limit_date: dueDateInputToLimitISO(props.limitDateInput),
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
    :title="title"
    :description="description"
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
        :label="t('tasks.kanban.dueMove.confirm')"
        color="primary"
        :loading="isPending"
        :disabled="isPending"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
