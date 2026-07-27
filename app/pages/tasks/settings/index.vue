<script setup lang="ts">
import TaskSettingsGroupModal from '~/features/task-settings/components/groups/TaskSettingsGroupModal.vue'
import TaskSettingsGroupsPanel from '~/features/task-settings/components/groups/TaskSettingsGroupsPanel.vue'
import TaskSettingsNavSidebar from '~/features/task-settings/components/shared/TaskSettingsNavSidebar.vue'
import TaskSettingsPlaceholderPanel from '~/features/task-settings/components/shared/TaskSettingsPlaceholderPanel.vue'
import TaskSettingsThemeModal from '~/features/task-settings/components/themes/TaskSettingsThemeModal.vue'
import TaskSettingsThemesPanel from '~/features/task-settings/components/themes/TaskSettingsThemesPanel.vue'
import type {
  TaskSettingsNavItem,
  TaskSettingsSectionId,
  ThemeFormState,
} from '~/features/task-settings/types/task-settings.types'
import {
  createEmptyThemeForm,
  createThemeFormFromProject,
} from '~/features/task-settings/types/task-settings.types'
import type {
  CatalogueGroup,
  CatalogueGroupDetail,
  GroupFormState,
} from '~/features/task-settings/types/group.types'
import {
  createEmptyGroupForm,
  createGroupFormFromCatalogue,
  createGroupFormFromDetail,
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

const activeSection = ref<TaskSettingsSectionId>('themes')
const themeModalOpen = ref(false)
const themeForm = ref<ThemeFormState>(createEmptyThemeForm())
const editingThemeId = ref<number | null>(null)
const groupModalOpen = ref(false)
const groupForm = ref<GroupFormState>(createEmptyGroupForm())
const editingGroupId = ref<number | null>(null)

const isEditingTheme = computed(() => editingThemeId.value != null)
const isEditingGroup = computed(() => editingGroupId.value != null)

const navItems: TaskSettingsNavItem[] = [
  { id: 'themes', labelKey: 'taskSettings.nav.themes', icon: 'i-lucide-palette' },
  { id: 'groups', labelKey: 'taskSettings.nav.groups', icon: 'i-lucide-users' },
  { id: 'nexxtep', labelKey: 'taskSettings.nav.nexxtep', icon: 'i-lucide-workflow' },
  { id: 'videoCalls', labelKey: 'taskSettings.nav.videoCalls', icon: 'i-lucide-video' },
  { id: 'notifications', labelKey: 'taskSettings.nav.notifications', icon: 'i-lucide-bell' },
  { id: 'general', labelKey: 'taskSettings.nav.general', icon: 'i-lucide-settings' },
]

const { projects, projectsQuery, createProject, companyId } = useEnterpriseProjects()
const updateProject = useUpdateEnterpriseProject()
const { groups, groupsQuery } = useCatalogueGroups()
const createGroup = useCreateGroup()
const updateGroup = useUpdateGroup()

const isThemeMutating = computed(
  () => createProject.isPending.value || updateProject.isPending.value,
)

const isGroupMutating = computed(
  () => createGroup.isPending.value || updateGroup.isPending.value,
)

function openNewThemeModal() {
  editingThemeId.value = null
  themeForm.value = createEmptyThemeForm()
  themeModalOpen.value = true
}

function openEditThemeModal(project: EnterpriseProject) {
  editingThemeId.value = project.id
  themeForm.value = createThemeFormFromProject(project)
  themeModalOpen.value = true
}

function openNewGroupModal() {
  editingGroupId.value = null
  groupForm.value = createEmptyGroupForm()
  groupModalOpen.value = true
}

async function openEditGroupModal(group: CatalogueGroup) {
  editingGroupId.value = group.id
  groupForm.value = createGroupFormFromCatalogue(group)
  groupModalOpen.value = true

  try {
    const detail = await queryClient.fetchQuery({
      queryKey: ['catalogues', 'groups', 'detail', group.id],
      queryFn: () => $api<CatalogueGroupDetail>(`/api/catalogues/groups/${group.id}/`),
    })
    groupForm.value = createGroupFormFromDetail(detail)
  }
  catch {
    // Prefill mínimo del listado; el toast de submit cubre fallos al guardar
  }
}

async function onSubmitTheme() {
  const name = themeForm.value.name.trim()
  if (!name || !themeForm.value.color) {
    return
  }

  const payload = {
    name,
    company: companyId,
    color: themeForm.value.color,
    members: themeForm.value.members,
  }

  try {
    if (editingThemeId.value != null) {
      await updateProject.mutateAsync({
        id: editingThemeId.value,
        payload,
      })
    }
    else {
      await createProject.mutateAsync(payload)
      toast.add({
        title: t('taskSettings.themeModal.createdTitle'),
        description: t('taskSettings.themeModal.createdDescription'),
        color: 'success',
      })
    }
    themeModalOpen.value = false
    editingThemeId.value = null
  }
  catch (error) {
    // En update el toast de error lo maneja useUpdateEnterpriseProject
    if (editingThemeId.value != null) {
      return
    }
    toast.add({
      title: t('taskSettings.themeModal.createErrorTitle'),
      description: parseFetchError(error),
      color: 'error',
    })
  }
}

async function onSubmitGroup() {
  const name = groupForm.value.name.trim()
  const manager = groupForm.value.manager
  if (!name || !groupForm.value.color || manager == null) {
    return
  }

  const payload = {
    name,
    color: groupForm.value.color,
    manager,
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
  <div class="flex h-[calc(100dvh-3.5rem)] overflow-hidden">
    <TaskSettingsNavSidebar
      :items="navItems"
      :active-id="activeSection"
      @select="activeSection = $event"
    />

    <div class="flex-1 overflow-y-auto">
      <div class="max-w-[720px] mx-auto px-8 py-8">
        <TaskSettingsThemesPanel
          v-if="activeSection === 'themes'"
          :projects="projects"
          :loading="projectsQuery.isPending.value"
          :error="projectsQuery.isError.value"
          @new-theme="openNewThemeModal"
          @edit="openEditThemeModal"
        />

        <TaskSettingsGroupsPanel
          v-else-if="activeSection === 'groups'"
          :groups="groups"
          :loading="groupsQuery.isPending.value"
          :error="groupsQuery.isError.value"
          @new-group="openNewGroupModal"
          @edit="openEditGroupModal"
        />

        <TaskSettingsPlaceholderPanel
          v-else
          :title="t(`taskSettings.nav.${activeSection}`)"
          :description="t('taskSettings.placeholderDescription')"
        />
      </div>
    </div>

    <TaskSettingsThemeModal
      v-model:open="themeModalOpen"
      v-model:form="themeForm"
      :is-edit="isEditingTheme"
      :loading="isThemeMutating"
      @submit="onSubmitTheme"
    />

    <TaskSettingsGroupModal
      v-model:open="groupModalOpen"
      v-model:form="groupForm"
      :is-edit="isEditingGroup"
      :loading="isGroupMutating"
      @submit="onSubmitGroup"
    />
  </div>
</template>
