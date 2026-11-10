<script setup lang="ts" generic="M extends PermissionModule">
import type { PermissionActions, PermissionModule } from '~/shared/types/auth.types'

/**
 * Muestra su contenido solo si el usuario tiene el permiso:
 *   <AppCan module="task" action="create"> … </AppCan>
 * Con `#denied` se puede mostrar algo alterno.
 */
const props = defineProps<{
  module: M
  action: PermissionActions[M]
}>()

const { can } = usePermissions()
const allowed = computed(() => can(props.module, props.action))
</script>

<template>
  <slot v-if="allowed" />
  <slot
    v-else
    name="denied"
  />
</template>
