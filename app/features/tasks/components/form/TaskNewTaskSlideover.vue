<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { SelectItem } from '@nuxt/ui'
import type { PaginatedResponse } from '~/shared/types/api.types'
import type {
  CloseTaskProcessStatus,
  NewTaskFormType,
  ProjectDropdown,
  ReviewDecisionStatus,
  TaskEffort,
  TaskGroupBy,
  TaskView,
  UserDropdown,
} from '~/features/tasks/types/task.types'
import { useCreateTask } from '~/features/tasks/composables/form/useCreateTask'
import { useUpdateTask } from '~/features/tasks/composables/form/useUpdateTask'
import { useGroupsDropdown } from '~/features/tasks/composables/shared/useGroupsDropdown'
import { useTaskDetail } from '~/features/tasks/composables/form/useTaskDetail'
import TaskAuthorizeCloseModal from '~/features/tasks/components/form/TaskAuthorizeCloseModal.vue'
import TaskCloseProcessModal from '~/features/tasks/components/form/TaskCloseProcessModal.vue'
import TaskMessenger from '~/features/tasks/components/form/TaskMessenger.vue'
import TaskReviewDecisionModal from '~/features/tasks/components/form/TaskReviewDecisionModal.vue'
import TaskStartProcessModal from '~/features/tasks/components/form/TaskStartProcessModal.vue'
import { extractResults } from '~/shared/utils/paginated.util'
import {
  buildCreateTaskPayload,
  buildUpdateTaskPayload,
  defaultTaskReviewers,
  findPendingCloseApproval,
  taskDetailToFormInput,
  type NewTaskFormInput,
} from '~/features/tasks/utils/form/task-form.util'

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
    /** Modo autorización desde pending-approval. */
    authorizeMode?: boolean
  }>(),
  {
    view: 'list',
    groupBy: 'all',
    authorizeMode: false,
  },
)

const { t } = useI18n()
const { user } = useAuth()
const { $api } = useNuxtApp()
const companyId = 1

const formId = 'new-task-form'
const submitError = ref('')
const startProcessModalOpen = ref(false)
const closeProcessModalOpen = ref(false)
const closeProcessStatus = ref<CloseTaskProcessStatus>('in_review')
const reviewDecisionModalOpen = ref(false)
const reviewDecisionStatus = ref<ReviewDecisionStatus>('complete')
const authorizeModalOpen = ref(false)
/** Con taskId el slideover es detalle (view-only salvo modo edición). */
const isDetailView = computed(() => taskId.value != null)
const isEditing = ref(false)
/** Campos bloqueados: detalle sin edición activa. */
const isReadOnly = computed(() => isDetailView.value && !isEditing.value)

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

/** Aprobación pendiente del usuario logueado en close_approvals. */
const pendingApprovalForUser = computed(() =>
  findPendingCloseApproval(
    taskDetailQuery.data.value?.close_approvals,
    user.value?.id,
  ),
)

const showAuthorize = computed(() =>
  props.authorizeMode
  && isDetailView.value
  && !isEditing.value
  && pendingApprovalForUser.value != null,
)

/** Detalle con acciones de proceso (List/Kanban All o Calendario). */
const showProcessActions = computed(() =>
  isDetailView.value
  && !isEditing.value
  && (
    (props.view === 'kanban' && props.groupBy === 'all')
    || (props.view === 'list' && props.groupBy === 'all')
    || props.view === 'calendar'
  ),
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
 * In review: rechazar o completar.
 * multiple_close solo permite rechazar (no complete).
 */
const showReviewDecision = computed(() =>
  showProcessActions.value
  && taskDetailQuery.data.value?.status === 'in_review',
)

const showReviewCompleteAction = computed(() =>
  showReviewDecision.value
  && !isMultipleCloseTask.value,
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
})

