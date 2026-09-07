<script setup lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'
import BulkCompanySelect from '~/features/users/components/BulkCompanySelect.vue'
import UserBulkCreateResultModal from '~/features/users/components/UserBulkCreateResultModal.vue'
import type { BulkUserSchema } from '~/features/users/schemas/bulk-user.schema'
import type { BulkCreatedUserCredential, BulkCreateUserItem } from '~/features/users/types/user.types'

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
  firstNameRequired: t('configuration.user.bulkCreate.validation.firstNameRequired'),
  lastNameRequired: t('configuration.user.bulkCreate.validation.lastNameRequired'),
  emailRequired: t('configuration.user.bulkCreate.validation.emailRequired'),
  emailInvalid: t('configuration.user.bulkCreate.validation.emailInvalid'),
  whatsappRequired: t('configuration.user.bulkCreate.validation.whatsappRequired'),
  usersMin: t('configuration.user.bulkCreate.validation.usersMin'),
}))

const state = reactive<BulkUserFormState>({
  company: undefined,
  users: [createEmptyUser()],
})

const isResultModalOpen = ref(false)
const createdCredentials = ref<BulkCreatedUserCredential[]>([])

function createEmptyUser(): BulkCreateUserItem {
  return {
    username: '',
    first_name: '',
    last_name: '',
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
    const credentials = await bulkCreate.mutateAsync({
      organization: organizationId,
      company: event.data.company,
      users: event.data.users,
    })
    createdCredentials.value = credentials
    isResultModalOpen.value = true
  }
  catch {
    // El composable presenta el error ya interpretado.
  }
}

watch(isResultModalOpen, (isOpenValue) => {
  if (!isOpenValue) navigateTo('/configuration/user')
})
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
              class="space-y-3 rounded-lg border border-default p-3"
            >
              <div class="flex items-start justify-between gap-3">
                <span class="pt-1.5 text-xs font-medium text-muted">
                  {{ t('configuration.user.bulkCreate.userNumber', { number: index + 1 }) }}
                </span>
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

              <div class="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  :name="`users.${index}.first_name`"
                  :label="t('configuration.user.fields.firstName')"
                  required
                >
                  <UInput
                    v-model="user.first_name"
                    :placeholder="t('configuration.user.placeholders.firstName')"
                    autocomplete="given-name"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  :name="`users.${index}.last_name`"
                  :label="t('configuration.user.fields.lastName')"
                  required
                >
                  <UInput
                    v-model="user.last_name"
                    :placeholder="t('configuration.user.placeholders.lastName')"
                    autocomplete="family-name"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <div class="grid items-start gap-3 sm:grid-cols-2">
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

    <UserBulkCreateResultModal
      v-model="isResultModalOpen"
      :credentials="createdCredentials"
    />
  </div>
</template>
