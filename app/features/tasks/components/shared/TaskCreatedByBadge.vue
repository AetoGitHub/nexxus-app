<script setup lang="ts">
import type { TaskCreatedBy } from '~/features/tasks/types/task.types'
import { ASSIGNEE_AVATAR_COLORS } from '~/features/tasks/utils/task-format.util'

const props = defineProps<{
  createdBy: TaskCreatedBy
}>()

const { t } = useI18n()

const fullName = computed(() => {
  const name = `${props.createdBy.first_name ?? ''} ${props.createdBy.last_name ?? ''}`.trim()
  return name || t('tasks.form.createdByUnknown')
})

const initials = computed(() => {
  const first = props.createdBy.first_name?.trim().charAt(0) ?? ''
  const last = props.createdBy.last_name?.trim().charAt(0) ?? ''
  const combined = `${first}${last}`.toUpperCase()
  return combined || '?'
})

const color = computed(() =>
  ASSIGNEE_AVATAR_COLORS[Math.abs(props.createdBy.id) % ASSIGNEE_AVATAR_COLORS.length]!,
)
</script>

<template>
  <UPopover mode="hover">
    <button
      type="button"
      class="inline-flex shrink-0 rounded-full"
      :aria-label="`${t('tasks.form.createdByLabel')}: ${fullName}`"
    >
      <UserAvatar
        class="ring-2 ring-card"
        :user-id="createdBy.id"
        :initials="initials"
        :size="24"
        :font-size="11"
        :fallback-color="color"
      />
    </button>

    <template #content>
      <div class="px-3 py-2 text-xs">
        <p class="font-medium text-muted-foreground">
          {{ t('tasks.form.createdByLabel') }}
        </p>
        <p class="text-sm text-foreground">
          {{ fullName }}
        </p>
      </div>
    </template>
  </UPopover>
</template>