const taskTypeOptions: { value: NewTaskFormType, icon: string, descriptionKey: string }[] = [
  { value: 'manual', icon: 'i-lucide-hand', descriptionKey: 'tasks.form.typeDescriptions.manual' },
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

const projectsQuery = useQuery({
  queryKey: ['tasks', companyId, 'projects', 'dropdown', 'new-task'],
  queryFn: () => $api<PaginatedResponse<ProjectDropdown>>(`/api/tools/dropdown/projects/company/${companyId}/`),
  enabled: computed(() => open.value),
})

const usersQuery = useQuery({
  queryKey: ['tasks', 'users', 'dropdown', 'new-task'],
  queryFn: () => $api<PaginatedResponse<UserDropdown>>('/api/tools/dropdown/users/'),
  enabled: computed(() => open.value),
})

const { groups: groupsQuery, items: groupItems } = useGroupsDropdown(() => open.value)

const projectItems = computed<SelectItem[]>(() =>
  extractResults(projectsQuery.data.value).map(project => ({
    label: project.name,
    value: project.id,
  })),
)

const userItems = computed<SelectItem[]>(() =>
  extractResults(usersQuery.data.value).map(user => ({
    label: user.username,
    value: user.id,
  })),
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
  open.value = false
}

function startEditing() {
  submitError.value = ''
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

function onProcessStarted() {
  close()
}

function onProcessClosed() {
  close()
}

function onReviewDecision() {
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
    submitError.value = ''
    startProcessModalOpen.value = false
    isEditing.value = false
    taskId.value = null
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
          class="hidden h-full sm:block sm:w-80 sm:shrink-0"
        >
          <TaskMessenger
            :task-id="taskId"
            class="h-full"
          />
        </div>

        <div class="flex min-h-0 min-w-0 flex-1 flex-col">
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
                v-else
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
            <div class="grid grid-cols-3 gap-2">
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
                  class="w-full"
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
                  class="w-full"
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
              :items="userItems"
              :placeholder="t('tasks.form.multipleClose.searchPlaceholder')"
              :loading="usersQuery.isPending.value"
              :disabled="isReadOnly"
              icon="i-lucide-search"
              class="w-full"
            />
          </div>

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
              :label="t('tasks.form.topic')"
              name="project"
              :required="!isReadOnly"
            >
              <USelect
                v-model="state.project"
                :items="projectItems"
                :placeholder="t('tasks.form.topicPlaceholder')"
                :loading="projectsQuery.isPending.value"
                :disabled="isReadOnly"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="t('tasks.form.group')"
              name="group"
              :required="!isDetailView"
            >
              <USelect
                v-model="state.group"
                :items="groupItems"
                :placeholder="t('tasks.form.groupPlaceholder')"
                :loading="groupsQuery.isPending.value"
                :disabled="isReadOnly"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField
              :label="t('tasks.form.assignedTo')"
              name="assignedTo"
              :required="!isReadOnly"
            >
              <USelect
                v-model="state.assignedTo"
                multiple
                :items="userItems"
                :placeholder="t('tasks.form.assignedToPlaceholder')"
                :loading="usersQuery.isPending.value"
                :disabled="isReadOnly"
                icon="i-lucide-user-search"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="t('tasks.form.dueDate')"
              name="dueDate"
              :required="!isReadOnly"
            >
              <UInput
                v-model="state.dueDate"
                type="date"
                icon="i-lucide-calendar"
                :min="isReadOnly ? undefined : minDueDate"
                :disabled="isReadOnly"
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

          <div class="rounded-lg border border-aeto-teal/40 bg-aeto-teal-light/40 p-4 space-y-4">
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
                color="primary"
                type="submit"
                :form="formId"
                :loading="isSaving"
                :disabled="isSaving"
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
              <UButton
                v-if="showAuthorize"
                :label="t('tasks.toUpdate.authorize.submit')"
                color="warning"
                @click="onAuthorize"
              />
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
                  v-if="showReviewCompleteAction"
                  :label="t('tasks.processReview.complete')"
                  color="primary"
                  @click="openReviewDecisionModal('complete')"
                />
              </template>
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
          color="primary"
          type="submit"
          :form="formId"
          :loading="isPending"
          :disabled="isPending"
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

  <TaskAuthorizeCloseModal
    v-if="pendingApprovalForUser != null"
    v-model:open="authorizeModalOpen"
    :approval-id="pendingApprovalForUser.id"
    @success="onAuthorizeSuccess"
  />
</template>
