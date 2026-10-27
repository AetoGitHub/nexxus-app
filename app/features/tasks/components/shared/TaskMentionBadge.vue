<script setup lang="ts">
import type { TaskMention } from '~/features/tasks/types/task.types'
import { useTaskMentions } from '~/features/tasks/composables/shared/useTaskMentions'

/**
 * Indicador «@» de una tarea con menciones: gris con el número de mencionados, o ámbar «Te mencionaron» si el usuario
 * logueado es uno de ellos (no depende solo del color: lleva texto, ícono «@» y aria-label). El tooltip lista los nombres.
 */
const props = withDefaults(
  defineProps<{
    mentions?: TaskMention[] | null
    /** `xs` para los eventos del calendario. */
    size?: 'sm' | 'xs'
  }>(),
  {
    mentions: () => [],
    size: 'sm',
  },
)

const { t } = useI18n()
const { count, mentionsMe, names } = useTaskMentions(() => props.mentions)

const ariaLabel = computed(() =>
  mentionsMe.value
    ? t('tasks.mentions.meAria')
    : t('tasks.mentions.countAria', { count: count.value, names: names.value.join(', ') }),
)
</script>

<template>
  <UTooltip
    v-if="count > 0"
    :content="{ side: 'top' }"
  >
    <span
      class="task-mention-badge"
      :class="[
        mentionsMe ? 'task-mention-badge--me' : 'task-mention-badge--others',
        size === 'xs' ? 'task-mention-badge--xs' : '',
      ]"
      tabindex="0"
      role="note"
      :aria-label="ariaLabel"
    >
      <span aria-hidden="true">@</span>
      <span aria-hidden="true">{{ mentionsMe ? t('tasks.mentions.me') : count }}</span>
    </span>

    <template #content>
      <div class="max-w-64 space-y-1 py-0.5 text-xs">
        <p class="font-semibold">
          {{ t('tasks.mentions.tooltipTitle', { count }) }}
        </p>
        <ul class="space-y-0.5">
          <li
            v-for="(name, index) in names"
            :key="`${index}-${name}`"
            :class="mentionsMe && index === 0 ? 'font-semibold' : ''"
          >
            {{ name }}
          </li>
        </ul>
      </div>
    </template>
  </UTooltip>
</template>

<style scoped>
.task-mention-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: 0.375rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: default;
}

.task-mention-badge--xs {
  font-size: 0.6875rem;
  line-height: 0.875rem;
  padding: 0.0625rem 0.3125rem;
}

/* Hay menciones, pero no a ti: neutro. */
.task-mention-badge--others {
  background: var(--muted);
  color: var(--muted-foreground);
  box-shadow: inset 0 0 0 1px var(--border);
}

/* Te mencionaron: acento ámbar con texto oscuro (AA en claro y oscuro). */
.task-mention-badge--me {
  background: var(--mention-me-fill);
  color: var(--mention-me-foreground);
  font-weight: 700;
}

/* Sobre el color de un evento del calendario (elegido por el usuario) un ámbar liso se pierde: lleva un aro oscuro. */
.task-mention-badge--me.task-mention-badge--xs {
  box-shadow: 0 0 0 1px var(--mention-me-foreground);
}

.task-mention-badge:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 1px;
}
</style>
