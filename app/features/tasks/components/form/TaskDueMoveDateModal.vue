<script setup lang="ts">
import { useUpdateTaskLimitDate } from '~/features/tasks/composables/form/useUpdateTaskLimitDate'
import { dueDateInputToLimitISO } from '~/features/tasks/utils/kanban/kanban-due-move.util'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  taskId: number
  columnId: 'week' | 'month'
  minDate: string
  maxDate: string
}>()

const emit = defineEmits<{
  success: []
}>()

const { t } = useI18n()
const { mutateAsync: updateLimitDate, isPending } = useUpdateTaskLimitDate()

const selectedDate = ref('')

const title = computed(() =>
  props.columnId === 'week'
    ? t('tasks.kanban.dueMove.pickDateWeekTitle')
    : t('tasks.kanban.dueMove.pickDateMonthTitle'),
)

const description = computed(() =>
  props.columnId === 'week'
    ? t('tasks.kanban.dueMove.pickDateWeekDescription')
    : t('tasks.kanban.dueMove.pickDateMonthDescription'),
)

const canConfirm = computed(() => {
  if (!selectedDate.value) {
    return false
  }
  return selectedDate.value >= props.minDate && selectedDate.value <= props.maxDate
})

function reset() {
  selectedDate.value = ''
}

watch(open, (isOpen) => {
  if (isOpen) {
    selectedDate.value = props.minDate
    return
  }
  reset()
})

async function onConfirm() {
  if (!canConfirm.value) {
    return
  }

  try {
    await updateLimitDate({
      taskId: props.taskId,
      payload: {
        limit_date: dueDateInputToLimitISO(selectedDate.value),
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
    <template #body>
      <UFormField
        :label="t('tasks.kanban.dueMove.dateLabel')"
        name="limitDate"
        required
      >
        <UInput
          v-model="selectedDate"
          type="date"
          icon="i-lucide-calendar"
          :min="minDate"
          :max="maxDate"
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
        :label="t('tasks.kanban.dueMove.confirm')"
        color="primary"
        :loading="isPending"
        :disabled="isPending || !canConfirm"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
