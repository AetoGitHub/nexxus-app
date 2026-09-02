<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type {
  CloseTaskProcessStatus,
  NewTaskFormType,
  ReviewDecisionStatus,
  TaskEffort,
  TaskGroupBy,
  TaskView,
} from '~/features/tasks/types/task.types'
import { useCreateTask } from '~/features/tasks/composables/form/useCreateTask'
import { useUpdateTask } from '~/features/tasks/composables/form/useUpdateTask'
import { useProjectsDropdown } from '~/features/tasks/composables/shared/useProjectsDropdown'
import { useUsersDropdown } from '~/features/tasks/composables/shared/useUsersDropdown'
import { useTaskDetail } from '~/features/tasks/composables/form/useTaskDetail'
import TaskAuthorizeCloseModal from '~/features/tasks/components/form/TaskAuthorizeCloseModal.vue'
import TaskArchiveProcessModal from '~/features/tasks/components/form/TaskArchiveProcessModal.vue'
import TaskCloseProcessModal from '~/features/tasks/components/form/TaskCloseProcessModal.vue'
import TaskMessenger from '~/features/tasks/components/form/TaskMessenger.vue'
import TaskReopenProcessModal from '~/features/tasks/components/form/TaskReopenProcessModal.vue'
import TaskReviewDecisionModal from '~/features/tasks/components/form/TaskReviewDecisionModal.vue'
import TaskStartProcessModal from '~/features/tasks/components/form/TaskStartProcessModal.vue'
import TaskDatePicker from '~/features/tasks/components/shared/TaskDatePicker.vue'
import TaskRepeatConfigFields from '~/features/tasks/components/form/TaskRepeatConfigFields.vue'
import {
  buildCreateTaskPayload,
  buildUpdateTaskPayload,
  defaultTaskReviewers,
  findCloseApprovalForUser,
  findPendingCloseApproval,
  taskDetailToFormInput,
  type NewTaskFormInput,
} from '~/features/tasks/utils/form/task-form.util'
import {
  applyNewTaskFormDefaults,
  type NewTaskFormDefaults,
} from '~/features/tasks/utils/form/new-task-defaults.util'
import {
  createDefaultRepeatConfig,
  isRepeatConfigComplete,
} from '~/features/tasks/utils/form/repeat-config.util'
import type { ToUpdateSectionId } from '~/features/to-update/types/to-update.types'

interface NewTaskFormState extends NewTaskFormInput {
  volumeCountWhat: string
  volumePeriodGoal: string
  volumePointsPerUnit: string
  volumeVerifyDates: boolean
  volumeRejectDuplicates: boolean
  volumeNexxaAiAnalysis: boolean
}

const open = defineModel<boolean>('open', { default: false })
const taskId = defineModel<number | null>('taskId', { default: null })

const props = withDefaults(
  defineProps<{
    view?: TaskView
    groupBy?: TaskGroupBy
    /** Prefills al crear (proyecto / usuario / grupo desde columna Kanban). */
    initialDefaults?: NewTaskFormDefaults | null
    /** Modo autorización desde pending-approval. */
    authorizeMode?: boolean
    /** Sección de pending-approval desde la que se abrió el detalle. */
    toUpdateSection?: ToUpdateSectionId | null
  }>(),
  {
    view: 'list',
    groupBy: 'all',
    initialDefaults: null,
    authorizeMode: false,
    toUpdateSection: null,
  },
)

const { t } = useI18n()
const { user } = useAuth()

const formId = 'new-task-form'
const submitError = ref('')
const startProcessModalOpen = ref(false)
const closeProcessModalOpen = ref(false)
const closeProcessStatus = ref<CloseTaskProcessStatus>('in_review')
const reviewDecisionModalOpen = ref(false)
const reviewDecisionStatus = ref<ReviewDecisionStatus>('complete')
const reopenProcessModalOpen = ref(false)
const archiveProcessModalOpen = ref(false)
const authorizeModalOpen = ref(false)
/** Con taskId el slideover es detalle (view-only salvo modo edición). */
const isDetailView = computed(() => taskId.value != null)
const isEditing = ref(false)
/** Campos bloqueados: detalle sin edición activa. */
const isReadOnly = computed(() => isDetailView.value && !isEditing.value)
/** En mobile: panel visible (mensajes o detalle). En sm+ se muestran ambos. */
const mobilePanel = ref<'detail' | 'messages'>('detail')

/** Hoy en zona local (YYYY-MM-DD) para deshabilitar días pasados en el input date. */
const minDueDate = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

const { mutateAsync: createTask, isPending } = useCreateTask()
const { mutateAsync: updateTask, isPending: isUpdating } = useUpdateTask()
const taskDetailQuery = useTaskDetail(() => (open.value ? taskId.value : null))

