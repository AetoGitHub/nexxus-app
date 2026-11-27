<script setup lang="ts">
import type { PermissionBlocks } from '~/shared/types/auth.types'
import PermissionsMatrix from '~/features/permissions/components/PermissionsMatrix.vue'
import {
  useApplyPermissionPreset,
  usePermissionPresets,
  useProfilePermissions,
  useUpdateProfilePermissions,
} from '~/features/permissions/composables/usePermissionsAdmin'
import { useApplyPresetApp, usePresetsApp } from '~/features/permissions/composables/usePresetsApp'
import { diffBlocks, pickBlocks } from '~/features/permissions/utils/permission-fields.util'
import { useProfileCompanyMemberships } from '~/features/company-memberships/composables/useProfileCompanyMemberships'
import { getInitials } from '~/shared/utils/initials'

/**
 * Permisos de UN perfil en UNA compañía (los permisos son por compañía): selector de compañía con sus membresías,
 * encabezado «Permisos de X en Y», aplicar plantilla, la matriz como borrador y la barra de guardado (solo manda lo que
 * cambió). Se usa en Configuración → Permisos y en el diálogo de la tabla de usuarios.
 */
const props = defineProps<{
  profileId: number
  name: string
  /** Compañía seleccionada del usuario: se preselecciona si está entre sus membresías. */
  preferredCompanyId?: number | null
  /** Sin avatar propio (el diálogo ya lo muestra). */
  hideHeader?: boolean
}>()

/** true mientras haya cambios sin guardar (para avisar antes de salir). */
const dirty = defineModel<boolean>('dirty', { default: false })

const { t } = useI18n()
const { user } = useAuth()

// Compañías del usuario: solo se pueden elegir sus membresías.
const membershipsQuery = useProfileCompanyMemberships(() => props.profileId)
const companyItems = computed(() =>
  membershipsQuery.memberships.value.map((membership) => {
    const raw = membership as typeof membership & { company__name?: string }
    return { value: membership.company, label: raw.company_name ?? raw.company__name ?? `#${membership.company}` }
  }),
)
const companyId = ref<number | null>(null)
const companyName = computed(() => companyItems.value.find(item => item.value === companyId.value)?.label ?? '')

// Preselección: su compañía seleccionada (si es una de sus membresías) o la primera.
watch(companyItems, (items) => {
  if (companyId.value != null && items.some(item => item.value === companyId.value)) {
    return
  }
  const preferred = items.find(item => item.value === props.preferredCompanyId)
  companyId.value = (preferred ?? items[0])?.value ?? null
}, { immediate: true })

// Cambiar de compañía con cambios sin guardar los descartaría: se pide confirmación.
const pendingCompanyId = ref<number | null>(null)
const confirmCompanyOpen = ref(false)
const companyModel = computed({
  get: () => companyId.value ?? undefined,
  set: (value: number | undefined) => {
    const id = value ?? null
    if (id === companyId.value) {
      return
    }
    if (hasChanges.value) {
      pendingCompanyId.value = id
      confirmCompanyOpen.value = true
      return
    }
    companyId.value = id
  },
})

function confirmCompanySwitch() {
  companyId.value = pendingCompanyId.value
  confirmCompanyOpen.value = false
}

const permissionsQuery = useProfilePermissions(() => props.profileId, companyId)
const permissions = computed(() => permissionsQuery.data.value ?? null)
const isSuperuserProfile = computed(() => permissions.value?.is_superuser === true)
const isMe = computed(() => props.profileId === user.value?.id)

/** Borrador local de la matriz; se reinicia cada vez que llegan permisos nuevos del backend. */
const draft = ref<PermissionBlocks | null>(null)
watch(permissions, (value) => {
  draft.value = value ? pickBlocks(value) : null
}, { immediate: true })

const patch = computed(() => (permissions.value && draft.value ? diffBlocks(permissions.value, draft.value) : null))
const hasChanges = computed(() => patch.value != null)
watch(hasChanges, (value) => {
  dirty.value = value
}, { immediate: true })

