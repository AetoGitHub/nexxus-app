<script setup lang="ts">
import type { EnterpriseProject, ProjectMember } from '~/features/projects/types/project.types'
import { resolveThemeColor } from '~/features/projects/utils/project-color.util'
import { resolveAvatarColor } from '~/features/task-settings/utils/groups/group-avatar.util'
import { profileFullName } from '~/features/auth/utils/profile-appearance.util'
import { getInitials } from '~/shared/utils/initials'

/** Detalle de solo lectura de un proyecto: nombre, responsable y miembros, sin pasar por el formulario de edición. */
const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  project: EnterpriseProject | null
}>()

const emit = defineEmits<{
  edit: [project: EnterpriseProject]
}>()

const { t } = useI18n()

const color = computed(() => resolveThemeColor(props.project?.color))

const responsibleName = computed(() => {
  const project = props.project
  if (!project || project.responsible == null) {
    return ''
  }
  return profileFullName({
    first_name: project.responsible_first_name,
    last_name: project.responsible_last_name,
    username: project.responsible_username || `#${project.responsible}`,
  })
})

const members = computed(() =>
  (props.project?.members ?? []).map((member: ProjectMember) => ({
    id: member.id,
    name: profileFullName(member),
  })),
)

function onEdit() {
  if (!props.project) {
    return
  }
  open.value = false
  emit('edit', props.project)
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('taskSettings.projectDetail.title')"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <div
        v-if="project"
        class="space-y-5"
      >
        <div>
          <p class="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
            {{ t('taskSettings.projectDetail.name') }}
          </p>
          <div class="flex items-center gap-2 min-w-0">
            <span
              class="w-2.5 h-2.5 rounded-full shrink-0"
              :style="{ background: color }"
            />
            <p class="text-sm font-medium text-foreground wrap-break-word min-w-0">
              {{ project.name }}
            </p>
          </div>
          <p class="text-[12px] text-muted-foreground mt-1">
            {{ t('taskSettings.projects.activeTasks', { count: project.task_count }) }}
          </p>
        </div>

        <div>
          <p class="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
            {{ t('taskSettings.projectDetail.responsible') }}
          </p>
          <div
            v-if="project.responsible != null"
            class="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5"
          >
            <UserAvatar
              :user-id="project.responsible"
              :initials="getInitials(responsibleName)"
              :name="responsibleName"
              :size="28"
              :font-size="11"
              :fallback-color="resolveAvatarColor(project.responsible)"
            />
            <p class="text-[13px] font-medium text-foreground truncate min-w-0 flex-1">
              {{ responsibleName }}
            </p>
          </div>
          <p
            v-else
            class="text-sm text-muted-foreground"
          >
            {{ t('taskSettings.projectDetail.noResponsible') }}
          </p>
        </div>

        <div>
          <p class="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
            {{ t('taskSettings.projectDetail.members') }}
            <span
              v-if="members.length"
              class="ml-1 normal-case tracking-normal font-normal"
            >
              · {{ members.length }}
            </span>
          </p>
          <p
            v-if="!members.length"
            class="text-sm text-muted-foreground"
          >
            {{ t('taskSettings.projectDetail.noMembers') }}
          </p>
          <ul
            v-else
            class="max-h-64 overflow-y-auto divide-y divide-border rounded-lg border border-border"
          >
            <li
              v-for="member in members"
              :key="member.id"
              class="flex items-center gap-2.5 px-3 py-2.5 bg-card"
            >
              <UserAvatar
                :user-id="member.id"
                :initials="getInitials(member.name)"
                :name="member.name"
                :size="28"
                :font-size="11"
                :fallback-color="resolveAvatarColor(member.id)"
              />
              <p class="text-[13px] font-medium text-foreground truncate min-w-0 flex-1">
                {{ member.name }}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('taskSettings.projectDetail.close')"
          @click="open = false"
        />
        <UButton
          color="primary"
          icon="i-lucide-pencil"
          :label="t('taskSettings.projectDetail.edit')"
          :disabled="!project"
          @click="onEdit"
        />
      </div>
    </template>
  </UModal>
</template>
