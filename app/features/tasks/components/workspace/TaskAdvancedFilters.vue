<script setup lang="ts">
import type { SavedTaskFilter, TaskListFilters, TaskType } from '~/features/tasks/types/task.types'
import { useProfiles } from '~/features/auth/composables/useProfiles'
import { profileFullName } from '~/features/auth/utils/profile-appearance.util'
import { usePrivateProjects } from '~/features/projects/composables/usePrivateProjects'
import { useSavedTaskFilters } from '~/features/tasks/composables/filters/useSavedTaskFilters'
import {
  hasTaskFilters,
  normalizeTaskFilters,
  paramsToTaskFilters,
  taskFiltersKey,
  taskFiltersToParams,
} from '~/features/tasks/utils/task-filter-params.util'
import { parseFetchError } from '~/shared/utils/error-message.util'

type FilterFieldId
  = | 'short_description'
    | 'type'
    | 'project'
    | 'users'
    | 'created_by'
    | 'overdue'
    | 'completed'
    | 'multiple_close'
    | 'not_started'
    | 'start_date'
    | 'wip_date'
    | 'final_date'

type ListKey = 'type' | 'project' | 'users' | 'created_by'
type BooleanKey = 'overdue' | 'completed' | 'multiple_close' | 'not_started'
type RangeId = 'start_date' | 'wip_date' | 'final_date'
type Step = 'saved' | 'builder' | 'name'

interface FieldDefinition {
  id: FilterFieldId
  icon: string
  kind: 'text' | 'list' | 'boolean' | 'range'
}

/** Filtros que soporta el backend en las listas de tareas (la visibilidad vive en la vista de administrador). */
const FIELDS: FieldDefinition[] = [
  { id: 'short_description', icon: 'i-lucide-text-search', kind: 'text' },
  { id: 'type', icon: 'i-lucide-shapes', kind: 'list' },
  { id: 'project', icon: 'i-lucide-folder-kanban', kind: 'list' },
  { id: 'users', icon: 'i-lucide-users', kind: 'list' },
  { id: 'created_by', icon: 'i-lucide-user-pen', kind: 'list' },
  { id: 'overdue', icon: 'i-lucide-alarm-clock-off', kind: 'boolean' },
  { id: 'completed', icon: 'i-lucide-circle-check', kind: 'boolean' },
  { id: 'multiple_close', icon: 'i-lucide-users-round', kind: 'boolean' },
  { id: 'not_started', icon: 'i-lucide-circle-dashed', kind: 'boolean' },
  { id: 'start_date', icon: 'i-lucide-calendar-plus', kind: 'range' },
  { id: 'wip_date', icon: 'i-lucide-play', kind: 'range' },
  { id: 'final_date', icon: 'i-lucide-calendar-check', kind: 'range' },
]

const TYPE_VALUES: TaskType[] = ['puesto', 'manual', 'repeat', 'trigger']

const filters = defineModel<TaskListFilters>({ required: true })
const search = defineModel<string>('search', { required: true })

defineProps<{
  /** Barra compacta: solo el ícono y el nombre del filtro en uso, sin etiqueta fija. */
  compact?: boolean
}>()

const { t } = useI18n()
const toast = useToast()
const { projects, items: projectItems } = useProjectsDropdown()
const { projects: privateProjects } = usePrivateProjects()
const { organization } = useAuth()
const { isAdminActive, isGroupActive, isProjectActive } = useTaskAdminView()

const showUserFilter = computed(() => isAdminActive.value || isGroupActive.value || isProjectActive.value)

const open = ref(false)
const step = ref<Step>('saved')

const { profiles: orgProfiles, profilesQuery: orgProfilesQuery } = useProfiles(
  open,
  () => ({ organization: organization.value?.id }),
)
const {
  savedFiltersQuery,
  savedFilters,
  createMutation,
  updateMutation,
  deleteMutation,
} = useSavedTaskFilters()

const availableFields = computed(() =>
  FIELDS.filter(field => field.id !== 'users' || showUserFilter.value),
)

// ───────────────────────── Constructor ─────────────────────────

const draft = ref<TaskListFilters>({})
const activeFields = ref<FilterFieldId[]>([])

function rangeKeys(id: RangeId) {
  return {
    from: `${id}_from` as 'start_date_from' | 'wip_date_from' | 'final_date_from',
    to: `${id}_to` as 'start_date_to' | 'wip_date_to' | 'final_date_to',
  }
}

