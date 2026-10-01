<script setup lang="ts">
import TaskTokenGivers from '~/features/tasks/components/shared/TaskTokenGivers.vue'
import { useTaskTokens } from '~/features/tasks/composables/shared/useTaskTokens'
import { useTaskTokenState } from '~/features/tasks/composables/shared/useTaskTokenState'
import type { TaskTokenByUser } from '~/features/tasks/types/task.types'
import { bumpTokensByUser } from '~/features/tasks/utils/task-token.util'

/**
 * Botón de token (manita) de una tarea: cada clic da un token y el número sube al instante.
 * Con `givers` (detalle) el tooltip lista quién dio tokens y cuántos cada quien.
 */
const props = withDefaults(
  defineProps<{
    taskId: number
    /** `tokens_count` que trae la tarea (lista, kanban o detalle). */
    count?: number
    /** `tokens_by_user` del detalle; sin él (listas) solo se muestra el número. */
    givers?: TaskTokenByUser[]
  }>(),
  {
    count: 0,
    givers: undefined,
  },
)

const { t } = useI18n()
const { user } = useAuth()
const { displayCount, giveToken } = useTaskTokens()
const { states } = useTaskTokenState()

const total = computed(() => displayCount(props.taskId, props.count))

/** Con `givers` el botón es el del detalle: número aparte y lista al pasar el cursor. */
const showGivers = computed(() => props.givers !== undefined)

/** Lista del tooltip: lo que manda el detalle más mis clics que aún van en vuelo. */
const giverRows = computed(() => {
  const rows = props.givers ?? []
  const pending = states.value[props.taskId]?.pending ?? 0
  const me = user.value
  return pending > 0 && me ? bumpTokensByUser(rows, me, pending) : rows
})

/** Cada clic reinicia la animación de "pop" (se remonta el icono). */
const popKey = ref(0)

function onGive() {
  popKey.value += 1
  void giveToken(props.taskId)
}

/** Sin cursor (táctil) no hay hover: el número abre la lista con un tap. */
const canHover = useMediaQuery('(hover: hover)')
const giversOpen = ref(false)
</script>

<template>
  <span class="inline-flex shrink-0 items-center gap-0.5">
    <UTooltip
      :disabled="showGivers && !canHover"
      :text="showGivers ? undefined : t('tasks.tokens.give')"
      :ui="{ content: showGivers ? 'h-auto max-w-none px-0 py-0' : '' }"
    >
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition-colors hover:bg-muted hover:text-aeto-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        :class="total > 0 ? 'text-foreground' : 'text-muted-foreground'"
        :aria-label="t('tasks.tokens.ariaLabel', { n: total }, total)"
        @click.stop="onGive"
        @dblclick.stop
        @keydown.enter.stop
        @keydown.space.stop
      >
        <UIcon
          :key="popKey"
          name="i-lucide-pointer"
          class="token-icon h-3.5 w-3.5 rotate-90"
          :class="{ 'token-pop': popKey > 0 }"
        />
        <span
          v-if="total > 0 && (!showGivers || canHover)"
          class="tabular-nums font-medium"
        >{{ total }}</span>
      </button>

      <template
        v-if="showGivers"
        #content
      >
        <div class="flex flex-col">
          <div class="px-2.5 pt-2 text-xs font-medium text-foreground">
            {{ t('tasks.tokens.give') }}
          </div>
          <TaskTokenGivers
            v-if="giverRows.length"
            :givers="giverRows"
          />
          <p
            v-else
            class="px-2.5 pb-2 pt-1 text-xs text-muted-foreground"
          >
            {{ t('tasks.tokens.empty') }}
          </p>
        </div>
      </template>
    </UTooltip>

    <UPopover
      v-if="showGivers && !canHover && total > 0"
      v-model:open="giversOpen"
      :content="{ side: 'bottom', align: 'end' }"
    >
      <button
        type="button"
        class="rounded-md px-1 py-0.5 text-xs font-medium tabular-nums text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        :aria-label="t('tasks.tokens.viewGivers')"
        @click.stop
      >
        {{ total }}
      </button>

      <template #content>
        <TaskTokenGivers
          v-if="giverRows.length"
          :givers="giverRows"
        />
        <p
          v-else
          class="p-3 text-xs text-muted-foreground"
        >
          {{ t('tasks.tokens.empty') }}
        </p>
      </template>
    </UPopover>
  </span>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .token-pop {
    animation: token-pop 200ms ease-out;
  }
}

@keyframes token-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.4) rotate(-8deg); }
  100% { transform: scale(1); }
}
</style>
