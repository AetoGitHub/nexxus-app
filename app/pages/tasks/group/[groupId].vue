<script setup lang="ts">
import TaskWorkspacePage from '~/features/tasks/components/workspace/TaskWorkspacePage.vue'

definePageMeta({ middleware: ['auth', 'permission', 'group'], permission: ['task', 'view_by_group'] })

const route = useRoute()
const { t } = useI18n()
const { managedGroups } = useAuth()

const groupName = computed(() =>
  managedGroups.value.find(group => group.id === Number(route.params.groupId))?.name
  ?? t('sidebar.groupTasks'),
)

useSeoMeta({
  title: () => groupName.value,
})
</script>

<template>
  <TaskWorkspacePage :title="groupName" />
</template>
