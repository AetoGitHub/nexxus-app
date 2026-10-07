<script setup lang="ts">
import type { TaskAssignee } from '~/features/tasks/types/task.types'

withDefaults(
  defineProps<{
    assignees: TaskAssignee[]
    size?: number
    max?: number
  }>(),
  {
    size: 24,
    max: 3,
  },
)
</script>

<template>
  <div
    v-if="assignees.length"
    class="flex items-center shrink-0"
    :class="assignees.length > 1 ? '-space-x-1.5' : ''"
  >
    <UserAvatar
      v-for="assignee in assignees.slice(0, max)"
      :key="assignee.id"
      :title="assignee.username"
      class="ring-2 ring-card"
      :user-id="assignee.id"
      :initials="taskAssigneeInitial(assignee.username)"
      :size="size"
      :font-size="Math.max(9, Math.round(size * 0.42))"
      :fallback-color="taskAssigneeColor(assignee)"
    />
    <span
      v-if="assignees.length > max"
      class="inline-flex items-center justify-center rounded-full font-semibold text-muted-foreground bg-muted select-none ring-2 ring-card"
      :style="{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${Math.max(9, Math.round(size * 0.38))}px`,
        lineHeight: 1,
      }"
      :title="assignees.slice(max).map(a => a.username).join(', ')"
    >
      +{{ assignees.length - max }}
    </span>
  </div>
</template>
