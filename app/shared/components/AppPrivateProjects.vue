<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import PrivateProjectCreateModal from '~/features/projects/components/PrivateProjectCreateModal.vue'
import PrivateProjectPublishModal from '~/features/projects/components/PrivateProjectPublishModal.vue'
import { usePrivateProjects } from '~/features/projects/composables/usePrivateProjects'
import type { PrivateProject } from '~/features/projects/types/project.types'
import { resolveThemeColor } from '~/features/projects/utils/project-color.util'

/**
 * Bloque «Tareas por proyecto» del menú lateral (y de la hoja «Más» en mobile), en un solo desplegable:
 * 1. Primero los proyectos privados (sin compañía, solo el usuario los ve; «Personal» primero). Cada uno abre sus tareas
 *    en «Mis tareas» (filtro por proyecto); desde su menú se puede volver público. El «+» crea uno nuevo.
 * 2. Después los proyectos de la empresa (los del usuario), solo con `task.can_view_by_project`: abren su vista por
 *    proyecto (`/tasks/project/:id`).
 * Con el sidebar colapsado queda un solo botón con un menú.
 */
withDefaults(
  defineProps<{
    /** Modo icon-only (solo aplica en el sidebar desktop). */
    collapsed?: boolean
    /** Dentro de la lista del menú (en su lugar, debajo de «Vista total»): sin línea ni margen de sección. */
    embedded?: boolean
  }>(),
  { collapsed: false, embedded: false },
)

const emit = defineEmits<{
  /** Se emite tras navegar (para cerrar la hoja mobile). */
  navigate: []
}>()

const { t } = useI18n()
const route = useRoute()
const { projects, projectsQuery, privateIds } = usePrivateProjects()
const { userProjects } = useAuth()
const { can } = usePermissions()

const createOpen = ref(false)
const publishOpen = ref(false)
const publishTarget = ref<PrivateProject | null>(null)
const expanded = ref(true)

/** Con error o cargando se muestra el aviso correspondiente y no la lista. */
const visibleProjects = computed(() =>
  projectsQuery.isError.value || projectsQuery.isPending.value ? [] : projects.value,
)

/** Proyectos de la empresa (sin los privados, que ya van arriba): solo con «Vista por proyecto». */
const companyProjects = computed(() => {
  if (!can('task', 'view') || !can('task', 'view_by_project')) {
    return []
  }
  return userProjects.value.filter(project => !privateIds.value.has(project.id))
})

function isPersonal(project: PrivateProject) {
  return project.name.trim().toLowerCase() === 'personal'
}

function isActive(project: PrivateProject) {
  return route.path === '/tasks' && String(route.query.project ?? '') === String(project.id)
}

function isCompanyActive(projectId: number) {
  return route.path === `/tasks/project/${projectId}`
}

function openProject(project: PrivateProject) {
  const view = typeof route.query.view === 'string' ? route.query.view : 'list'
  void navigateTo({ path: '/tasks', query: { view, project: String(project.id) } })
  emit('navigate')
}

function openCompanyProject(projectId: number) {
  void navigateTo(`/tasks/project/${projectId}`)
  emit('navigate')
}

function askPublish(project: PrivateProject) {
  publishTarget.value = project
  publishOpen.value = true
}

function openCreate() {
  createOpen.value = true
}

// Publicar un proyecto privado lo vuelve de la empresa: pide `settings.can_projects`. Abrirlo/crearlo siempre se puede.
function menuItems(project: PrivateProject): DropdownMenuItem[][] {
  const items: DropdownMenuItem[] = [
    { label: t('privateProjects.open'), icon: 'i-lucide-list-checks', onSelect: () => openProject(project) },
  ]
  if (can('settings', 'projects')) {
    items.push({ label: t('privateProjects.makePublic'), icon: 'i-lucide-globe', onSelect: () => askPublish(project) })
  }
  return [items]
}

