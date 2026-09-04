<script setup lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'
import BulkCompanySelect from '~/features/users/components/BulkCompanySelect.vue'
import type { CompanyMembershipSchema } from '~/features/company-memberships/schemas/company-membership.schema'

interface CompanyMembershipFormState {
  company?: number
}

const { t } = useI18n()
const { membershipContext, isOpen, closeDialog } = useCompanyMembershipDialog()
const createCompanyMembership = useCreateCompanyMembership()

const open = computed({
  get: () => isOpen.value,
  set: (value: boolean) => {
    if (!value) closeDialog()
  },
})

const form = useTemplateRef<Form<CompanyMembershipSchema>>('form')

const schema = computed(() => createCompanyMembershipSchema({
  companyRequired: t('configuration.user.membership.validation.companyRequired'),
}))

function createInitialState(): CompanyMembershipFormState {
  return { company: undefined }
}

const state = reactive<CompanyMembershipFormState>(createInitialState())

function resetForm() {
  Object.assign(state, createInitialState())
  form.value?.clear()
}

watch(open, (isOpenValue) => {
  if (!isOpenValue) {
    nextTick(resetForm)
  }
})

async function onSubmit(event: FormSubmitEvent<CompanyMembershipSchema>) {
  const profileId = membershipContext.value?.profileId
  if (!profileId) return

  try {
    await createCompanyMembership.mutateAsync({
      profile: profileId,
      company: event.data.company,
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
    :title="t('configuration.user.membership.title')"
    :description="t('configuration.user.membership.description')"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <UForm
        ref="form"
        :state="state"
        :schema="schema"
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField
          name="company"
          :label="t('configuration.user.membership.fields.company')"
          required
        >
          <BulkCompanySelect
            v-model="state.company"
            :excluded-company-ids="membershipContext?.existingCompanyIds ?? []"
          />
        </UFormField>

        <div class="mt-2 flex justify-end">
          <UButton
            type="submit"
            color="primary"
            :label="t('configuration.user.membership.submit')"
            :loading="createCompanyMembership.isPending.value"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
