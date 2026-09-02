<script setup lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'
import type { OrganizationSchema } from '~/features/organizations/schemas/organization.schema'

const { t } = useI18n()
const createOrganization = useCreateOrganization()

const open = ref(false)
const form = useTemplateRef<Form<OrganizationSchema>>('form')

const schema = computed(() => createOrganizationSchema({
  nameRequired: t('configuration.organization.create.validation.nameRequired'),
}))

function createInitialState(): OrganizationSchema {
  return { name: '' }
}

const state = reactive<OrganizationSchema>(createInitialState())

function resetForm() {
  Object.assign(state, createInitialState())
  form.value?.clear()
}

watch(open, (isOpen) => {
  if (!isOpen) {
    nextTick(resetForm)
  }
})

async function onSubmit(event: FormSubmitEvent<OrganizationSchema>) {
  try {
    await createOrganization.mutateAsync(event.data)
    open.value = false
  }
  catch {
    // El composable presenta el error ya interpretado.
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('configuration.organization.create.title')"
    :description="t('configuration.organization.create.description')"
    :ui="{
      content: 'sm:max-w-xl',
      body: 'max-h-[calc(100dvh-10rem)] overflow-y-auto',
    }"
  >
    <AppCreateToolbarButton
      :label="t('configuration.organization.create.toolbarButton')"
      :aria-label="t('configuration.organization.create.title')"
    />

    <template #body>
      <UForm
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
            :label="t('configuration.organization.create.submit')"
            :loading="createOrganization.isPending.value"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
