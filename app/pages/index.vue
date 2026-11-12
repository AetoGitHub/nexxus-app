<script setup lang="ts">
// Protected route: redirects to /login when not authenticated.
// Landing/Hub tras el login: selector de módulos.
definePageMeta({ middleware: 'auth', layout: false })

const { t } = useI18n()
const { can, isSuperuser, permissions, refreshPermissions } = usePermissions()
const { user } = useAuth()
/** Empresa a la que aplican los permisos (la seleccionada del usuario). */
const companyName = computed(() => permissions.value?.company?.name ?? user.value?.selected_company?.name ?? null)

/**
 * La tarjeta de Tareas abre el primer módulo del shell al que tenga acceso (tareas, reporte o dashboard): alguien con
 * solo Reportes también entra por aquí.
 */
// El hub solo trae `task` y `master` (me/ sin screen): la tarjeta de Nexxus Tasks sale con el módulo encendido. Al entrar,
// `me/?screen=task` decide qué se ve (si no puede ver tareas, el middleware lo lleva a reporte o dashboard).
const tasksEntry = computed(() => (can('task') ? '/tasks' : null))
// Configuración master: el módulo encendido (o superuser, que además ve Permisos).
const showConfiguration = computed(() => isSuperuser.value || can('master'))
const hasNothing = computed(() => !tasksEntry.value && !showConfiguration.value)

const isRefreshing = ref(false)
async function recheck() {
  isRefreshing.value = true
  try {
    await refreshPermissions(undefined, { force: true })
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
            v-if="tasksEntry"
            :to="tasksEntry"
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
