<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { CatalogueGroup } from '~/features/task-settings/types/group.types'
import { resolveThemeColor } from '~/features/projects/utils/project-color.util'
import { resolveAvatarColor } from '~/features/task-settings/utils/groups/group-avatar.util'
import { useGroupDetail } from '~/features/task-settings/composables/groups/useGroupDetail'
import { useProfiles } from '~/features/auth/composables/useProfiles'
import { getInitials } from '~/shared/utils/initials'

const props = defineProps<{
  group: CatalogueGroup
  /** Listado completo: sirve para badges “manager de…”. */
  allGroups?: CatalogueGroup[]
}>()

const emit = defineEmits<{
  edit: [group: CatalogueGroup]
}>()

const { t } = useI18n()

const open = ref(false)
const color = computed(() => resolveThemeColor(props.group.color))

const detailGroupId = computed(() => (open.value ? props.group.id : null))
const { detail, detailQuery } = useGroupDetail(detailGroupId)
const { profiles } = useProfiles(true)

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: t('taskSettings.groups.edit'),
      icon: 'i-lucide-pencil',
      onSelect: () => emit('edit', props.group),
    },
  ],
])

function resolveUsername(userId: number): string {
  const fromDetail = detail.value?.members.find(member => member.id === userId)
  if (fromDetail) {
    return fromDetail.username
  }
  const fromProfiles = profiles.value.find(profile => profile.id === userId)
  return fromProfiles?.username ?? `#${userId}`
}

const managerName = computed(() =>
  detail.value?.manager_name
  || props.group.manager_name
  || resolveUsername(props.group.manager),
)

const displayMembers = computed(() =>
  (detail.value?.members ?? []).filter(member => member.id !== props.group.manager),
)

const memberCount = computed(() => displayMembers.value.length)

const subtitle = computed(() => {
  const managerLabel = t('taskSettings.groups.managerLabel', { name: managerName.value })
  if (!open.value || !detail.value) {
    return managerLabel
  }
  return `${managerLabel} · ${t('taskSettings.groups.membersCount', { count: memberCount.value })}`
})

function managedGroupNames(userId: number): string[] {
  return (props.allGroups ?? [])
    .filter(item => item.manager === userId && item.id !== props.group.id)
    .map(item => item.name)
}

function onToggle() {
  open.value = !open.value
}
</script>

<template>
  <div
    class="border border-border rounded-lg relative bg-card overflow-hidden"
    :style="{
      borderWidth: '0.5px 0.5px 0.5px 3px',
      borderLeftStyle: 'solid',
      borderLeftColor: color,
    }"
  >
    <div class="flex items-start gap-1 px-2 py-3">
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        class="mt-0.5 shrink-0"
        :icon="open ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
        :aria-expanded="open"
        :aria-label="t('taskSettings.groups.toggleDetail')"
        @click="onToggle"
      />

      <button
        type="button"
        class="min-w-0 flex-1 text-left"
        @click="onToggle"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span
            class="w-2.5 h-2.5 rounded-full shrink-0"
            :style="{ background: color }"
          />
          <span class="text-[13px] font-medium text-foreground truncate">
            {{ group.name }}
          </span>
        </div>
        <p class="text-[12px] text-muted-foreground mt-1 truncate">
          {{ subtitle }}
        </p>
      </button>

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
          :aria-label="t('taskSettings.groups.options')"
          @click.stop
        />
      </UDropdownMenu>
    </div>

    <div
      v-if="open"
      class="px-4 pb-4 pt-1 space-y-4 border-t border-border"
    >
      <div
        v-if="detailQuery.isPending.value"
        class="space-y-4 py-1"
      >
        <div>
          <USkeleton class="h-3 w-16 rounded mb-2 dark:bg-white/15" />
          <div class="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
            <USkeleton class="w-7 h-7 rounded-full shrink-0 dark:bg-white/15" />
            <USkeleton class="h-4 w-28 rounded flex-1 max-w-[40%] dark:bg-white/15" />
            <USkeleton class="h-5 w-16 rounded-md shrink-0 dark:bg-white/15" />
          </div>
        </div>

        <div>
          <USkeleton class="h-3 w-20 rounded mb-1 dark:bg-white/15" />
          <USkeleton class="h-3 w-64 max-w-full rounded mb-2 dark:bg-white/15" />
          <ul class="divide-y divide-border rounded-lg border border-border overflow-hidden">
            <li
              v-for="n in 3"
              :key="n"
              class="flex items-center gap-2.5 px-3 py-2.5"
            >
              <USkeleton class="w-7 h-7 rounded-full shrink-0 dark:bg-white/15" />
              <USkeleton class="h-4 w-32 rounded flex-1 max-w-[45%] dark:bg-white/15" />
              <USkeleton class="h-5 w-14 rounded-md shrink-0 dark:bg-white/15" />
            </li>
          </ul>
        </div>
      </div>

      <p
        v-else-if="detailQuery.isError.value"
        class="text-sm text-error py-2"
      >
        {{ t('taskSettings.groups.detailLoadError') }}
      </p>

      <template v-else-if="detail">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {{ t('taskSettings.groups.managerSection') }}
          </p>
          <div class="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
            <span
              class="inline-flex items-center justify-center rounded-full font-semibold text-white select-none shrink-0 w-7 h-7 text-[11px] leading-none"
              :style="{ backgroundColor: resolveAvatarColor(group.manager) }"
              :title="managerName"
            >
              {{ getInitials(managerName) }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-[13px] font-medium text-foreground truncate">
                {{ managerName }}
              </p>
            </div>
            <UBadge
              color="primary"
              variant="subtle"
              size="sm"
              :label="t('taskSettings.groups.managerBadge')"
            />
          </div>
        </div>

        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            {{ t('taskSettings.groups.membersSection') }}
          </p>
          <p class="text-[12px] text-muted-foreground mb-2">
            {{ t('taskSettings.groups.membersHelp') }}
          </p>

          <p
            v-if="!displayMembers.length"
            class="text-sm text-muted-foreground py-2"
          >
            {{ t('common.noUsers') }}
          </p>

          <ul
            v-else
            class="divide-y divide-border rounded-lg border border-border overflow-hidden"
          >
            <li
              v-for="member in displayMembers"
              :key="member.id"
              class="flex items-center gap-2.5 px-3 py-2.5 bg-card"
            >
              <span
                class="inline-flex items-center justify-center rounded-full font-semibold text-white select-none shrink-0 w-7 h-7 text-[11px] leading-none"
                :style="{ backgroundColor: resolveAvatarColor(member.id) }"
                :title="member.username"
              >
                {{ getInitials(member.username) }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-[13px] font-medium text-foreground truncate">
                  {{ member.username }}
                </p>
              </div>
              <div
                v-if="managedGroupNames(member.id).length"
                class="flex flex-wrap gap-1 justify-end max-w-[45%]"
              >
                <UBadge
                  v-for="groupName in managedGroupNames(member.id)"
                  :key="groupName"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  :label="groupName"
                />
              </div>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </div>
</template>