const updateMutation = useUpdateProfilePermissions()
const applyMutation = useApplyPermissionPreset()
const applyAppMutation = useApplyPresetApp()
const isBusy = computed(() =>
  updateMutation.isPending.value || applyMutation.isPending.value || applyAppMutation.isPending.value,
)

function save() {
  if (!patch.value || companyId.value == null) {
    return
  }
  updateMutation.mutate({ profileId: props.profileId, companyId: companyId.value, patch: patch.value })
}

function discard() {
  draft.value = permissions.value ? pickBlocks(permissions.value) : null
}

// Aplicar plantilla o Preset App (con confirmación: reemplaza lo que tenga el usuario en esa compañía). Plantillas:
// las generales y las de la compañía elegida; Presets App: solo los de esa compañía (copian solo Tareas y Configuración).
const presetsQuery = usePermissionPresets(companyId)
const presetsAppQuery = usePresetsApp(() => ({ company: companyId.value }))

/** Valor del select: `preset:<id>` (plantilla) o `app:<id>` (Preset App). */
type PresetChoice = `preset:${number}` | `app:${number}`

const presetOptions = computed(() => (presetsQuery.data.value ?? [])
  .map(preset => ({ value: `preset:${preset.id}` as PresetChoice, label: preset.name, icon: 'i-lucide-layout-template' })))
const presetAppOptions = computed(() => (presetsAppQuery.data.value ?? [])
  .filter(preset => preset.company === companyId.value)
  .map(preset => ({ value: `app:${preset.id}` as PresetChoice, label: preset.name, icon: 'i-lucide-app-window' })))
const hasPresetOptions = computed(() => presetOptions.value.length > 0 || presetAppOptions.value.length > 0)
/** Agrupado: «Plantillas» y «Presets App» (solo los grupos que tengan opciones). */
const presetItems = computed(() => [
  ...(presetOptions.value.length
    ? [[{ type: 'label' as const, label: t('permissions.tabs.presets') }, ...presetOptions.value]]
    : []),
  ...(presetAppOptions.value.length
    ? [[{ type: 'label' as const, label: t('permissions.tabs.presetsApp') }, ...presetAppOptions.value]]
    : []),
])
const presetsLoading = computed(() => presetsQuery.isPending.value || presetsAppQuery.isPending.value)

const presetToApply = ref<PresetChoice | undefined>(undefined)
const confirmApplyOpen = ref(false)
const presetToApplyIsApp = computed(() => presetToApply.value?.startsWith('app:') === true)
const presetToApplyName = computed(() =>
  [...presetOptions.value, ...presetAppOptions.value].find(item => item.value === presetToApply.value)?.label ?? '',
)

function askApply() {
  if (presetToApply.value != null) {
    confirmApplyOpen.value = true
  }
}

async function confirmApply() {
  if (presetToApply.value == null || companyId.value == null) {
    return
  }
  const id = Number(presetToApply.value.split(':')[1])
  try {
    if (presetToApplyIsApp.value) {
      await applyAppMutation.mutateAsync({ profileId: props.profileId, companyId: companyId.value, presetAppId: id })
    }
    else {
      await applyMutation.mutateAsync({ profileId: props.profileId, companyId: companyId.value, presetId: id })
    }
    confirmApplyOpen.value = false
    presetToApply.value = undefined
  }
  catch {
    // El toast de error lo muestra la mutación.
  }
}

/** «Quitar Preset App»: lo desliga (`preset_app: null`); el usuario conserva sus permisos actuales. */
const confirmUnlinkAppOpen = ref(false)

async function confirmUnlinkApp() {
  if (companyId.value == null) {
    return
  }
  try {
    await applyAppMutation.mutateAsync({ profileId: props.profileId, companyId: companyId.value, presetAppId: null })
    confirmUnlinkAppOpen.value = false
  }
  catch {
    // El toast de error lo muestra la mutación.
  }
}

// La plantilla elegida pudo no aplicar en la nueva compañía.
watch(companyId, () => {
  presetToApply.value = undefined
})

/** Ajustes manuales (banderas distintas a su plantilla) y cuántos son, para «Personalizado (N)». */
const custom = computed(() => permissions.value?.custom ?? {})
const customCount = computed(() =>
  Object.values(custom.value).reduce((total, flags) => total + Object.keys(flags ?? {}).length, 0),
)

