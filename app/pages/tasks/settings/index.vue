<script setup lang="ts">
import TaskSettingsGroupModal from '~/features/task-settings/components/groups/TaskSettingsGroupModal.vue'
import TaskSettingsGroupsPanel from '~/features/task-settings/components/groups/TaskSettingsGroupsPanel.vue'
import TaskSettingsGeneralPanel from '~/features/task-settings/components/general/TaskSettingsGeneralPanel.vue'
import TaskSettingsNotificationsPanel from '~/features/task-settings/components/notifications/TaskSettingsNotificationsPanel.vue'
import TaskSettingsNavSidebar from '~/features/task-settings/components/shared/TaskSettingsNavSidebar.vue'
import TaskSettingsPlaceholderPanel from '~/features/task-settings/components/shared/TaskSettingsPlaceholderPanel.vue'
import TaskSettingsProjectModal from '~/features/task-settings/components/projects/TaskSettingsProjectModal.vue'
import TaskSettingsProjectsPanel from '~/features/task-settings/components/projects/TaskSettingsProjectsPanel.vue'
import type {
  TaskSettingsNavItem,
  TaskSettingsProjectTab,
  TaskSettingsSectionId,
  ProjectFormState,
} from '~/features/task-settings/types/task-settings.types'
import {
  createEmptyProjectForm,
  createProjectFormFromEnterprise,
} from '~/features/task-settings/types/task-settings.types'
import type {
  CatalogueGroup,
  CatalogueGroupDetail,
  CatalogueGroupMember,
  GroupFormState,
} from '~/features/task-settings/types/group.types'
import {
  createEmptyGroupForm,
  createGroupFormFromCatalogue,
  createGroupFormFromDetail,
  groupUsersFromDetail,
} from '~/features/task-settings/types/group.types'
import type { EnterpriseProject } from '~/features/projects/types/project.types'
import { useEnterpriseProjects } from '~/features/projects/composables/useEnterpriseProjects'
import { useUpdateEnterpriseProject } from '~/features/projects/composables/useUpdateEnterpriseProject'
import { useCatalogueGroups } from '~/features/task-settings/composables/groups/useCatalogueGroups'
import { useCreateGroup } from '~/features/task-settings/composables/groups/useCreateGroup'
import { useUpdateGroup } from '~/features/task-settings/composables/groups/useUpdateGroup'
import { parseFetchError } from '~/shared/utils/error-message.util'
import { useQueryClient } from '@tanstack/vue-query'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
const toast = useToast()
const { $api } = useNuxtApp()
const queryClient = useQueryClient()

const activeSection = ref<TaskSettingsSectionId>('projects')
const projectsTab = ref<TaskSettingsProjectTab>('all')
const projectModalOpen = ref(false)
const projectForm = ref<ProjectFormState>(createEmptyProjectForm())
const editingProjectId = ref<number | null>(null)
const groupModalOpen = ref(false)
const groupForm = ref<GroupFormState>(createEmptyGroupForm())
const editingGroupId = ref<number | null>(null)
const assignedGroupUsers = ref<CatalogueGroupMember[]>([])

const isEditingProject = computed(() => editingProjectId.value != null)
const isEditingGroup = computed(() => editingGroupId.value != null)

const navItems: TaskSettingsNavItem[] = [
  { id: 'projects', labelKey: 'taskSettings.nav.projects', icon: 'i-lucide-folder-kanban' },
  { id: 'groups', labelKey: 'taskSettings.nav.groups', icon: 'i-lucide-users' },
  { id: 'nexxtep', labelKey: 'taskSettings.nav.nexxtep', icon: 'i-lucide-workflow' },
  { id: 'videoCalls', labelKey: 'taskSettings.nav.videoCalls', icon: 'i-lucide-video' },
  { id: 'notifications', labelKey: 'taskSettings.nav.notifications', icon: 'i-lucide-bell' },
  { id: 'general', labelKey: 'taskSettings.nav.general', icon: 'i-lucide-settings' },
]

const { projects, projectsQuery, createProject, companyId } = useEnterpriseProjects(
  () => projectsTab.value === 'mine',
)
const updateProject = useUpdateEnterpriseProject()
const { groups, groupsQuery } = useCatalogueGroups()
const createGroup = useCreateGroup()
const updateGroup = useUpdateGroup()

/** Skeleton mientras no hay datos de la query activa (all / mine). */
const isProjectsLoading = computed(
  () => projectsQuery.isFetching.value && projectsQuery.data.value == null,
)

const isProjectMutating = computed(
  () => createProject.isPending.value || updateProject.isPending.value,
)

const isGroupMutating = computed(
  () => createGroup.isPending.value || updateGroup.isPending.value,
)

function openNewProjectModal() {
  editingProjectId.value = null
  projectForm.value = createEmptyProjectForm()
  projectModalOpen.value = true
}

function openEditProjectModal(project: EnterpriseProject) {
  editingProjectId.value = project.id
  projectForm.value = createProjectFormFromEnterprise(project)
  projectModalOpen.value = true
}

