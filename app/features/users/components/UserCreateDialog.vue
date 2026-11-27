<script setup lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'
import UserAppearanceField from '~/features/users/components/UserAppearanceField.vue'
import { initialsFromNames } from '~/features/auth/utils/profile-appearance.util'
import { useUserImageUpload } from '~/features/users/composables/useUserImageUpload'
import UserPasswordStrengthField from '~/features/users/components/UserPasswordStrengthField.vue'
import type { CreateUserSchema } from '~/features/users/schemas/user.schema'
import { useOrganizationsDropdown } from '~/features/organizations/composables/useOrganizationsDropdown'
import { useCompaniesDropdown } from '~/features/companies/composables/useCompaniesDropdown'
import { useApplyPermissionPreset, usePermissionPresets } from '~/features/permissions/composables/usePermissionsAdmin'
import { fetchErrorStatus, useApplyPresetApp, usePresetsApp } from '~/features/permissions/composables/usePresetsApp'

const props = defineProps<{
  /** Organización elegida en el selector de la barra: se preselecciona al abrir. */
  organizationId?: number | null
}>()

const { t } = useI18n()
const createUser = useCreateUser()
const { uploadUserImage, isUploading } = useUserImageUpload()
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
  organizationRequired: t('configuration.user.validation.organizationRequired'),
  companyRequired: t('configuration.user.validation.companyRequired'),
}))

type UserCreateFormState = Omit<CreateUserSchema, 'organization' | 'company'> & {
  organization: number | undefined
  company: number | undefined
}

function createInitialState(): UserCreateFormState {
  return {
    username: '',
    password: '',
    organization: undefined,
    company: undefined,
    first_name: '',
    last_name: '',
    email: '',
    corporate_email: '',
    whatsapp: '',
    background_color: '',
    background_image: '',
  }
}

const state = reactive<UserCreateFormState>(createInitialState())
/** Foto elegida; se sube a Firebase al guardar y su URL va en `background_image`. */
const pendingImage = ref<File | null>(null)

const appearanceInitials = computed(() => initialsFromNames(state.first_name, state.last_name) ?? getInitials(state.username))

const { items: organizationItems } = useOrganizationsDropdown()
const { items: companyItems, isPending: companyItemsPending } = useCompaniesDropdown({
  organizationId: () => state.organization,
})

const usernameModel = computed({
  get: () => state.username,
  set: (value: string) => {
    state.username = value.toLocaleUpperCase()
  },
})

const firstNameModel = computed({
  get: () => state.first_name,
  set: (value: string) => {
    state.first_name = toNameCase(value)
  },
})

const lastNameModel = computed({
  get: () => state.last_name,
  set: (value: string) => {
    state.last_name = toNameCase(value)
  },
})

/** Al cambiar de organización, la compañía elegida puede dejar de pertenecerle. */
watch(() => state.organization, () => {
  if (!companyItems.value.some(item => item.value === state.company)) {
    state.company = undefined
  }
})

/**
 * Atajo: elegir una plantilla o un Preset App de la compañía; al crear el usuario se le aplica en esa compañía.
 * Plantillas solo para superusers (su API es solo de superuser); Presets App si la API los deja ver (`settings.can_presets`,
 * un 403 simplemente no muestra el grupo).
 */
const { isSuperuser } = usePermissions()
const presetsQuery = usePermissionPresets(() => (isSuperuser.value ? state.company ?? null : null))
const presetsAppQuery = usePresetsApp(() => ({ company: state.company }), () => state.company != null)
const applyPreset = useApplyPermissionPreset()
const applyPresetApp = useApplyPresetApp()

/** `preset:<id>` (plantilla) o `app:<id>` (Preset App). */
type PresetChoice = `preset:${number}` | `app:${number}`
const presetChoice = ref<PresetChoice | undefined>(undefined)

const presetOptions = computed(() => (isSuperuser.value ? presetsQuery.data.value ?? [] : [])
  .map(preset => ({ value: `preset:${preset.id}` as PresetChoice, label: preset.name, icon: 'i-lucide-layout-template' })))
const presetAppOptions = computed(() => (presetsAppQuery.data.value ?? [])
  .filter(preset => preset.company === state.company)
  .map(preset => ({ value: `app:${preset.id}` as PresetChoice, label: preset.name, icon: 'i-lucide-app-window' })))
const presetItems = computed(() => [
  ...(presetOptions.value.length
    ? [[{ type: 'label' as const, label: t('permissions.tabs.presets') }, ...presetOptions.value]]
    : []),
  ...(presetAppOptions.value.length
    ? [[{ type: 'label' as const, label: t('permissions.tabs.presetsApp') }, ...presetAppOptions.value]]
    : []),
])
const hasPresetOptions = computed(() => presetOptions.value.length > 0 || presetAppOptions.value.length > 0)
const presetsLoading = computed(() =>
  (isSuperuser.value && presetsQuery.isFetching.value)
  || (presetsAppQuery.isFetching.value && fetchErrorStatus(presetsAppQuery.error.value) !== 403),
)
/** Sin permiso para ninguna de las dos (no superuser y 403 en Presets App): el campo no se muestra. */
const showPresetField = computed(() =>
  isSuperuser.value || fetchErrorStatus(presetsAppQuery.error.value) !== 403,
)