/** Menú del sidebar colapsado: privados (cada uno con su submenú), los de la empresa y el alta. */
const collapsedItems = computed<DropdownMenuItem[][]>(() => {
  const groups: DropdownMenuItem[][] = [
    [{ label: t('sidebar.projectTasks'), type: 'label' }],
    projects.value.map(project => ({
      label: project.name,
      icon: 'i-lucide-lock',
      children: menuItems(project)[0],
    })),
  ]
  if (companyProjects.value.length) {
    groups.push(companyProjects.value.map(project => ({
      label: project.name,
      icon: 'i-lucide-folder-kanban',
      onSelect: () => openCompanyProject(project.id),
    })))
  }
  groups.push([{ label: t('privateProjects.new'), icon: 'i-lucide-plus', onSelect: openCreate }])
  return groups
})

function onCreated(projectId: number) {
  const created = projects.value.find(project => project.id === projectId)
  if (created) {
    openProject(created)
  }
}
</script>

<template>
  <div :class="embedded ? '' : 'mt-4 border-t border-sidebar-border pt-3'">
    <UDropdownMenu
      v-if="collapsed"
      :items="collapsedItems"
      :content="{ side: 'right', align: 'start', sideOffset: 8 }"
    >
      <UTooltip
        :text="t('sidebar.projectTasks')"
        :content="{ side: 'right', sideOffset: 8 }"
      >
        <button
          type="button"
          :aria-label="t('sidebar.projectTasks')"
          class="flex h-9 w-full items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <UIcon
            name="i-lucide-folder"
            class="size-[18px]"
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
          class="flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-[10px] px-2 text-left text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          <UIcon
            name="i-lucide-folder"
            class="size-[18px] shrink-0"
          />
          <span class="flex-1 truncate">{{ t('sidebar.projectTasks') }}</span>
          <UIcon
            name="i-lucide-chevron-right"
            class="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform"
            :class="{ 'rotate-90': expanded }"
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
            @click="openCreate"
          />
        </UTooltip>
      </div>

      <template v-if="expanded">
        <p
          v-if="projectsQuery.isError.value"
          class="py-1 pl-9 pr-3 text-xs text-error"
        >
          {{ t('privateProjects.loadError') }}
        </p>

        <div
          v-else-if="projectsQuery.isPending.value"
          class="space-y-1 py-1 pl-9 pr-3"
        >
          <USkeleton class="h-7 w-full" />
        </div>

        <p
          v-else-if="!projects.length && !companyProjects.length"
          class="py-1 pl-9 pr-3 text-xs text-muted-foreground"
        >
          {{ t('privateProjects.empty') }}
        </p>

        <!-- 1. Proyectos privados -->
        <div
          v-for="project in visibleProjects"
          :key="`private-${project.id}`"
          class="group/private relative flex items-center rounded-md transition-colors"
          :class="isActive(project) ? 'bg-aeto-teal-light text-aeto-teal-dark' : 'text-sidebar-foreground hover:bg-muted'"
        >
          <span
            v-if="isActive(project)"
            class="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-aeto-teal"
          />
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-9 pr-3 text-left text-sm"
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

        <!-- 2. Proyectos de la empresa (con «Vista por proyecto») -->
        <button
          v-for="project in companyProjects"
          :key="`company-${project.id}`"
          type="button"
          class="relative flex w-full items-center gap-2.5 rounded-md py-2 pl-9 pr-3 text-left text-sm transition-colors"
          :class="isCompanyActive(project.id)
            ? 'bg-aeto-teal-light text-aeto-teal-dark font-medium'
            : 'text-sidebar-foreground hover:bg-muted'"
          :aria-label="project.name"
          @click="openCompanyProject(project.id)"
        >
          <span
            v-if="isCompanyActive(project.id)"
            class="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-aeto-teal"
          />
          <span class="min-w-0 flex-1 truncate">{{ project.name }}</span>
        </button>
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
