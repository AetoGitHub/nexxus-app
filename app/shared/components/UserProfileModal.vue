<script setup lang="ts">
/** Modal con la tarjeta del usuario en sesión; lo abre la opción "Ver perfil" de los menús de usuario. */
const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('user.profile.title')"
    :description="t('user.profile.description')"
    :ui="{ content: 'max-w-sm' }"
  >
    <template #body>
      <UserProfileCard />
    </template>
  </UModal>
</template>
