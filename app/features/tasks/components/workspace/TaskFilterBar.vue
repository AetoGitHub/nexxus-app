<script setup lang="ts">
import TaskAdvancedFilters from '~/features/tasks/components/workspace/TaskAdvancedFilters.vue'
import TaskFilterButton from '~/features/tasks/components/workspace/TaskFilterButton.vue'
import TaskPrivacyFilter from '~/features/tasks/components/workspace/TaskPrivacyFilter.vue'
import { useProfiles } from '~/features/auth/composables/useProfiles'
import { profileFullName } from '~/features/auth/utils/profile-appearance.util'
import { usePrivateProjects } from '~/features/projects/composables/usePrivateProjects'
import { useTaskGroupByAccess } from '~/features/tasks/composables/shared/useTaskGroupByAccess'
import { TASK_FILTER_STATUSES } from '~/features/tasks/utils/task-filter-params.util'
import type { TaskFilterStatus, TaskGroupBy, TaskListFilters, TaskType, TaskView } from '~/features/tasks/types/task.types'

/**
 * Fila de filtros de la maqueta UX-04:
 * [Todas|Empresa|Privadas] [Agrupar ▾] [Estado ▾] [Proyecto ▾] [Responsable ▾] [Tipo ▾] [Más filtros]  ⓘ
 * Todos escriben en los mismos filtros de la URL que «Más filtros» (filtros avanzados y guardados).
 */
const filters = defineModel<TaskListFilters>({ required: true })
const search = defineModel<string>('search', { required: true })
const groupBy = defineModel<TaskGroupBy>('groupBy', { required: true })

const props = withDefaults(
  defineProps<{
    view: TaskView
    /** Pendientes de aprobación: sin privacidad ni filtros del backend de listas. */
    authorizeMode?: boolean
    hideGroupBy?: boolean
    excludeGroupBy?: TaskGroupBy[]
    activeFilterCount?: number
  }>(),
  {
    authorizeMode: false,
    hideGroupBy: false,
    excludeGroupBy: () => [],
    activeFilterCount: 0,
  },
)

const { t } = useI18n()
const { organization } = useAuth()
const { isAdminActive, isGroupActive, isProjectActive } = useTaskAdminView()
const { projects: privateProjects } = usePrivateProjects()

function patch(next: Partial<TaskListFilters>) {
  filters.value = { ...filters.value, ...next }
}

// ───────────── Privacidad ─────────────
/** Solo con proyectos privados (o con un valor ya aplicado, para poder quitarlo). */
const showPrivacy = computed(() =>
  !props.authorizeMode && (privateProjects.value.length > 0 || filters.value.private !== undefined),
)

// ───────────── Agrupar ─────────────
const GROUP_OPTIONS: { value: TaskGroupBy, icon: string, labelKey: string }[] = [
  { value: 'all', icon: 'i-lucide-layers', labelKey: 'tasks.groupBy.all' },
  { value: 'status', icon: 'i-lucide-flag', labelKey: 'tasks.groupBy.status' },
  { value: 'due', icon: 'i-lucide-calendar-days', labelKey: 'tasks.groupBy.due' },
  { value: 'project', icon: 'i-lucide-folder', labelKey: 'tasks.groupBy.project' },
  { value: 'group', icon: 'i-lucide-users', labelKey: 'tasks.groupBy.group' },
  { value: 'user', icon: 'i-lucide-user', labelKey: 'tasks.groupBy.user' },
]
// «Proyecto» y «Grupo» solo con su permiso (task.can_view_by_project / can_view_by_group).
const { deniedGroupBys } = useTaskGroupByAccess()
const groupOptions = computed(() =>
  GROUP_OPTIONS.filter(option => !props.excludeGroupBy.includes(option.value) && !deniedGroupBys.value.includes(option.value)),
)
const groupLabel = computed(() => {
  const active = GROUP_OPTIONS.find(option => option.value === groupBy.value)
  return active && active.value !== 'all'
    ? t('tasks.groupByLabel', { name: t(active.labelKey) })
    : t('tasks.groupByShort')
})