// Las plantillas dependen de la compañía: al cambiarla, la elección ya no aplica.
watch(() => state.company, () => {
  presetChoice.value = undefined
})

function resetForm() {
  Object.assign(state, createInitialState())
  pendingImage.value = null
  presetChoice.value = undefined
  form.value?.clear()
}

watch(open, (isOpen) => {
  if (!isOpen) {
    nextTick(resetForm)
    return
  }
  // Al abrir: la organización del selector de la barra (se puede cambiar en el formulario).
  if (state.organization == null && props.organizationId != null) {
    state.organization = props.organizationId
  }
})

async function onSubmit(event: FormSubmitEvent<CreateUserSchema>) {
  const payload = { ...event.data }
  if (pendingImage.value) {
    const url = await uploadUserImage(pendingImage.value, payload.organization)
    if (url == null) {
      return
    }
    payload.background_image = url
  }

  let created: { id: number }
  try {
    created = await createUser.mutateAsync(payload)
  }
  catch {
    // El composable presenta el error ya interpretado.
    return
  }

  // El usuario ya existe: si falla aplicar la plantilla, el toast lo dice y se puede aplicar luego desde Permisos.
  const choice = presetChoice.value
  if (choice && created?.id != null) {
    const id = Number(choice.split(':')[1])
    try {
      if (choice.startsWith('app:')) {
        await applyPresetApp.mutateAsync({ profileId: created.id, companyId: payload.company, presetAppId: id })
      }
      else {
        await applyPreset.mutateAsync({ profileId: created.id, companyId: payload.company, presetId: id })
      }
    }
    catch {
      // Toast de error de la mutación.
    }
  }
  open.value = false
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
            name="organization"
            :label="t('configuration.user.fields.organization')"
            required
          >
            <USelectMenu
              v-model="state.organization"
              :items="organizationItems"
              value-key="value"
              :placeholder="t('configuration.user.placeholders.organization')"
              class="w-full"
            />
          </UFormField>

          <UFormField
            name="company"
            :label="t('configuration.user.fields.company')"
            required
          >
            <USelectMenu
              v-model="state.company"
              :items="companyItems"
              :loading="companyItemsPending"
              :disabled="state.organization == null"
              value-key="value"
              :placeholder="t('configuration.user.placeholders.company')"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Atajo: plantilla de permisos que se aplica al crear el usuario (en la compañía elegida). -->
        <UFormField
          v-if="showPresetField"
          :label="t('configuration.user.fields.preset')"
          :help="t('configuration.user.presetHelp')"
        >
          <USelectMenu
            v-model="presetChoice"
            :items="presetItems"
            value-key="value"
            :loading="presetsLoading"
            :disabled="state.company == null || !hasPresetOptions"
            :placeholder="state.company == null
              ? t('configuration.user.placeholders.presetNoCompany')
              : hasPresetOptions ? t('configuration.user.placeholders.preset') : t('permissions.users.noPresets')"
            icon="i-lucide-layout-template"
            class="w-full"
          >
            <template
              v-if="presetChoice"
              #trailing
            >
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="link"
                size="xs"
                :aria-label="t('configuration.user.clearPreset')"
                @click.stop="presetChoice = undefined"
              />
            </template>
          </USelectMenu>
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            name="first_name"
            :label="t('configuration.user.fields.firstName')"
          >
            <UInput
              v-model="firstNameModel"
              :placeholder="t('configuration.user.placeholders.firstName')"
              autocomplete="given-name"
              class="w-full"
              @input="normalizeNameInput"
            />
          </UFormField>

          <UFormField
            name="last_name"
            :label="t('configuration.user.fields.lastName')"
          >
            <UInput
              v-model="lastNameModel"
              :placeholder="t('configuration.user.placeholders.lastName')"
              autocomplete="family-name"
              class="w-full"
              @input="normalizeNameInput"
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

        <UFormField
          name="background_image"
          :label="t('configuration.user.appearance.label')"
        >
          <UserAppearanceField
            v-model:color="state.background_color"
            v-model:image="state.background_image"
            v-model:file="pendingImage"
            :initials="appearanceInitials"
          />
        </UFormField>

        <div class="mt-2 flex justify-end">
          <UButton
            type="submit"
            color="primary"
            :label="t('configuration.user.create.submit')"
            :loading="createUser.isPending.value || isUploading || applyPreset.isPending.value || applyPresetApp.isPending.value"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
