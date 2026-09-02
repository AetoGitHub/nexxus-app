<script setup lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'
import type { CompanySchema } from '~/features/companies/schemas/company.schema'

const { t } = useI18n()
const { organization } = useAuth()
const toast = useToast()
const createCompany = useCreateCompany()

const open = ref(false)
const form = useTemplateRef<Form<CompanySchema>>('form')

const schema = computed(() => createCompanySchema({
  nameRequired: t('configuration.company.create.validation.nameRequired'),
  legalNameRequired: t('configuration.company.create.validation.legalNameRequired'),
  taxRegimeRequired: t('configuration.company.create.validation.taxRegimeRequired'),
  addressRequired: t('configuration.company.create.validation.addressRequired'),
  phoneRequired: t('configuration.company.create.validation.phoneRequired'),
  contactNameRequired: t('configuration.company.create.validation.contactNameRequired'),
  contactPhoneRequired: t('configuration.company.create.validation.contactPhoneRequired'),
  contactEmailRequired: t('configuration.company.create.validation.contactEmailRequired'),
  contactEmailInvalid: t('configuration.company.create.validation.contactEmailInvalid'),
}))

function createInitialState(): CompanySchema {
  return {
    name: '',
    razon_social: '',
    regimen_fiscal: '',
    direccion: '',
    telefono: '',
    contacts: [],
  }
}

const state = reactive<CompanySchema>(createInitialState())

function addContact() {
  state.contacts.push({ name: '', phone: '', email: '' })
}

function removeContact(index: number) {
  state.contacts.splice(index, 1)
}

function resetForm() {
  Object.assign(state, createInitialState())
  form.value?.clear()
}

watch(open, (isOpen) => {
  if (!isOpen) {
    nextTick(resetForm)
  }
})

async function onSubmit(event: FormSubmitEvent<CompanySchema>) {
  const organizationId = organization.value?.id

  if (!organizationId) {
    toast.add({
      title: t('configuration.company.create.organizationUnavailableTitle'),
      description: t('configuration.company.create.organizationUnavailableDescription'),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
    return
  }

  try {
    await createCompany.mutateAsync({
      ...event.data,
      organization: organizationId,
    })
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
    :title="t('configuration.company.create.title')"
    :description="t('configuration.company.create.description')"
    :ui="{
      content: 'sm:max-w-xl',
      body: 'max-h-[calc(100dvh-10rem)] overflow-y-auto',
    }"
  >
    <AppCreateToolbarButton
      :label="t('configuration.company.create.toolbarButton')"
      :aria-label="t('configuration.company.create.title')"
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
          :label="t('configuration.company.create.fields.name')"
          required
        >
          <UInput
            v-model="state.name"
            :placeholder="t('configuration.company.create.placeholders.name')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="razon_social"
          :label="t('configuration.company.create.fields.legalName')"
          required
        >
          <UInput
            v-model="state.razon_social"
            :placeholder="t('configuration.company.create.placeholders.legalName')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="regimen_fiscal"
          :label="t('configuration.company.create.fields.taxRegime')"
          required
        >
          <UInput
            v-model="state.regimen_fiscal"
            :placeholder="t('configuration.company.create.placeholders.taxRegime')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="direccion"
          :label="t('configuration.company.create.fields.address')"
          required
        >
          <UTextarea
            v-model="state.direccion"
            :placeholder="t('configuration.company.create.placeholders.address')"
            :rows="2"
            autoresize
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="telefono"
          :label="t('configuration.company.create.fields.phone')"
          required
        >
          <UInput
            v-model="state.telefono"
            type="tel"
            :placeholder="t('configuration.company.create.placeholders.phone')"
            class="w-full"
          />
        </UFormField>

        <div class="mt-2 space-y-3 border-t border-default pt-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-highlighted">
                {{ t('configuration.company.create.contacts.title') }}
              </h3>
              <p class="text-xs text-muted">
                {{ t('configuration.company.create.contacts.description') }}
              </p>
            </div>
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-plus"
              :label="t('configuration.company.create.contacts.add')"
              @click="addContact"
            />
          </div>

          <p
            v-if="!state.contacts.length"
            class="rounded-lg border border-dashed border-default px-4 py-3 text-center text-sm text-muted"
          >
            {{ t('configuration.company.create.contacts.empty') }}
          </p>

          <div
            v-for="(_, index) in state.contacts"
            :key="index"
            class="space-y-3 rounded-lg border border-default p-3"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-medium text-highlighted">
                {{ t('configuration.company.create.contacts.item', { number: index + 1 }) }}
              </span>
              <UButton
                type="button"
                color="error"
                variant="ghost"
                size="xs"
                square
                icon="i-lucide-trash-2"
                :aria-label="t('configuration.company.create.contacts.remove', { number: index + 1 })"
                @click="removeContact(index)"
              />
            </div>

            <UFormField
              :name="`contacts.${index}.name`"
              :label="t('configuration.company.create.fields.contactName')"
              required
            >
              <UInput
                v-model="state.contacts[index]!.name"
                :placeholder="t('configuration.company.create.placeholders.contactName')"
                class="w-full"
              />
            </UFormField>

            <div class="grid gap-3 sm:grid-cols-2">
              <UFormField
                :name="`contacts.${index}.phone`"
                :label="t('configuration.company.create.fields.contactPhone')"
                required
              >
                <UInput
                  v-model="state.contacts[index]!.phone"
                  type="tel"
                  :placeholder="t('configuration.company.create.placeholders.contactPhone')"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :name="`contacts.${index}.email`"
                :label="t('configuration.company.create.fields.contactEmail')"
                required
              >
                <UInput
                  v-model="state.contacts[index]!.email"
                  type="email"
                  :placeholder="t('configuration.company.create.placeholders.contactEmail')"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <UButton
            type="submit"
            color="primary"
            :label="t('configuration.company.create.submit')"
            :loading="createCompany.isPending.value"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
