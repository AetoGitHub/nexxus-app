<script setup lang="ts">
import TaskWorkspacePage from '~/features/tasks/components/workspace/TaskWorkspacePage.vue'

definePageMeta({ middleware: ['auth', 'admin'] })

const { t } = useI18n()
const { isAdminActive } = useTaskAdminView()

useSeoMeta({
  title: () => t('sidebar.adminTasks'),
})

// Se activa aquí (setup del padre, antes de montar los hijos) para que las
// queries iniciales de TaskWorkspacePage ya salgan con admin=true.
isAdminActive.value = true

onUnmounted(() => {
  isAdminActive.value = false
})
</script>

<template>
  <TaskWorkspacePage :title="t('sidebar.adminTasks')" />
</template>
