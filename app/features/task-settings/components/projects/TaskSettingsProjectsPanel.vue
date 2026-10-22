<script setup lang="ts">
import type { EnterpriseProject } from '~/features/projects/types/project.types'
import type { TaskSettingsProjectTab } from '~/features/task-settings/types/task-settings.types'
import TaskSettingsProjectCard from '~/features/task-settings/components/projects/TaskSettingsProjectCard.vue'
import { matchesSearch } from '~/shared/utils/search-text.util'

const props = defineProps<{
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

/** Buscador por nombre de proyecto: filtra la pestaña activa (Todos / Mis proyectos) sin volver a pedir datos. */
const search = ref('')
const visibleProjects = computed(() =>
  props.projects.filter(project => matchesSearch(project.name, search.value)),
)
const isSearching = computed(() => search.value.trim().length > 0)

const tabs: { id: TaskSettingsProjectTab, labelKey: string }[] = [
  { id: 'all', labelKey: 'taskSettings.projects.tabs.all' },
  { id: 'mine', labelKey: 'taskSettings.projects.tabs.mine' },
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
        class="bg-aeto-teal hover:opacity-90 text-white self-start sm:shrink-0"
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

    <div class="sm:flex sm:items-end sm:justify-between sm:gap-4 sm:border-b sm:border-border">
      <div class="flex gap-5 border-b border-border sm:border-b-0">
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

      <UInput
        v-model="search"
        icon="i-lucide-search"
        size="sm"
        :placeholder="t('taskSettings.projects.searchPlaceholder')"
        :aria-label="t('taskSettings.projects.searchPlaceholder')"
        class="mt-3 w-full sm:mb-2 sm:mt-0 sm:w-64"
      >
        <template
          v-if="isSearching"
          #trailing
        >
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="link"
            size="xs"
            :aria-label="t('taskSettings.projects.clearSearch')"
            @click="search = ''"
          />
        </template>
      </UInput>
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

    <p
      v-else-if="!visibleProjects.length"
      class="text-sm text-muted-foreground py-4"
    >
      {{ t('taskSettings.projects.searchEmpty', { query: search.trim() }) }}
    </p>

    <div
      v-else
      class="space-y-2"
    >
      <TaskSettingsProjectCard
        v-for="project in visibleProjects"
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
