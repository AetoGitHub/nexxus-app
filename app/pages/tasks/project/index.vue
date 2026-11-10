<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'permission', 'project'], permission: ['task', 'view_all'] })

const { userProjects } = useAuth()

// Entrada sin proyecto explícito: manda al primero de la lista del usuario.
await navigateTo(`/tasks/project/${userProjects.value[0]?.id}`, { replace: true })
</script>

<template>
  <div />
</template>
