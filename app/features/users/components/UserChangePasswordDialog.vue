<script setup lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'
import UserPasswordStrengthField from '~/features/users/components/UserPasswordStrengthField.vue'
import type { ChangePasswordSchema } from '~/features/users/schemas/user.schema'

const { t } = useI18n()
const {
  passwordUserId,
  isPasswordOpen,
  closePasswordDialog,
} = useUserManagementDialog()
const open = computed({
  get: () => isPasswordOpen.value,
  set: (value: boolean) => {
    if (!value) closePasswordDialog()
  },
})
const changePassword = useChangeUserPassword()
const form = useTemplateRef<Form<ChangePasswordSchema>>('form')
const showCurrent = ref(false)
const showConfirmation = ref(false)

const schema = computed(() => createChangePasswordSchema({
  currentPasswordRequired: t('configuration.user.validation.currentPasswordRequired'),
  passwordRequired: t('configuration.user.validation.passwordRequired'),
  passwordMin: t('configuration.user.validation.passwordMin'),
  passwordNumber: t('configuration.user.validation.passwordNumber'),
  passwordLowercase: t('configuration.user.validation.passwordLowercase'),
  passwordUppercase: t('configuration.user.validation.passwordUppercase'),
  confirmationRequired: t('configuration.user.validation.confirmationRequired'),
  passwordsMismatch: t('configuration.user.validation.passwordsMismatch'),
}))

function createInitialState(): ChangePasswordSchema {
  return {
    old_password: '',
    password1: '',
    password2: '',
  }
}

const state = reactive<ChangePasswordSchema>(createInitialState())

function resetForm() {
  Object.assign(state, createInitialState())
  showCurrent.value = false
  showConfirmation.value = false
  form.value?.clear()
}

watch(open, (isOpen) => {
  if (!isOpen) nextTick(resetForm)
})

async function onSubmit(event: FormSubmitEvent<ChangePasswordSchema>) {
  const userId = passwordUserId.value
  if (!userId) return

  try {
    await changePassword.mutateAsync({
      id: userId,
      payload: event.data,
    })
    closePasswordDialog()
  }
  catch {
    // El composable presenta el error ya interpretado.
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('configuration.user.password.title')"
    :description="t('configuration.user.password.description')"
    :ui="{ content: 'sm:max-w-xl' }"
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
          name="old_password"
          :label="t('configuration.user.password.current')"
          required
        >
          <UInput
            v-model="state.old_password"
            :type="showCurrent ? 'text' : 'password'"
            :placeholder="t('configuration.user.password.currentPlaceholder')"
            autocomplete="current-password"
            :ui="{ trailing: 'pe-1' }"
            class="w-full"
          >
            <template #trailing>
              <UButton
                type="button"
                color="neutral"
                variant="link"
                size="sm"
                :icon="showCurrent ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="showCurrent
                  ? t('configuration.user.passwordStrength.hide')
                  : t('configuration.user.passwordStrength.show')"
                :aria-pressed="showCurrent"
                @click="showCurrent = !showCurrent"
              />
            </template>
          </UInput>
        </UFormField>

        <UserPasswordStrengthField
          v-model="state.password1"
          name="password1"
          :label="t('configuration.user.password.new')"
          :placeholder="t('configuration.user.password.newPlaceholder')"
        />

        <UFormField
          name="password2"
          :label="t('configuration.user.password.confirm')"
          required
        >
          <UInput
            v-model="state.password2"
            :type="showConfirmation ? 'text' : 'password'"
            :placeholder="t('configuration.user.password.confirmPlaceholder')"
            autocomplete="new-password"
            :ui="{ trailing: 'pe-1' }"
            class="w-full"
          >
            <template #trailing>
              <UButton
                type="button"
                color="neutral"
                variant="link"
                size="sm"
                :icon="showConfirmation ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="showConfirmation
                  ? t('configuration.user.passwordStrength.hide')
                  : t('configuration.user.passwordStrength.show')"
                :aria-pressed="showConfirmation"
                @click="showConfirmation = !showConfirmation"
              />
            </template>
          </UInput>
        </UFormField>

        <div class="mt-2 flex justify-end">
          <UButton
            type="submit"
            color="primary"
            :label="t('configuration.user.password.submit')"
            :loading="changePassword.isPending.value"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
