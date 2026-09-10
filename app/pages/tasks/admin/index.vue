<script setup lang="ts">
import TaskWorkspacePage from '~/features/tasks/components/workspace/TaskWorkspacePage.vue'

definePageMeta({ middleware: ['auth', 'admin'] })

const { t } = useI18n()

useSeoMeta({
  title: () => t('sidebar.adminTasks'),
})
</script>

<template>
  <TaskWorkspacePage :title="t('sidebar.adminTasks')" />
</template>
