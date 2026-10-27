<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import PrivateProjectCreateModal from '~/features/projects/components/PrivateProjectCreateModal.vue'
import PrivateProjectPublishModal from '~/features/projects/components/PrivateProjectPublishModal.vue'
import { usePrivateProjects } from '~/features/projects/composables/usePrivateProjects'
import type { PrivateProject } from '~/features/projects/types/project.types'
import { resolveThemeColor } from '~/features/projects/utils/project-color.util'

/**
 * Sección «Mis proyectos privados» del menú lateral (y de la hoja «Más» en mobile): los proyectos sin compañía que solo
 * el usuario ve, con «Personal» primero. Cada uno abre sus tareas en «Mis tareas» (filtro por proyecto); desde el menú de
 * cada proyecto se puede volver público. Con el sidebar colapsado queda un solo botón con candado y un menú.
 */
withDefaults(
  defineProps<{
    /** Modo icon-only (solo aplica en el sidebar desktop). */
    collapsed?: boolean
  }>(),
  { collapsed: false },
)

const emit = defineEmits<{
  /** Se emite tras navegar (para cerrar la hoja mobile). */
  navigate: []
}>()

const { t } = useI18n()
const route = useRoute()
const { projects, projectsQuery } = usePrivateProjects()

const createOpen = ref(false)
const publishOpen = ref(false)
const publishTarget = ref<PrivateProject | null>(null)
const expanded = ref(true)

/** Con error, cargando o sin proyectos se muestra el aviso correspondiente y no la lista. */
const visibleProjects = computed(() =>
  projectsQuery.isError.value || projectsQuery.isPending.value ? [] : projects.value,
)

function isPersonal(project: PrivateProject) {
  return project.name.trim().toLowerCase() === 'personal'
}

function isActive(project: PrivateProject) {
  return route.path === '/tasks' && String(route.query.project ?? '') === String(project.id)
}

function openProject(project: PrivateProject) {
  const view = typeof route.query.view === 'string' ? route.query.view : 'list'
  void navigateTo({ path: '/tasks', query: { view, project: String(project.id) } })
  emit('navigate')
}

function askPublish(project: PrivateProject) {
  publishTarget.value = project
  publishOpen.value = true
}

function menuItems(project: PrivateProject): DropdownMenuItem[][] {
  return [[
    { label: t('privateProjects.open'), icon: 'i-lucide-list-checks', onSelect: () => openProject(project) },
    { label: t('privateProjects.makePublic'), icon: 'i-lucide-globe', onSelect: () => askPublish(project) },
  ]]
}

/** Menú del sidebar colapsado: todos los proyectos (cada uno con su submenú) y el alta. */
const collapsedItems = computed<DropdownMenuItem[][]>(() => [
  [{ label: t('privateProjects.section'), type: 'label' }],
  projects.value.map(project => ({
    label: project.name,
    icon: 'i-lucide-lock',
    children: menuItems(project)[0],
  })),
  [{ label: t('privateProjects.new'), icon: 'i-lucide-plus', onSelect: () => { createOpen.value = true } }],
])

function onCreated(projectId: number) {
  const created = projects.value.find(project => project.id === projectId)
  if (created) {
    openProject(created)
  }
}
</script>

<template>
  <div class="mt-4 border-t border-sidebar-border pt-3">
    <UDropdownMenu
      v-if="collapsed"
      :items="collapsedItems"
      :content="{ side: 'right', align: 'start', sideOffset: 8 }"
    >
      <UTooltip
        :text="t('privateProjects.section')"
        :content="{ side: 'right', sideOffset: 8 }"
      >
        <button
          type="button"
          :aria-label="t('privateProjects.section')"
          class="flex w-full items-center justify-center rounded-md py-2 text-sidebar-foreground transition-colors hover:bg-muted"
        >
          <UIcon
            name="i-lucide-lock"
            class="h-4 w-4"
          />
        </button>
      </UTooltip>
    </UDropdownMenu>

    <div
      v-else
      class="space-y-0.5"
    >
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          <span class="flex-1 truncate">{{ t('privateProjects.section') }}</span>
          <UIcon
            name="i-lucide-chevron-down"
            class="h-3 w-3 shrink-0 transition-transform"
            :class="{ '-rotate-90': !expanded }"
          />
        </button>
        <UTooltip :text="t('privateProjects.new')">
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            :aria-label="t('privateProjects.new')"
            @click="createOpen = true"
          />
        </UTooltip>
      </div>

      <template v-if="expanded">
        <p
          v-if="projectsQuery.isError.value"
          class="px-3 py-1 text-xs text-error"
        >
          {{ t('privateProjects.loadError') }}
        </p>

        <div
          v-else-if="projectsQuery.isPending.value"
          class="space-y-1 px-3 py-1"
        >
          <USkeleton class="h-7 w-full" />
        </div>

        <p
          v-else-if="!projects.length"
          class="px-3 py-1 text-xs text-muted-foreground"
        >
          {{ t('privateProjects.empty') }}
        </p>

        <div
          v-for="project in visibleProjects"
          :key="project.id"
          class="group/private relative flex items-center rounded-md transition-colors"
          :class="isActive(project) ? 'bg-aeto-teal-light text-aeto-teal-dark' : 'text-sidebar-foreground hover:bg-muted'"
        >
          <span
            v-if="isActive(project)"
            class="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-aeto-teal"
          />
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left text-sm"
            :class="isActive(project) ? 'font-medium' : ''"
            :aria-label="`${project.name} · ${t('privateProjects.onlyYou')}`"
            @click="openProject(project)"
          >
            <UIcon
              name="i-lucide-lock"
              class="h-3.5 w-3.5 shrink-0"
              :style="{ color: resolveThemeColor(project.color) }"
            />
            <span class="min-w-0 flex-1 truncate">{{ project.name }}</span>
            <span
              v-if="isPersonal(project)"
              class="shrink-0 rounded-full bg-muted px-1.5 text-[10px] font-medium leading-4 text-muted-foreground"
            >{{ t('privateProjects.onlyYou') }}</span>
          </button>
          <UDropdownMenu
            :items="menuItems(project)"
            :content="{ align: 'end' }"
          >
            <UButton
              icon="i-lucide-ellipsis"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              class="mr-1 shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-hover/private:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
              :aria-label="t('privateProjects.options', { name: project.name })"
            />
          </UDropdownMenu>
        </div>
      </template>
    </div>

    <PrivateProjectCreateModal
      v-model:open="createOpen"
      @created="onCreated"
    />
    <PrivateProjectPublishModal
      v-model:open="publishOpen"
      :project="publishTarget"
    />
  </div>
</template>
