<script setup lang="ts">
import type { PermissionModule } from '~/shared/types/auth.types'
import type { PermissionPreset } from '~/features/permissions/types/permissions.types'
import PermissionPresetModal from '~/features/permissions/components/PermissionPresetModal.vue'
import { useDeletePermissionPreset, usePermissionPresets } from '~/features/permissions/composables/usePermissionsAdmin'
import { PERMISSION_MODULES } from '~/features/permissions/utils/permission-fields.util'

/** Plantillas de permisos: listar, crear, editar y borrar. */
const { t } = useI18n()

const presetsQuery = usePermissionPresets()
const presets = computed(() => presetsQuery.data.value ?? [])

const modalOpen = ref(false)
const editingPreset = ref<PermissionPreset | null>(null)

function openCreate() {
  editingPreset.value = null
  modalOpen.value = true
}

function openEdit(preset: PermissionPreset) {
  editingPreset.value = preset
  modalOpen.value = true
}

const deleteMutation = useDeletePermissionPreset()
const deleteTarget = ref<PermissionPreset | null>(null)
const confirmDeleteOpen = computed({
  get: () => deleteTarget.value != null,
  set: (value: boolean) => {
    if (!value) {
      deleteTarget.value = null
    }
  },
})

function askDelete(preset: PermissionPreset) {
  deleteTarget.value = preset
}

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

/** Resumen por módulo para la tarjeta: apagado, completo o «n de m». */
function moduleSummary(preset: PermissionPreset, module: PermissionModule) {
  const block = preset[module] as unknown as Record<string, boolean>
  const def = PERMISSION_MODULES.find(item => item.id === module)!
  const enabled = def.fields.filter(field => block[field.key]).length
  if (!block.allow) {
    return { tone: 'off' as const, label: t('permissions.presets.off') }
  }
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
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <p class="min-w-0 flex-1 text-sm text-muted-foreground">
        {{ t('permissions.presets.subtitle') }}
      </p>
      <UButton
        icon="i-lucide-plus"
        :label="t('permissions.presets.new')"
        @click="openCreate"
      />
    </div>

    <div
      v-if="presetsQuery.isPending.value"
      class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      <USkeleton
        v-for="n in 3"
        :key="n"
        class="h-40 rounded-xl"
      />
    </div>

    <UAlert
      v-else-if="presetsQuery.isError.value"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="t('permissions.presets.loadError')"
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
        {{ t('permissions.presets.empty') }}
      </p>
      <UButton
        icon="i-lucide-plus"
        :label="t('permissions.presets.new')"
        variant="outline"
        @click="openCreate"
      />
    </div>

    <div
      v-else
      class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      <article
        v-for="preset in presets"
        :key="preset.id"
        class="flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30"
      >
        <div class="mb-3 flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/25">
            <UIcon
              name="i-lucide-layout-template"
              class="h-4.5 w-4.5"
            />
          </div>
          <p class="min-w-0 flex-1 truncate pt-1.5 font-semibold">
            {{ preset.name }}
          </p>
          <div class="flex shrink-0 items-center">
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
                @click="askDelete(preset)"
              />
            </UTooltip>
          </div>
        </div>

        <ul class="mt-auto space-y-1.5">
          <li
            v-for="module in PERMISSION_MODULES"
            :key="module.id"
            class="flex items-center gap-2 text-xs"
          >
            <UIcon
              :name="module.icon"
              class="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            />
            <span class="min-w-0 flex-1 truncate">{{ t(`permissions.modules.${module.id}`) }}</span>
            <span
              class="rounded-md px-1.5 py-0.5 font-medium"
              :class="TONE_CLASSES[moduleSummary(preset, module.id).tone]"
            >
              {{ moduleSummary(preset, module.id).label }}
            </span>
          </li>
        </ul>
      </article>
    </div>

    <PermissionPresetModal
      v-model:open="modalOpen"
      :preset="editingPreset"
    />

    <UModal
      v-model:open="confirmDeleteOpen"
      :title="t('permissions.presets.deleteTitle', { name: deleteTarget?.name ?? '' })"
      :description="t('permissions.presets.deleteDescription')"
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
