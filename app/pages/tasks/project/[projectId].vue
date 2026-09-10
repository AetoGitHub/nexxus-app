<script setup lang="ts">
import TaskWorkspacePage from '~/features/tasks/components/workspace/TaskWorkspacePage.vue'

definePageMeta({ middleware: ['auth', 'project'] })

const route = useRoute()
const { t } = useI18n()
const { userProjects } = useAuth()

const projectName = computed(() =>
  userProjects.value.find(project => project.id === Number(route.params.projectId))?.name
  ?? t('sidebar.projectTasks'),
)

useSeoMeta({
  title: () => projectName.value,
})
</script>

<template>
  <TaskWorkspacePage :title="projectName" />
</template>
