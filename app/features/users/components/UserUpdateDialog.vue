<script setup lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'
import type { UpdateUserSchema } from '~/features/users/schemas/user.schema'
import type { UserProfileDetail } from '~/features/users/types/user.types'

const { t } = useI18n()
const { editUserId, isEditOpen, closeEditDialog } = useUserManagementDialog()
const open = computed({
  get: () => isEditOpen.value,
  set: (value: boolean) => {
    if (!value) closeEditDialog()
  },
})
const updateUser = useUpdateUser()
const {
  data: user,
  errorMessage,
  isError,
  isPending,
  refetch,
} = useUserDetail(editUserId)

const form = useTemplateRef<Form<UpdateUserSchema>>('form')
const schema = computed(() => createUpdateUserSchema({
  usernameRequired: t('configuration.user.validation.usernameRequired'),
  emailInvalid: t('configuration.user.validation.emailInvalid'),
  corporateEmailInvalid: t('configuration.user.validation.corporateEmailInvalid'),
}))

function createInitialState(): UpdateUserSchema {
  return {
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    corporate_email: '',
    whatsapp: '',
  }
}

const state = reactive<UpdateUserSchema>(createInitialState())

const usernameModel = computed({
  get: () => state.username,
  set: (value: string) => {
    state.username = value.toLocaleUpperCase()
  },
})

function applyUser(detail: UserProfileDetail) {
  Object.assign(state, {
    username: detail.username.toLocaleUpperCase(),
    first_name: detail.first_name,
    last_name: detail.last_name,
    email: detail.email,
    corporate_email: detail.corporate_email,
    whatsapp: detail.whatsapp,
  })
}

function resetForm() {
  Object.assign(state, createInitialState())
  form.value?.clear()
}

watch(user, (detail) => {
  if (detail) applyUser(detail)
})

watch(open, (isOpen) => {
  if (!isOpen) nextTick(resetForm)
})

async function onSubmit(event: FormSubmitEvent<UpdateUserSchema>) {
  const userId = editUserId.value
  if (!userId) return

  try {
    await updateUser.mutateAsync({
      id: userId,
      payload: event.data,
    })
    closeEditDialog()
  }
  catch {
    // El composable presenta el error ya interpretado.
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('configuration.user.update.title')"
    :description="t('configuration.user.update.description')"
    :ui="{
      content: 'sm:max-w-2xl',
      body: 'max-h-[calc(100dvh-10rem)] overflow-y-auto',
    }"
  >
    <template #body>
      <div
        v-if="isPending"
        class="grid gap-3"
      >
        <USkeleton
          v-for="index in 6"
          :key="index"
          class="h-10 w-full"
        />
      </div>

      <UAlert
        v-else-if="isError"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="t('configuration.user.update.loadErrorTitle')"
        :description="errorMessage"
        :actions="[{
          label: t('configuration.user.list.retry'),
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
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField
          name="username"
          :label="t('configuration.user.fields.username')"
          required
        >
          <UInput
            v-model="usernameModel"
            :placeholder="t('configuration.user.placeholders.username')"
            autocomplete="username"
            class="w-full"
          />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            name="first_name"
            :label="t('configuration.user.fields.firstName')"
          >
            <UInput
              v-model="state.first_name"
              :placeholder="t('configuration.user.placeholders.firstName')"
              autocomplete="given-name"
              class="w-full"
            />
          </UFormField>

          <UFormField
            name="last_name"
            :label="t('configuration.user.fields.lastName')"
          >
            <UInput
              v-model="state.last_name"
              :placeholder="t('configuration.user.placeholders.lastName')"
              autocomplete="family-name"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          name="email"
          :label="t('configuration.user.fields.email')"
        >
          <UInput
            v-model="state.email"
            type="email"
            :placeholder="t('configuration.user.placeholders.email')"
            autocomplete="email"
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="corporate_email"
          :label="t('configuration.user.fields.corporateEmail')"
        >
          <UInput
            v-model="state.corporate_email"
            type="email"
            :placeholder="t('configuration.user.placeholders.corporateEmail')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="whatsapp"
          :label="t('configuration.user.fields.whatsapp')"
        >
          <UInput
            v-model="state.whatsapp"
            type="tel"
            :placeholder="t('configuration.user.placeholders.whatsapp')"
            autocomplete="tel"
            class="w-full"
          />
        </UFormField>

        <div class="mt-2 flex justify-end">
          <UButton
            type="submit"
            color="primary"
            :label="t('configuration.user.update.submit')"
            :loading="updateUser.isPending.value"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