// ───────────── Estado ─────────────
const STATUS_DOT: Record<TaskFilterStatus, string> = {
  pending: '#a3a6b1',
  wip: '#28cda8',
  in_review: '#ffb020',
  rejected: '#ff6b7a',
}
const selectedStatuses = computed(() => filters.value.status ?? [])
/** El tablero ya agrupa por estado: ahí el filtro se apaga (y el Kanban no lo recibe). */
const statusDisabled = computed(() => props.view === 'kanban')
const statusLabel = computed(() => {
  const selected = selectedStatuses.value
  if (statusDisabled.value || !selected.length) {
    return t('tasks.filterStatus')
  }
  const first = t(`tasks.statusFilter.${selected[0]}`)
  return selected.length > 1 ? t('tasks.responsibleMore', { name: first, n: selected.length - 1 }) : first
})
function toggleStatus(status: TaskFilterStatus) {
  const current = selectedStatuses.value
  const next = current.includes(status) ? current.filter(value => value !== status) : [...current, status]
  // Todos marcados equivale a no filtrar.
  patch({ status: !next.length || next.length === TASK_FILTER_STATUSES.length ? undefined : next })
}

// ───────────── Proyecto ─────────────
const projectOpen = ref(false)
const projectSearchTerm = ref('')
const {
  projects,
  items: projectItems,
  allItems: allProjectItems,
  isSearching: isSearchingProjects,
} = useProjectsDropdown({ searchTerm: projectSearchTerm })

/** Proyectos vistos alguna vez (y mis privados): así los elegidos conservan su nombre al cambiar la búsqueda. */
const knownProjects = reactive(new Map<number, string>())
watchEffect(() => {
  for (const item of allProjectItems.value) {
    knownProjects.set(item.value, item.label)
  }
  for (const project of privateProjects.value) {
    knownProjects.set(project.id, project.name)
  }
})
const selectedProjects = computed(() => filters.value.project ?? [])
/** Elegidos primero (aunque la búsqueda no los traiga) y luego el resultado de la búsqueda. */
const projectOptions = computed(() => {
  const selected = selectedProjects.value.map(id => ({ value: id, label: knownProjects.get(id) ?? `#${id}` }))
  const selectedIds = new Set(selectedProjects.value)
  return [...selected, ...projectItems.value.filter(item => !selectedIds.has(item.value))]
})
const projectLabel = computed(() => {
  const selected = selectedProjects.value
  if (!selected.length) {
    return t('tasks.filterProject')
  }
  const first = knownProjects.get(selected[0]!) ?? t('tasks.filterProject')
  return selected.length > 1 ? t('tasks.responsibleMore', { name: first, n: selected.length - 1 }) : first
})
function toggleProject(id: number) {
  const current = selectedProjects.value
  const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id]
  patch({ project: next.length ? next : undefined })
}

// ───────────── Responsable ─────────────
const responsibleOpen = ref(false)
const peopleSearch = ref('')
/** Mis tareas (no vista total / grupo / proyecto): el backend ya trae solo las asignadas a mí. */
const isMineScope = computed(() => !isAdminActive.value && !isGroupActive.value && !isProjectActive.value)
const { profiles: orgProfiles, profilesQuery: orgProfilesQuery } = useProfiles(
  // Se piden al abrir (o si ya hay personas elegidas, para mostrar su nombre en el botón).
  computed(() => responsibleOpen.value || Boolean(filters.value.users?.length)),
  () => ({ organization: organization.value?.id }),
)
const selectedUsers = computed(() => filters.value.users ?? [])
const peopleOptions = computed(() => {
  const term = peopleSearch.value.trim().toLowerCase()
  const all = orgProfiles.value.map(profile => ({ value: profile.id, label: profileFullName(profile) }))
  const filtered = term ? all.filter(option => option.label.toLowerCase().includes(term)) : all
  // Elegidos arriba.
  return [...filtered].sort((a, b) => Number(selectedUsers.value.includes(b.value)) - Number(selectedUsers.value.includes(a.value)))
})
const responsibleLabel = computed(() => {
  const selected = selectedUsers.value
  if (!selected.length) {
    return isMineScope.value
      ? t('tasks.responsibleLabel', { name: t('tasks.responsibleMe') })
      : t('tasks.filterResponsible')
  }
  const firstProfile = orgProfiles.value.find(profile => profile.id === selected[0])
  const first = firstProfile ? profileFullName(firstProfile) : t('tasks.filterResponsible')
  const name = selected.length > 1 ? t('tasks.responsibleMore', { name: first, n: selected.length - 1 }) : first
  return t('tasks.responsibleLabel', { name })
})
const responsibleActive = computed(() => isMineScope.value || selectedUsers.value.length > 0)
function toggleUser(id: number) {
  const current = selectedUsers.value
  const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id]
  patch({ users: next.length ? next : undefined })
}

