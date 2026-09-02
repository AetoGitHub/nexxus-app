<script setup lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'
import type { OrganizationSchema } from '~/features/organizations/schemas/organization.schema'
import type { OrganizationDetail } from '~/features/organizations/types/organization.types'

const { t } = useI18n()
const { selectedId, isOpen, closeDialog } = useOrganizationDialog()
const open = computed({
  get: () => isOpen.value,
  set: (value: boolean) => {
    if (!value) {
      closeDialog()
    }
  },
})
const updateOrganization = useUpdateOrganization()
const {
  data: organization,
  errorMessage,
  isError,
  isPending,
  refetch,
} = useOrganizationDetail(selectedId)

const form = useTemplateRef<Form<OrganizationSchema>>('form')

const schema = computed(() => createOrganizationSchema({
  nameRequired: t('configuration.organization.create.validation.nameRequired'),
}))

function createInitialState(): OrganizationSchema {
  return { name: '' }
}

const state = reactive<OrganizationSchema>(createInitialState())

function applyOrganization(detail: OrganizationDetail) {
  state.name = detail.name
}

function resetForm() {
  Object.assign(state, createInitialState())
  form.value?.clear()
}

watch(organization, (detail) => {
  if (detail) {
    applyOrganization(detail)
  }
})

watch(open, (isDialogOpen) => {
  if (!isDialogOpen) {
    nextTick(resetForm)
  }
})

async function onSubmit(event: FormSubmitEvent<OrganizationSchema>) {
  const organizationId = selectedId.value

  if (!organizationId) {
    return
  }

  try {
    await updateOrganization.mutateAsync({
      id: organizationId,
      payload: event.data,
    })
    closeDialog()
  }
  catch {
    // El composable presenta el error ya interpretado.
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('configuration.organization.update.title')"
    :description="t('configuration.organization.update.description')"
    :ui="{
      content: 'sm:max-w-xl',
      body: 'max-h-[calc(100dvh-10rem)] overflow-y-auto',
    }"
  >
    <template #body>
      <div
        v-if="isPending"
        class="grid gap-3"
      >
        <USkeleton class="h-10 w-full" />
      </div>

      <UAlert
        v-else-if="isError"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="t('configuration.organization.update.loadErrorTitle')"
        :description="errorMessage"
        :actions="[{
          label: t('configuration.organization.list.retry'),
          color: 'neutral',
          variant: 'outline',
          icon: 'i-lucide-refresh-cw',
          onClick: () => refetch(),
        }]"
      />

      <UForm
        v-else
        ref="form"
        :state="state"
        :schema="schema"
        class="flex flex-col gap-3"
        @submit="onSubmit"
      >
        <UFormField
          name="name"
          :label="t('configuration.organization.create.fields.name')"
          required
        >
          <UInput
            v-model="state.name"
            :placeholder="t('configuration.organization.create.placeholders.name')"
            class="w-full"
          />
        </UFormField>

        <div class="mt-4 flex justify-end">
          <UButton
            type="submit"
            color="primary"
            :label="t('configuration.organization.update.submit')"
            :loading="updateOrganization.isPending.value"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
