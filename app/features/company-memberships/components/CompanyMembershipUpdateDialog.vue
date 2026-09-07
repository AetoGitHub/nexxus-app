<script setup lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'
import BulkCompanySelect from '~/features/users/components/BulkCompanySelect.vue'
import type { CompanyMembershipSchema } from '~/features/company-memberships/schemas/company-membership.schema'
import type { EditingCompanyMembership } from '~/features/company-memberships/types/company-membership.types'

interface CompanyMembershipFormState {
  company?: number
}

const { t } = useI18n()
const { editingMembership, isOpen, closeDialog } = useCompanyMembershipEditDialog()
const updateCompanyMembership = useUpdateCompanyMembership()

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

function applyMembership(membership: EditingCompanyMembership) {
  state.company = membership.company
}

function resetForm() {
  Object.assign(state, createInitialState())
  form.value?.clear()
}

watch(editingMembership, (membership) => {
  if (membership) applyMembership(membership)
})

watch(open, (isOpenValue) => {
  if (!isOpenValue) {
    nextTick(resetForm)
  }
})

async function onSubmit(event: FormSubmitEvent<CompanyMembershipSchema>) {
  const membershipId = editingMembership.value?.id
  if (!membershipId) return

  try {
    await updateCompanyMembership.mutateAsync({
      id: membershipId,
      payload: { company: event.data.company },
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
    :title="t('configuration.user.membership.update.title')"
    :description="t('configuration.user.membership.update.description')"
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
          <BulkCompanySelect v-model="state.company" />
        </UFormField>

        <div class="mt-2 flex justify-end">
          <UButton
            type="submit"
            color="primary"
            :label="t('configuration.user.membership.update.submit')"
            :loading="updateCompanyMembership.isPending.value"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
