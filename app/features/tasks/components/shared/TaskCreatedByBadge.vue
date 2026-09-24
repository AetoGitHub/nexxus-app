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
      class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white select-none ring-2 ring-card"
      :style="{ backgroundColor: color }"
      :aria-label="`${t('tasks.form.createdByLabel')}: ${fullName}`"
    >
      {{ initials }}
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
