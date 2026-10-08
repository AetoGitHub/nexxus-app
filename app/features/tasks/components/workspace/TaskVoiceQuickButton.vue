<script setup lang="ts">
import TaskVoiceButton from '~/features/tasks/components/form/TaskVoiceButton.vue'
import { useProjectsDropdown } from '~/features/tasks/composables/shared/useProjectsDropdown'
import { useUsersDropdown } from '~/features/tasks/composables/shared/useUsersDropdown'
import type { VoiceTaskResponse } from '~/features/tasks/types/voice-task.types'
import { toVoiceProjects, toVoiceUsers } from '~/features/tasks/utils/form/voice-task.util'

/**
 * Atajo de dictado junto a «Nueva tarea»: solo el ícono del micrófono. Graba la tarea, la manda a la IA y avisa con
 * `result` para que el espacio de trabajo abra el slide over ya rellenado. Pide los usuarios y proyectos de la empresa
 * (los mismos dropdowns del formulario, con su caché) porque la IA los necesita para resolver nombres.
 */
defineEmits<{
  result: [task: VoiceTaskResponse]
}>()

const { user } = useAuth()

const { list: usersList } = useUsersDropdown(true)
const { allItems: projectItems } = useProjectsDropdown({ enabled: true })

const users = computed(() => toVoiceUsers(usersList.value))
const projects = computed(() => toVoiceProjects(projectItems.value))
</script>

<template>
  <TaskVoiceButton
    icon-only
    size="sm"
    :user-id="user?.id"
    :users="users"
    :projects="projects"
    @result="$emit('result', $event)"
  />
</template>
