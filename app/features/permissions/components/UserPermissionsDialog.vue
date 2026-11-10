<script setup lang="ts">
import PermissionsProfileEditor from '~/features/permissions/components/PermissionsProfileEditor.vue'
import { getInitials } from '~/shared/utils/initials'

/** Permisos de un usuario desde la tabla de Usuarios (acción de la fila). Solo superusers. */
const open = defineModel<boolean>('open', { default: false })

defineProps<{
  profileId: number | null
  name: string
  username?: string
}>()

const { t } = useI18n()
const dirty = ref(false)

// Cerrar con cambios sin guardar los descartaría: se pide confirmación.
const confirmCloseOpen = ref(false)
const dialogOpen = computed({
  get: () => open.value,
  set: (value: boolean) => {
    if (!value && dirty.value) {
      confirmCloseOpen.value = true
      return
    }
    open.value = value
  },
})

function requestClose() {
  dialogOpen.value = false
}

function confirmClose() {
  confirmCloseOpen.value = false
  dirty.value = false
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="dialogOpen"
    :ui="{ content: 'sm:max-w-5xl', body: 'sm:p-6' }"
  >
    <template #header>
      <div class="flex w-full items-center gap-3">
        <UserAvatar
          v-if="profileId != null"
          :user-id="profileId"
          :initials="getInitials(name)"
          :name="name"
          :size="40"
          :font-size="14"
        />
        <div class="min-w-0 flex-1">
          <h2 class="flex items-center gap-2 text-base font-semibold leading-tight">
            <UIcon
              name="i-lucide-shield-check"
              class="h-4.5 w-4.5 text-primary"
            />
            {{ t('permissions.dialog.title') }}
          </h2>
          <p class="truncate text-sm text-muted-foreground">
            {{ name }}<template v-if="username && username !== name">
              · {{ username }}
            </template>
          </p>
        </div>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          :aria-label="t('permissions.actions.cancel')"
          @click="requestClose"
        />
      </div>
    </template>

    <template #body>
      <PermissionsProfileEditor
        v-if="profileId != null"
        :key="profileId"
        v-model:dirty="dirty"
        :profile-id="profileId"
        :name="name"
        hide-header
      />
    </template>
  </UModal>

  <UModal
    v-model:open="confirmCloseOpen"
    :title="t('permissions.users.switchConfirmTitle')"
    :description="t('permissions.users.switchConfirmDescription')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer="{ close }">
      <UButton
        :label="t('permissions.actions.cancel')"
        color="neutral"
        variant="outline"
        @click="close()"
      />
      <UButton
        :label="t('permissions.actions.discardAndContinue')"
        color="warning"
        @click="confirmClose"
      />
    </template>
  </UModal>
</template>
