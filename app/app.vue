<script setup lang="ts">
import UserUpdateDialog from '~/features/users/components/UserUpdateDialog.vue'

const { isLoggedIn } = useAuth()
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Única instancia: la comparten la lista de usuarios de Configuración y la tarjeta de perfil (estado global 'user-edit-id'). -->
    <UserUpdateDialog v-if="isLoggedIn" />
  </UApp>
</template>
