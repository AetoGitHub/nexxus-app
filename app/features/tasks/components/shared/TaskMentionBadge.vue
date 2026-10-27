<script setup lang="ts">
import type { TaskMention } from '~/features/tasks/types/task.types'
import { useTaskMentions } from '~/features/tasks/composables/shared/useTaskMentions'
import { personInitials } from '~/features/tasks/utils/task-initials.util'

/**
 * Indicador «@» de una tarea con menciones: gris con el número de mencionados, o ámbar «Te mencionaron» si el usuario
 * logueado es uno de ellos (no depende solo del color: lleva texto, ícono «@» y aria-label). El tooltip es una tarjeta con
 * los mencionados (avatar y nombre), el usuario logueado primero y marcado como «Tú».
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
const { count, mentionsMe, names, people } = useTaskMentions(() => props.mentions)

const ariaLabel = computed(() =>
  mentionsMe.value
    ? t('tasks.mentions.meAria')
    : t('tasks.mentions.countAria', { count: count.value, names: names.value.join(', ') }),
)
</script>

<template>
  <UTooltip
    v-if="count > 0"
    :content="{ side: 'top', sideOffset: 8 }"
    :ui="{ content: 'h-auto max-w-none overflow-hidden z-50 rounded-xl bg-elevated p-0 text-default shadow-xl ring-1 ring-default' }"
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
      <div class="w-56 max-w-[calc(100vw-2rem)]">
        <div class="flex items-center gap-2 border-b border-border px-3 py-2">
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
            :class="mentionsMe ? 'task-mention-badge--me' : 'bg-muted text-muted-foreground'"
            aria-hidden="true"
          >@</span>
          <span class="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
            {{ t('tasks.mentions.tooltipHeader') }}
          </span>
          <span class="shrink-0 rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums leading-4 text-muted-foreground">
            {{ count }}
          </span>
        </div>

        <ul class="max-h-56 space-y-0.5 overflow-y-auto p-1.5">
          <li
            v-for="person in people"
            :key="person.id"
            class="flex items-center gap-2 rounded-lg px-1.5 py-1"
            :class="person.isMe ? 'bg-[color-mix(in_oklab,var(--mention-me-fill)_16%,transparent)]' : ''"
          >
            <UserAvatar
              :user-id="person.id"
              :initials="personInitials(person.name)"
              :name="person.name"
              :size="24"
              :font-size="10"
              fallback-color="#28ceab"
            />
            <span class="min-w-0 flex-1 truncate text-xs text-foreground">{{ person.name }}</span>
            <span
              v-if="person.isMe"
              class="task-mention-badge--me shrink-0 rounded-md px-1.5 text-[10px] font-bold leading-4"
            >{{ t('tasks.mentions.you') }}</span>
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
