<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { ComponentPublicInstance } from 'vue'
import type { Company } from '~/features/companies/types/company.types'
import { LIST_TABLE_UI_CLASS } from '~/shared/constants/list-table'

const { t, locale } = useI18n()
const { openDialog } = useCompanyDialog()

const {
  companies,
  errorMessage,
  fetchNextPage,
  hasNextPage,
  isError,
  isFetching,
  isFetchingNextPage,
  isPending,
  refetch,
} = useCompanies()

const dateFormatter = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }),
)

function formatCreatedAt(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.value.format(date)
}

function rowMenuItems(company: Company): DropdownMenuItem[][] {
  return [
    [
      {
        label: t('configuration.company.update.edit'),
        icon: 'i-lucide-pen-line',
        onSelect: () => openDialog(company.id),
      },
    ],
  ]
}

const columns = computed<TableColumn<Company>[]>(() => [
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
    accessorKey: 'name',
    header: t('configuration.company.list.columns.name'),
    cell: ({ row }) => row.getValue('name') ?? '-',
  },
  {
    accessorKey: 'razon_social',
    header: t('configuration.company.list.columns.legalName'),
    cell: ({ row }) => row.getValue('razon_social') ?? '-',
  },
  {
    accessorKey: 'regimen_fiscal',
    header: t('configuration.company.list.columns.taxRegime'),
    cell: ({ row }) => row.getValue('regimen_fiscal') ?? '-',
  },
  {
    accessorKey: 'direccion',
    header: t('configuration.company.list.columns.address'),
    cell: ({ row }) => row.getValue('direccion') ?? '-',
  },
  {
    accessorKey: 'telefono',
    header: t('configuration.company.list.columns.phone'),
    cell: ({ row }) => row.getValue('telefono') ?? '-',
  },
  {
    accessorKey: 'created_at',
    header: t('configuration.company.list.columns.createdAt'),
    cell: ({ row }) => formatCreatedAt(row.original.created_at),
  },
])

const table = useTemplateRef<ComponentPublicInstance>('table')

// El scroll vive dentro de la tabla: al acercarse al final del viewport interno se pide la página siguiente.
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
          {{ t('configuration.company.list.title') }}
        </h1>
        <p class="mt-0.5 text-sm text-muted">
          {{ t('configuration.company.list.subtitle') }}
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
      :title="t('configuration.company.list.loadErrorTitle')"
      :description="errorMessage"
      :actions="[{
        label: t('configuration.company.list.retry'),
        color: 'neutral',
        variant: 'outline',
        icon: 'i-lucide-refresh-cw',
        onClick: () => refetch(),
      }]"
    />

    <div
      v-else-if="!companies.length"
      class="flex flex-1 flex-col items-center justify-center py-12 text-center"
    >
      <UIcon
        name="i-lucide-building-2"
        class="mb-2 text-4xl text-dimmed"
      />
      <h3 class="mb-1 text-lg font-semibold text-highlighted">
        {{ t('configuration.company.list.empty') }}
      </h3>
      <p class="text-sm text-muted">
        {{ t('configuration.company.list.emptyDescription') }}
      </p>
    </div>

    <AppListTableShell
      v-else
      class="min-h-0 flex-1"
    >
      <UTable
        ref="table"
        :class="LIST_TABLE_UI_CLASS"
        :data="companies"
        :columns="columns"
        :loading="isFetching || isFetchingNextPage"
        :get-row-id="(company: Company) => String(company.id)"
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
              :aria-label="t('configuration.company.list.openActions')"
            />
          </UDropdownMenu>
        </template>
      </UTable>
    </AppListTableShell>
  </section>
</template>
