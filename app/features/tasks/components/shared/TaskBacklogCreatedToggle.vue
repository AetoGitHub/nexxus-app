<script setup lang="ts">
import { useBacklogCreatedView } from '~/features/tasks/composables/shared/useBacklogCreatedView'

/**
 * Botón «Creadas por mí» de la columna Backlog del Kanban: cambia la consulta de la columna a las tareas que delegué.
 * Va en el encabezado y también en la columna colapsada (ahí el tooltip sale a la derecha).
 */
withDefaults(
  defineProps<{
    tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
  }>(),
  {
    tooltipSide: 'top',
  },
)

const { t } = useI18n()
const { created } = useBacklogCreatedView()

function toggle() {
  created.value = !created.value
}
</script>

<template>
  <UTooltip
    :text="t('tasks.backlogCreated')"
    :content="{ side: tooltipSide }"
  >
    <UButton
      icon="i-lucide-send"
      size="xs"
      square
      :color="created ? 'primary' : 'neutral'"
      :variant="created ? 'soft' : 'outline'"
      :aria-pressed="created"
      :aria-label="t('tasks.backlogCreated')"
      @click.stop="toggle"
    />
  </UTooltip>
</template>