// ───────────── Tipo ─────────────
type VisibleTaskType = Extract<TaskType, 'puesto' | 'manual' | 'repeat' | 'trigger'>
const TYPE_OPTIONS: { value: VisibleTaskType, dotClass: string }[] = [
  { value: 'puesto', dotClass: 'bg-info' },
  { value: 'manual', dotClass: 'bg-success' },
  { value: 'repeat', dotClass: 'bg-secondary' },
  { value: 'trigger', dotClass: 'bg-warning' },
]
const selectedTypes = computed(() => filters.value.type ?? [])
const typeLabel = computed(() => {
  const selected = selectedTypes.value
  if (!selected.length) {
    return t('tasks.filterType')
  }
  const first = t(`tasks.types.${selected[0]}`)
  return selected.length > 1 ? t('tasks.responsibleMore', { name: first, n: selected.length - 1 }) : first
})
function toggleType(type: VisibleTaskType) {
  const current = selectedTypes.value
  const next = current.includes(type) ? current.filter(value => value !== type) : [...current, type]
  // Todos los tipos = sin filtro (query sin `type`).
  const allSelected = TYPE_OPTIONS.every(option => next.includes(option.value))
  patch({ type: !next.length || allSelected ? undefined : next })
}
</script>

<template>
  <div class="flex items-center gap-2 max-md:flex-nowrap max-md:overflow-x-auto max-md:-mx-3 max-md:px-3 max-md:pb-1 md:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <TaskPrivacyFilter
      v-if="showPrivacy"
      :model-value="filters.private"
      @update:model-value="patch({ private: $event })"
    />

    <!-- Agrupar (antes «Ver por»). -->
    <TaskFilterButton
      v-if="!hideGroupBy"
      :label="groupLabel"
      :active="groupBy !== 'all'"
      content-class="w-56"
    >
      <template #default="{ close }">
        <button
          v-for="option in groupOptions"
          :key="option.value"
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted"
          :class="groupBy === option.value ? 'font-semibold text-aeto-teal-dark' : 'text-foreground'"
          @click="groupBy = option.value; close()"
        >
          <UIcon :name="option.icon" class="size-4 shrink-0 text-muted-foreground" />
          <span class="flex-1">{{ t(option.labelKey) }}</span>
          <UIcon v-if="groupBy === option.value" name="i-lucide-check" class="size-4 shrink-0" />
        </button>
      </template>
    </TaskFilterButton>

    <template v-if="!authorizeMode">
      <!-- Estado: pendiente, en progreso, en revisión, rechazada. -->
      <TaskFilterButton
        :label="statusLabel"
        :active="!statusDisabled && selectedStatuses.length > 0"
        :disabled="statusDisabled"
        :disabled-reason="t('tasks.kanbanStatusHint')"
        content-class="w-56"
      >
        <button
          v-for="status in TASK_FILTER_STATUSES"
          :key="status"
          type="button"
          role="menuitemcheckbox"
          :aria-checked="selectedStatuses.includes(status)"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground hover:bg-muted"
          @click="toggleStatus(status)"
        >
          <UIcon
            :name="selectedStatuses.includes(status) ? 'i-lucide-square-check' : 'i-lucide-square'"
            class="size-4 shrink-0"
            :class="selectedStatuses.includes(status) ? 'text-primary' : 'text-muted-foreground'"
          />
          <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: STATUS_DOT[status] }" aria-hidden="true" />
          <span class="flex-1">{{ t(`tasks.statusFilter.${status}`) }}</span>
        </button>
        <button
          v-if="selectedStatuses.length"
          type="button"
          class="mt-1 w-full rounded-md border-t border-border px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
          @click="patch({ status: undefined })"
        >
          {{ t('tasks.clearFilter') }}
        </button>
      </TaskFilterButton>

      <!-- Proyecto. -->
      <TaskFilterButton
        v-model:open="projectOpen"
        :label="projectLabel"
        :active="selectedProjects.length > 0"
        content-class="w-72"
      >
        <UInput
          v-model="projectSearchTerm"
          icon="i-lucide-search"
          size="sm"
          class="mb-1 w-full"
          :placeholder="t('tasks.filterSelectSearch')"
          :loading="isSearchingProjects"
          autofocus
        />
        <div class="max-h-64 overflow-y-auto">
          <p
            v-if="projects.isPending.value"
            class="px-2 py-3 text-center text-xs text-muted-foreground"
          >
            {{ t('common.loading') }}
          </p>
          <p
            v-else-if="!projectOptions.length"
            class="px-2 py-3 text-center text-xs text-muted-foreground"
          >
            {{ t('common.noData') }}
          </p>
          <button
            v-for="option in projectOptions"
            :key="option.value"
            type="button"
            role="menuitemcheckbox"
            :aria-checked="selectedProjects.includes(option.value)"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground hover:bg-muted"
            @click="toggleProject(option.value)"
          >
            <UIcon
              :name="selectedProjects.includes(option.value) ? 'i-lucide-square-check' : 'i-lucide-square'"
              class="size-4 shrink-0"
              :class="selectedProjects.includes(option.value) ? 'text-primary' : 'text-muted-foreground'"
            />
            <UIcon name="i-lucide-folder" class="size-4 shrink-0 text-muted-foreground" />
            <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
          </button>
        </div>
        <button
          v-if="selectedProjects.length"
          type="button"
          class="mt-1 w-full rounded-md border-t border-border px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
          @click="patch({ project: undefined })"
        >
          {{ t('tasks.clearFilter') }}
        </button>
      </TaskFilterButton>

      <!-- Responsable: mismo campo `users` de filtros avanzados. -->
      <TaskFilterButton
        v-model:open="responsibleOpen"
        :label="responsibleLabel"
        :active="responsibleActive"
        content-class="w-72"
      >
        <div
          v-if="isMineScope"
          class="mb-1 flex items-start gap-2 rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground"
        >
          <UIcon name="i-lucide-user-check" class="mt-px size-4 shrink-0 text-primary" />
          <span>{{ t('tasks.responsibleHintMine') }}</span>
        </div>
        <UInput
          v-model="peopleSearch"
          icon="i-lucide-search"
          size="sm"
          class="mb-1 w-full"
          :placeholder="t('tasks.filterSelectSearch')"
          autofocus
        />
        <div class="max-h-64 overflow-y-auto">
          <p
            v-if="orgProfilesQuery.isPending.value"
            class="px-2 py-3 text-center text-xs text-muted-foreground"
          >
            {{ t('common.loading') }}
          </p>
          <p
            v-else-if="!peopleOptions.length"
            class="px-2 py-3 text-center text-xs text-muted-foreground"
          >
            {{ t('common.noData') }}
          </p>
          <button
            v-for="option in peopleOptions"
            :key="option.value"
            type="button"
            role="menuitemcheckbox"
            :aria-checked="selectedUsers.includes(option.value)"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground hover:bg-muted"
            @click="toggleUser(option.value)"
          >
            <UIcon
              :name="selectedUsers.includes(option.value) ? 'i-lucide-square-check' : 'i-lucide-square'"
              class="size-4 shrink-0"
              :class="selectedUsers.includes(option.value) ? 'text-primary' : 'text-muted-foreground'"
            />
            <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
          </button>
        </div>
        <button
          v-if="selectedUsers.length"
          type="button"
          class="mt-1 w-full rounded-md border-t border-border px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
          @click="patch({ users: undefined })"
        >
          {{ t('tasks.clearFilter') }}
        </button>
      </TaskFilterButton>

      <!-- Tipo: puesto, manual, repetitiva, trigger. -->
      <TaskFilterButton
        :label="typeLabel"
        :active="selectedTypes.length > 0"
        content-class="w-56"
      >
        <button
          v-for="option in TYPE_OPTIONS"
          :key="option.value"
          type="button"
          role="menuitemcheckbox"
          :aria-checked="selectedTypes.includes(option.value)"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground hover:bg-muted"
          @click="toggleType(option.value)"
        >
          <UIcon
            :name="selectedTypes.includes(option.value) ? 'i-lucide-square-check' : 'i-lucide-square'"
            class="size-4 shrink-0"
            :class="selectedTypes.includes(option.value) ? 'text-primary' : 'text-muted-foreground'"
          />
          <span class="size-2 shrink-0 rounded-full" :class="option.dotClass" aria-hidden="true" />
          <span class="flex-1">{{ t(`tasks.types.${option.value}`) }}</span>
        </button>
        <button
          v-if="selectedTypes.length"
          type="button"
          class="mt-1 w-full rounded-md border-t border-border px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
          @click="patch({ type: undefined })"
        >
          {{ t('tasks.clearFilter') }}
        </button>
      </TaskFilterButton>

      <!-- Más filtros = filtros avanzados (constructor + guardados). -->
      <TaskAdvancedFilters
        v-model="filters"
        v-model:search="search"
        toolbar
        :active-count="activeFilterCount"
      />
    </template>

    <span
      v-if="statusDisabled && !authorizeMode"
      class="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground xl:inline-flex"
    >
      <UIcon name="i-lucide-info" class="size-4 shrink-0" />
      {{ t('tasks.kanbanStatusHint') }}
    </span>

    <slot />
  </div>
</template>
