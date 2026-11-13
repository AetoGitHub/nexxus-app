<script setup lang="ts">
// Protected route: redirects to /login when not authenticated.
// Landing/Hub tras el login: selector de módulos.
definePageMeta({ middleware: 'auth', layout: false })

const { t } = useI18n()
const { hasAccess, refreshPermissions } = usePermissions()
const { user } = useAuth()
/** Empresa a la que aplican los permisos (la seleccionada del usuario). */
const companyName = computed(() => user.value?.selected_company?.name ?? null)

/**
 * El hub no pide permisos: cada tarjeta sale de `access` del login (y se actualiza al entrar a la plataforma). Al
 * entrar, `me/?screen=…` trae el detalle (en Nexxus Tasks, si no puede ver tareas, el middleware lo lleva a reporte o
 * dashboard).
 */
const showTasks = computed(() => hasAccess('task'))
const showConfiguration = computed(() => hasAccess('config_admin'))
const hasNothing = computed(() => !showTasks.value && !showConfiguration.value)

/** «Volver a revisar»: solo sin acceso a nada; consulta cada plataforma y así se actualiza `access`. */
const isRefreshing = ref(false)
async function recheck() {
  isRefreshing.value = true
  try {
    await Promise.all([
      refreshPermissions('task', { force: true }),
      refreshPermissions('config_admin', { force: true }),
    ])
  }
  finally {
    isRefreshing.value = false
  }
}

useSeoMeta({
  title: () => t('hub.title'),
})
</script>

<template>
  <div class="min-h-dvh flex flex-col bg-background text-foreground">
    <AppHubHeader />

    <main class="flex-1 flex flex-col items-center justify-center px-6">
      <!-- Sin permisos: todo arranca negado hasta que un administrador asigne permisos o una plantilla. -->
      <div
        v-if="hasNothing"
        class="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card px-8 py-10 text-center"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25">
          <UIcon
            name="i-lucide-shield-question"
            class="h-7 w-7"
          />
        </div>
        <div>
          <h1 class="text-lg font-semibold">
            {{ t('permissions.empty.title') }}
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ t('permissions.empty.description') }}
          </p>
          <UBadge
            v-if="companyName"
            :label="t('permissions.empty.company', { company: companyName })"
            icon="i-lucide-briefcase"
            color="neutral"
            variant="subtle"
            class="mt-3"
          />
        </div>
        <UButton
          :label="t('permissions.empty.recheck')"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="isRefreshing"
          @click="recheck"
        />
      </div>

      <template v-else>
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-foreground">
            {{ t('hub.title') }}
          </h1>
          <p class="text-sm text-muted-foreground mt-1">
            {{ t('hub.subtitle') }}
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 w-full max-w-2xl">
          <AppModuleCard
            v-if="showTasks"
            to="/tasks"
            icon="i-lucide-square-check-big"
            :title="t('hub.tasksTitle')"
            :description="t('hub.tasksDescription')"
          />
          <AppModuleCard
            v-if="showConfiguration"
            to="/configuration"
            icon="i-lucide-settings"
            :title="t('hub.configurationTitle')"
            :description="t('hub.configurationDescription')"
          />
        </div>
      </template>
    </main>
  </div>
</template>