function fieldHasValue(filtersValue: TaskListFilters, field: FieldDefinition): boolean {
  switch (field.kind) {
    case 'text':
      return Boolean(filtersValue.short_description)
    case 'list':
      return Boolean(filtersValue[field.id as ListKey]?.length)
    case 'boolean':
      return filtersValue[field.id as BooleanKey] !== undefined
    case 'range': {
      const keys = rangeKeys(field.id as RangeId)
      return Boolean(filtersValue[keys.from] || filtersValue[keys.to])
    }
  }
}

function startDraft(source: TaskListFilters) {
  const normalized = normalizeTaskFilters(source)
  // «Finalización» agrega `completed` sola: no se muestra como una fila aparte de «Completadas».
  if (normalized.final_date_from || normalized.final_date_to) {
    delete normalized.completed
  }
  draft.value = normalized
  activeFields.value = availableFields.value
    .filter(field => fieldHasValue(normalized, field))
    .map(field => field.id)
}

const addableFields = computed(() =>
  availableFields.value.filter(field => !activeFields.value.includes(field.id)),
)

const addFieldItems = computed(() =>
  addableFields.value.map(field => ({
    label: t(`tasks.advancedFilters.fields.${field.id}`),
    icon: field.icon,
    onSelect: () => addField(field),
  })),
)

function addField(field: FieldDefinition) {
  activeFields.value = [...activeFields.value, field.id]
  if (field.kind === 'boolean') {
    draft.value = { ...draft.value, [field.id]: true }
  }
}

function removeField(id: FilterFieldId) {
  const field = FIELDS.find(item => item.id === id)!
  activeFields.value = activeFields.value.filter(fieldId => fieldId !== id)

  const next = { ...draft.value }
  if (field.kind === 'range') {
    const keys = rangeKeys(id as RangeId)
    delete next[keys.from]
    delete next[keys.to]
  }
  else if (field.kind === 'text') {
    delete next.short_description
  }
  else {
    delete (next as Record<string, unknown>)[id]
  }
  draft.value = next
}

function clearAll() {
  draft.value = {}
  activeFields.value = []
}

function listValue(key: ListKey): (number | string)[] {
  return draft.value[key] ?? []
}

function setListValue(key: ListKey, value: (number | string)[]) {
  draft.value = { ...draft.value, [key]: value.length ? value : undefined }
}

function setRangeValue(id: RangeId, edge: 'from' | 'to', value: string) {
  const keys = rangeKeys(id)
  draft.value = { ...draft.value, [keys[edge]]: value || undefined }
}

function rangeValue(id: RangeId, edge: 'from' | 'to'): string {
  return draft.value[rangeKeys(id)[edge]] ?? ''
}

function rangeInvalid(id: RangeId): boolean {
  const from = rangeValue(id, 'from')
  const to = rangeValue(id, 'to')
  return Boolean(from && to && from > to)
}

const hasInvalidRange = computed(() =>
  (['start_date', 'wip_date', 'final_date'] as RangeId[]).some(id =>
    activeFields.value.includes(id) && rangeInvalid(id),
  ),
)

const draftFilters = computed(() => normalizeTaskFilters(draft.value))
const draftHasFilters = computed(() => hasTaskFilters(draftFilters.value))
const canSubmitDraft = computed(() => draftHasFilters.value && !hasInvalidRange.value)

const typeItems = computed(() =>
  TYPE_VALUES.map(type => ({ label: t(`tasks.types.${type}`), value: type })),
)

/** Los proyectos de la compañía y, solo para conservar su nombre, mis proyectos privados (p. ej. al abrir uno desde el menú lateral). */
const projectsWithPrivate = computed(() => {
  const shown = new Set(projectItems.value.map(item => item.value))
  const extra = privateProjects.value
    .filter(project => !shown.has(project.id) && (draft.value.project ?? []).includes(project.id))
    .map(project => ({ label: project.name, value: project.id }))
  return [...projectItems.value, ...extra]
})

const projectSelectItems = computed(() =>
  withEmptySelectItems(projectsWithPrivate.value, t('common.noData'), { pending: projects.isPending.value }),
)

const profileItems = computed(() =>
  withEmptySelectItems(
    orgProfiles.value.map(profile => ({ label: profileFullName(profile), value: profile.id })),
    t('common.noData'),
    { pending: orgProfilesQuery.isPending.value },
  ),
)

