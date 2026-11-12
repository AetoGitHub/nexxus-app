<script setup lang="ts">
import type { PermissionBlocks } from '~/shared/types/auth.types'
import type { PermissionPreset } from '~/features/permissions/types/permissions.types'
import PermissionsMatrix from '~/features/permissions/components/PermissionsMatrix.vue'
import { useSavePermissionPreset } from '~/features/permissions/composables/usePermissionsAdmin'
import { denyAllBlocks, diffBlocks, pickBlocks } from '~/features/permissions/utils/permission-fields.util'
import { useCompaniesDropdown } from '~/features/companies/composables/useCompaniesDropdown'

/**
 * Crear o editar una plantilla: nombre, compañía (General = todas, o una sola) y matriz. Al editar solo se mandan los
 * cambios.
 */
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  /** null = plantilla nueva. */
  preset: PermissionPreset | null
}>()

const { t } = useI18n()
const saveMutation = useSavePermissionPreset()

const name = ref('')
const draft = ref<PermissionBlocks>(denyAllBlocks())

/** 0 = General (todas las compañías) → se manda `company: null`. */
const GENERAL = 0
const companyValue = ref<number>(GENERAL)
const { organization } = useAuth()
const { items: companyOptions, isPending: companiesPending } = useCompaniesDropdown({
  organizationId: () => organization.value?.id,
})
const companyItems = computed(() => {
  const items = [{ value: GENERAL, label: t('permissions.presets.general') }, ...companyOptions.value]
  // La compañía de la plantilla aunque el listado aún no la traiga (si no, el select mostraría el id).
  const current = props.preset
  if (current?.company != null && !items.some(item => item.value === current.company)) {
    items.push({ value: current.company, label: current.company_name ?? `#${current.company}` })
  }
  return items
})
const companyPayload = computed(() => (companyValue.value === GENERAL ? null : companyValue.value))

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }
  name.value = props.preset?.name ?? ''
  draft.value = props.preset ? pickBlocks(props.preset) : denyAllBlocks()
  companyValue.value = props.preset?.company ?? GENERAL
})

const isEditing = computed(() => props.preset != null)
const trimmedName = computed(() => name.value.trim())
const blocksPatch = computed(() => (props.preset ? diffBlocks(props.preset, draft.value) : null))
const nameChanged = computed(() => !props.preset || trimmedName.value !== props.preset.name)
const companyChanged = computed(() => !props.preset || companyPayload.value !== props.preset.company)
const canSave = computed(() =>
  trimmedName.value.length > 0
  && (!isEditing.value || nameChanged.value || companyChanged.value || blocksPatch.value != null),
)

async function save() {
  if (!canSave.value) {
    return
  }
  const body = props.preset
    ? {
        ...(nameChanged.value ? { name: trimmedName.value } : {}),
        ...(companyChanged.value ? { company: companyPayload.value } : {}),
        ...(blocksPatch.value ?? {}),
      }
    : { name: trimmedName.value, company: companyPayload.value, ...draft.value }
  try {
    await saveMutation.mutateAsync({
      id: props.preset?.id,
      body: body as Partial<PermissionBlocks> & { name?: string, company?: number | null },
    })
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
        <div class="grid gap-4 sm:grid-cols-2">
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

          <UFormField
            :label="t('permissions.presets.company')"
            :help="t('permissions.presets.companyHelp')"
          >
            <USelectMenu
              v-model="companyValue"
              :items="companyItems"
              value-key="value"
              :loading="companiesPending"
              :disabled="saveMutation.isPending.value"
              icon="i-lucide-briefcase"
              class="w-full"
            />
          </UFormField>
        </div>

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
