<script setup lang="ts">
import PermissionsProfileEditor from '~/features/permissions/components/PermissionsProfileEditor.vue'
import { usePermissionProfiles } from '~/features/permissions/composables/usePermissionsAdmin'
import { profileFullName } from '~/features/auth/utils/profile-appearance.util'

/**
 * Permisos por usuario: la lista sale de la organización elegida en el selector de afuera (el mismo de Organización,
 * Compañía y Usuarios); sin organización se muestra el aviso para elegirla. Se edita con el mismo editor del diálogo de
 * la tabla de usuarios.
 */
const props = defineProps<{
  organizationId: number | null
}>()

const { t } = useI18n()

const profilesQuery = usePermissionProfiles(() => props.organizationId)
const profileItems = computed(() =>
  (profilesQuery.data.value ?? []).map((profile) => {
    const label = profileFullName(profile)
    return {
      value: profile.id,
      label,
      // El username solo como apoyo cuando el nombre es distinto (si no, se repetiría).
      description: profile.username !== label ? profile.username : undefined,
    }
  }),
)

const selectedProfileId = ref<number | null>(null)

// Otra organización: el usuario elegido ya no está en la lista.
watch(() => props.organizationId, () => {
  selectedProfileId.value = null
})
const selectedName = computed(() => profileItems.value.find(item => item.value === selectedProfileId.value)?.label ?? '')
/** Su compañía seleccionada: el editor la preselecciona entre sus membresías. */
const selectedProfileCompanyId = computed(() =>
  profilesQuery.data.value?.find(profile => profile.id === selectedProfileId.value)?.selected_company ?? null,
)
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
  <!-- Sin organización: aviso para elegirla en el selector de arriba. -->
  <UAlert
    v-if="organizationId == null"
    color="warning"
    variant="subtle"
    icon="i-lucide-building-2"
    :title="t('permissions.users.noOrganizationTitle')"
    :description="t('permissions.users.noOrganizationDescription')"
  />

  <div
    v-else
    class="space-y-4"
  >
    <UFormField
      :label="t('permissions.users.select')"
      class="rounded-xl border border-border bg-card p-4"
    >
      <USelectMenu
        v-model="profileModel"
        :items="profileItems"
        value-key="value"
        :loading="profilesQuery.isFetching.value"
        :placeholder="profilesQuery.isSuccess.value && !profileItems.length
          ? t('permissions.users.noUsers')
          : t('permissions.users.selectPlaceholder')"
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
      :preferred-company-id="selectedProfileCompanyId"
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
