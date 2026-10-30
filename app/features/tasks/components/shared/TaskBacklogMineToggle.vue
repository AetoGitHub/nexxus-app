<script setup lang="ts">
import { useBacklogMine } from '~/features/tasks/composables/shared/useBacklogMine'

/** Interruptor «Asignadas a mí» del backlog (Lista y Kanban comparten el mismo estado). */
const { t } = useI18n()
const { mine } = useBacklogMine()
</script>

<template>
  <UButton
    :icon="mine ? 'i-lucide-user-check' : 'i-lucide-user'"
    :label="t('tasks.backlogMine')"
    size="xs"
    :color="mine ? 'primary' : 'neutral'"
    :variant="mine ? 'soft' : 'outline'"
    :aria-pressed="mine"
    @click.stop="mine = !mine"
  />
</template>
