<script setup lang="ts">
import type { CatalogueGroup } from '~/features/task-settings/types/group.types'
import TaskSettingsGroupCard from '~/features/task-settings/components/groups/TaskSettingsGroupCard.vue'
import { matchesSearch } from '~/shared/utils/search-text.util'

const props = defineProps<{
  groups: CatalogueGroup[]
  loading?: boolean
  error?: boolean
}>()

const emit = defineEmits<{
  newGroup: []
  edit: [group: CatalogueGroup]
}>()

const { t } = useI18n()

/**
 * Buscador por nombre de grupo. Solo filtra la lista que se muestra: `groups` completo sigue yendo a
 * cada tarjeta para sus badges «manager de…».
 */
const search = ref('')
const visibleGroups = computed(() =>
  props.groups.filter(group => matchesSearch(group.name, search.value)),
)
const isSearching = computed(() => search.value.trim().length > 0)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h2 class="text-xl font-bold text-foreground">
          {{ t('taskSettings.groups.title') }}
        </h2>
        <p class="text-sm text-muted-foreground mt-1">
          {{ t('taskSettings.groups.subtitle') }}
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        :label="t('taskSettings.groups.newGroup')"
        class="bg-aeto-teal hover:opacity-90 text-white self-start sm:shrink-0"
        @click="emit('newGroup')"
      />
    </div>

    <div class="flex items-start gap-2.5 rounded-lg bg-muted/60 border border-border px-3.5 py-3">
      <UIcon
        name="i-lucide-info"
        class="h-4 w-4 shrink-0 text-muted-foreground mt-0.5"
      />
      <p class="text-[13px] text-muted-foreground leading-relaxed">
        {{ t('taskSettings.groups.infoBanner') }}
      </p>
    </div>

    <UInput
      v-model="search"
      icon="i-lucide-search"
      size="sm"
      :placeholder="t('taskSettings.groups.searchPlaceholder')"
      :aria-label="t('taskSettings.groups.searchPlaceholder')"
      class="w-full"
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
          :aria-label="t('taskSettings.groups.clearSearch')"
          @click="search = ''"
        />
      </template>
    </UInput>

    <div v-if="loading" class="space-y-2">
      <USkeleton
        v-for="n in 3"
        :key="n"
        class="h-16 w-full rounded-lg"
      />
    </div>

    <p
      v-else-if="error"
      class="text-sm text-error py-4"
    >
      {{ t('taskSettings.groups.loadError') }}
    </p>

    <p
      v-else-if="!groups.length"
      class="text-sm text-muted-foreground py-4"
    >
      {{ t('common.noData') }}
    </p>

    <p
      v-else-if="!visibleGroups.length"
      class="text-sm text-muted-foreground py-4"
    >
      {{ t('taskSettings.groups.searchEmpty', { query: search.trim() }) }}
    </p>

    <div
      v-else
      class="space-y-2"
    >
      <TaskSettingsGroupCard
        v-for="group in visibleGroups"
        :key="group.id"
        :group="group"
        :all-groups="groups"
        @edit="emit('edit', $event)"
      />
    </div>
  </div>
</template>
