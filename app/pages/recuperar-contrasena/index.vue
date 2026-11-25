<script setup lang="ts">
import {
  PASSWORD_RESET_CODE_TTL_MS,
  PASSWORD_RESET_RESEND_COOLDOWN_MS,
  classifyPasswordResetError,
  maskEmail,
  usePasswordReset,
} from '~/features/auth/composables/usePasswordReset'

/** Pública (sin middleware `auth`): el usuario aún no tiene sesión. */
definePageMeta({ layout: false })

const { t } = useI18n({ useScope: 'local' })
const route = useRoute()
const toast = useToast()
const session = useAuthSession()
const { requestCode, confirmReset } = usePasswordReset()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Step = 'request' | 'confirm'
const step = ref<Step>('request')

// Paso 1. Usuario y correo se conservan en memoria para el paso 2 (nunca en la URL ni en localStorage).
const identity = reactive({
  username: typeof route.query.username === 'string' ? route.query.username : '',
  email: '',
})
const emailValid = computed(() => EMAIL_PATTERN.test(identity.email.trim()))
const canRequest = computed(() => identity.username.trim() !== '' && emailValid.value)
const requesting = ref(false)
const requestError = ref('')
/** Mensaje genérico de n8n ("Si los datos son correctos…"). */
const requestInfo = ref('')

// Paso 2.
const codeDigits = ref<number[]>([])
const code = computed(() => codeDigits.value.filter(digit => digit != null && !Number.isNaN(digit)).join(''))
const passwords = reactive({ next: '', confirm: '' })
const visible = reactive({ next: false, confirm: false })

function toggleVisible(key: keyof typeof visible) {
  visible[key] = !visible[key]
}
const confirming = ref(false)
/** Error general (red, 429, código inválido). */
const confirmError = ref('')
/** Error de los validadores de contraseña: va bajo «Nueva contraseña» y el código sigue sirviendo. */
const passwordError = ref('')
const mismatchError = ref('')
const codeError = ref('')
/** El backend dio el código por gastado (un intento, vencido o usado): solo queda reenviar. */
const codeSpent = ref(false)

