<script setup lang="ts">
import { useTaskTokenGivers } from '~/features/tasks/composables/shared/useTaskTokenGivers'
import { formatRelativeTime } from '~/shared/utils/date'

/** Contenido del popover del detalle: quién dio tokens, agrupado por persona. */
const props = defineProps<{ taskId: number, open: boolean }>()

const { t, locale } = useI18n()

const {
  groups,
  isPending,
  isError,
  error,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
} = useTaskTokenGivers(() => props.taskId, () => props.open)

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
  <div class="w-72 max-w-[calc(100vw-2rem)] p-2">
    <p class="px-2 pb-1.5 text-xs font-medium text-muted-foreground">
      {{ t('tasks.tokens.giversTitle') }}
    </p>

    <div
      v-if="isPending"
      class="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="h-4 w-4 animate-spin"
      />
      {{ t('tasks.tokens.loading') }}
    </div>

    <p
      v-else-if="isError"
      class="px-2 py-4 text-xs text-error"
    >
      {{ parseFetchError(error) }}
    </p>

    <p
      v-else-if="!groups.length"
      class="px-2 py-4 text-center text-xs text-muted-foreground"
    >
      {{ t('tasks.tokens.empty') }}
    </p>

    <template v-else>
      <ul class="max-h-64 space-y-0.5 overflow-y-auto">
        <li
          v-for="group in groups"
          :key="group.id"
          class="flex items-center gap-2.5 rounded-md px-2 py-1.5"
        >
          <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aeto-teal/15 text-[11px] font-semibold text-aeto-teal">
            {{ initialsOf(group.name) }}
          </span>
          <span class="min-w-0 flex-1 truncate text-sm text-foreground">
            {{ group.name }}
            <span
              v-if="group.count > 1"
              class="font-medium tabular-nums text-muted-foreground"
            >×{{ group.count }}</span>
          </span>
          <span class="shrink-0 text-[11px] text-muted-foreground">
            {{ formatRelativeTime(group.latestAt, locale) }}
          </span>
        </li>
      </ul>

      <UButton
        v-if="hasNextPage"
        class="mt-1 w-full justify-center"
        color="neutral"
        variant="ghost"
        size="xs"
        :label="t('tasks.tokens.loadMore')"
        :loading="isFetchingNextPage"
        @click="fetchNextPage()"
      />
    </template>
  </div>
</template>
