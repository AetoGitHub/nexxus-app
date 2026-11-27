<script setup lang="ts">
import type { PresetApp } from '~/features/permissions/types/permissions.types'
import { useApplyPresetApp } from '~/features/permissions/composables/usePresetsApp'
import { usePresetAppProfiles } from '~/features/permissions/composables/usePresetAppOptions'

/**
 * Aplicar un Preset App a un usuario de su compañía (solo copia Tareas y Configuración), o quitárselo: el usuario
 * conserva sus permisos actuales y deja de estar ligado al preset.
 */
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  presetApp: PresetApp | null
}>()

const { t } = useI18n()
const applyMutation = useApplyPresetApp()
const { query: profilesQuery, membersOf } = usePresetAppProfiles()

const profileId = ref<number | undefined>(undefined)
/** Qué acción se está enviando (para el spinner del botón correcto). */
const pendingAction = ref<'apply' | 'remove' | null>(null)

const userItems = computed(() => membersOf(props.presetApp?.company))

watch(open, (isOpen) => {
  if (isOpen) {
    profileId.value = undefined
    pendingAction.value = null
  }
})

async function submit(action: 'apply' | 'remove') {
  const preset = props.presetApp
  if (!preset || profileId.value == null || applyMutation.isPending.value) {
    return
  }
  pendingAction.value = action
  try {
    await applyMutation.mutateAsync({
      profileId: profileId.value,
      companyId: preset.company,
      presetAppId: action === 'apply' ? preset.id : null,
    })
    open.value = false
  }
  catch {
    // El toast de error lo muestra la mutación.
  }
  finally {
    pendingAction.value = null
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('permissions.presetsApp.applyTitle', { name: presetApp?.name ?? '' })"
    :description="t('permissions.presetsApp.applyDescription', { company: presetApp?.company_name ?? '' })"
    :ui="{ footer: 'justify-between gap-2 flex-wrap' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField
          :label="t('permissions.presetsApp.user')"
          required
        >
          <USelectMenu
            v-model="profileId"
            :items="userItems"
            value-key="value"
            :loading="profilesQuery.isPending.value"
            :disabled="applyMutation.isPending.value"
            :placeholder="t('permissions.presetsApp.userPlaceholder')"
            :search-input="{ placeholder: t('permissions.presetsApp.searchUser') }"
            icon="i-lucide-user"
            class="w-full"
          />
        </UFormField>

        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          :description="t('permissions.presetsApp.applyInfo')"
        />
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        :label="t('permissions.presetsApp.remove')"
        icon="i-lucide-unlink"
        color="neutral"
        variant="ghost"
        :loading="pendingAction === 'remove'"
        :disabled="profileId == null || applyMutation.isPending.value"
        @click="submit('remove')"
      />
      <div class="flex gap-2">
        <UButton
          :label="t('permissions.actions.cancel')"
          color="neutral"
          variant="outline"
          :disabled="applyMutation.isPending.value"
          @click="close()"
        />
        <UButton
          :label="t('permissions.presetsApp.apply')"
          icon="i-lucide-user-check"
          :loading="pendingAction === 'apply'"
          :disabled="profileId == null || applyMutation.isPending.value"
          @click="submit('apply')"
        />
      </div>
    </template>
  </UModal>
</template>
