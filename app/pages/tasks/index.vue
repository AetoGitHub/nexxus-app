<script setup lang="ts">
import TaskWorkspacePage from '~/features/tasks/components/workspace/TaskWorkspacePage.vue'

definePageMeta({ middleware: 'auth' })

const { t } = useI18n()

useSeoMeta({
  title: () => t('sidebar.myTasks'),
})
</script>

<template>
  <TaskWorkspacePage :title="t('sidebar.myTasks')" />
</template>
