<script setup lang="ts">
import TaskTokenGivers from '~/features/tasks/components/shared/TaskTokenGivers.vue'
import { useTaskTokens } from '~/features/tasks/composables/shared/useTaskTokens'

/**
 * Botón de token (manita) de una tarea: cada clic da un token y el número sube al instante.
 * Con `showGivers` (detalle) el número abre un popover con quién dio los tokens.
 */
const props = withDefaults(
  defineProps<{
    taskId: number
    /** `tokens_count` que trae la tarea (lista, kanban o detalle). */
    count?: number
    showGivers?: boolean
  }>(),
  {
    count: 0,
    showGivers: false,
  },
)

const { t } = useI18n()
const { displayCount, giveToken } = useTaskTokens()

const total = computed(() => displayCount(props.taskId, props.count))

/** Cada clic reinicia la animación de "pop" (se remonta el icono). */
const popKey = ref(0)

function onGive() {
  popKey.value += 1
  void giveToken(props.taskId)
}

const canHover = useMediaQuery('(hover: hover)')
const giversOpen = ref(false)
</script>

<template>
  <span class="inline-flex shrink-0 items-center gap-0.5">
    <UTooltip :text="t('tasks.tokens.give')">
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
          name="i-lucide-thumbs-up"
          class="token-icon h-3.5 w-3.5"
          :class="{ 'token-pop': popKey > 0 }"
        />
        <span
          v-if="!showGivers && total > 0"
          class="tabular-nums font-medium"
        >{{ total }}</span>
      </button>
    </UTooltip>

    <UPopover
      v-if="showGivers && total > 0"
      v-model:open="giversOpen"
      :mode="canHover ? 'hover' : 'click'"
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
          :task-id="taskId"
          :open="giversOpen"
        />
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
