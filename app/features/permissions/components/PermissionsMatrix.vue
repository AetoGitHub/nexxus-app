<script setup lang="ts">
import type { PermissionBlocks, PermissionCustom, PermissionModule } from '~/shared/types/auth.types'
import type { PermissionModuleDef } from '~/features/permissions/types/permissions.types'
import { PERMISSION_MODULES } from '~/features/permissions/utils/permission-fields.util'

/**
 * Matriz de permisos: una tarjeta por módulo con su switch de acceso (`allow`) y un checkbox por acción. Con el módulo
 * apagado sus checkboxes se deshabilitan (el backend apaga todo el módulo aunque estén en true).
 */
const blocks = defineModel<PermissionBlocks>({ required: true })

const props = defineProps<{
  disabled?: boolean
  /** Ajustes manuales del usuario (banderas distintas a su plantilla): se marcan con «Ajustado». */
  custom?: PermissionCustom
  /** Plantilla del usuario, para el tooltip «Distinto a la plantilla X». */
  presetName?: string | null
}>()

const { t } = useI18n()

/** ¿Esta bandera del usuario es distinta a su plantilla? */
function isCustom(module: PermissionModule, key: string): boolean {
  return props.custom?.[module]?.[key] !== undefined
}

const customTooltip = computed(() => t('permissions.users.customTooltip', { name: props.presetName ?? '' }))

function block(module: PermissionModule): Record<string, boolean> {
  return blocks.value[module] as unknown as Record<string, boolean>
}

function setField(module: PermissionModule, key: string, value: boolean) {
  blocks.value = {
    ...blocks.value,
    [module]: { ...block(module), [key]: value },
  }
}

function allSelected(module: PermissionModuleDef): boolean {
  const current = block(module.id)
  return current.allow === true && module.fields.every(field => current[field.key] === true)
}

/**
 * «Seleccionar todo» enciende el módulo y todas sus acciones (con el módulo apagado las casillas no se pueden marcar);
 * «Quitar todo» desmarca las acciones y deja el switch como esté.
 */
function toggleAll(module: PermissionModuleDef) {
  const value = !allSelected(module)
  const next: Record<string, boolean> = { ...block(module.id) }
  for (const field of module.fields) {
    next[field.key] = value
  }
  if (value) {
    next.allow = true
  }
  blocks.value = { ...blocks.value, [module.id]: next }
}

function enabledCount(module: PermissionModule): number {
  const current = block(module)
  return Object.entries(current).filter(([key, value]) => key.startsWith('can_') && value).length
}
</script>

<template>
  <div class="grid gap-3 lg:grid-cols-2">
    <section
      v-for="module in PERMISSION_MODULES"
      :key="module.id"
      class="rounded-xl border border-border bg-card transition-opacity"
      :class="{ 'opacity-70': !block(module.id).allow }"
    >
      <header class="flex items-center gap-3 border-b border-border px-4 py-3">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1"
          :class="block(module.id).allow ? 'bg-primary/10 text-primary ring-primary/25' : 'bg-muted text-muted-foreground ring-border'"
        >
          <UIcon
            :name="module.icon"
            class="h-4.5 w-4.5"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">
            {{ t(`permissions.modules.${module.id}`) }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ block(module.id).allow
              ? t('permissions.matrix.enabledCount', { count: enabledCount(module.id), total: module.fields.length })
              : t('permissions.matrix.moduleOff') }}
          </p>
        </div>
        <UButton
          :label="allSelected(module) ? t('permissions.matrix.clearAll') : t('permissions.matrix.selectAll')"
          :icon="allSelected(module) ? 'i-lucide-square-minus' : 'i-lucide-check-check'"
          :color="allSelected(module) ? 'neutral' : 'primary'"
          :variant="allSelected(module) ? 'outline' : 'soft'"
          size="sm"
          class="shrink-0"
          :disabled="disabled"
          @click="toggleAll(module)"
        />
        <UTooltip
          v-if="isCustom(module.id, 'allow')"
          :text="customTooltip"
        >
          <span class="h-2 w-2 shrink-0 rounded-full bg-warning" />
        </UTooltip>
        <UTooltip :text="t(module.allowLabelKey ?? 'permissions.matrix.allow')">
          <USwitch
            :model-value="block(module.id).allow"
            :disabled="disabled"
            :aria-label="t(module.allowLabelKey ?? 'permissions.matrix.allow')"
            @update:model-value="setField(module.id, 'allow', $event)"
          />
        </UTooltip>
      </header>

      <ul class="space-y-1 px-2 py-2">
        <li
          v-for="field in module.fields"
          :key="field.key"
        >
          <label
            class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
            :class="{ 'pointer-events-none': disabled || !block(module.id).allow }"
          >
            <UCheckbox
              :model-value="block(module.id)[field.key]"
              :disabled="disabled || !block(module.id).allow"
              @update:model-value="setField(module.id, field.key, $event === true)"
            />
            <span class="min-w-0 flex-1 text-sm">
              {{ t(field.labelKey) }}
            </span>
            <!-- Ajuste manual: distinto a la plantilla del usuario. -->
            <UTooltip
              v-if="isCustom(module.id, field.key)"
              :text="customTooltip"
            >
              <UBadge
                :label="t('permissions.users.adjusted')"
                icon="i-lucide-circle-dot"
                color="warning"
                variant="subtle"
                size="sm"
              />
            </UTooltip>
            <UBadge
              v-if="field.comingSoon"
              :label="t('permissions.matrix.comingSoon')"
              color="neutral"
              variant="subtle"
              size="sm"
            />
          </label>
        </li>
      </ul>
    </section>
  </div>
</template>
