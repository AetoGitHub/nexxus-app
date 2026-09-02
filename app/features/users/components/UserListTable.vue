<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { ComponentPublicInstance } from 'vue'
import type { UserProfile } from '~/features/users/types/user.types'
import { LIST_TABLE_UI_CLASS } from '~/shared/constants/list-table'

const { t } = useI18n()
const {
  openEditDialog,
  openPasswordDialog,
} = useUserManagementDialog()

const {
  users,
  errorMessage,
  fetchNextPage,
  hasNextPage,
  isError,
  isFetching,
  isFetchingNextPage,
  isPending,
  refetch,
} = useUsers()

function displayCell(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    return t('configuration.user.list.emptyValue')
  }
  return value
}

function rowMenuItems(user: UserProfile): DropdownMenuItem[][] {
  return [
    [
      {
        label: t('configuration.user.update.edit'),
        icon: 'i-lucide-pen-line',
        onSelect: () => openEditDialog(user.id),
      },
      {
        label: t('configuration.user.password.action'),
        icon: 'i-lucide-key-round',
        onSelect: () => openPasswordDialog(user.id),
      },
    ],
  ]
}

const columns = computed<TableColumn<UserProfile>[]>(() => [
  {
    id: 'actions',
    header: '',
    meta: {
      class: {
        th: 'w-16',
        td: 'w-16',
      },
    },
  },
  {
    accessorKey: 'username',
    header: t('configuration.user.list.columns.username'),
    cell: ({ row }) => displayCell(row.getValue('username')),
  },
  {
    accessorKey: 'email',
    header: t('configuration.user.list.columns.email'),
    cell: ({ row }) => displayCell(row.getValue('email')),
  },
  {
    accessorKey: 'whatsapp',
    header: t('configuration.user.list.columns.whatsapp'),
    cell: ({ row }) => displayCell(row.getValue('whatsapp')),
  },
])

const table = useTemplateRef<ComponentPublicInstance>('table')

useInfiniteScroll(
  () => table.value?.$el as HTMLElement | null,
  () => fetchNextPage(),
  {
    distance: 200,
    canLoadMore: () =>
      hasNextPage.value && !isFetching.value && !isFetchingNextPage.value,
  },
)
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col gap-4">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div class="min-w-0">
        <h1 class="text-xl font-semibold text-highlighted">
          {{ t('configuration.user.list.title') }}
        </h1>
        <p class="mt-0.5 text-sm text-muted">
          {{ t('configuration.user.list.subtitle') }}
        </p>
      </div>
    </div>

    <div
      v-if="isPending"
      class="grid gap-2"
    >
      <USkeleton class="h-12" />
      <USkeleton class="h-12" />
      <USkeleton class="h-64" />
    </div>

    <UAlert
      v-else-if="isError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="t('configuration.user.list.loadErrorTitle')"
      :description="errorMessage"
      :actions="[{
        label: t('configuration.user.list.retry'),
        color: 'neutral',
        variant: 'outline',
        icon: 'i-lucide-refresh-cw',
        onClick: () => refetch(),
      }]"
    />

    <div
      v-else-if="!users.length"
      class="flex flex-1 flex-col items-center justify-center py-12 text-center"
    >
      <UIcon
        name="i-lucide-user-round-x"
        class="mb-2 text-4xl text-dimmed"
      />
      <h3 class="mb-1 text-lg font-semibold text-highlighted">
        {{ t('configuration.user.list.empty') }}
      </h3>
      <p class="text-sm text-muted">
        {{ t('configuration.user.list.emptyDescription') }}
      </p>
    </div>

    <AppListTableShell
      v-else
      class="min-h-0 flex-1"
    >
      <UTable
        ref="table"
        :class="LIST_TABLE_UI_CLASS"
        :data="users"
        :columns="columns"
        :loading="isFetching || isFetchingNextPage"
        :get-row-id="(user: UserProfile) => String(user.id)"
        sticky
      >
        <template #actions-cell="{ row }">
          <UDropdownMenu
            :items="rowMenuItems(row.original)"
            :content="{ align: 'start', sideOffset: 4 }"
          >
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-ellipsis-vertical"
              :aria-label="t('configuration.user.list.openActions')"
            />
          </UDropdownMenu>
        </template>
      </UTable>
    </AppListTableShell>
  </section>
</template>
