<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { EnterpriseProject } from '~/features/projects/types/project.types'
import { resolveThemeColor } from '~/features/projects/utils/project-color.util'

const props = defineProps<{
  project: EnterpriseProject
}>()

const emit = defineEmits<{
  edit: [project: EnterpriseProject]
}>()

const { t } = useI18n()

const color = computed(() => resolveThemeColor(props.project.color))
const memberCount = computed(() => props.project.members.length)
const isShared = computed(() => memberCount.value > 1)

const membersLabel = computed(() => {
  if (memberCount.value <= 1) {
    return t('taskSettings.projects.soloYou')
  }
  return t('taskSettings.projects.membersCount', { count: memberCount.value })
})

const tasksLabel = computed(() =>
  t('taskSettings.projects.activeTasks', { count: props.project.task_count }),
)

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: t('taskSettings.projects.edit'),
      icon: 'i-lucide-pencil',
      onSelect: () => emit('edit', props.project),
    },
  ],
])
</script>

<template>
  <div
    class="border border-border rounded-lg px-3.5 py-3 relative bg-card"
    :style="{
      borderWidth: '0.5px 0.5px 0.5px 3px',
      borderLeftStyle: 'solid',
      borderLeftColor: color,
    }"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 min-w-0">
          <span
            class="w-2.5 h-2.5 rounded-full shrink-0"
            :style="{ background: color }"
          />
          <span class="text-[13px] font-medium text-foreground truncate">
            {{ project.name }}
          </span>
          <UIcon
            :name="isShared ? 'i-lucide-users' : 'i-lucide-lock'"
            class="h-3.5 w-3.5 shrink-0"
            :class="isShared ? 'text-aeto-teal' : 'text-muted-foreground'"
          />
        </div>

        <div class="flex items-center gap-3 mt-1.5 text-[12px] text-muted-foreground flex-wrap">
          <span class="inline-flex items-center gap-1.5">
            <UIcon
              name="i-lucide-square-check"
              class="h-3 w-3 shrink-0"
            />
            {{ tasksLabel }}
          </span>
          <span class="inline-flex items-center gap-1.5">
            <UIcon
              name="i-lucide-user"
              class="h-3 w-3 shrink-0"
            />
            {{ membersLabel }}
          </span>
        </div>
      </div>

      <UDropdownMenu
        :items="menuItems"
        :content="{ align: 'end', sideOffset: 4 }"
      >
        <UButton
          icon="i-lucide-ellipsis"
          color="neutral"
          variant="ghost"
          size="xs"
          class="shrink-0"
          :aria-label="t('taskSettings.projects.options')"
          @click.stop
        />
      </UDropdownMenu>
    </div>
  </div>
</template>