// Contadores: vence a los 5 min y «Reenviar código» espera 30 s tras cada envío.
const sentAt = ref<number | null>(null)
const now = useNow({ interval: 1000 })
const remainingMs = computed(() =>
  sentAt.value == null ? 0 : Math.max(0, sentAt.value + PASSWORD_RESET_CODE_TTL_MS - now.value.getTime()),
)
const expired = computed(() => step.value === 'confirm' && remainingMs.value === 0)
const countdown = computed(() => {
  const totalSeconds = Math.ceil(remainingMs.value / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})
const resendWaitSeconds = computed(() =>
  sentAt.value == null
    ? 0
    : Math.max(0, Math.ceil((sentAt.value + PASSWORD_RESET_RESEND_COOLDOWN_MS - now.value.getTime()) / 1000)),
)
const resendDisabled = computed(() => requesting.value || resendWaitSeconds.value > 0)
/** Sin código válido no hay nada que enviar: se resalta «Reenviar código». */
const needsNewCode = computed(() => codeSpent.value || expired.value)

const maskedEmail = computed(() => maskEmail(identity.email))

function resetConfirmErrors() {
  confirmError.value = ''
  passwordError.value = ''
  mismatchError.value = ''
  codeError.value = ''
}

/** Paso 1 y «Reenviar código»: el reenvío invalida el código anterior (lo hace el backend al generar otro). */
async function sendCode() {
  if (!canRequest.value || requesting.value) {
    return
  }
  requesting.value = true
  requestError.value = ''
  try {
    const detail = await requestCode({ username: identity.username, email: identity.email })
    requestInfo.value = detail ?? t('request_info_default')
    sentAt.value = Date.now()
    codeDigits.value = []
    codeSpent.value = false
    resetConfirmErrors()
    step.value = 'confirm'
  }
  catch {
    // Red o 5xx de n8n: nunca se dice si el usuario existe.
    requestError.value = t('request_error')
  }
  finally {
    requesting.value = false
  }
}

async function onConfirm() {
  if (confirming.value || needsNewCode.value) {
    return
  }
  resetConfirmErrors()
  if (!/^\d{6}$/.test(code.value)) {
    codeError.value = t('validation_code')
    return
  }
  if (!passwords.next) {
    passwordError.value = t('validation_password')
    return
  }
  if (passwords.next !== passwords.confirm) {
    mismatchError.value = t('validation_mismatch')
    return
  }

  confirming.value = true
  try {
    const detail = await confirmReset({
      username: identity.username,
      email: identity.email,
      code: code.value,
      new_password: passwords.next,
      new_password2: passwords.confirm,
    })
    // El backend cerró las sesiones del usuario: si la guardada en este navegador era suya, ya no sirve.
    if (session.value?.user?.username?.toLowerCase() === identity.username.trim().toLowerCase()) {
      session.value = null
    }
    toast.add({
      title: t('success_title'),
      description: detail ?? t('success_description'),
      icon: 'i-lucide-circle-check',
      color: 'success',
    })
    passwords.next = ''
    passwords.confirm = ''
    codeDigits.value = []
    await navigateTo({ path: '/login', query: { username: identity.username.trim() } }, { replace: true })
  }
  catch (error) {
    const { kind, message } = classifyPasswordResetError(error)
    if (kind === 'code') {
      // Un solo intento: este código ya no sirve. No se deja reintentar con él.
      codeSpent.value = true
      codeDigits.value = []
      confirmError.value = message
    }
    else if (kind === 'password') {
      passwordError.value = message
    }
    else if (kind === 'throttled') {
      confirmError.value = t('throttled')
    }
    else {
      confirmError.value = message
    }
  }
  finally {
    confirming.value = false
  }
}

/** Volver al paso 1 para corregir usuario o correo. */
function editIdentity() {
  step.value = 'request'
  codeDigits.value = []
  passwords.next = ''
  passwords.confirm = ''
  resetConfirmErrors()
}

const loginLink = computed(() => ({
  path: '/login',
  query: identity.username.trim() ? { username: identity.username.trim() } : undefined,
}))

useSeoMeta({
  title: computed(() => t('title')),
})
</script>

<template>
  <UContainer class="flex flex-col min-h-dvh lg:h-dvh relative p-0 overflow-y-auto lg:overflow-hidden">
    <div class="w-full p-4 flex flex-col flex-1">
      <header class="flex items-center justify-end">
        <UColorModeButton />
      </header>

      <div class="max-w-lg mx-auto w-full my-auto flex flex-col gap-6">
        <header class="grid gap-2">
          <NexxusLogo class="w-40" />
          <h1 class="text-left font-medium text-lg">
            {{ step === 'request' ? t('title') : t('confirm_title') }}
          </h1>
          <p
            v-if="step === 'request'"
            class="text-left text-muted"
          >
            {{ t('tagline') }}
          </p>
          <p
            v-else
            class="text-left text-muted"
          >
            {{ t('confirm_tagline', { email: maskedEmail }) }}
          </p>
        </header>

        <!-- Paso 1: pedir el código -->
        <UForm
          v-if="step === 'request'"
          :state="identity"
          class="grid gap-4"
          @submit="sendCode"
        >
          <UFormField
            name="username"
            :label="t('field_username')"
            required
          >
            <UInput
              v-model="identity.username"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              size="xl"
              class="w-full"
              :placeholder="t('placeholder_username')"
            />
          </UFormField>

          <UFormField
            name="email"
            :label="t('field_email')"
            :error="identity.email.trim() !== '' && !emailValid ? t('validation_email') : undefined"
            required
          >
            <UInput
              v-model="identity.email"
              type="email"
              inputmode="email"
              autocomplete="email"
              autocapitalize="none"
              spellcheck="false"
              size="xl"
              class="w-full"
              :placeholder="t('placeholder_email')"
            />
          </UFormField>

          <div aria-live="assertive">
            <UAlert
              v-if="requestError"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              :description="requestError"
            />
          </div>

          <UButton
            type="submit"
            size="xl"
            block
            :loading="requesting"
            :disabled="!canRequest"
          >
            {{ t('send_code') }}
          </UButton>
        </UForm>

        <!-- Paso 2: código y nueva contraseña -->
        <UForm
          v-else
          :state="passwords"
          class="grid gap-4"
          @submit="onConfirm"
        >
          <div aria-live="polite">
            <UAlert
              v-if="requestInfo"
              color="info"
              variant="subtle"
              icon="i-lucide-mail"
              :description="requestInfo"
            />
          </div>

          <UFormField
            name="code"
            :label="t('field_code')"
            :error="codeError || undefined"
            required
          >
            <template #hint>
              <span
                class="tabular-nums"
                :class="expired ? 'text-error' : 'text-muted'"
                aria-live="polite"
              >
                {{ expired ? t('code_expired') : t('expires_in', { time: countdown }) }}
              </span>
            </template>
            <UPinInput
              v-model="codeDigits"
              type="number"
              otp
              :length="6"
              size="xl"
              :disabled="needsNewCode"
              :aria-label="t('field_code')"
              class="w-full justify-between"
            />
          </UFormField>

          <UFormField
            name="new_password"
            :label="t('field_new')"
            :error="passwordError || undefined"
            required
          >
            <UInput
              v-model="passwords.next"
              :type="visible.next ? 'text' : 'password'"
              autocomplete="new-password"
              size="xl"
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
                  @click="toggleVisible('next')"
                />
              </template>
            </UInput>
          </UFormField>

          <UFormField
            name="confirm_password"
            :label="t('field_confirm')"
            :error="mismatchError || undefined"
            required
          >
            <UInput
              v-model="passwords.confirm"
              :type="visible.confirm ? 'text' : 'password'"
              autocomplete="new-password"
              size="xl"
              class="w-full"
              :ui="{ trailing: 'pe-1' }"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="visible.confirm ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="visible.confirm ? t('hide_password') : t('show_password')"
                  :aria-pressed="visible.confirm"
                  @click="toggleVisible('confirm')"
                />
              </template>
            </UInput>
          </UFormField>

          <div aria-live="assertive">
            <UAlert
              v-if="confirmError || requestError"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              :description="confirmError || requestError"
            />
          </div>

          <UButton
            type="submit"
            size="xl"
            block
            :loading="confirming"
            :disabled="needsNewCode || requesting"
          >
            {{ t('submit') }}
          </UButton>

          <div class="flex flex-wrap items-center justify-between gap-2">
            <UButton
              type="button"
              :color="needsNewCode ? 'primary' : 'neutral'"
              :variant="needsNewCode ? 'soft' : 'link'"
              icon="i-lucide-rotate-cw"
              :loading="requesting"
              :disabled="resendDisabled"
              @click="sendCode"
            >
              {{ resendWaitSeconds > 0 ? t('resend_wait', { seconds: resendWaitSeconds }) : t('resend') }}
            </UButton>
            <UButton
              type="button"
              color="neutral"
              variant="link"
              :disabled="confirming"
              @click="editIdentity"
            >
              {{ t('edit_identity') }}
            </UButton>
          </div>
        </UForm>

        <ULink
          :to="loginLink"
          class="inline-flex items-center gap-1 self-start text-sm text-muted hover:text-default"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          {{ t('back_to_login') }}
        </ULink>
      </div>
    </div>
  </UContainer>
</template>

<i18n lang="yaml">
en:
  title: Recover password
  tagline: Enter your username and registered email. We'll send you a 6-digit code.
  field_username: Username
  field_email: Email
  placeholder_username: e.g. john.doe
  placeholder_email: "name{'@'}company.com"
  validation_email: Enter a valid email
  send_code: Send code
  request_error: We couldn't send the code. Please try again.
  request_info_default: If the details are correct, you'll receive a code in your email.
  confirm_title: Enter your code
  confirm_tagline: "We sent a code to {email}. It expires in 5 minutes and you only get one attempt."
  field_code: Code
  expires_in: "Expires in {time}"
  code_expired: The code expired
  field_new: New password
  field_confirm: Confirm password
  show_password: Show password
  hide_password: Hide password
  validation_code: Enter the 6-digit code.
  validation_password: Enter the new password.
  validation_mismatch: The passwords do not match.
  submit: Change password
  resend: Resend code
  resend_wait: "Resend code ({seconds} s)"
  edit_identity: Change username or email
  throttled: Too many attempts. Wait a few minutes and try again.
  back_to_login: Back to sign in
  success_title: Password updated
  success_description: Sign in with your new password.
es:
  title: Recuperar contraseña
  tagline: Escribe tu usuario y el correo registrado. Te enviaremos un código de 6 dígitos.
  field_username: Usuario
  field_email: Correo
  placeholder_username: ej. hector.nexxus
  placeholder_email: "nombre{'@'}empresa.com"
  validation_email: Escribe un correo válido
  send_code: Enviar código
  request_error: No pudimos enviar el código. Intenta de nuevo.
  request_info_default: Si los datos son correctos, recibirás un código en tu correo.
  confirm_title: Escribe tu código
  confirm_tagline: "Enviamos un código a {email}. Vence en 5 minutos y solo tienes un intento."
  field_code: Código
  expires_in: "Vence en {time}"
  code_expired: El código venció
  field_new: Nueva contraseña
  field_confirm: Confirmar contraseña
  show_password: Mostrar contraseña
  hide_password: Ocultar contraseña
  validation_code: Escribe el código de 6 dígitos.
  validation_password: Escribe la nueva contraseña.
  validation_mismatch: Las contraseñas no coinciden.
  submit: Cambiar contraseña
  resend: Reenviar código
  resend_wait: "Reenviar código ({seconds} s)"
  edit_identity: Cambiar usuario o correo
  throttled: Demasiados intentos. Espera unos minutos e inténtalo de nuevo.
  back_to_login: Volver a iniciar sesión
  success_title: Contraseña actualizada
  success_description: Inicia sesión con tu nueva contraseña.
</i18n>
