<script setup lang="ts">
import type { PermissionBlocks } from '~/shared/types/auth.types'
import type { PermissionPreset } from '~/features/permissions/types/permissions.types'
import PermissionsMatrix from '~/features/permissions/components/PermissionsMatrix.vue'
import { useSavePermissionPreset } from '~/features/permissions/composables/usePermissionsAdmin'
import { denyAllBlocks, diffBlocks, pickBlocks } from '~/features/permissions/utils/permission-fields.util'

/** Crear o editar una plantilla: nombre + matriz. Al editar solo se mandan los cambios. */
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  /** null = plantilla nueva. */
  preset: PermissionPreset | null
}>()

const { t } = useI18n()
const saveMutation = useSavePermissionPreset()

const name = ref('')
const draft = ref<PermissionBlocks>(denyAllBlocks())

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }
  name.value = props.preset?.name ?? ''
  draft.value = props.preset ? pickBlocks(props.preset) : denyAllBlocks()
})

const isEditing = computed(() => props.preset != null)
const trimmedName = computed(() => name.value.trim())
const blocksPatch = computed(() => (props.preset ? diffBlocks(props.preset, draft.value) : null))
const nameChanged = computed(() => !props.preset || trimmedName.value !== props.preset.name)
const canSave = computed(() =>
  trimmedName.value.length > 0
  && (!isEditing.value || nameChanged.value || blocksPatch.value != null),
)

async function save() {
  if (!canSave.value) {
    return
  }
  const body = props.preset
    ? { ...(nameChanged.value ? { name: trimmedName.value } : {}), ...(blocksPatch.value ?? {}) }
    : { name: trimmedName.value, ...draft.value }
  try {
    await saveMutation.mutateAsync({ id: props.preset?.id, body: body as Partial<PermissionBlocks> & { name?: string } })
    open.value = false
  }
  catch {
    // El toast (p. ej. nombre repetido, 400) lo muestra la mutación; el modal sigue abierto para corregir.
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEditing ? t('permissions.presets.editTitle') : t('permissions.presets.createTitle')"
    :description="isEditing ? t('permissions.presets.editDescription') : t('permissions.presets.createDescription')"
    :ui="{ content: 'sm:max-w-4xl', footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField
          :label="t('permissions.presets.name')"
          required
        >
          <UInput
            v-model="name"
            :placeholder="t('permissions.presets.namePlaceholder')"
            :disabled="saveMutation.isPending.value"
            autofocus
            class="w-full"
            @keydown.enter.prevent="save"
          />
        </UFormField>

        <UAlert
          v-if="isEditing"
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          :description="t('permissions.presets.editWarning')"
        />

        <PermissionsMatrix
          v-model="draft"
          :disabled="saveMutation.isPending.value"
        />
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        :label="t('permissions.actions.cancel')"
        color="neutral"
        variant="outline"
        :disabled="saveMutation.isPending.value"
        @click="close()"
      />
      <UButton
        :label="isEditing ? t('permissions.actions.save') : t('permissions.presets.create')"
        icon="i-lucide-check"
        :loading="saveMutation.isPending.value"
        :disabled="!canSave || saveMutation.isPending.value"
        @click="save"
      />
    </template>
  </UModal>
</template>
