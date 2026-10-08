<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { useProfileFullName } from '~/features/auth/composables/useProfileAppearance'
import type { AuthProfile } from '~/features/auth/types/profile.types'

/**
 * Tarjeta del usuario en sesión (al estilo de Lark): círculo grande, nombre, correo y datos de su cuenta.
 * Todo sale de la sesión guardada al iniciar sesión (`useAuth`); no pide nada al backend. El `UserAvatar` busca solo
 * su imagen/color/iniciales reales por `user-id`. El slot por defecto es para acciones al pie (p. ej. cerrar sesión).
 */
const { t } = useI18n()
const toast = useToast()
const { user, organization } = useAuth()
const { copy } = useClipboard()

const username = computed(() => user.value?.username ?? '')
// Nombre y apellido salen del catálogo de perfiles (la sesión solo trae el username); mientras no llegue, el username.
const fullName = useProfileFullName(() => user.value?.id)
const displayName = computed(() => fullName.value || username.value || t('user.fallback'))
const initials = computed(() => getInitials(displayName.value))

// La sesión no trae el correo: se pide el detalle del perfil propio (una sola vez por sesión, en caché).
const { $api } = useNuxtApp()
const { data: profileDetail } = useQuery({
  queryKey: computed(() => ['auth', 'profile-detail', user.value?.id ?? null]),
  queryFn: () => $api<AuthProfile>(`/api/auth/profiles/${user.value?.id}/`),
  enabled: computed(() => user.value?.id != null),
  staleTime: 5 * 60 * 1000,
})
const email = computed(() => profileDetail.value?.corporate_email || profileDetail.value?.email || null)
const company = computed(() => user.value?.selected_company?.name ?? null)
const organizationName = computed(() => organization.value?.name ?? null)
const isSuperuser = computed(() => user.value?.is_superuser === true)

const emailCopied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copyEmail() {
  if (!email.value) {
    return
  }
  try {
    await copy(email.value)
    emailCopied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      emailCopied.value = false
    }, 2000)
  }
  catch {
    toast.add({ title: t('user.profile.copyError'), color: 'error', icon: 'i-lucide-circle-alert' })
  }
}

onBeforeUnmount(() => clearTimeout(copiedTimer))

const details = computed(() => [
  { key: 'company', icon: 'i-lucide-building-2', label: t('user.profile.company'), value: company.value },
  { key: 'organization', icon: 'i-lucide-network', label: t('user.profile.organization'), value: organizationName.value },
].filter(row => row.value))
</script>

<template>
  <div class="w-full min-w-0">
    <div class="flex flex-col items-center gap-2 text-center">
      <UserAvatar
        :user-id="user?.id"
        :initials="initials"
        :size="72"
        :font-size="26"
        fallback-color="#f59e0b"
      />
      <div class="min-w-0 max-w-full">
        <div class="text-base font-semibold text-foreground break-words">
          {{ displayName }}
        </div>
        <UBadge
          v-if="isSuperuser"
          :label="t('user.profile.superuser')"
          icon="i-lucide-shield-check"
          color="primary"
          variant="subtle"
          size="sm"
          class="mt-1.5"
        />
      </div>
    </div>

    <dl class="mt-4 space-y-3 border-t border-border pt-3">
      <div v-if="email" class="flex items-center gap-2.5 min-w-0">
        <UIcon name="i-lucide-mail" class="h-4 w-4 shrink-0 text-muted-foreground" />
        <div class="min-w-0 flex-1">
          <dt class="text-[11px] uppercase tracking-wider text-muted-foreground">
            {{ t('user.profile.email') }}
          </dt>
          <dd class="text-sm text-foreground truncate" :title="email">
            {{ email }}
          </dd>
        </div>
        <UButton
          :icon="emailCopied ? 'i-lucide-check' : 'i-lucide-copy'"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          :aria-label="emailCopied ? t('user.profile.copied') : t('user.profile.copyEmail')"
          :title="emailCopied ? t('user.profile.copied') : t('user.profile.copyEmail')"
          @click="copyEmail"
        />
      </div>

      <div
        v-for="row in details"
        :key="row.key"
        class="flex items-center gap-2.5 min-w-0"
      >
        <UIcon :name="row.icon" class="h-4 w-4 shrink-0 text-muted-foreground" />
        <div class="min-w-0 flex-1">
          <dt class="text-[11px] uppercase tracking-wider text-muted-foreground">
            {{ row.label }}
          </dt>
          <dd class="text-sm text-foreground break-words">
            {{ row.value }}
          </dd>
        </div>
      </div>
    </dl>

    <div v-if="$slots.default" class="mt-4 border-t border-border pt-3">
      <slot />
    </div>
  </div>
</template>
