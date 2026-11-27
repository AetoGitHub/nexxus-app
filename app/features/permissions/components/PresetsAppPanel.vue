<script setup lang="ts">
import type { PresetApp, PresetAppModule } from '~/features/permissions/types/permissions.types'
import { PRESET_APP_MODULES } from '~/features/permissions/types/permissions.types'
import PresetAppModal from '~/features/permissions/components/PresetAppModal.vue'
import PresetAppApplyModal from '~/features/permissions/components/PresetAppApplyModal.vue'
import { fetchErrorStatus, useDeletePresetApp, usePresetsApp } from '~/features/permissions/composables/usePresetsApp'
import { usePresetAppCompanies, usePresetAppProfiles } from '~/features/permissions/composables/usePresetAppOptions'
import { PERMISSION_MODULES } from '~/features/permissions/utils/permission-fields.util'

/**
 * Presets App: plantillas de permisos de Tareas y Configuración por compañía. Listar (filtros por compañía y dueño),
 * crear, editar, aplicar a un usuario y borrar. Superuser o `settings.allow` + `settings.can_presets`.
 */
withDefaults(defineProps<{
  /** Encabezado propio (en Configuración de Tareas); en el panel de Permisos ya lo pone la pestaña. */
  showHeader?: boolean
}>(), { showHeader: true })

const { t } = useI18n()
const { refreshAllPermissions } = usePermissions()

const companyFilter = ref<number | null>(null)
const ownerFilter = ref<number | null>(null)
const filters = computed(() => ({ company: companyFilter.value, profile: ownerFilter.value }))
const hasFilters = computed(() => companyFilter.value != null || ownerFilter.value != null)

const presetsQuery = usePresetsApp(filters)
const presets = computed(() => presetsQuery.data.value ?? [])
const forbidden = computed(() => fetchErrorStatus(presetsQuery.error.value) === 403)

// Sin permiso (403): se refrescan los permisos para que la sección desaparezca del menú.
watch(forbidden, (isForbidden) => {
  if (isForbidden) {
    void refreshAllPermissions()
  }
})

const { items: companyOptions } = usePresetAppCompanies()
const { allOptions: ownerOptions } = usePresetAppProfiles()

const ALL = -1
const companyFilterItems = computed(() => [{ value: ALL, label: t('permissions.presetsApp.allCompanies') }, ...companyOptions.value])
const ownerFilterItems = computed(() => [{ value: ALL, label: t('permissions.presetsApp.allOwners') }, ...ownerOptions.value])
const companyFilterModel = computed({
  get: () => companyFilter.value ?? ALL,
  set: (value: number) => { companyFilter.value = value === ALL ? null : value },
})
const ownerFilterModel = computed({
  get: () => ownerFilter.value ?? ALL,
  set: (value: number) => { ownerFilter.value = value === ALL ? null : value },
})

function clearFilters() {
  companyFilter.value = null
  ownerFilter.value = null
}

// Crear / editar
const formOpen = ref(false)
const editing = ref<PresetApp | null>(null)
function openCreate() {
  editing.value = null
  formOpen.value = true
}
function openEdit(preset: PresetApp) {
  editing.value = preset
  formOpen.value = true
}

// Aplicar
const applyOpen = ref(false)
const applying = ref<PresetApp | null>(null)
function openApply(preset: PresetApp) {
  applying.value = preset
  applyOpen.value = true
}

// Borrar (con confirmación)
const deleteMutation = useDeletePresetApp()
const deleteTarget = ref<PresetApp | null>(null)
const confirmDeleteOpen = computed({
  get: () => deleteTarget.value != null,
  set: (value: boolean) => {
    if (!value) {
      deleteTarget.value = null
    }
  },
})
async function confirmDelete() {
  if (!deleteTarget.value) {
    return
  }
  try {
    await deleteMutation.mutateAsync(deleteTarget.value.id)
    deleteTarget.value = null
  }
  catch {
    // El toast de error lo muestra la mutación.
  }
}

/** Resumen por módulo: sin acceso, completo o «n de m». */
function moduleSummary(preset: PresetApp, module: PresetAppModule) {
  const block = (preset[module] ?? {}) as unknown as Record<string, boolean>
  const def = PERMISSION_MODULES.find(item => item.id === module)!
  if (!block.allow) {
    return { tone: 'off' as const, label: t('permissions.presets.off') }
  }
  const enabled = def.fields.filter(field => block[field.key]).length
  if (enabled === def.fields.length) {
    return { tone: 'full' as const, label: t('permissions.presets.full') }
  }
  return { tone: 'partial' as const, label: t('permissions.presets.partial', { count: enabled, total: def.fields.length }) }
}

const TONE_CLASSES = {
  off: 'bg-muted text-muted-foreground',
  full: 'bg-success/10 text-success',
  partial: 'bg-warning/10 text-warning',
} as const

const MODULE_ICONS = Object.fromEntries(PERMISSION_MODULES.map(module => [module.id, module.icon])) as Record<string, string>
</script>

