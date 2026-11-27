<script setup lang="ts">
import { useMutation } from '@tanstack/vue-query'
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'

const { t } = useI18n({ useScope: 'local' })
const { login, isLoggedIn } = useAuth()
const route = useRoute()

if (isLoggedIn.value) {
  await navigateTo('/')
}

const schema = computed(() =>
  z.object({
    username: z.string({ error: t('validation_username') }).min(1, t('validation_username')),
    password: z.string({ error: t('validation_password') }).min(1, t('validation_password')),
  }),
)

const { mutateAsync, isError, isPending, error } = useMutation<
  unknown,
  unknown,
  {
    username: string
    password: string
  }
>({
  mutationFn: variables => login(variables.username, variables.password),
})

const loginErrorMessage = computed(() =>
  error.value != null ? parseFetchError(error.value) : '',
)

/** Al volver de «Recuperar contraseña» llega el usuario para prellenarlo (la contraseña siempre vacía). */
const prefilledUsername = typeof route.query.username === 'string' ? route.query.username : undefined

const fields = computed<AuthFormField[]>(() => [
  {
    name: 'username',
    type: 'text',
    label: t('field_username'),
    required: true,
    defaultValue: prefilledUsername,
  },
  {
    name: 'password',
    type: 'password',
    label: t('field_password'),
    required: true,
  },
])

const sessionExpired = computed(() => route.query.reason === 'expired')

/** Lo que ya se escribió en «Usuario» pasa prellenado al paso 1 de «Recuperar contraseña». */
const authForm = useTemplateRef<{ state?: { username?: string } }>('authForm')
const forgotPasswordLink = computed(() => {
  const username = authForm.value?.state?.username?.trim()
  return { path: '/recuperar-contrasena', query: username ? { username } : undefined }
})

const onSubmit = async (
  event: FormSubmitEvent<{ username: string, password: string }>,
) => {
  await mutateAsync(event.data)
  const redirect = (route.query.redirect as string) || '/'
  await navigateTo(redirect)
}

definePageMeta({
  layout: false,
})

useSeoMeta({
  title: computed(() => t('title')),
})
</script>

<template>
  <UContainer
    class="flex flex-col lg:flex-row min-h-dvh lg:h-dvh relative p-0 overflow-y-auto lg:overflow-hidden"
  >
    <div class="flex-1/2 w-full p-4 flex flex-col">
      <header class="flex items-center justify-end">
        <UColorModeButton />
      </header>

      <UAuthForm
        ref="authForm"
        class="max-w-lg mx-auto w-full my-auto flex flex-col"
        :schema="schema"
        :fields="fields"
        :loading="isPending"
        @submit="onSubmit"
      >
        <template #header>
          <header class="grid gap-2">
            <NexxusLogo class="w-40" />
            <h1 class="text-left font-medium text-lg">
              {{ t('title') }}
            </h1>
            <p class="text-left text-muted">
              {{ t('tagline') }}
            </p>
          </header>
        </template>

        <template #footer>
          <div class="flex justify-end">
            <ULink
              :to="forgotPasswordLink"
              class="text-sm text-primary font-medium hover:underline"
            >
              {{ t('forgot_password') }}
            </ULink>
          </div>
        </template>

        <template #validation>
          <UAlert
            v-if="sessionExpired && !isError"
            color="warning"
            variant="subtle"
            icon="i-lucide-log-out"
            :title="t('session_expired_title')"
            :description="t('session_expired_description')"
          />
          <UAlert
            v-if="isError && loginErrorMessage"
            color="error"
            variant="subtle"
          >
            <template #title>{{ t('error_title') }}</template>
            <template #description>{{ loginErrorMessage }}</template>
          </UAlert>
        </template>
      </UAuthForm>
    </div>
  </UContainer>
</template>

<i18n lang="yaml">
en:
  title: Login
  tagline: Platform for the highest efficiency in transportation
  field_username: Username
  field_password: Password
  validation_username: Username is required
  validation_password: Password is required
  error_title: Sign-in error
  session_expired_title: Your session ended
  session_expired_description: It was closed on another device or is no longer valid. Sign in again to continue.
  forgot_password: Forgot your password?
es:
  title: Iniciar sesión
  tagline: Plataforma para la más alta eficiencia en transportes
  field_username: Usuario
  field_password: Contraseña
  validation_username: Usuario requerido
  validation_password: Contraseña requerida
  error_title: Error al acceder
  session_expired_title: Tu sesión terminó
  session_expired_description: Se cerró en otro dispositivo o ya no es válida. Inicia sesión de nuevo para continuar.
  forgot_password: ¿Olvidaste tu contraseña?
</i18n>
