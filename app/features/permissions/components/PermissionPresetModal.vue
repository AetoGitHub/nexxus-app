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

/**
 * Al editar, si cambió alguna bandera se pregunta si aplicar el cambio también a los usuarios que tienen la plantilla
 * (`propagate`): solo se les agregan o quitan las banderas modificadas, sus demás permisos se conservan. Si solo cambió
 * el nombre o la compañía no se pregunta (propagate=false). Crear no afecta a nadie hasta que se aplique.
 */
const propagateOpen = ref(false)

function requestSave() {
  if (!canSave.value) {
    return
  }
  if (isEditing.value && blocksPatch.value != null) {
    propagateOpen.value = true
    return
  }
  void save(false)
}

async function saveWith(propagate: boolean) {
  await save(propagate)
  propagateOpen.value = false
}

async function save(propagate: boolean) {
  if (!canSave.value) {
    return
  }
  // Al editar se manda solo el diff de banderas (una bandera con el mismo valor la ignoraría el backend).
  const body = props.preset
    ? {
        ...(nameChanged.value ? { name: trimmedName.value } : {}),
        ...(companyChanged.value ? { company: companyPayload.value } : {}),
        ...(blocksPatch.value ?? {}),
        propagate,
      }
    : { name: trimmedName.value, company: companyPayload.value, ...draft.value }
  try {
    await saveMutation.mutateAsync({
      id: props.preset?.id,
      body: body as Partial<PermissionBlocks> & { name?: string, company?: number | null, propagate?: boolean },
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
              @keydown.enter.prevent="requestSave"
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
        @click="requestSave"
      />
    </template>
  </UModal>

  <!-- Cambiaron banderas: ¿solo la plantilla, o también a sus usuarios (solo lo modificado)? -->
  <UModal
    v-model:open="propagateOpen"
    :title="t('permissions.presets.propagateTitle')"
    :description="t('permissions.presets.propagateDescription')"
    :ui="{ footer: 'justify-end flex-wrap' }"
  >
    <template #footer="{ close }">
      <UButton
        :label="t('permissions.actions.cancel')"
        color="neutral"
        variant="ghost"
        :disabled="saveMutation.isPending.value"
        @click="close()"
      />
      <UButton
        :label="t('permissions.presets.onlyTemplate')"
        color="neutral"
        variant="outline"
        icon="i-lucide-layout-template"
        :disabled="saveMutation.isPending.value"
        @click="saveWith(false)"
      />
      <UButton
        :label="t('permissions.presets.templateAndUsers')"
        color="primary"
        icon="i-lucide-users"
        :loading="saveMutation.isPending.value"
        :disabled="saveMutation.isPending.value"
        @click="saveWith(true)"
      />
    </template>
  </UModal>
</template>