function listItems(key: ListKey) {
  if (key === 'type') {
    return typeItems.value
  }
  return key === 'project' ? projectSelectItems.value : profileItems.value
}

const multipleCloseItems = computed(() => [
  { label: t('tasks.advancedFilters.yes'), value: true },
  { label: t('tasks.advancedFilters.no'), value: false },
])

function applyToList(next: TaskListFilters) {
  const normalized = normalizeTaskFilters(next)
  filters.value = normalized
  search.value = normalized.short_description ?? ''
}

function applyDraft() {
  if (!canSubmitDraft.value) {
    return
  }
  applyToList(draftFilters.value)
  open.value = false
}

// ───────────────────────── Guardar ─────────────────────────

const saveName = ref('')
const saveAsDefault = ref(false)
const saveError = ref('')

watch(saveName, () => {
  saveError.value = ''
})

function goToNameStep() {
  if (!canSubmitDraft.value) {
    return
  }
  saveName.value = ''
  saveAsDefault.value = false
  saveError.value = ''
  step.value = 'name'
}

async function submitSave() {
  const name = saveName.value.trim()
  if (!name || createMutation.isPending.value) {
    return
  }
  saveError.value = ''
  try {
    await createMutation.mutateAsync({
      name,
      params: taskFiltersToParams(draftFilters.value),
      is_default: saveAsDefault.value,
    })
    toast.add({ title: t('tasks.advancedFilters.toasts.saved'), color: 'success' })
    step.value = 'saved'
  }
  catch (error) {
    saveError.value = parseFetchError(error)
  }
}

// ───────────────────────── Filtros guardados ─────────────────────────

const currentKey = computed(() => taskFiltersKey(filters.value))

/** Filtro guardado que coincide con lo que está aplicado en la lista. */
const activeSaved = computed<SavedTaskFilter | null>(() => {
  if (!hasTaskFilters(filters.value)) {
    return null
  }
  return savedFilters.value.find(saved => taskFiltersKey(paramsToTaskFilters(saved.params)) === currentKey.value) ?? null
})

/** Varios filtros guardados pueden tener los mismos params: todos se marcan «En uso». */
function isInUse(saved: SavedTaskFilter): boolean {
  return hasTaskFilters(filters.value) && taskFiltersKey(paramsToTaskFilters(saved.params)) === currentKey.value
}

const buttonLabel = computed(() => activeSaved.value?.name ?? t('tasks.advancedFilters.button'))

const profileNames = computed(() => new Map(orgProfiles.value.map(profile => [profile.id, profileFullName(profile)])))
const projectNames = computed(() => new Map([
  ...projectItems.value.map(item => [item.value, item.label] as const),
  ...privateProjects.value.map(project => [project.id, project.name] as const),
]))

