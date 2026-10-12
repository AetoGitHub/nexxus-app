<script setup lang="ts">
import TaskVoiceButton from '~/features/tasks/components/form/TaskVoiceButton.vue'
import { useAllUsersDropdown } from '~/features/tasks/composables/shared/useAllUsersDropdown'
import { useProjectsDropdown } from '~/features/tasks/composables/shared/useProjectsDropdown'
import { useUsersDropdown } from '~/features/tasks/composables/shared/useUsersDropdown'
import type { VoiceTaskResponse } from '~/features/tasks/types/voice-task.types'
import { toVoiceProjects, toVoiceUsers } from '~/features/tasks/utils/form/voice-task.util'

/**
 * Atajo de dictado junto a «Nueva tarea»: solo el ícono del micrófono. Graba la tarea, la manda a la IA y avisa con
 * `result` para que el espacio de trabajo abra el slide over ya rellenado. Pide los usuarios y proyectos de la empresa
 * porque la IA los necesita para resolver nombres: los usuarios completos (todas las páginas) y los proyectos del
 * dropdown del formulario, con su caché.
 *
 * `busy` avisa cuando está grabando o procesando, para que la barra donde vive le haga espacio al visualizador.
 */
defineProps<{
  /** Grabando o procesando, ocupa todo el ancho disponible de su contenedor (barra mobile). */
  fill?: boolean
}>()

defineEmits<{
  result: [task: VoiceTaskResponse]
  'update:busy': [busy: boolean]
}>()

const { user } = useAuth()

const { list: firstPageUsers } = useUsersDropdown(true)
const { list: allUsers } = useAllUsersDropdown(true)
const { allItems: projectItems } = useProjectsDropdown({ enabled: true })

// Mientras se descargan todas las páginas se usa la primera, que ya suele estar en caché.
const users = computed(() => toVoiceUsers(allUsers.value.length ? allUsers.value : firstPageUsers.value))
const projects = computed(() => toVoiceProjects(projectItems.value))
</script>

<template>
  <TaskVoiceButton
    icon-only
    size="sm"
    :fill="fill"
    :user-id="user?.id"
    :users="users"
    :projects="projects"
    @result="$emit('result', $event)"
    @update:busy="$emit('update:busy', $event)"
  />
</template>
