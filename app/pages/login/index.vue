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

const fields = computed<AuthFormField[]>(() => [
  {
    name: 'username',
    type: 'text',
    label: t('field_username'),
    required: true,
  },
  {
    name: 'password',
    type: 'password',
    label: t('field_password'),
    required: true,
  },
])

const sessionExpired = computed(() => route.query.reason === 'expired')

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
    class="flex flex-col lg:flex-row h-screen relative p-0 overflow-hidden"
  >
    <div class="flex-1/2 w-full p-4 flex flex-col">
      <header class="flex items-center justify-end">
        <UColorModeButton />
      </header>

      <UAuthForm
        class="max-w-lg mx-auto w-full h-full flex flex-col justify-center"
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
</i18n>
