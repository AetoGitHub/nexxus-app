<script setup lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'
import UserPasswordStrengthField from '~/features/users/components/UserPasswordStrengthField.vue'
import type { CreateUserSchema } from '~/features/users/schemas/user.schema'

const { t } = useI18n()
const createUser = useCreateUser()
const open = ref(false)
const form = useTemplateRef<Form<CreateUserSchema>>('form')

const schema = computed(() => createUserSchema({
  usernameRequired: t('configuration.user.validation.usernameRequired'),
  passwordRequired: t('configuration.user.validation.passwordRequired'),
  passwordMin: t('configuration.user.validation.passwordMin'),
  passwordNumber: t('configuration.user.validation.passwordNumber'),
  passwordLowercase: t('configuration.user.validation.passwordLowercase'),
  passwordUppercase: t('configuration.user.validation.passwordUppercase'),
  emailInvalid: t('configuration.user.validation.emailInvalid'),
  corporateEmailInvalid: t('configuration.user.validation.corporateEmailInvalid'),
}))

function createInitialState(): CreateUserSchema {
  return {
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    corporate_email: '',
    whatsapp: '',
  }
}

const state = reactive<CreateUserSchema>(createInitialState())

const usernameModel = computed({
  get: () => state.username,
  set: (value: string) => {
    state.username = value.toLocaleUpperCase()
  },
})

function resetForm() {
  Object.assign(state, createInitialState())
  form.value?.clear()
}

watch(open, (isOpen) => {
  if (!isOpen) {
    nextTick(resetForm)
  }
})

async function onSubmit(event: FormSubmitEvent<CreateUserSchema>) {
  try {
    await createUser.mutateAsync(event.data)
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
    :title="t('configuration.user.create.title')"
    :description="t('configuration.user.create.description')"
    :ui="{
      content: 'sm:max-w-2xl',
      body: 'max-h-[calc(100dvh-10rem)] overflow-y-auto',
    }"
  >
    <AppCreateToolbarButton
      :label="t('configuration.user.create.toolbarButton')"
      :aria-label="t('configuration.user.create.title')"
    />

    <template #body>
      <UForm
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

        <UserPasswordStrengthField
          v-model="state.password"
          name="password"
          :label="t('configuration.user.fields.password')"
          :placeholder="t('configuration.user.placeholders.password')"
        />

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
            :label="t('configuration.user.create.submit')"
            :loading="createUser.isPending.value"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
