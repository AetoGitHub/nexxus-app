<script setup lang="ts">
import TaskSection from '~/features/tasks/components/list/TaskSection.vue'
import type { TaskListFilters } from '~/features/tasks/types/task.types'
import type { ToUpdateSectionId } from '~/features/to-update/types/to-update.types'
import { findPendingCloseApproval } from '~/features/tasks/utils/form/task-form.util'
import { useAuthorizeCloseApproval } from '~/features/tasks/composables/form/useAuthorizeCloseApproval'

const props = withDefaults(
  defineProps<{
    filters: TaskListFilters
    selectedTaskId?: number | null
  }>(),
  {
    selectedTaskId: null,
  },
)

const emit = defineEmits<{
  select: [taskId: number, sectionId: ToUpdateSectionId]
}>()

const { t } = useI18n()
const { user } = useAuth()
const { sections } = useToUpdateTasks(() => props.filters)
const { mutateAsync: authorizeCloseApproval } = useAuthorizeCloseApproval()

/** Tareas con la autorización en curso, para el spinner del check. */
const approvingIds = ref<Set<number>>(new Set())

/**
 * Click directo en el check de la fila: autoriza sin modal ni slideover.
 * Si el usuario logueado no tiene una aprobación pendiente en esa tarea
 * (p. ej. "Sin atender"), no hace nada — mismo guard que ya usaba el modal.
 */
async function onApprove(taskId: number) {
  const task = sections.value.flatMap(section => section.tasks).find(item => item.id === taskId)
  const approval = findPendingCloseApproval(task?.close_approvals, user.value?.id)
  if (!approval) {
    return
  }

  approvingIds.value = new Set(approvingIds.value).add(taskId)
  try {
    await authorizeCloseApproval(approval.id)
  }
  finally {
    const next = new Set(approvingIds.value)
    next.delete(taskId)
    approvingIds.value = next
  }
}
</script>

<template>
  <div class="space-y-6">
    <TaskSection
      v-for="section in sections"
      :key="section.id"
      :title="t(section.labelKey)"
      :dot-color="section.color"
      :count="section.count"
      :tasks="section.tasks"
      :loading="section.loading"
      :error="section.error"
      :selected-task-id="selectedTaskId"
      :default-open="section.defaultOpen ?? true"
      show-status
      check-action="approve"
      :approving-ids="approvingIds"
      @select="emit('select', $event, section.id)"
      @approve="onApprove"
    />
  </div>
</template>