/** Resumen legible de un filtro guardado para la lista. */
function describeFilters(params: Record<string, string>): string[] {
  const parsed = paramsToTaskFilters(params)
  const parts: string[] = []
  const label = (id: FilterFieldId) => t(`tasks.advancedFilters.fields.${id}`)

  if (parsed.short_description) {
    parts.push(`${label('short_description')}: ${parsed.short_description}`)
  }
  if (parsed.type?.length) {
    parts.push(`${label('type')}: ${parsed.type.map(type => t(`tasks.types.${type}`)).join(', ')}`)
  }
  if (parsed.project?.length) {
    parts.push(`${label('project')}: ${parsed.project.map(id => projectNames.value.get(id) ?? `#${id}`).join(', ')}`)
  }
  if (parsed.users?.length) {
    parts.push(`${label('users')}: ${parsed.users.map(id => profileNames.value.get(id) ?? `#${id}`).join(', ')}`)
  }
  if (parsed.created_by?.length) {
    parts.push(`${label('created_by')}: ${parsed.created_by.map(id => profileNames.value.get(id) ?? `#${id}`).join(', ')}`)
  }
  if (parsed.overdue) {
    parts.push(label('overdue'))
  }
  if (parsed.completed && !parsed.final_date_from && !parsed.final_date_to) {
    parts.push(label('completed'))
  }
  if (parsed.multiple_close !== undefined) {
    parts.push(`${label('multiple_close')}: ${parsed.multiple_close ? t('tasks.advancedFilters.yes') : t('tasks.advancedFilters.no')}`)
  }
  if (parsed.not_started) {
    parts.push(label('not_started'))
  }
  for (const id of ['start_date', 'wip_date', 'final_date'] as RangeId[]) {
    const keys = rangeKeys(id)
    const from = parsed[keys.from]
    const to = parsed[keys.to]
    if (from || to) {
      parts.push(`${label(id)}: ${from ?? '…'} → ${to ?? '…'}`)
    }
  }

  return parts
}

const rowError = ref<{ id: number, message: string } | null>(null)
const renamingId = ref<number | null>(null)
const renameValue = ref('')
const confirmingDeleteId = ref<number | null>(null)

function resetRowState() {
  rowError.value = null
  renamingId.value = null
  confirmingDeleteId.value = null
}

function applySaved(saved: SavedTaskFilter) {
  applyToList(paramsToTaskFilters(saved.params))
  open.value = false
}

async function runRowAction(saved: SavedTaskFilter, action: () => Promise<unknown>, successKey: string) {
  rowError.value = null
  try {
    await action()
    toast.add({ title: t(`tasks.advancedFilters.toasts.${successKey}`), color: 'success' })
    return true
  }
  catch (error) {
    rowError.value = { id: saved.id, message: parseFetchError(error) }
    return false
  }
}

function toggleDefault(saved: SavedTaskFilter) {
  return runRowAction(
    saved,
    () => updateMutation.mutateAsync({ id: saved.id, is_default: !saved.is_default }),
    'updated',
  )
}

function startRename(saved: SavedTaskFilter) {
  resetRowState()
  renamingId.value = saved.id
  renameValue.value = saved.name
}

async function submitRename(saved: SavedTaskFilter) {
  const name = renameValue.value.trim()
  if (!name) {
    return
  }
  if (name === saved.name) {
    renamingId.value = null
    return
  }
  const done = await runRowAction(
    saved,
    () => updateMutation.mutateAsync({ id: saved.id, name }),
    'renamed',
  )
  if (done) {
    renamingId.value = null
  }
}

function updateWithCurrent(saved: SavedTaskFilter) {
  const params = taskFiltersToParams(filters.value)
  if (!Object.keys(params).length) {
    rowError.value = { id: saved.id, message: t('tasks.advancedFilters.noCurrentFilters') }
    return
  }
  return runRowAction(
    saved,
    () => updateMutation.mutateAsync({ id: saved.id, params }),
    'updated',
  )
}

async function confirmDelete(saved: SavedTaskFilter) {
  const done = await runRowAction(saved, () => deleteMutation.mutateAsync(saved.id), 'deleted')
  if (done) {
    confirmingDeleteId.value = null
  }
}

// ───────────────────────── Modal ─────────────────────────

function openModal(initialStep?: Step) {
  resetRowState()
  startDraft(filters.value)
  step.value = initialStep ?? (savedFilters.value.length ? 'saved' : 'builder')
  open.value = true
}

function goToBuilder(fromCurrent = true) {
  resetRowState()
  if (fromCurrent) {
    startDraft(filters.value)
  }
  else {
    clearAll()
  }
  step.value = 'builder'
}

const modalTitle = computed(() =>
  step.value === 'name' ? t('tasks.advancedFilters.nameTitle') : t('tasks.advancedFilters.title'),
)

const modalDescription = computed(() => {
  switch (step.value) {
    case 'name':
      return t('tasks.advancedFilters.nameDescription')
    case 'saved':
      return t('tasks.advancedFilters.savedDescription')
    default:
      return t('tasks.advancedFilters.builderDescription')
  }
})
</script>

<template>
  <UButton
    color="neutral"
    :variant="activeSaved ? 'subtle' : 'outline'"
    size="sm"
    class="h-8 shrink-0 max-w-full"
    :class="compact ? 'min-w-0 max-w-36' : 'max-w-56'"
    :icon="activeSaved ? 'i-lucide-bookmark-check' : 'i-lucide-list-filter'"
    :aria-label="t('tasks.advancedFilters.button')"
    @click="openModal()"
  >
    <span
      v-if="!compact || activeSaved"
      class="truncate"
    >
      {{ buttonLabel }}
    </span>
  </UButton>

  <UModal
    v-model:open="open"
    :title="modalTitle"
    :description="modalDescription"
    :ui="{ content: 'sm:max-w-2xl', body: 'space-y-4', footer: 'justify-between gap-2 flex-wrap' }"
  >
    <template #body>
      <!-- Pestañas: guardados / constructor (el paso de nombre las reemplaza). -->
      <div
        v-if="step !== 'name'"
        class="flex items-center gap-1 rounded-lg bg-muted p-1"
        role="tablist"
      >
        <UButton
          role="tab"
          :aria-selected="step === 'saved'"
          size="sm"
          :color="step === 'saved' ? 'primary' : 'neutral'"
          :variant="step === 'saved' ? 'subtle' : 'ghost'"
          class="flex-1 justify-center"
          icon="i-lucide-bookmark"
          :label="`${t('tasks.advancedFilters.tabs.saved')} (${savedFilters.length})`"
          @click="step = 'saved'; resetRowState()"
        />
        <UButton
          role="tab"
          :aria-selected="step === 'builder'"
          size="sm"
          :color="step === 'builder' ? 'primary' : 'neutral'"
          :variant="step === 'builder' ? 'subtle' : 'ghost'"
          class="flex-1 justify-center"
          icon="i-lucide-list-filter"
          :label="t('tasks.advancedFilters.tabs.builder')"
          @click="goToBuilder()"
        />
      </div>

      <!-- Constructor de filtros -->
      <template v-if="step === 'builder'">
        <p
          v-if="!activeFields.length"
          class="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground"
        >
          {{ t('tasks.advancedFilters.builderEmpty') }}
        </p>

        <ul
          v-else
          class="space-y-2"
        >
          <li
            v-for="fieldId in activeFields"
            :key="fieldId"
            class="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-border bg-card p-2 sm:grid-cols-[11rem_1fr_auto]"
          >
            <div class="order-1 flex min-w-0 items-center gap-2 text-sm font-medium">
              <UIcon
                :name="FIELDS.find(field => field.id === fieldId)!.icon"
                class="size-4 shrink-0 text-muted-foreground"
              />
              <span class="truncate">{{ t(`tasks.advancedFilters.fields.${fieldId}`) }}</span>
            </div>

            <div class="order-3 col-span-2 min-w-0 sm:order-2 sm:col-span-1">
              <UInput
                v-if="fieldId === 'short_description'"
                :model-value="draft.short_description ?? ''"
                size="sm"
                class="w-full"
                :placeholder="t('tasks.advancedFilters.textPlaceholder')"
                @update:model-value="draft = { ...draft, short_description: String($event) || undefined }"
              />

              <USelectMenu
                v-else-if="fieldId === 'type' || fieldId === 'project' || fieldId === 'users' || fieldId === 'created_by'"
                :model-value="listValue(fieldId)"
                multiple
                value-key="value"
                :items="listItems(fieldId)"
                :placeholder="t('tasks.advancedFilters.listPlaceholder')"
                :search-input="fieldId === 'type' ? false : { placeholder: t('tasks.filterSelectSearch') }"
                size="sm"
                class="w-full"
                @update:model-value="setListValue(fieldId, $event as (number | string)[])"
              />

              <USelect
                v-else-if="fieldId === 'multiple_close'"
                :model-value="draft.multiple_close"
                :items="multipleCloseItems"
                size="sm"
                class="w-full sm:w-32"
                @update:model-value="draft = { ...draft, multiple_close: $event === true }"
              />

              <span
                v-else-if="fieldId === 'overdue' || fieldId === 'completed' || fieldId === 'not_started'"
                class="text-sm text-muted-foreground"
              >
                {{ t('tasks.advancedFilters.yes') }}
              </span>

              <div
                v-else
                class="space-y-1"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <UInput
                    type="date"
                    size="sm"
                    class="min-w-0 flex-1"
                    :aria-label="`${t(`tasks.advancedFilters.fields.${fieldId}`)} ${t('tasks.advancedFilters.from')}`"
                    :model-value="rangeValue(fieldId as RangeId, 'from')"
                    @update:model-value="setRangeValue(fieldId as RangeId, 'from', String($event))"
                  />
                  <span class="text-xs text-muted-foreground">{{ t('tasks.advancedFilters.to') }}</span>
                  <UInput
                    type="date"
                    size="sm"
                    class="min-w-0 flex-1"
                    :aria-label="`${t(`tasks.advancedFilters.fields.${fieldId}`)} ${t('tasks.advancedFilters.to')}`"
                    :model-value="rangeValue(fieldId as RangeId, 'to')"
                    @update:model-value="setRangeValue(fieldId as RangeId, 'to', String($event))"
                  />
                </div>
                <p
                  v-if="rangeInvalid(fieldId as RangeId)"
                  class="text-xs text-error"
                >
                  {{ t('tasks.advancedFilters.rangeError') }}
                </p>
                <p
                  v-else-if="fieldId === 'final_date'"
                  class="text-xs text-muted-foreground"
                >
                  {{ t('tasks.advancedFilters.finalHint') }}
                </p>
              </div>
            </div>

            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              square
              icon="i-lucide-x"
              class="order-2 justify-self-end sm:order-3"
              :aria-label="t('tasks.advancedFilters.removeFilter')"
              @click="removeField(fieldId)"
            />
          </li>
        </ul>

        <div class="flex items-center justify-between gap-2">
          <UDropdownMenu
            :items="addFieldItems"
            :content="{ align: 'start' }"
          >
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-plus"
              :disabled="!addableFields.length"
              :label="t('tasks.advancedFilters.addFilter')"
            />
          </UDropdownMenu>

          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-eraser"
            :disabled="!activeFields.length"
            :label="t('tasks.advancedFilters.clearAll')"
            @click="clearAll"
          />
        </div>
      </template>

      <!-- Nombre del filtro a guardar -->
      <form
        v-else-if="step === 'name'"
        class="space-y-4"
        @submit.prevent="submitSave"
      >
        <UFormField
          :label="t('tasks.advancedFilters.nameLabel')"
          :error="saveError || undefined"
          required
        >
          <UInput
            v-model="saveName"
            class="w-full"
            maxlength="100"
            autofocus
            :placeholder="t('tasks.advancedFilters.namePlaceholder')"
          />
        </UFormField>

        <UCheckbox
          v-model="saveAsDefault"
          :label="t('tasks.advancedFilters.makeDefault')"
          :description="t('tasks.advancedFilters.makeDefaultHint')"
        />

        <ul class="flex flex-wrap gap-1.5">
          <li
            v-for="part in describeFilters(taskFiltersToParams(draftFilters))"
            :key="part"
            class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            {{ part }}
          </li>
        </ul>
      </form>

      <!-- Lista de filtros guardados -->
      <template v-else>
        <div
          v-if="savedFiltersQuery.isPending.value"
          class="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-4 animate-spin"
          />
          {{ t('tasks.advancedFilters.loading') }}
        </div>

        <div
          v-else-if="savedFiltersQuery.isError.value"
          class="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground"
        >
          {{ t('tasks.advancedFilters.loadError') }}
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-refresh-cw"
            :label="t('tasks.advancedFilters.retry')"
            @click="savedFiltersQuery.refetch()"
          />
        </div>

        <div
          v-else-if="!savedFilters.length"
          class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-8 text-center"
        >
          <p class="text-sm text-muted-foreground">
            {{ t('tasks.advancedFilters.savedEmpty') }}
          </p>
          <UButton
            size="sm"
            icon="i-lucide-plus"
            :label="t('tasks.advancedFilters.createFirst')"
            @click="goToBuilder()"
          />
        </div>

        <ul
          v-else
          class="space-y-2"
        >
          <li
            v-for="saved in savedFilters"
            :key="saved.id"
            class="rounded-lg border bg-card transition-colors"
            :class="isInUse(saved) ? 'border-primary' : 'border-border'"
          >
            <!-- Renombrar -->
            <form
              v-if="renamingId === saved.id"
              class="flex flex-wrap items-center gap-2 p-2"
              @submit.prevent="submitRename(saved)"
            >
              <UInput
                v-model="renameValue"
                size="sm"
                class="min-w-0 flex-1"
                maxlength="100"
                autofocus
                :aria-label="t('tasks.advancedFilters.nameLabel')"
              />
              <UButton
                type="submit"
                size="sm"
                :loading="updateMutation.isPending.value"
                :disabled="!renameValue.trim()"
                :label="t('tasks.advancedFilters.renameSave')"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                :label="t('tasks.advancedFilters.cancel')"
                @click="renamingId = null; rowError = null"
              />
            </form>

            <div
              v-else
              class="flex flex-col gap-1 p-2 sm:flex-row sm:items-start"
            >
              <button
                type="button"
                class="flex min-w-0 flex-1 flex-col items-start gap-1 rounded-md px-1 py-0.5 text-left hover:bg-muted/60"
                @click="applySaved(saved)"
              >
                <span class="flex max-w-full items-center gap-2 text-sm font-medium">
                  <span class="truncate">{{ saved.name }}</span>
                  <UBadge
                    v-if="saved.is_default"
                    color="primary"
                    variant="subtle"
                    size="sm"
                    :label="t('tasks.advancedFilters.defaultBadge')"
                  />
                  <UBadge
                    v-if="isInUse(saved)"
                    color="success"
                    variant="subtle"
                    size="sm"
                    :label="t('tasks.advancedFilters.inUse')"
                  />
                </span>
                <span class="flex flex-wrap gap-1">
                  <span
                    v-for="part in describeFilters(saved.params)"
                    :key="part"
                    class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {{ part }}
                  </span>
                  <span
                    v-if="!describeFilters(saved.params).length"
                    class="text-xs text-muted-foreground"
                  >
                    {{ t('tasks.advancedFilters.noFilters') }}
                  </span>
                </span>
              </button>

              <div class="flex shrink-0 items-center justify-end">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  square
                  icon="i-lucide-star"
                  :class="saved.is_default ? 'text-warning [&_svg]:fill-current' : 'text-muted-foreground'"
                  :aria-pressed="saved.is_default"
                  :aria-label="saved.is_default ? t('tasks.advancedFilters.unsetDefault') : t('tasks.advancedFilters.setDefault')"
                  :title="saved.is_default ? t('tasks.advancedFilters.unsetDefault') : t('tasks.advancedFilters.setDefault')"
                  @click="toggleDefault(saved)"
                />
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  square
                  icon="i-lucide-pencil"
                  :aria-label="t('tasks.advancedFilters.rename')"
                  :title="t('tasks.advancedFilters.rename')"
                  @click="startRename(saved)"
                />
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  square
                  icon="i-lucide-save"
                  :aria-label="t('tasks.advancedFilters.updateWithCurrent')"
                  :title="t('tasks.advancedFilters.updateWithCurrent')"
                  @click="updateWithCurrent(saved)"
                />
                <UButton
                  color="error"
                  variant="ghost"
                  size="sm"
                  square
                  icon="i-lucide-trash-2"
                  :aria-label="t('tasks.advancedFilters.delete')"
                  :title="t('tasks.advancedFilters.delete')"
                  @click="resetRowState(); confirmingDeleteId = saved.id"
                />
              </div>
            </div>

            <!-- Confirmación de eliminación -->
            <div
              v-if="confirmingDeleteId === saved.id"
              class="flex flex-wrap items-center gap-2 border-t border-border bg-error/5 px-3 py-2 text-sm"
            >
              <span class="min-w-0 flex-1">{{ t('tasks.advancedFilters.deleteConfirm', { name: saved.name }) }}</span>
              <UButton
                color="error"
                size="sm"
                :loading="deleteMutation.isPending.value"
                :label="t('tasks.advancedFilters.delete')"
                @click="confirmDelete(saved)"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                :label="t('tasks.advancedFilters.cancel')"
                @click="confirmingDeleteId = null"
              />
            </div>

            <p
              v-if="rowError?.id === saved.id"
              class="border-t border-border px-3 py-2 text-xs text-error"
            >
              {{ rowError.message }}
            </p>
          </li>
        </ul>
      </template>
    </template>

    <template #footer>
      <template v-if="step === 'builder'">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-bookmark-plus"
          :disabled="!canSubmitDraft"
          :label="t('tasks.advancedFilters.save')"
          @click="goToNameStep"
        />
        <UButton
          icon="i-lucide-check"
          :disabled="!canSubmitDraft"
          :label="t('tasks.advancedFilters.apply')"
          @click="applyDraft"
        />
      </template>

      <template v-else-if="step === 'name'">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-arrow-left"
          :label="t('tasks.advancedFilters.back')"
          @click="step = 'builder'"
        />
        <UButton
          icon="i-lucide-bookmark-plus"
          :loading="createMutation.isPending.value"
          :disabled="!saveName.trim()"
          :label="t('tasks.advancedFilters.saveConfirm')"
          @click="submitSave"
        />
      </template>

      <template v-else>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-eraser"
          :disabled="!hasTaskFilters(filters)"
          :label="t('tasks.advancedFilters.clearApplied')"
          @click="applyToList({}); open = false"
        />
        <UButton
          icon="i-lucide-plus"
          :label="t('tasks.advancedFilters.newFilter')"
          @click="goToBuilder(false)"
        />
      </template>
    </template>
  </UModal>
</template>
