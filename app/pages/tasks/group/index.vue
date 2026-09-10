<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'group'] })

const { managedGroups } = useAuth()

// Entrada sin grupo explícito: manda al primero que administre el usuario.
await navigateTo(`/tasks/group/${managedGroups.value[0]?.id}`, { replace: true })
</script>

<template>
  <div />
</template>
