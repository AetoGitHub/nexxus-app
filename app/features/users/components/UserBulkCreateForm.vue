<script setup lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'
import BulkCompanySelect from '~/features/users/components/BulkCompanySelect.vue'
import type { BulkUserSchema } from '~/features/users/schemas/bulk-user.schema'
import type { BulkCreateUserItem } from '~/features/users/types/user.types'

interface BulkUserFormState {
  company?: number
  users: BulkCreateUserItem[]
}

const { t } = useI18n()
const { organization } = useAuth()
const toast = useToast()
const bulkCreate = useBulkCreateUsers()
const form = useTemplateRef<Form<BulkUserSchema>>('form')

const schema = computed(() => createBulkUserSchema({
  companyRequired: t('configuration.user.bulkCreate.validation.companyRequired'),
  userRequired: t('configuration.user.bulkCreate.validation.usernameRequired'),
  emailRequired: t('configuration.user.bulkCreate.validation.emailRequired'),
  emailInvalid: t('configuration.user.bulkCreate.validation.emailInvalid'),
  whatsappRequired: t('configuration.user.bulkCreate.validation.whatsappRequired'),
  usersMin: t('configuration.user.bulkCreate.validation.usersMin'),
}))

const state = reactive<BulkUserFormState>({
  company: undefined,
  users: [createEmptyUser()],
})

function createEmptyUser(): BulkCreateUserItem {
  return {
    username: '',
    email: '',
    whatsapp: '',
  }
}

function addUser() {
  state.users.push(createEmptyUser())
}

function removeUser(index: number) {
  if (state.users.length > 1) {
    state.users.splice(index, 1)
  }
}

function updateUsername(index: number, value: string | number) {
  const user = state.users[index]
  if (user) {
    user.username = String(value).toLocaleUpperCase()
  }
}

async function onSubmit(event: FormSubmitEvent<BulkUserSchema>) {
  const organizationId = organization.value?.id

  if (!organizationId) {
    toast.add({
      title: t('configuration.user.bulkCreate.organizationUnavailableTitle'),
      description: t('configuration.user.bulkCreate.organizationUnavailableDescription'),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
    return
  }

  try {
    await bulkCreate.mutateAsync({
      organization: organizationId,
      company: event.data.company,
      users: event.data.users,
    })
    await navigateTo('/configuration/user')
  }
  catch {
    // El composable presenta el error ya interpretado.
  }
}
</script>

<template>
  <div class="space-y-4">
    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-users"
      :title="t('configuration.user.bulkCreate.infoTitle')"
      :description="t('configuration.user.bulkCreate.infoDescription')"
    />

    <UCard>
      <UForm
        ref="form"
        :state="state"
        :schema="schema"
        class="space-y-8"
        @submit="onSubmit"
      >
        <UFormField
          name="company"
          :label="t('configuration.user.bulkCreate.company')"
          required
        >
          <BulkCompanySelect v-model="state.company" />
        </UFormField>

        <section class="space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-highlighted">
                {{ t('configuration.user.bulkCreate.usersTitle') }}
              </h2>
              <p class="mt-0.5 text-xs text-muted">
                {{ t('configuration.user.bulkCreate.usersDescription') }}
              </p>
            </div>

            <UButton
              type="button"
              color="primary"
              variant="subtle"
              size="sm"
              icon="i-lucide-user-plus"
              :label="t('configuration.user.bulkCreate.addUser')"
              @click="addUser"
            />
          </div>

          <div class="space-y-3">
            <div
              v-for="(user, index) in state.users"
              :key="index"
              class="grid items-start gap-3 rounded-lg border border-default p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <UFormField
                :name="`users.${index}.username`"
                :label="t('configuration.user.fields.username')"
                required
              >
                <UInput
                  :model-value="user.username"
                  :placeholder="t('configuration.user.placeholders.username')"
                  autocomplete="off"
                  class="w-full"
                  @update:model-value="updateUsername(index, $event)"
                />
              </UFormField>

              <UFormField
                :name="`users.${index}.email`"
                :label="t('configuration.user.fields.email')"
                required
              >
                <UInput
                  v-model="user.email"
                  type="email"
                  :placeholder="t('configuration.user.placeholders.email')"
                  autocomplete="off"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :name="`users.${index}.whatsapp`"
                :label="t('configuration.user.fields.whatsapp')"
                required
              >
                <UInput
                  v-model="user.whatsapp"
                  type="tel"
                  :placeholder="t('configuration.user.placeholders.whatsapp')"
                  autocomplete="off"
                  class="w-full"
                />
              </UFormField>

              <div class="flex h-8 items-center md:mt-6">
                <UButton
                  type="button"
                  color="error"
                  variant="ghost"
                  square
                  icon="i-lucide-trash-2"
                  :disabled="state.users.length === 1"
                  :aria-label="t('configuration.user.bulkCreate.removeUser', { number: index + 1 })"
                  @click="removeUser(index)"
                />
              </div>
            </div>
          </div>
        </section>

        <div class="flex justify-end">
          <UButton
            type="submit"
            color="primary"
            icon="i-lucide-users"
            :label="t('configuration.user.bulkCreate.submit')"
            :loading="bulkCreate.isPending.value"
          />
        </div>
      </UForm>
    </UCard>
  </div>
</template>
