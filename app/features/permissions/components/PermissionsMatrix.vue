<script setup lang="ts">
import type { PermissionBlocks, PermissionModule } from '~/shared/types/auth.types'
import { PERMISSION_MODULES } from '~/features/permissions/utils/permission-fields.util'

/**
 * Matriz de permisos: una tarjeta por módulo con su switch de acceso (`allow`) y un checkbox por acción. Con el módulo
 * apagado sus checkboxes se deshabilitan (el backend apaga todo el módulo aunque estén en true).
 */
const blocks = defineModel<PermissionBlocks>({ required: true })

defineProps<{
  disabled?: boolean
}>()

const { t } = useI18n()

function block(module: PermissionModule): Record<string, boolean> {
  return blocks.value[module] as unknown as Record<string, boolean>
}

function setField(module: PermissionModule, key: string, value: boolean) {
  blocks.value = {
    ...blocks.value,
    [module]: { ...block(module), [key]: value },
  }
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
        <USwitch
          :model-value="block(module.id).allow"
          :disabled="disabled"
          :aria-label="t('permissions.matrix.allow')"
          @update:model-value="setField(module.id, 'allow', $event)"
        />
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