const isSaving = computed(() => isPending.value || isUpdating.value)

/** Campos obligatorios listos para crear/guardar. */
const canSubmit = computed(() => {
  if (!state.name.trim()) {
    return false
  }
  if (state.project == null) {
    return false
  }
  if (!state.assignedTo.length) {
    return false
  }
  if (!state.dueDate) {
    return false
  }
  if (!isDetailView.value && state.group == null) {
    return false
  }
  if (state.type === 'multiple_close' && !state.taskReviewer.length && user.value?.id == null) {
    return false
  }
  if (state.type === 'repeat' && !isRepeatConfigComplete(state.repeatConfig)) {
    return false
  }
  return true
})

/** Registro de close_approvals del usuario logueado (si existe). */
const userCloseApproval = computed(() =>
  findCloseApprovalForUser(
    taskDetailQuery.data.value?.close_approvals,
    user.value?.id,
  ),
)

/** Aprobación pendiente del usuario logueado en close_approvals. */
const pendingApprovalForUser = computed(() =>
  findPendingCloseApproval(
    taskDetailQuery.data.value?.close_approvals,
    user.value?.id,
  ),
)

/** El usuario ya registró su autorización (closed: true). */
const hasUserAlreadyAuthorized = computed(() => userCloseApproval.value?.closed === true)

/** En accepted solo se muestra Close; en el resto Rejected + Authorize. */
const isAcceptedToUpdateSection = computed(() => props.toUpdateSection === 'accepted')

/** Acciones Rejected/Authorize en pending-approval (todas las secciones menos accepted). */
const showAuthorizeActions = computed(() =>
  props.authorizeMode
  && isDetailView.value
  && !isEditing.value
  && !isAcceptedToUpdateSection.value,
)

const canAuthorize = computed(() => pendingApprovalForUser.value != null)

/** Detalle con acciones de proceso (fuera de pending-approval). */
const showProcessActions = computed(() =>
  isDetailView.value
  && !isEditing.value
  && !props.authorizeMode
  && (props.view === 'list' || props.view === 'kanban' || props.view === 'calendar'),
)

/** Pending: acción para iniciar proceso. */
const showStartProcess = computed(() =>
  showProcessActions.value
  && taskDetailQuery.data.value?.status === 'pending',
)

/** In Progress: avanzar a in_review / complete. */
const showCloseProcess = computed(() =>
  showProcessActions.value
  && taskDetailQuery.data.value?.status === 'wip',
)

/** Cierre múltiple: se detecta por type (y boolean de respaldo). */
const isMultipleCloseTask = computed(() => {
  const detail = taskDetailQuery.data.value
  return detail?.type === 'multiple_close' || detail?.multiple_close === true
})

/** multiple_close solo permite enviar a revisión (no complete directo). */
const showCompleteAction = computed(() =>
  showCloseProcess.value
  && !isMultipleCloseTask.value,
)

/**
 * In review: rechazar / completar / autorizar.
 * Si el usuario ya autorizó en close_approvals, no se muestran acciones.
 */
const showReviewDecision = computed(() =>
  showProcessActions.value
  && taskDetailQuery.data.value?.status === 'in_review'
  && !hasUserAlreadyAuthorized.value,
)

/**
 * En in_review con close_approval pendiente: Rejected + Autorizar
 * (misma base que el contador closed/total de All List/Kanban).
 */
const showReviewAuthorizeActions = computed(() =>
  showReviewDecision.value
  && pendingApprovalForUser.value != null,
)

const showReviewCompleteAction = computed(() =>
  showReviewDecision.value
  && !isMultipleCloseTask.value
  && !showReviewAuthorizeActions.value,
)

/** Complete: reabrir hacia En progreso. */
const showReopenProcess = computed(() =>
  showProcessActions.value
  && taskDetailQuery.data.value?.status === 'complete',
)

/** Detalle: archivar (oculto si ya está archivada). */
const showArchiveProcess = computed(() =>
  isDetailView.value
  && !isEditing.value
  && taskDetailQuery.data.value != null
  && taskDetailQuery.data.value.status !== 'archived',
)

/** Completada: sin lápiz; solo se edita tras reabrir. */
const canEditTask = computed(() =>
  taskDetailQuery.data.value?.status !== 'complete',
)

const state = reactive<NewTaskFormState>({
  type: 'manual',
  name: '',
  description: '',
  project: undefined,
  group: undefined,
  assignedTo: [],
  taskReviewer: defaultTaskReviewers(user.value?.id),
  dueDate: '',
  urgent: false,
  effort: undefined,
  volumeCountWhat: '',
  volumePeriodGoal: '',
  volumePointsPerUnit: '',
  volumeVerifyDates: true,
  volumeRejectDuplicates: true,
  volumeNexxaAiAnalysis: true,
  repeatConfig: createDefaultRepeatConfig(),
})

