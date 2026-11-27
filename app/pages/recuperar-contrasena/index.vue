<script setup lang="ts">
import {
  PASSWORD_RESET_CODE_TTL_MS,
  PASSWORD_RESET_RESEND_COOLDOWN_MS,
  classifyPasswordResetError,
  fetchErrorStatus,
  maskEmail,
  usePasswordReset,
} from '~/features/auth/composables/usePasswordReset'

/** Pública (sin middleware `auth`): el usuario aún no tiene sesión. */
definePageMeta({ layout: false })

const { t } = useI18n({ useScope: 'local' })
const route = useRoute()
const toast = useToast()
const session = useAuthSession()
const { lookupUser, requestCode, confirmReset } = usePasswordReset()

type Step = 'request' | 'confirm'
const step = ref<Step>('request')

// Paso 1. Solo el usuario: el correo sale del perfil (el backend lo da enmascarado) y no se puede editar.
const identity = reactive({
  username: typeof route.query.username === 'string' ? route.query.username : '',
})

/**
 * Usuario encontrado (`GET password/reset/lookup/`). Comparte el límite de 10 llamadas por hora con el confirm:
 * se consulta al salir del campo o 500 ms después de dejar de escribir, y cada usuario una sola vez.
 */
/** `no_email`: el usuario existe pero no tiene un correo válido (404 con `code: "no_email"`). */
type LookupState = 'idle' | 'loading' | 'found' | 'not_found' | 'no_email' | 'throttled' | 'error'
const lookupState = ref<LookupState>('idle')
const foundUsername = ref('')
/** Correo tal como lo regresa el lookup: solo en memoria, para mandarlo a n8n. Nunca se pinta. */
const foundEmail = ref('')
/** Lo único que se muestra: `h***@gmail.com`. */
const maskedEmail = computed(() => (foundEmail.value ? maskEmail(foundEmail.value) : ''))
/** Usuario (normalizado) al que corresponde el resultado mostrado. */
const lookedUpFor = ref('')
const lookupCache = new Map<string, { state: LookupState, username: string, email: string }>()
let lookupSeq = 0

const normalizedUsername = computed(() => identity.username.trim().toLowerCase())

function applyLookup(key: string, state: LookupState, username = '', email = '') {
  lookedUpFor.value = key
  lookupState.value = state
  foundUsername.value = username
  foundEmail.value = email
}

async function runLookup() {
  const key = normalizedUsername.value
  if (!key) {
    applyLookup('', 'idle')
    return
  }
  if (lookedUpFor.value === key && lookupState.value !== 'idle') {
    return
  }
  const cached = lookupCache.get(key)
  if (cached) {
    applyLookup(key, cached.state, cached.username, cached.email)
    return
  }

  const seq = ++lookupSeq
  applyLookup(key, 'loading')
  try {
    const result = await lookupUser(identity.username)
    if (seq !== lookupSeq) {
      return
    }
    applyLookup(key, 'found', result.username, result.email)
    lookupCache.set(key, { state: 'found', username: result.username, email: result.email })
  }
  catch (error) {
    if (seq !== lookupSeq) {
      return
    }
    const status = fetchErrorStatus(error)
    const notFound: LookupState = (error as { data?: { code?: string } })?.data?.code === 'no_email'
      ? 'no_email'
      : 'not_found'
    applyLookup(key, status === 404 ? notFound : status === 429 ? 'throttled' : 'error')
    // Solo el 404 es definitivo para ese usuario; un 429 o un error de red se puede reintentar.
    if (status === 404) {
      lookupCache.set(key, { state: notFound, username: '', email: '' })
    }
  }
}

// Al cambiar el texto se borra el resultado mostrado y se vuelve a consultar con debounce.
watch(normalizedUsername, (key) => {
  if (key !== lookedUpFor.value) {
    lookupSeq++
    applyLookup('', 'idle')
  }
})
watchDebounced(normalizedUsername, () => {
  void runLookup()
}, { debounce: 500 })
onMounted(() => {
  if (normalizedUsername.value) {
    void runLookup()
  }
})

const lookupMessage = computed(() => {
  switch (lookupState.value) {
    case 'not_found':
      return t('lookup_not_found')
    case 'no_email':
      return t('lookup_no_email')
    case 'throttled':
      return t('throttled')
    case 'error':
      return t('lookup_error')
    default:
      return ''
  }
})

const canRequest = computed(() =>
  lookupState.value === 'found' && lookedUpFor.value === normalizedUsername.value,
)
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
    // Al webhook de n8n van el username real y el correo del perfil (no algo que escriba el usuario).
    const detail = await requestCode({ username: foundUsername.value || identity.username, email: foundEmail.value })
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

