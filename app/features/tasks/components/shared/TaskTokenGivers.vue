<script setup lang="ts">
import type { TaskTokenByUser } from '~/features/tasks/types/task.types'
import { personInitials } from '~/features/tasks/utils/task-initials.util'
import { tokenGiverName } from '~/features/tasks/utils/task-token.util'

/** Quién dio tokens a la tarea y cuántos (viene en `tokens_by_user` del detalle). */
defineProps<{ givers: TaskTokenByUser[] }>()

const { t } = useI18n()
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
        <UserAvatar
          :user-id="giver.id"
          :initials="personInitials(tokenGiverName(giver, t('tasks.tokens.unknownUser')))"
          :size="28"
          :font-size="11"
          fallback-color="#28ceab"
        />
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