const taskTypeOptions: { value: NewTaskFormType, icon: string, descriptionKey: string }[] = [
  { value: 'manual', icon: 'i-lucide-hand', descriptionKey: 'tasks.form.typeDescriptions.manual' },
  { value: 'repeat', icon: 'i-lucide-repeat', descriptionKey: 'tasks.form.typeDescriptions.repeat' },
  { value: 'volume', icon: 'i-lucide-chart-bar', descriptionKey: 'tasks.form.typeDescriptions.volume' },
  { value: 'multiple_close', icon: 'i-lucide-users', descriptionKey: 'tasks.form.typeDescriptions.multiple_close' },
]

const effortOptions: { value: TaskEffort, icon: string, labelKey: string, hintKey: string }[] = [
  { value: 'quick', icon: 'i-lucide-zap', labelKey: 'tasks.form.effortQuick', hintKey: 'tasks.form.effortQuickHint' },
  { value: 'normal', icon: 'i-lucide-clock', labelKey: 'tasks.form.effortNormal', hintKey: 'tasks.form.effortNormalHint' },
  { value: 'complex', icon: 'i-lucide-brain-circuit', labelKey: 'tasks.form.effortComplex', hintKey: 'tasks.form.effortComplexHint' },
]

const nexxtepSuggestions = [
  { key: 'tasks.form.nexxtepSuggestions.contact', confidence: 97, dotClass: 'bg-aeto-teal' },
  { key: 'tasks.form.nexxtepSuggestions.schedule', confidence: 91, dotClass: 'bg-violet-500' },
  { key: 'tasks.form.nexxtepSuggestions.evidence', confidence: 74, dotClass: 'bg-orange-500' },
] as const

const projectSearchTerm = ref('')
const debouncedProjectSearch = refDebounced(projectSearchTerm, 300)

const { projects: projectsQuery, items: fetchedProjectItems } = useProjectsDropdown({
  enabled: () => open.value,
  name: debouncedProjectSearch,
})

const { users: usersQuery, list: usersList, items: userItems } = useUsersDropdown(
  () => open.value,
)

const userSelectItems = computed(() =>
  withEmptySelectItems(userItems.value, t('common.noUsers'), {
    pending: usersQuery.isPending.value,
  }),
)

/** Valor especial: no es un proyecto, redirige a crear uno. */
const CREATE_PROJECT_VALUE = '__create_project__'

const projectItems = computed(() => {
  const items = fetchedProjectItems.value
  if (!projectsQuery.isPending.value && items.length === 0) {
    return [{
      label: t('tasks.form.createProject'),
      value: CREATE_PROJECT_VALUE,
      icon: 'i-lucide-plus',
    }]
  }
  return items
})

function onProjectSelect(value: string | number | undefined | null) {
  if (value === CREATE_PROJECT_VALUE) {
    open.value = false
    void navigateTo('/tasks/settings')
    return
  }
  state.project = typeof value === 'number' ? value : undefined
}

/** Grupo: del asignado, del detalle, o prefill Kanban (group-id + group-name). */
const selectedGroupLabel = computed(() => {
  for (const id of state.assignedTo) {
    const match = usersList.value.find(user => user.id === id)
    if (match?.group_name) {
      return match.group_name
    }
  }
  return taskDetailQuery.data.value?.group_name
    ?? props.initialDefaults?.groupName
    ?? ''
})

watch(
  [() => [...state.assignedTo], usersList],
  ([ids]) => {
    if (isReadOnly.value) {
      return
    }
    const match = ids
      .map(id => usersList.value.find(user => user.id === id))
      .find(user => user?.group_id != null)
    // Prioriza el grupo del asignado; si no hay, conserva el prefill de Kanban
    state.group = match?.group_id ?? props.initialDefaults?.group ?? undefined
  },
)

function resetForm() {
  state.type = 'manual'
  state.name = ''
  state.description = ''
  state.project = undefined
  state.group = undefined
  state.assignedTo = []
  state.taskReviewer = defaultTaskReviewers(user.value?.id)
  state.dueDate = ''
  state.urgent = false
  state.effort = undefined
  state.volumeCountWhat = ''
  state.volumePeriodGoal = ''
  state.volumePointsPerUnit = ''
  state.volumeVerifyDates = true
  state.volumeRejectDuplicates = true
  state.volumeNexxaAiAnalysis = true
  state.repeatConfig = createDefaultRepeatConfig()
}

