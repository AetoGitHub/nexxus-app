<script setup lang="ts">
import type { TaskTokenByUser } from '~/features/tasks/types/task.types'
import { tokenGiverName } from '~/features/tasks/utils/task-token.util'

/** Quién dio tokens a la tarea y cuántos (viene en `tokens_by_user` del detalle). */
defineProps<{ givers: TaskTokenByUser[] }>()

const { t } = useI18n()

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
}
</script>

<template>
  <div class="w-64 max-w-[calc(100vw-2rem)] p-2">
    <p class="px-2 pb-1.5 text-xs font-medium text-muted-foreground">
      {{ t('tasks.tokens.giversTitle') }}
    </p>

    <ul class="max-h-64 space-y-0.5 overflow-y-auto">
      <li
        v-for="giver in givers"
        :key="giver.id ?? giver.username ?? 'unknown'"
        class="flex items-center gap-2.5 rounded-md px-2 py-1.5"
      >
        <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aeto-teal/15 text-[11px] font-semibold text-aeto-teal">
          {{ initialsOf(tokenGiverName(giver, t('tasks.tokens.unknownUser'))) }}
        </span>
        <span class="min-w-0 flex-1 truncate text-sm text-foreground">
          {{ tokenGiverName(giver, t('tasks.tokens.unknownUser')) }}
        </span>
        <span
          class="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground"
          :aria-label="t('tasks.tokens.givenCount', { n: giver.tokens }, giver.tokens)"
        >×{{ giver.tokens }}</span>
      </li>
    </ul>
  </div>
</template>
