<script setup lang="ts">
import type { EnterpriseProject } from '~/features/projects/types/project.types'
import type { TaskSettingsProjectTab } from '~/features/task-settings/types/task-settings.types'
import TaskSettingsProjectCard from '~/features/task-settings/components/projects/TaskSettingsProjectCard.vue'

defineProps<{
  projects: EnterpriseProject[]
  loading?: boolean
  error?: boolean
}>()

const activeTab = defineModel<TaskSettingsProjectTab>('tab', { default: 'all' })

const emit = defineEmits<{
  newProject: []
  edit: [project: EnterpriseProject]
}>()

const { t } = useI18n()

const archivedOpen = ref(false)

const tabs: { id: TaskSettingsProjectTab, labelKey: string }[] = [
  { id: 'all', labelKey: 'taskSettings.projects.tabs.all' },
  { id: 'mine', labelKey: 'taskSettings.projects.tabs.mine' },
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h2 class="text-xl font-bold text-foreground">
          {{ t('taskSettings.projects.title') }}
        </h2>
        <p class="text-sm text-muted-foreground mt-1">
          {{ t('taskSettings.projects.subtitle') }}
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        :label="t('taskSettings.projects.newProject')"
        class="bg-aeto-teal hover:opacity-90 text-white shrink-0"
        @click="emit('newProject')"
      />
    </div>

    <div class="flex items-start gap-2.5 rounded-lg bg-muted/60 border border-border px-3.5 py-3">
      <UIcon
        name="i-lucide-info"
        class="h-4 w-4 shrink-0 text-muted-foreground mt-0.5"
      />
      <p class="text-[13px] text-muted-foreground leading-relaxed">
        {{ t('taskSettings.projects.infoBanner') }}
      </p>
    </div>

    <div class="border-b border-border">
      <div class="flex gap-5">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="pb-2.5 text-sm transition-colors relative"
          :class="activeTab === tab.id
            ? 'text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground'"
          @click="activeTab = tab.id"
        >
          {{ t(tab.labelKey) }}
          <span
            v-if="activeTab === tab.id"
            class="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-primary"
          />
        </button>
      </div>
    </div>

    <div v-if="loading" class="space-y-2">
      <USkeleton
        v-for="n in 3"
        :key="n"
        class="h-16 w-full rounded-lg bg-muted border border-border dark:bg-white/15"
      />
    </div>

    <p
      v-else-if="error"
      class="text-sm text-error py-4"
    >
      {{ t('taskSettings.projects.loadError') }}
    </p>

    <p
      v-else-if="!projects.length"
      class="text-sm text-muted-foreground py-4"
    >
      {{ t('taskSettings.projects.empty') }}
    </p>

    <div
      v-else
      class="space-y-2"
    >
      <TaskSettingsProjectCard
        v-for="project in projects"
        :key="project.id"
        :project="project"
        @edit="emit('edit', $event)"
      />
    </div>

    <!-- Archivados: UI placeholder, sin lógica aún -->
    <div class="pt-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        @click="archivedOpen = !archivedOpen"
      >
        <UIcon
          name="i-lucide-chevron-right"
          class="h-4 w-4 transition-transform"
          :class="{ 'rotate-90': archivedOpen }"
        />
        {{ t('taskSettings.projects.archived', { count: 0 }) }}
      </button>
    </div>
  </div>
</template>