<template>
  <div class="space-y-5">
    <div
      v-if="showHeader || !forbidden"
      class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
    >
      <div
        v-if="showHeader"
        class="min-w-0"
      >
        <h2 class="text-xl font-bold text-foreground">
          {{ t('permissions.presetsApp.title') }}
        </h2>
        <p class="text-sm text-muted-foreground mt-1">
          {{ t('permissions.presetsApp.subtitle') }}
        </p>
      </div>
      <p
        v-else
        class="min-w-0 flex-1 text-sm text-muted-foreground"
      >
        {{ t('permissions.presetsApp.subtitle') }}
      </p>
      <UButton
        v-if="!forbidden"
        icon="i-lucide-plus"
        :label="t('permissions.presetsApp.new')"
        class="self-start sm:shrink-0"
        @click="openCreate"
      />
    </div>

    <UAlert
      v-if="forbidden"
      color="warning"
      variant="subtle"
      icon="i-lucide-lock"
      :title="t('permissions.presetsApp.forbidden')"
    />

    <template v-else>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <USelectMenu
          v-model="companyFilterModel"
          :items="companyFilterItems"
          value-key="value"
          icon="i-lucide-briefcase"
          size="sm"
          class="w-full sm:w-56"
          :aria-label="t('permissions.presets.company')"
        />
        <USelectMenu
          v-model="ownerFilterModel"
          :items="ownerFilterItems"
          value-key="value"
          icon="i-lucide-user"
          size="sm"
          class="w-full sm:w-56"
          :aria-label="t('permissions.presetsApp.owner')"
        />
        <UButton
          v-if="hasFilters"
          :label="t('permissions.presetsApp.clearFilters')"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          class="self-start sm:self-auto"
          @click="clearFilters"
        />
      </div>

      <div
        v-if="presetsQuery.isPending.value"
        class="space-y-2"
      >
        <USkeleton
          v-for="n in 3"
          :key="n"
          class="h-12 rounded-lg"
        />
      </div>

      <UAlert
        v-else-if="presetsQuery.isError.value"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="t('permissions.presetsApp.loadError')"
        :description="parseFetchError(presetsQuery.error.value)"
      />

      <div
        v-else-if="!presets.length"
        class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UIcon
            name="i-lucide-layout-template"
            class="h-6 w-6"
          />
        </div>
        <p class="max-w-sm text-sm text-muted-foreground">
          {{ hasFilters ? t('permissions.presetsApp.emptyFiltered') : t('permissions.presetsApp.empty') }}
        </p>
        <UButton
          v-if="!hasFilters"
          icon="i-lucide-plus"
          :label="t('permissions.presetsApp.new')"
          variant="outline"
          @click="openCreate"
        />
      </div>

      <div
        v-else
        class="overflow-x-auto rounded-xl border border-border"
      >
        <table class="w-full min-w-[640px] text-sm">
          <thead class="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th class="px-4 py-2.5 font-medium">
                {{ t('permissions.presets.name') }}
              </th>
              <th class="px-4 py-2.5 font-medium">
                {{ t('permissions.presets.company') }}
              </th>
              <th class="px-4 py-2.5 font-medium">
                {{ t('permissions.presetsApp.owner') }}
              </th>
              <th class="px-4 py-2.5 font-medium">
                {{ t('permissions.presetsApp.permissions') }}
              </th>
              <th class="px-4 py-2.5 text-right font-medium">
                <span class="sr-only">{{ t('permissions.presetsApp.actions') }}</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="preset in presets"
              :key="preset.id"
              class="transition-colors hover:bg-muted/30"
            >
              <td class="px-4 py-2.5 font-medium">
                {{ preset.name }}
              </td>
              <td class="px-4 py-2.5 text-muted-foreground">
                {{ preset.company_name }}
              </td>
              <td class="px-4 py-2.5 text-muted-foreground">
                {{ preset.profile_name }}
              </td>
              <td class="px-4 py-2.5">
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="module in PRESET_APP_MODULES"
                    :key="module"
                    class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium"
                    :class="TONE_CLASSES[moduleSummary(preset, module).tone]"
                  >
                    <UIcon
                      :name="MODULE_ICONS[module]!"
                      class="h-3 w-3"
                    />
                    {{ t(`permissions.modules.${module}`) }}: {{ moduleSummary(preset, module).label }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-2.5">
                <div class="flex justify-end">
                  <UTooltip :text="t('permissions.presetsApp.apply')">
                    <UButton
                      icon="i-lucide-user-check"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      square
                      :aria-label="t('permissions.presetsApp.apply')"
                      @click="openApply(preset)"
                    />
                  </UTooltip>
                  <UTooltip :text="t('permissions.actions.edit')">
                    <UButton
                      icon="i-lucide-pencil"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      square
                      :aria-label="t('permissions.actions.edit')"
                      @click="openEdit(preset)"
                    />
                  </UTooltip>
                  <UTooltip :text="t('permissions.actions.delete')">
                    <UButton
                      icon="i-lucide-trash-2"
                      color="error"
                      variant="ghost"
                      size="sm"
                      square
                      :aria-label="t('permissions.actions.delete')"
                      @click="deleteTarget = preset"
                    />
                  </UTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <PresetAppModal
      v-model:open="formOpen"
      :preset-app="editing"
    />

    <PresetAppApplyModal
      v-model:open="applyOpen"
      :preset-app="applying"
    />

    <UModal
      v-model:open="confirmDeleteOpen"
      :title="t('permissions.presets.deleteTitle', { name: deleteTarget?.name ?? '' })"
      :description="t('permissions.presetsApp.deleteDescription')"
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer="{ close }">
        <UButton
          :label="t('permissions.actions.cancel')"
          color="neutral"
          variant="outline"
          :disabled="deleteMutation.isPending.value"
          @click="close()"
        />
        <UButton
          :label="t('permissions.actions.delete')"
          color="error"
          icon="i-lucide-trash-2"
          :loading="deleteMutation.isPending.value"
          @click="confirmDelete"
        />
      </template>
    </UModal>
  </div>
</template>