function applyFormInput(input: NewTaskFormInput) {
  state.type = input.type
  state.name = input.name
  state.description = input.description
  state.project = input.project
  state.group = input.group
  state.assignedTo = [...input.assignedTo]
  state.taskReviewer = input.taskReviewer.length
    ? [...input.taskReviewer]
    : defaultTaskReviewers(user.value?.id)
  state.dueDate = input.dueDate
  state.urgent = input.urgent
  state.effort = input.effort
  state.repeatConfig = { ...input.repeatConfig }
}

function ensureCurrentUserInReviewers() {
  const currentUserId = user.value?.id
  if (currentUserId == null) {
    return
  }
  if (!state.taskReviewer.includes(currentUserId)) {
    state.taskReviewer = [currentUserId, ...state.taskReviewer]
  }
}

function close() {
  isEditing.value = false
  mobilePanel.value = 'detail'
  open.value = false
}

function startEditing() {
  if (!canEditTask.value) {
    return
  }
  submitError.value = ''
  mobilePanel.value = 'detail'
  isEditing.value = true
}

function cancelEditing() {
  submitError.value = ''
  isEditing.value = false
  const detail = taskDetailQuery.data.value
  if (detail) {
    applyFormInput(taskDetailToFormInput(detail))
  }
}

function showMobileMessages() {
  mobilePanel.value = 'messages'
}

function showMobileDetail() {
  mobilePanel.value = 'detail'
}

function openStartProcessModal() {
  startProcessModalOpen.value = true
}

function openCloseProcessModal(status: CloseTaskProcessStatus) {
  closeProcessStatus.value = status
  closeProcessModalOpen.value = true
}

function openReviewDecisionModal(status: ReviewDecisionStatus) {
  reviewDecisionStatus.value = status
  reviewDecisionModalOpen.value = true
}

function openReopenProcessModal() {
  reopenProcessModalOpen.value = true
}

function openArchiveProcessModal() {
  archiveProcessModalOpen.value = true
}

function onProcessStarted() {
  close()
}

function onProcessClosed() {
  close()
}

function onReviewDecision() {
  close()
}

function onProcessReopened() {
  close()
}

function onProcessArchived() {
  close()
}

function onAuthorize() {
  if (!pendingApprovalForUser.value) {
    return
  }
  authorizeModalOpen.value = true
}

function onAuthorizeSuccess() {
  authorizeModalOpen.value = false
  close()
}

function validationMessage(code: string): string {
  const messages: Record<string, string> = {
    name_required: t('tasks.form.validation.nameRequired'),
    project_required: t('tasks.form.validation.projectRequired'),
    group_required: t('tasks.form.validation.groupRequired'),
    assigned_to_required: t('tasks.form.validation.assignedToRequired'),
    due_date_required: t('tasks.form.validation.dueDateRequired'),
    task_reviewer_required: t('tasks.form.validation.taskReviewerRequired'),
    repeat_config_required: t('tasks.form.validation.repeatConfigRequired'),
  }
  return messages[code] ?? t('tasks.form.createError')
}

async function onSubmit(_event: FormSubmitEvent<NewTaskFormState>) {
  if (isDetailView.value && !isEditing.value) {
    return
  }

  submitError.value = ''

  try {
    if (isEditing.value && taskId.value != null) {
      const payload = buildUpdateTaskPayload(
        state,
        taskDetailQuery.data.value?.start_date,
        user.value?.id,
      )
      await updateTask({ taskId: taskId.value, payload })
      isEditing.value = false
      return
    }

    const payload = buildCreateTaskPayload(state, user.value?.id)
    await createTask(payload)
    close()
  }
  catch (error) {
    if (error instanceof Error && !('data' in error)) {
      submitError.value = validationMessage(error.message)
      return
    }
    submitError.value = parseFetchError(error)
      || (isEditing.value ? t('tasks.form.updateErrorTitle') : t('tasks.form.createError'))
  }
}

watch(() => state.taskReviewer, (reviewers) => {
  if (isReadOnly.value || state.type !== 'multiple_close') {
    return
  }
  const currentUserId = user.value?.id
  if (currentUserId != null && !reviewers.includes(currentUserId)) {
    state.taskReviewer = [currentUserId, ...reviewers]
  }
}, { deep: true })

watch(() => state.type, (type) => {
  if (isReadOnly.value) {
    return
  }
  if (type === 'multiple_close') {
    ensureCurrentUserInReviewers()
  }
})

watch(() => state.urgent, (isUrgent) => {
  if (isReadOnly.value) {
    return
  }
  if (isUrgent) {
    state.effort = undefined
  }
})