/** Volver al paso 1 para corregir el usuario. */
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
              :loading="lookupState === 'loading'"
              @blur="runLookup"
            />
            <template #help>
              <p
                v-if="lookupMessage"
                class="flex items-start gap-1.5 text-sm text-error"
              >
                <UIcon
                  name="i-lucide-circle-alert"
                  class="mt-0.5 size-4 shrink-0"
                />
                <span>{{ lookupMessage }}</span>
              </p>
            </template>
          </UFormField>

          <!-- Correo del usuario encontrado: solo se muestra (enmascarado), no se puede escribir ni cambiar. -->
          <div aria-live="polite">
            <div
              v-if="lookupState === 'found'"
              class="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3"
            >
              <UIcon
                name="i-lucide-mail-check"
                class="mt-0.5 size-5 shrink-0 text-primary"
              />
              <div class="min-w-0 grid gap-0.5">
                <p class="text-sm text-muted">
                  {{ t('lookup_found_user', { username: foundUsername }) }}
                </p>
                <p class="text-sm">
                  {{ t('lookup_found_email') }}
                  <strong class="break-all text-default">{{ maskedEmail }}</strong>
                </p>
                <p class="text-xs text-muted">
                  {{ t('lookup_found_hint') }}
                </p>
              </div>
            </div>
          </div>

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
  tagline: Enter your username. We'll send a 6-digit key to the email registered on your account.
  field_username: Username
  placeholder_username: e.g. john.doe
  lookup_found_user: "User found: {username}"
  lookup_found_email: "We'll send the key to"
  lookup_found_hint: This is the email registered on your account. It can't be changed here.
  lookup_not_found: We couldn't find that user. Check that it's written correctly.
  lookup_no_email: This user doesn't have a valid email address, so we can't send you the key. Ask your administrator to update it.
  lookup_error: We couldn't look up the user. Please try again.
  send_code: Send key
  request_error: We couldn't send the key. Please try again.
  request_info_default: If the details are correct, you'll receive a key in your email.
  confirm_title: Enter your key
  confirm_tagline: "We sent a key to {email}. It expires in 5 minutes and you only get one attempt."
  field_code: Key
  expires_in: "Expires in {time}"
  code_expired: The key expired
  field_new: New password
  field_confirm: Confirm password
  show_password: Show password
  hide_password: Hide password
  validation_code: Enter the 6-digit key.
  validation_password: Enter the new password.
  validation_mismatch: The passwords do not match.
  submit: Change password
  resend: Resend key
  resend_wait: "Resend key ({seconds} s)"
  edit_identity: Change username
  throttled: Too many attempts. Wait a few minutes.
es:
  title: Recuperar contraseña
  tagline: Escribe tu usuario. Te enviaremos una clave de 6 dígitos al correo registrado en tu cuenta.
  field_username: Usuario
  placeholder_username: ej. hector.nexxus
  lookup_found_user: "Usuario encontrado: {username}"
  lookup_found_email: "Enviaremos la clave a"
  lookup_found_hint: Es el correo registrado en tu cuenta. No se puede cambiar aquí.
  lookup_not_found: No encontramos ese usuario. Revisa que esté bien escrito.
  lookup_no_email: Este usuario no tiene un correo electrónico válido, así que no podemos enviarte la clave. Pide a tu administrador que lo actualice.
  lookup_error: No pudimos buscar el usuario. Intenta de nuevo.
  send_code: Enviar clave
  request_error: No pudimos enviar la clave. Intenta de nuevo.
  request_info_default: Si los datos son correctos, recibirás una clave en tu correo.
  confirm_title: Escribe tu clave
  confirm_tagline: "Enviamos una clave a {email}. Vence en 5 minutos y solo tienes un intento."
  field_code: Clave
  expires_in: "Vence en {time}"
  code_expired: La clave venció
  field_new: Nueva contraseña
  field_confirm: Confirmar contraseña
  show_password: Mostrar contraseña
  hide_password: Ocultar contraseña
  validation_code: Escribe la clave de 6 dígitos.
  validation_password: Escribe la nueva contraseña.
  validation_mismatch: Las contraseñas no coinciden.
  submit: Cambiar contraseña
  resend: Reenviar clave
  resend_wait: "Reenviar clave ({seconds} s)"
  edit_identity: Cambiar usuario
  throttled: Demasiados intentos. Espera unos minutos.
  back_to_login: Volver a iniciar sesión
  success_title: Contraseña actualizada
  success_description: Inicia sesión con tu nueva contraseña.
</i18n>