function openNewGroupModal() {
  editingGroupId.value = null
  assignedGroupUsers.value = []
  groupForm.value = createEmptyGroupForm()
  groupModalOpen.value = true
}

async function openEditGroupModal(group: CatalogueGroup) {
  editingGroupId.value = group.id
  assignedGroupUsers.value = group.manager_name
    ? [{ id: group.manager, username: group.manager_name }]
    : []
  groupForm.value = createGroupFormFromCatalogue(group)
  groupModalOpen.value = true

  try {
    const detail = await queryClient.fetchQuery({
      queryKey: ['catalogues', 'groups', 'detail', group.id],
      queryFn: () => $api<CatalogueGroupDetail>(`/api/catalogues/groups/${group.id}/`),
    })
    groupForm.value = createGroupFormFromDetail(detail)
    assignedGroupUsers.value = groupUsersFromDetail(detail)
  }
  catch {
    // Prefill mínimo del listado; el toast de submit cubre fallos al guardar
  }
}

async function onSubmitProject() {
  const name = projectForm.value.name.trim()
  if (!name || !projectForm.value.color) {
    return
  }

  if (companyId.value == null) {
    return
  }

  const payload = {
    name,
    company: companyId.value,
    color: projectForm.value.color,
    members: projectForm.value.members,
  }

  try {
    if (editingProjectId.value != null) {
      await updateProject.mutateAsync({
        id: editingProjectId.value,
        payload,
      })
    }
    else {
      await createProject.mutateAsync(payload)
      toast.add({
        title: t('taskSettings.projectModal.createdTitle'),
        description: t('taskSettings.projectModal.createdDescription'),
        color: 'success',
      })
    }
    projectModalOpen.value = false
    editingProjectId.value = null
  }
  catch (error) {
    // En update el toast de error lo maneja useUpdateEnterpriseProject
    if (editingProjectId.value != null) {
      return
    }
    toast.add({
      title: t('taskSettings.projectModal.createErrorTitle'),
      description: parseFetchError(error),
      color: 'error',
    })
  }
}

async function onSubmitGroup() {
  const name = groupForm.value.name.trim()
  const manager = groupForm.value.manager
  const company = groupForm.value.company
  if (!name || !groupForm.value.color || manager == null || company == null) {
    return
  }

  const payload = {
    name,
    color: groupForm.value.color,
    manager,
    company,
    members: groupForm.value.members.filter(id => id !== manager),
  }

  try {
    if (editingGroupId.value != null) {
      await updateGroup.mutateAsync({
        id: editingGroupId.value,
        payload,
      })
    }
    else {
      await createGroup.mutateAsync(payload)
    }
    groupModalOpen.value = false
    editingGroupId.value = null
  }
  catch {
    // Toast de error lo manejan useCreateGroup / useUpdateGroup
  }
}

useSeoMeta({
  title: () => t('taskSettings.title'),
})
</script>

<template>
  <div class="flex flex-col md:flex-row md:h-[calc(100dvh-3.5rem)] min-w-0 md:overflow-hidden">
    <TaskSettingsNavSidebar
      :items="navItems"
      :active-id="activeSection"
      @select="activeSection = $event"
    />

    <div class="flex-1 min-w-0 md:overflow-y-auto">
      <div class="max-w-[720px] mx-auto w-full px-4 py-5 sm:px-6 md:px-8 md:py-8">
        <TaskSettingsProjectsPanel
          v-if="activeSection === 'projects'"
          v-model:tab="projectsTab"
          :projects="projects"
          :loading="isProjectsLoading"
          :error="projectsQuery.isError.value"
          @new-project="openNewProjectModal"
          @edit="openEditProjectModal"
        />

        <TaskSettingsGroupsPanel
          v-else-if="activeSection === 'groups'"
          :groups="groups"
          :loading="groupsQuery.isPending.value"
          :error="groupsQuery.isError.value"
          @new-group="openNewGroupModal"
          @edit="openEditGroupModal"
        />

        <TaskSettingsGeneralPanel
          v-else-if="activeSection === 'general'"
        />

        <TaskSettingsNotificationsPanel
          v-else-if="activeSection === 'notifications'"
        />

        <TaskSettingsPlaceholderPanel
          v-else
          :title="t(`taskSettings.nav.${activeSection}`)"
          :description="t('taskSettings.placeholderDescription')"
        />
      </div>
    </div>

    <TaskSettingsProjectModal
      v-model:open="projectModalOpen"
      v-model:form="projectForm"
      :is-edit="isEditingProject"
      :loading="isProjectMutating"
      @submit="onSubmitProject"
    />

    <TaskSettingsGroupModal
      v-model:open="groupModalOpen"
      v-model:form="groupForm"
      :is-edit="isEditingGroup"
      :loading="isGroupMutating"
      :assigned-users="assignedGroupUsers"
      @submit="onSubmitGroup"
    />
  </div>
</template>
