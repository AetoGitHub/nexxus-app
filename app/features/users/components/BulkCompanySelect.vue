<script setup lang="ts">
const companyId = defineModel<number | undefined>({ required: true })
const props = withDefaults(defineProps<{
  excludedCompanyIds?: number[]
}>(), {
  excludedCompanyIds: () => [],
})
const { t } = useI18n()

const {
  companies,
  fetchNextPage,
  hasNextPage,
  isError,
  isFetchingNextPage,
  isPending,
} = useCompanies()

const items = computed(() =>
  companies.value.map(company => ({
    ...company,
    disabled: props.excludedCompanyIds.includes(company.id),
  })),
)

const selectMenu = useTemplateRef<{
  viewportRef?: HTMLElement | null
}>('selectMenu')

useInfiniteScroll(
  () => selectMenu.value?.viewportRef,
  () => fetchNextPage(),
  {
    distance: 80,
    canLoadMore: () =>
      !!hasNextPage.value && !isFetchingNextPage.value,
  },
)
</script>

<template>
  <USelectMenu
    ref="selectMenu"
    v-model="companyId"
    :items="items"
    value-key="id"
    label-key="name"
    icon="i-lucide-building-2"
    :loading="isPending || isFetchingNextPage"
    :placeholder="t('configuration.user.bulkCreate.companyPlaceholder')"
    :search-input="{
      placeholder: t('configuration.user.bulkCreate.companySearch'),
      icon: 'i-lucide-search',
    }"
    class="w-full"
  >
    <template #empty>
      {{ isError
        ? t('configuration.user.bulkCreate.companyLoadError')
        : t('configuration.user.bulkCreate.companyEmpty') }}
    </template>

    <template #content-bottom>
      <div
        v-if="isFetchingNextPage"
        class="flex items-center justify-center gap-2 px-3 py-2 text-xs text-muted"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-4 animate-spin"
        />
        {{ t('configuration.user.bulkCreate.companyLoadingMore') }}
      </div>
    </template>
  </USelectMenu>
</template>
