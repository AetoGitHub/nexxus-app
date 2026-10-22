<script setup lang="ts">
import { useMutation } from '@tanstack/vue-query'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ middleware: 'auth', layout: false })

const { t } = useI18n({ useScope: 'local' })
const route = useRoute()
const toast = useToast()
const { changePassword, mustChangePassword, logout } = useAuth()

/** Quien entra por contraseña temporal no puede salir de aquí hasta cambiarla; los demás pueden volver. */
const isForced = computed(() => mustChangePassword.value)

const schema = computed(() =>
  z
    .object({
      current_password: z.string({ error: t('validation_current') }).min(1, t('validation_current')),
      new_password: z.string({ error: t('validation_new') }).min(1, t('validation_new')),
      confirm_password: z.string({ error: t('validation_confirm') }).min(1, t('validation_confirm')),
    })
    .refine(data => data.new_password === data.confirm_password, {
      path: ['confirm_password'],
      message: t('validation_mismatch'),
    })
    .refine(data => data.new_password !== data.current_password, {
      path: ['new_password'],
      message: t('validation_same'),
    }),
)

type Schema = z.output<typeof schema.value>

const state = reactive({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

const visible = reactive({ current: false, next: false })

const { mutateAsync, isPending, isError, error, reset } = useMutation<
  unknown,
  unknown,
  { current: string, next: string }
>({
  mutationFn: variables => changePassword(variables.current, variables.next),
})

const errorMessage = computed(() => (error.value != null ? parseFetchError(error.value) : ''))

/** Solo rutas internas: un `redirect` externo o con `//` mandaría al usuario fuera de la app. */
const redirectTo = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') && redirect !== '/change-password'
    ? redirect
    : '/'
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  reset()
  await mutateAsync({ current: event.data.current_password, next: event.data.new_password })
  toast.add({
    title: t('success_title'),
    description: t('success_description'),
    icon: 'i-lucide-circle-check',
    color: 'success',
  })
  await navigateTo(redirectTo.value, { replace: true })
}

useSeoMeta({
  title: computed(() => t('title')),
})
</script>

<template>
  <UContainer class="flex flex-col h-screen relative p-0 overflow-hidden">
    <div class="w-full p-4 flex flex-col h-full">
      <header class="flex items-center justify-end">
        <UColorModeButton />
      </header>

      <div class="max-w-lg mx-auto w-full h-full flex flex-col justify-center gap-6">
        <header class="grid gap-2">
          <NexxusLogo class="w-40" />
          <h1 class="text-left font-medium text-lg">
            {{ t('title') }}
          </h1>
          <p class="text-left text-muted">
            {{ isForced ? t('tagline_forced') : t('tagline') }}
          </p>
        </header>

        <UAlert
          v-if="isForced"
          color="warning"
          variant="subtle"
          icon="i-lucide-key-round"
          :title="t('forced_title')"
          :description="t('forced_description')"
        />

        <UForm
          :schema="schema"
          :state="state"
          class="grid gap-4"
          @submit="onSubmit"
        >
          <UFormField
            name="current_password"
            :label="t('field_current')"
            required
          >
            <UInput
              v-model="state.current_password"
              :type="visible.current ? 'text' : 'password'"
              autocomplete="current-password"
              class="w-full"
              :ui="{ trailing: 'pe-1' }"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="visible.current ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="visible.current ? t('hide_password') : t('show_password')"
                  :aria-pressed="visible.current"
                  @click="visible.current = !visible.current"
                />
              </template>
            </UInput>
          </UFormField>

          <UFormField
            name="new_password"
            :label="t('field_new')"
            required
          >
            <UInput
              v-model="state.new_password"
              :type="visible.next ? 'text' : 'password'"
              autocomplete="new-password"
              class="w-full"
              :ui="{ trailing: 'pe-1' }"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="visible.next ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="visible.next ? t('hide_password') : t('show_password')"
                  :aria-pressed="visible.next"
                  @click="visible.next = !visible.next"
                />
              </template>
            </UInput>
          </UFormField>

          <UFormField
            name="confirm_password"
            :label="t('field_confirm')"
            required
          >
            <UInput
              v-model="state.confirm_password"
              :type="visible.next ? 'text' : 'password'"
              autocomplete="new-password"
              class="w-full"
            />
          </UFormField>

          <UAlert
            v-if="isError && errorMessage"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="t('error_title')"
            :description="errorMessage"
          />

          <div class="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <UButton
              v-if="isForced"
              type="button"
              color="neutral"
              variant="ghost"
              icon="i-lucide-log-out"
              :disabled="isPending"
              @click="logout"
            >
              {{ t('logout') }}
            </UButton>
            <UButton
              v-else
              type="button"
              color="neutral"
              variant="ghost"
              icon="i-lucide-arrow-left"
              :disabled="isPending"
              @click="navigateTo(redirectTo)"
            >
              {{ t('back') }}
            </UButton>

            <UButton
              type="submit"
              :loading="isPending"
              icon="i-lucide-save"
            >
              {{ t('submit') }}
            </UButton>
          </div>
        </UForm>
      </div>
    </div>
  </UContainer>
</template>

<i18n lang="yaml">
en:
  title: Change password
  tagline: Choose a new password for your account.
  tagline_forced: Set your own password to continue.
  forced_title: You must change your temporary password
  forced_description: You can't use the platform until you set a new password.
  field_current: Current password
  field_new: New password
  field_confirm: Confirm new password
  validation_current: Current password is required
  validation_new: New password is required
  validation_confirm: Confirm the new password
  validation_mismatch: Passwords do not match
  validation_same: The new password must be different from the current one
  show_password: Show password
  hide_password: Hide password
  submit: Change password
  logout: Sign out
  back: Back
  error_title: Couldn't change the password
  success_title: Password updated
  success_description: Your new password is ready to use.
es:
  title: Cambiar contraseña
  tagline: Elige una contraseña nueva para tu cuenta.
  tagline_forced: Define tu propia contraseña para continuar.
  forced_title: Debes cambiar tu contraseña temporal
  forced_description: No podrás usar la plataforma hasta que establezcas una contraseña nueva.
  field_current: Contraseña actual
  field_new: Contraseña nueva
  field_confirm: Confirmar contraseña nueva
  validation_current: Contraseña actual requerida
  validation_new: Contraseña nueva requerida
  validation_confirm: Confirma la contraseña nueva
  validation_mismatch: Las contraseñas no coinciden
  validation_same: La contraseña nueva debe ser distinta de la actual
  show_password: Mostrar contraseña
  hide_password: Ocultar contraseña
  submit: Cambiar contraseña
  logout: Cerrar sesión
  back: Volver
  error_title: No se pudo cambiar la contraseña
  success_title: Contraseña actualizada
  success_description: Tu nueva contraseña ya está activa.
</i18n>
