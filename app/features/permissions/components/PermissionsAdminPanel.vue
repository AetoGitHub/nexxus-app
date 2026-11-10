<script setup lang="ts">
import PermissionsUsersTab from '~/features/permissions/components/PermissionsUsersTab.vue'
import PermissionsPresetsTab from '~/features/permissions/components/PermissionsPresetsTab.vue'

/** Configuración → Permisos (solo superusers): pestañas Usuarios y Plantillas. */
const { t } = useI18n()

const tab = ref<'users' | 'presets'>('users')
const tabs = computed(() => [
  { value: 'users', label: t('permissions.tabs.users'), icon: 'i-lucide-users' },
  { value: 'presets', label: t('permissions.tabs.presets'), icon: 'i-lucide-layout-template' },
])
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-4 lg:px-5">
    <div class="mb-4 flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/25">
        <UIcon
          name="i-lucide-shield-check"
          class="h-5 w-5"
        />
      </div>
      <div class="min-w-0">
        <h1 class="text-lg font-semibold leading-tight">
          {{ t('permissions.title') }}
        </h1>
        <p class="text-sm text-muted-foreground">
          {{ t('permissions.subtitle') }}
        </p>
      </div>
    </div>

    <UTabs
      v-model="tab"
      :items="tabs"
      :content="false"
      class="mb-4 w-full sm:w-auto"
    />

    <PermissionsUsersTab v-if="tab === 'users'" />
    <PermissionsPresetsTab v-else />
  </div>
</template>