/**
 * «Restablecer a la plantilla»: vuelve a aplicar su plantilla actual (copia todas sus banderas y `custom` queda vacío).
 * Se pierden los ajustes manuales: se confirma antes.
 */
const confirmResetOpen = ref(false)

function openResetConfirm() {
  confirmResetOpen.value = true
}

/**
 * «Quitar plantilla»: desliga la plantilla (`preset: null`). El usuario CONSERVA sus permisos actuales, queda «Sin
 * plantilla» y deja de recibir los cambios que se hagan a esa plantilla.
 */
const confirmUnlinkOpen = ref(false)

function openUnlinkConfirm() {
  confirmUnlinkOpen.value = true
}

async function confirmUnlink() {
  if (companyId.value == null) {
    return
  }
  try {
    await applyMutation.mutateAsync({ profileId: props.profileId, companyId: companyId.value, presetId: null })
    confirmUnlinkOpen.value = false
  }
  catch {
    // El toast de error lo muestra la mutación.
  }
}

async function confirmReset() {
  const presetId = permissions.value?.preset?.id
  if (presetId == null || companyId.value == null) {
    return
  }
  try {
    await applyMutation.mutateAsync({ profileId: props.profileId, companyId: companyId.value, presetId })
    confirmResetOpen.value = false
  }
  catch {
    // El toast de error lo muestra la mutación.
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Compañía: los permisos son por compañía; solo las membresías del usuario. -->
    <UFormField
      v-if="membershipsQuery.isPending.value || companyItems.length"
      :label="t('permissions.users.company')"
    >
      <USelectMenu
        v-model="companyModel"
        :items="companyItems"
        value-key="value"
        :loading="membershipsQuery.isPending.value"
        :placeholder="t('permissions.users.companyPlaceholder')"
        :disabled="isBusy"
        icon="i-lucide-briefcase"
        class="w-full sm:w-96"
      />
    </UFormField>

    <UAlert
      v-if="membershipsQuery.isError.value"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="t('permissions.users.membershipsError')"
      :description="membershipsQuery.errorMessage.value"
    />

    <UAlert
      v-else-if="!membershipsQuery.isPending.value && !companyItems.length"
      color="warning"
      variant="subtle"
      icon="i-lucide-briefcase"
      :title="t('permissions.users.noMembershipsTitle')"
      :description="t('permissions.users.noMembershipsDescription')"
    />

    <!-- Cargando -->
    <div
      v-else-if="companyId == null || permissionsQuery.isPending.value"
      class="grid gap-3 lg:grid-cols-2"
    >
      <USkeleton
        v-for="n in 4"
        :key="n"
        class="h-56 rounded-xl"
      />
    </div>

    <UAlert
      v-else-if="permissionsQuery.isError.value"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="t('permissions.users.loadError')"
      :description="parseFetchError(permissionsQuery.error.value)"
    />

    <template v-else-if="permissions && draft">
      <!-- Encabezado + aplicar plantilla -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          v-if="!hideHeader"
          class="flex min-w-0 flex-1 items-center gap-3"
        >
          <UserAvatar
            :user-id="profileId"
            :initials="getInitials(name)"
            :name="name"
            :size="40"
            :font-size="14"
          />
          <div class="min-w-0">
            <p class="flex items-center gap-2 font-semibold">
              <span class="truncate">{{ t('permissions.users.headerFor', { user: name, company: companyName }) }}</span>
              <UBadge
                v-if="isMe"
                :label="t('permissions.users.you')"
                color="neutral"
                variant="subtle"
                size="sm"
              />
            </p>
          </div>
        </div>
        <p
          v-else
          class="min-w-0 flex-1 text-sm font-semibold"
        >
          {{ t('permissions.users.headerFor', { user: name, company: companyName }) }}
        </p>

        <div
          v-if="!isSuperuserProfile"
          class="flex min-w-0 gap-2 sm:w-96"
        >
          <USelectMenu
            v-model="presetToApply"
            :items="presetItems"
            value-key="value"
            :loading="presetsLoading"
            :placeholder="hasPresetOptions ? t('permissions.users.presetPlaceholder') : t('permissions.users.noPresets')"
            :disabled="!hasPresetOptions || isBusy"
            icon="i-lucide-layout-template"
            class="min-w-0 flex-1"
          />
          <UButton
            :label="t('permissions.users.apply')"
            color="neutral"
            variant="outline"
            :disabled="presetToApply == null || isBusy"
            @click="askApply"
          />
        </div>
      </div>

      <!-- Plantilla asignada, ajustes manuales (custom) y «Restablecer a la plantilla». -->
      <div
        v-if="!isSuperuserProfile"
        class="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2.5"
      >
        <UIcon
          name="i-lucide-layout-template"
          class="h-4 w-4 shrink-0 text-muted-foreground"
        />
        <span class="text-sm">
          <template v-if="permissions.preset">
            {{ t('permissions.users.templateLabel') }}
            <span class="font-semibold">{{ permissions.preset.name }}</span>
          </template>
          <span
            v-else
            class="text-muted-foreground"
          >{{ t('permissions.users.noTemplate') }}</span>
        </span>
        <UTooltip
          v-if="customCount > 0"
          :text="t('permissions.users.customHint', { name: permissions.preset?.name ?? '' })"
        >
          <UBadge
            :label="t('permissions.users.customized', { count: customCount })"
            icon="i-lucide-circle-dot"
            color="warning"
            variant="subtle"
            size="sm"
          />
        </UTooltip>
        <div
          v-if="permissions.preset"
          class="ml-auto flex flex-wrap items-center gap-1"
        >
          <UButton
            v-if="customCount > 0"
            :label="t('permissions.users.resetToTemplate')"
            icon="i-lucide-rotate-ccw"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="isBusy"
            @click="openResetConfirm"
          />
          <UButton
            :label="t('permissions.users.unlinkTemplate')"
            icon="i-lucide-unlink"
            color="error"
            variant="ghost"
            size="xs"
            :disabled="isBusy"
            @click="openUnlinkConfirm"
          />
        </div>
      </div>

      <!-- Preset App asignado (solo Tareas y Configuración); convive con la plantilla. -->
      <div
        v-if="!isSuperuserProfile && permissions.preset_app"
        class="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2.5"
      >
        <UIcon
          name="i-lucide-app-window"
          class="h-4 w-4 shrink-0 text-muted-foreground"
        />
        <span class="text-sm">
          {{ t('permissions.users.presetAppLabel') }}
          <span class="font-semibold">{{ permissions.preset_app.name }}</span>
        </span>
        <UButton
          :label="t('permissions.presetsApp.remove')"
          icon="i-lucide-unlink"
          color="error"
          variant="ghost"
          size="xs"
          class="ml-auto"
          :disabled="isBusy"
          @click="confirmUnlinkAppOpen = true"
        />
      </div>

      <UAlert
        v-if="isSuperuserProfile"
        color="warning"
        variant="subtle"
        icon="i-lucide-crown"
        :title="t('permissions.users.superuserTitle')"
        :description="t('permissions.users.superuserDescription')"
      />

      <PermissionsMatrix
        v-model="draft"
        :custom="custom"
        :preset-name="permissions.preset?.name ?? null"
        :disabled="isSuperuserProfile || isBusy"
      />

      <!-- Ajuste manual sobre una plantilla: se perderá cuando alguien edite esa plantilla. -->
      <UAlert
        v-if="hasChanges && permissions.preset && !isSuperuserProfile"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :description="t('permissions.users.manualOverPreset', { name: permissions.preset.name })"
      />

      <!-- Barra de guardado -->
      <div
        v-if="!isSuperuserProfile"
        class="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-card/95 px-4 py-3 backdrop-blur"
      >
        <span
          class="mr-auto flex items-center gap-1.5 text-xs"
          :class="hasChanges ? 'text-warning' : 'text-muted-foreground'"
        >
          <UIcon
            :name="hasChanges ? 'i-lucide-circle-dot' : 'i-lucide-check'"
            class="h-3.5 w-3.5"
          />
          {{ hasChanges ? t('permissions.users.unsaved') : t('permissions.users.saved') }}
        </span>
        <UButton
          :label="t('permissions.actions.discard')"
          color="neutral"
          variant="outline"
          :disabled="!hasChanges || isBusy"
          @click="discard"
        />
        <UButton
          :label="t('permissions.actions.save')"
          icon="i-lucide-check"
          :loading="updateMutation.isPending.value"
          :disabled="!hasChanges || isBusy"
          @click="save"
        />
      </div>
    </template>

    <!-- Confirmar cambiar de compañía con cambios sin guardar -->
    <UModal
      v-model:open="confirmCompanyOpen"
      :title="t('permissions.users.switchConfirmTitle')"
      :description="t('permissions.users.switchConfirmDescription')"
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer="{ close }">
        <UButton
          :label="t('permissions.actions.cancel')"
          color="neutral"
          variant="outline"
          @click="close()"
        />
        <UButton
          :label="t('permissions.actions.discardAndContinue')"
          color="warning"
          @click="confirmCompanySwitch"
        />
      </template>
    </UModal>

    <!-- Confirmar quitar la plantilla: conserva sus permisos, deja de seguir la plantilla. -->
    <UModal
      v-model:open="confirmUnlinkOpen"
      :title="t('permissions.users.unlinkConfirmTitle', { name: permissions?.preset?.name ?? '' })"
      :description="t('permissions.users.unlinkConfirmDescription')"
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer="{ close }">
        <UButton
          :label="t('permissions.actions.cancel')"
          color="neutral"
          variant="outline"
          :disabled="applyMutation.isPending.value"
          @click="close()"
        />
        <UButton
          :label="t('permissions.users.unlinkTemplate')"
          color="error"
          icon="i-lucide-unlink"
          :loading="applyMutation.isPending.value"
          @click="confirmUnlink"
        />
      </template>
    </UModal>

    <!-- Confirmar restablecer a la plantilla: se pierden los ajustes manuales. -->
    <UModal
      v-model:open="confirmResetOpen"
      :title="t('permissions.users.resetConfirmTitle', { name: permissions?.preset?.name ?? '' })"
      :description="t('permissions.users.resetConfirmDescription')"
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer="{ close }">
        <UButton
          :label="t('permissions.actions.cancel')"
          color="neutral"
          variant="outline"
          :disabled="applyMutation.isPending.value"
          @click="close()"
        />
        <UButton
          :label="t('permissions.users.resetToTemplate')"
          color="warning"
          icon="i-lucide-rotate-ccw"
          :loading="applyMutation.isPending.value"
          @click="confirmReset"
        />
      </template>
    </UModal>

    <!-- Confirmar aplicar plantilla o Preset App -->
    <UModal
      v-model:open="confirmApplyOpen"
      :title="presetToApplyIsApp ? t('permissions.users.applyAppConfirmTitle') : t('permissions.users.applyConfirmTitle')"
      :description="t(
        presetToApplyIsApp ? 'permissions.users.applyAppConfirmDescription' : 'permissions.users.applyConfirmDescription',
        { preset: presetToApplyName, user: name, company: companyName },
      )"
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer="{ close }">
        <UButton
          :label="t('permissions.actions.cancel')"
          color="neutral"
          variant="outline"
          :disabled="isBusy"
          @click="close()"
        />
        <UButton
          :label="t('permissions.users.apply')"
          :loading="applyMutation.isPending.value || applyAppMutation.isPending.value"
          @click="confirmApply"
        />
      </template>
    </UModal>

    <!-- Confirmar quitar el Preset App: conserva sus permisos. -->
    <UModal
      v-model:open="confirmUnlinkAppOpen"
      :title="t('permissions.users.unlinkConfirmTitle', { name: permissions?.preset_app?.name ?? '' })"
      :description="t('permissions.users.unlinkAppConfirmDescription')"
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer="{ close }">
        <UButton
          :label="t('permissions.actions.cancel')"
          color="neutral"
          variant="outline"
          :disabled="applyAppMutation.isPending.value"
          @click="close()"
        />
        <UButton
          :label="t('permissions.presetsApp.remove')"
          color="error"
          icon="i-lucide-unlink"
          :loading="applyAppMutation.isPending.value"
          @click="confirmUnlinkApp"
        />
      </template>
    </UModal>
  </div>
</template>