watch(open, (isOpen) => {
  if (!isOpen) {
    resetForm()
    projectSearchTerm.value = ''
    submitError.value = ''
    startProcessModalOpen.value = false
    closeProcessModalOpen.value = false
    reviewDecisionModalOpen.value = false
    reopenProcessModalOpen.value = false
    archiveProcessModalOpen.value = false
    authorizeModalOpen.value = false
    isEditing.value = false
    mobilePanel.value = 'detail'
    taskId.value = null
    return
  }

  if (taskId.value == null) {
    applyNewTaskFormDefaults(state, props.initialDefaults)
  }
})

watch(
  () => taskDetailQuery.data.value,
  (detail) => {
    if (!open.value || !detail || taskId.value == null || isEditing.value) {
      return
    }
    applyFormInput(taskDetailToFormInput(detail))
  },
)

const slideoverUi = computed(() => {
  if (isDetailView.value) {
    return {
      content: 'w-full max-w-md sm:max-w-[60rem] p-0 overflow-hidden',
      header: 'hidden',
      body: 'p-0 flex-1 min-h-0 overflow-hidden',
      footer: 'hidden',
    }
  }

  return {
    content: 'w-full max-w-md sm:max-w-xl',
    body: 'p-0',
    footer: 'border-t border-border',
  }
})
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :close="isDetailView ? false : true"
    :ui="slideoverUi"
  >
    <template
      v-if="!isDetailView"
      #header
    >
      <div class="flex items-center gap-2 min-w-0">
        <UIcon
          name="i-lucide-plus"
          class="h-5 w-5 text-foreground shrink-0"
        />
        <h2 class="text-base font-semibold text-foreground truncate">
          {{ t('tasks.newTask') }}
        </h2>
        <UBadge
          :label="t(`tasks.types.${state.type}`)"
          color="neutral"
          variant="subtle"
          size="sm"
          class="uppercase tracking-wide shrink-0"
        />
      </div>
    </template>

    <template #body>
      <div class="flex h-full min-h-0 w-full">
        <div
          v-if="isDetailView && taskId != null"
          class="h-full min-h-0 flex-col"
          :class="mobilePanel === 'messages'
            ? 'flex w-full flex-1'
            : 'hidden sm:flex sm:w-80 sm:shrink-0'"
        >
          <TaskMessenger
            :task-id="taskId"
            class="h-full"
          >
            <template #header-actions>
              <UButton
                class="sm:hidden"
                icon="i-lucide-file-text"
                color="neutral"
                variant="ghost"
                size="xs"
                square
                :aria-label="t('tasks.messenger.showDetail')"
                @click="showMobileDetail"
              />
            </template>
          </TaskMessenger>
        </div>

        <div
          class="min-h-0 min-w-0 flex-1 flex-col"
          :class="mobilePanel === 'detail' ? 'flex' : 'hidden sm:flex'"
        >
          <div
            v-if="isDetailView"
            class="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3"
          >
            <div class="flex items-center gap-2 min-w-0">
              
              <UIcon
                name="i-lucide-file-text"
                class="h-5 w-5 text-foreground shrink-0"
              />
              <h2 class="text-base font-semibold text-foreground truncate">
                {{ t('tasks.taskDetail') }}
              </h2>
              <UBadge
                :label="t(`tasks.types.${state.type}`)"
                color="neutral"
                variant="subtle"
                size="sm"
                class="uppercase tracking-wide shrink-0"
              />
              <UTooltip
                v-if="showArchiveProcess"
                :text="t('tasks.processArchive.submit')"
              >
                <UButton
                  icon="i-lucide-archive"
                  color="error"
                  variant="ghost"
                  size="md"
                  square
                  class="shrink-0"
                  :aria-label="t('tasks.processArchive.submit')"
                  @click="openArchiveProcessModal"
                />
              </UTooltip>
              <UBadge
                v-if="props.authorizeMode"
                :label="t('tasks.toUpdate.authorize.label')"
                color="warning"
                variant="subtle"
                size="sm"
                class="uppercase tracking-wide shrink-0"
              />
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <UButton
                v-if="!isEditing"
                class="sm:hidden"
                icon="i-lucide-messages-square"
                color="neutral"
                variant="ghost"
                size="md"
                square
                :aria-label="t('tasks.messenger.showMessages')"
                @click="showMobileMessages"
              />
              <UButton
                v-if="!isEditing && canEditTask"
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="md"
                square
                :aria-label="t('tasks.form.edit')"
                :disabled="taskDetailQuery.isPending.value || taskDetailQuery.isError.value"
                @click="startEditing"
              />
              <UButton
                v-else-if="isEditing"
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="md"
                square
                :aria-label="t('tasks.form.cancelEdit')"
                :disabled="isSaving"
                @click="cancelEditing"
              />
              <UButton
                v-if="!isEditing"
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="md"
                square
                :aria-label="t('tasks.form.close')"
                @click="close"
              />
            </div>
          </div>

          <UForm
            :id="formId"
            :state="state"
            class="flex min-h-0 flex-1 flex-col"
            @submit="onSubmit"
          >
            <div class="flex-1 overflow-y-auto px-4 py-5 space-y-6">
              <div
                v-if="isDetailView && taskDetailQuery.isPending.value"
                class="space-y-3"
              >
                <USkeleton class="h-10 w-full" />
                <USkeleton class="h-24 w-full" />
                <USkeleton class="h-10 w-full" />
                <USkeleton class="h-10 w-2/3" />
              </div>

              <UAlert
                v-else-if="isDetailView && taskDetailQuery.isError.value"
                color="error"
                variant="subtle"
                :title="t('tasks.loadError')"
                class="mb-2"
              />

              <UAlert
                v-if="submitError"
                color="error"
                variant="subtle"
                :title="submitError"
                class="mb-2"
              />

              <template v-if="!isDetailView || taskDetailQuery.data.value">
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {{ t('tasks.form.taskType') }}
            </p>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="option in taskTypeOptions"
                :key="option.value"
                type="button"
                class="rounded-lg border p-3 text-left transition-colors"
                :class="[
                  state.type === option.value
                    ? 'border-aeto-teal bg-aeto-teal-light'
                    : 'border-border bg-card',
                  isDetailView
                    ? 'cursor-default opacity-90'
                    : 'hover:border-muted-foreground/40',
                ]"
                :disabled="isDetailView"
                @click="!isDetailView && (state.type = option.value)"
              >
                <UIcon
                  :name="option.icon"
                  class="h-4 w-4 mb-2"
                  :class="state.type === option.value ? 'text-aeto-teal-dark' : 'text-muted-foreground'"
                />
                <p class="text-sm font-medium text-foreground">
                  {{ t(`tasks.types.${option.value}`) }}
                </p>
                <p class="text-xs text-muted-foreground mt-0.5 leading-snug">
                  {{ t(option.descriptionKey) }}
                </p>
              </button>
            </div>
          </div>

          <div
            v-if="state.type === 'volume'"
            class="rounded-lg border border-aeto-teal/30 bg-aeto-teal-light/30 p-4 space-y-4"
          >
            <UFormField
              :label="t('tasks.form.volume.countWhat')"
              name="volumeCountWhat"
              :required="!isReadOnly"
            >
              <UInput
                v-model="state.volumeCountWhat"
                :placeholder="t('tasks.form.volume.countWhatPlaceholder')"
                :disabled="isReadOnly"
                class="w-full"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField
                :label="t('tasks.form.volume.periodGoal')"
                name="volumePeriodGoal"
                :required="!isReadOnly"
              >
                <UInput
                  v-model="state.volumePeriodGoal"
                  type="number"
                  min="0"
                  :placeholder="t('tasks.form.volume.periodGoalPlaceholder')"
                  :disabled="isReadOnly"
                  class="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </UFormField>

              <UFormField
                :label="t('tasks.form.volume.pointsPerUnit')"
                name="volumePointsPerUnit"
                :required="!isReadOnly"
                :help="t('tasks.form.volume.pointsPerUnitHelp')"
              >
                <UInput
                  v-model="state.volumePointsPerUnit"
                  type="number"
                  min="0"
                  :placeholder="t('tasks.form.volume.pointsPerUnitPlaceholder')"
                  :disabled="isReadOnly"
                  class="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </UFormField>
            </div>

            <div class="space-y-3">
              <USwitch
                v-model="state.volumeVerifyDates"
                :label="t('tasks.form.volume.verifyDates')"
                :disabled="isReadOnly"
              />
              <USwitch
                v-model="state.volumeRejectDuplicates"
                :label="t('tasks.form.volume.rejectDuplicates')"
                :disabled="isReadOnly"
              />
              <USwitch
                v-model="state.volumeNexxaAiAnalysis"
                :label="t('tasks.form.volume.nexxaAiAnalysis')"
                :disabled="isReadOnly"
              />
            </div>
          </div>

          <div
            v-else-if="state.type === 'multiple_close'"
            class="rounded-lg border border-aeto-teal/30 bg-aeto-teal-light/30 p-4 space-y-3"
          >
            <div>
              <p class="text-sm font-medium text-foreground">
                {{ t('tasks.form.multipleClose.title') }}
                <span
                  v-if="!isReadOnly"
                  class="text-error"
                >*</span>
              </p>
              <p class="text-xs text-muted-foreground mt-1">
                {{ t('tasks.form.multipleClose.description') }}
              </p>
            </div>
            <USelect
              v-model="state.taskReviewer"
              multiple
              :items="userSelectItems"
              :placeholder="t('tasks.form.multipleClose.searchPlaceholder')"
              :loading="usersQuery.isPending.value"
              :disabled="isReadOnly"
              icon="i-lucide-search"
              class="w-full"
            />
          </div>

          <TaskRepeatConfigFields
            v-else-if="state.type === 'repeat'"
            v-model="state.repeatConfig"
            :disabled="isReadOnly"
          />

          <UFormField
            :label="t('tasks.form.name')"
            name="name"
            :required="!isReadOnly"
          >
            <UInput
              v-model="state.name"
              :placeholder="t('tasks.form.namePlaceholder')"
              :disabled="isReadOnly"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('tasks.form.description')" name="description">
            <UTextarea
              v-model="state.description"
              :placeholder="t('tasks.form.descriptionPlaceholder')"
              :rows="3"
              :disabled="isReadOnly"
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField
              :label="t('tasks.form.project')"
              name="project"
              :required="!isReadOnly"
            >
              <USelectMenu
                :model-value="state.project"
                v-model:search-term="projectSearchTerm"
                value-key="value"
                :items="projectItems"
                :placeholder="t('tasks.form.projectPlaceholder')"
                :loading="projectsQuery.isPending.value"
                :disabled="isReadOnly"
                :search-input="{
                  icon: 'i-lucide-search',
                  placeholder: t('tasks.form.projectSearchPlaceholder'),
                  loading: projectsQuery.isFetching.value,
                }"
                ignore-filter
                class="w-full"
                @update:model-value="onProjectSelect"
              />
            </UFormField>

            <UFormField
              :label="t('tasks.form.dueDate')"
              name="dueDate"
              :required="!isReadOnly"
            >
              <TaskDatePicker
                v-model="state.dueDate"
                :min="isReadOnly ? undefined : minDueDate"
                :disabled="isReadOnly"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField
              :label="t('tasks.form.assignedTo')"
              name="assignedTo"
              :required="!isReadOnly"
            >
              <USelectMenu
                v-model="state.assignedTo"
                multiple
                value-key="value"
                :items="userItems"
                :placeholder="t('tasks.form.assignedToPlaceholder')"
                :loading="usersQuery.isPending.value"
                :disabled="isReadOnly"
                icon="i-lucide-user-search"
                :search-input="{
                  icon: 'i-lucide-search',
                  placeholder: t('tasks.form.assignedToSearchPlaceholder'),
                }"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="t('tasks.form.group')"
              name="group"
            >
              <UInput
                :model-value="selectedGroupLabel"
                :placeholder="t('tasks.form.groupPlaceholder')"
                disabled
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField name="urgent">
            <USwitch
              v-model="state.urgent"
              :label="t('tasks.form.markUrgent')"
              :disabled="isReadOnly"
            />
          </UFormField>

          <div
            class="space-y-2"
            :class="!isReadOnly && state.urgent ? 'opacity-50 pointer-events-none' : ''"
          >
            <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {{ t('tasks.form.effort') }}
              <span class="font-normal normal-case">({{ t('tasks.form.effortOptional') }})</span>
            </p>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="option in effortOptions"
                :key="option.value"
                type="button"
                :disabled="state.urgent || isReadOnly"
                class="rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed"
                :class="state.effort === option.value
                  ? 'border-aeto-teal bg-aeto-teal-light'
                  : 'border-border bg-card hover:border-muted-foreground/40'"
                @click="!isReadOnly && (state.effort = state.effort === option.value ? undefined : option.value)"
              >
                <UIcon
                  :name="option.icon"
                  class="h-4 w-4 mb-2"
                  :class="state.effort === option.value ? 'text-aeto-teal-dark' : 'text-muted-foreground'"
                />
                <p class="text-sm font-medium text-foreground">
                  {{ t(option.labelKey) }}
                </p>
                <p class="text-xs text-muted-foreground mt-0.5">
                  {{ t(option.hintKey) }}
                </p>
              </button>
            </div>
          </div>

          <!-- Oculto de momento: aún no funciona -->
          <div
            v-if="false"
            class="rounded-lg border border-aeto-teal/40 bg-aeto-teal-light/40 p-4 space-y-4"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-bot" class="h-4 w-4 text-aeto-teal-dark" />
              <p class="text-sm font-medium text-foreground">
                {{ t('tasks.form.nexxtepTitle') }}
              </p>
            </div>

            <ul class="space-y-2">
              <li
                v-for="suggestion in nexxtepSuggestions"
                :key="suggestion.key"
                class="flex items-center justify-between gap-3 text-sm"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <span
                    class="h-2 w-2 rounded-full shrink-0"
                    :class="suggestion.dotClass"
                  />
                  <span class="text-foreground truncate">{{ t(suggestion.key) }}</span>
                </span>
                <UBadge
                  :label="`${suggestion.confidence}%`"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  class="shrink-0"
                />
              </li>
            </ul>

            <div
              v-if="!isDetailView"
              class="flex flex-wrap gap-2"
            >
              <UButton
                :label="t('tasks.form.nexxtepAccept')"
                color="primary"
                size="sm"
              />
              <UButton
                :label="t('tasks.form.nexxtepDecline')"
                color="neutral"
                variant="outline"
                size="sm"
              />
            </div>
          </div>
              </template>
            </div>
          </UForm>

          <div
            v-if="isDetailView"
            class="flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-3"
          >
            <template v-if="isEditing">
              <UButton
                :label="t('tasks.form.save')"
                :color="canSubmit ? 'primary' : 'neutral'"
                type="submit"
                :form="formId"
                :loading="isSaving"
                :disabled="isSaving || !canSubmit"
                class="disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </template>
            <template v-else>
              <UButton
                :label="t('tasks.form.close')"
                color="neutral"
                variant="ghost"
                :disabled="isSaving"
                @click="close"
              />
              <template v-if="showAuthorizeActions">
                <UButton
                  :label="t('tasks.processReview.rejected')"
                  color="error"
                  variant="solid"
                  @click="openReviewDecisionModal('rejected')"
                />
                <UButton
                  :label="t('tasks.toUpdate.authorize.submit')"
                  color="warning"
                  :disabled="!canAuthorize"
                  @click="onAuthorize"
                />
              </template>
              <UButton
                v-else-if="showStartProcess"
                :label="t('tasks.processStart.submit')"
                color="primary"
                @click="openStartProcessModal"
              />
              <template v-else-if="showCloseProcess">
                <UButton
                  :label="t('tasks.processClose.inReview')"
                  color="neutral"
                  variant="outline"
                  @click="openCloseProcessModal('in_review')"
                />
                <UButton
                  v-if="showCompleteAction"
                  :label="t('tasks.processClose.complete')"
                  color="primary"
                  @click="openCloseProcessModal('complete')"
                />
              </template>
              <template v-else-if="showReviewDecision">
                <UButton
                  :label="t('tasks.processReview.rejected')"
                  color="error"
                  variant="solid"
                  @click="openReviewDecisionModal('rejected')"
                />
                <UButton
                  v-if="showReviewAuthorizeActions"
                  :label="t('tasks.toUpdate.authorize.submit')"
                  color="warning"
                  :disabled="!canAuthorize"
                  @click="onAuthorize"
                />
                <UButton
                  v-else-if="showReviewCompleteAction"
                  :label="t('tasks.processReview.complete')"
                  color="primary"
                  @click="openReviewDecisionModal('complete')"
                />
              </template>
              <UButton
                v-else-if="showReopenProcess"
                :label="t('tasks.processReopen.submit')"
                color="primary"
                @click="openReopenProcessModal"
              />
            </template>
          </div>
        </div>
      </div>
    </template>

    <template
      v-if="!isDetailView"
      #footer
    >
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton
          :label="t('tasks.form.cancel')"
          color="neutral"
          variant="ghost"
          :disabled="isPending"
          @click="close"
        />
        <UButton
          :label="t('tasks.form.create')"
          :color="canSubmit ? 'primary' : 'neutral'"
          type="submit"
          :form="formId"
          :loading="isPending"
          :disabled="isPending || !canSubmit"
          class="disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    </template>
  </USlideover>

  <TaskStartProcessModal
    v-if="taskId != null"
    v-model:open="startProcessModalOpen"
    :task-id="taskId"
    @success="onProcessStarted"
  />

  <TaskCloseProcessModal
    v-if="taskId != null"
    v-model:open="closeProcessModalOpen"
    :task-id="taskId"
    :target-status="closeProcessStatus"
    @success="onProcessClosed"
  />

  <TaskReviewDecisionModal
    v-if="taskId != null"
    v-model:open="reviewDecisionModalOpen"
    :task-id="taskId"
    :target-status="reviewDecisionStatus"
    @success="onReviewDecision"
  />

  <TaskReopenProcessModal
    v-if="taskId != null"
    v-model:open="reopenProcessModalOpen"
    :task-id="taskId"
    @success="onProcessReopened"
  />

  <TaskArchiveProcessModal
    v-if="taskId != null"
    v-model:open="archiveProcessModalOpen"
    :task-id="taskId"
    @success="onProcessArchived"
  />

  <TaskAuthorizeCloseModal
    v-if="pendingApprovalForUser != null"
    v-model:open="authorizeModalOpen"
    :approval-id="pendingApprovalForUser.id"
    @success="onAuthorizeSuccess"
  />
</template>
