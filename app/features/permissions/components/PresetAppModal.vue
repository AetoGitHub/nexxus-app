<script setup lang="ts">
import type { PermissionBlocks } from '~/shared/types/auth.types'
import type { PresetApp } from '~/features/permissions/types/permissions.types'
import { PRESET_APP_MODULES } from '~/features/permissions/types/permissions.types'
import PermissionsMatrix from '~/features/permissions/components/PermissionsMatrix.vue'
import { fieldError, useSavePresetApp } from '~/features/permissions/composables/usePresetsApp'
import type { PresetAppBody } from '~/features/permissions/composables/usePresetsApp'
import { usePresetAppCompanies } from '~/features/permissions/composables/usePresetAppOptions'
import { denyAllBlocks, diffBlocks, pickBlocks } from '~/features/permissions/utils/permission-fields.util'

/**
 * Crear o editar un Preset App: nombre, compañía y permisos de Tareas y Configuración. Al editar solo se manda lo que
 * cambió y se puede propagar a los usuarios que ya lo tienen.
 */
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  /** null = preset nuevo. */
  presetApp: PresetApp | null
}>()

const { t } = useI18n()
const { selectedCompanyId } = useAuth()
const saveMutation = useSavePresetApp()
const { items: companyOptions, isPending: companiesPending } = usePresetAppCompanies()

const name = ref('')
const company = ref<number | undefined>(undefined)
const draft = ref<PermissionBlocks>(denyAllBlocks(PRESET_APP_MODULES))
const propagate = ref(false)
/** Errores de validación (400) por campo; el resto va en toast. */
const errors = ref<{ name?: string | null, company?: string | null }>({})

const companyItems = computed(() => {
  const items = [...companyOptions.value]
  const current = props.presetApp
  // La compañía del preset aunque el listado aún no la traiga (si no, el select mostraría el id).
  if (current && !items.some(item => item.value === current.company)) {
    items.push({ value: current.company, label: current.company_name })
  }
  return items
})

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }
  const preset = props.presetApp
  name.value = preset?.name ?? ''
  draft.value = preset ? pickBlocks(preset, PRESET_APP_MODULES) : denyAllBlocks(PRESET_APP_MODULES)
  propagate.value = false
  errors.value = {}
  // Nuevo: la compañía seleccionada si está entre las permitidas.
  company.value = preset?.company
    ?? companyOptions.value.find(item => item.value === selectedCompanyId.value)?.value
    ?? (companyOptions.value.length === 1 ? companyOptions.value[0]!.value : undefined)
})

watch(name, () => {
  errors.value.name = null
})
watch(company, () => {
  errors.value.company = null
})

const isEditing = computed(() => props.presetApp != null)
const trimmedName = computed(() => name.value.trim())
const blocksPatch = computed(() =>
  props.presetApp ? diffBlocks(props.presetApp, draft.value, PRESET_APP_MODULES) : null,
)
const nameChanged = computed(() => !props.presetApp || trimmedName.value !== props.presetApp.name)
const companyChanged = computed(() => !props.presetApp || company.value !== props.presetApp.company)
const canSave = computed(() =>
  trimmedName.value.length > 0
  && company.value != null
  && (!isEditing.value || nameChanged.value || companyChanged.value || blocksPatch.value != null),
)
/** Propagar solo tiene sentido si cambió alguna bandera. */
const canPropagate = computed(() => isEditing.value && blocksPatch.value != null)

async function save() {
  if (!canSave.value || saveMutation.isPending.value) {
    return
  }
  const body: PresetAppBody = props.presetApp
    ? {
        ...(nameChanged.value ? { name: trimmedName.value } : {}),
        ...(companyChanged.value ? { company: company.value } : {}),
        ...(blocksPatch.value ?? {}),
        ...(canPropagate.value && propagate.value ? { propagate: true } : {}),
      }
    : {
        name: trimmedName.value,
        company: company.value,
        task: draft.value.task,
        settings: draft.value.settings,
      }
  try {
    await saveMutation.mutateAsync({ id: props.presetApp?.id, body })
    open.value = false
  }
  catch (error) {
    // El toast lo muestra la mutación; el mensaje del campo se pinta también junto a él.
    errors.value = { name: fieldError(error, 'name'), company: fieldError(error, 'company') }
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEditing ? t('permissions.presetsApp.editTitle') : t('permissions.presetsApp.createTitle')"
    :description="t('permissions.presetsApp.formDescription')"
    :ui="{ content: 'sm:max-w-4xl', footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            :label="t('permissions.presets.name')"
            :error="errors.name ?? undefined"
            required
          >
            <UInput
              v-model="name"
              :maxlength="80"
              :placeholder="t('permissions.presetsApp.namePlaceholder')"
              :disabled="saveMutation.isPending.value"
              autofocus
              class="w-full"
              @keydown.enter.prevent="save"
            />
          </UFormField>

          <UFormField
            :label="t('permissions.presets.company')"
            :help="t('permissions.presetsApp.companyHelp')"
            :error="errors.company ?? undefined"
            required
          >
            <USelectMenu
              v-model="company"
              :items="companyItems"
              value-key="value"
              :loading="companiesPending"
              :disabled="saveMutation.isPending.value"
              :placeholder="t('permissions.presetsApp.companyPlaceholder')"
              icon="i-lucide-briefcase"
              class="w-full"
            />
          </UFormField>
        </div>

        <div
          v-if="isEditing"
          class="rounded-xl border px-4 py-3 transition-colors"
          :class="propagate && canPropagate ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/30'"
        >
          <UCheckbox
            v-model="propagate"
            :disabled="saveMutation.isPending.value || !canPropagate"
            :label="t('permissions.presetsApp.propagateLabel')"
            :description="canPropagate
              ? t('permissions.presets.propagateDescription')
              : t('permissions.presetsApp.propagateNoChanges')"
          />
        </div>

        <PermissionsMatrix
          v-model="draft"
          :modules="PRESET_APP_MODULES"
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
        :label="isEditing ? t('permissions.actions.save') : t('permissions.presetsApp.create')"
        icon="i-lucide-check"
        :loading="saveMutation.isPending.value"
        :disabled="!canSave || saveMutation.isPending.value"
        @click="save"
      />
    </template>
  </UModal>
</template>
