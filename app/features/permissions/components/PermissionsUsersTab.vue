<script setup lang="ts">
import PermissionsProfileEditor from '~/features/permissions/components/PermissionsProfileEditor.vue'
import { usePermissionProfiles } from '~/features/permissions/composables/usePermissionsAdmin'
import { profileFullName } from '~/features/auth/utils/profile-appearance.util'

/** Permisos por usuario: se elige un perfil y se edita con el mismo editor del diálogo de la tabla de usuarios. */
const { t } = useI18n()
const { organization } = useAuth()

const profilesQuery = usePermissionProfiles(() => organization.value?.id)
const profileItems = computed(() =>
  (profilesQuery.data.value ?? []).map(profile => ({
    value: profile.id,
    label: profileFullName(profile),
    description: profile.username,
  })),
)

const selectedProfileId = ref<number | null>(null)
const selectedName = computed(() => profileItems.value.find(item => item.value === selectedProfileId.value)?.label ?? '')
const dirty = ref(false)

// Cambiar de usuario con cambios sin guardar los descartaría: se pide confirmación.
const pendingProfileId = ref<number | null>(null)
const confirmSwitchOpen = ref(false)
const profileModel = computed({
  get: () => selectedProfileId.value ?? undefined,
  set: (value: number | undefined) => {
    const id = value ?? null
    if (dirty.value && id !== selectedProfileId.value) {
      pendingProfileId.value = id
      confirmSwitchOpen.value = true
      return
    }
    selectedProfileId.value = id
  },
})

function confirmSwitch() {
  selectedProfileId.value = pendingProfileId.value
  confirmSwitchOpen.value = false
}
</script>

<template>
  <div class="space-y-4">
    <UFormField
      :label="t('permissions.users.select')"
      class="rounded-xl border border-border bg-card p-4"
    >
      <USelectMenu
        v-model="profileModel"
        :items="profileItems"
        value-key="value"
        :loading="profilesQuery.isPending.value"
        :placeholder="t('permissions.users.selectPlaceholder')"
        :search-input="{ placeholder: t('permissions.users.search') }"
        icon="i-lucide-user-search"
        class="w-full sm:w-96"
      />
    </UFormField>

    <div
      v-if="selectedProfileId == null"
      class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center"
    >
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UIcon
          name="i-lucide-shield-user"
          class="h-6 w-6"
        />
      </div>
      <p class="max-w-sm text-sm text-muted-foreground">
        {{ t('permissions.users.empty') }}
      </p>
    </div>

    <PermissionsProfileEditor
      v-else
      :key="selectedProfileId"
      v-model:dirty="dirty"
      :profile-id="selectedProfileId"
      :name="selectedName"
    />

    <UModal
      v-model:open="confirmSwitchOpen"
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
          @click="confirmSwitch"
        />
      </template>
    </UModal>
  </div>
</template>
