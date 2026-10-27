<script setup lang="ts">
import { useProfileCompanyMemberships } from '~/features/company-memberships/composables/useProfileCompanyMemberships'
import { usePrivateProjects } from '~/features/projects/composables/usePrivateProjects'
import type { PrivateProject } from '~/features/projects/types/project.types'

/**
 * Vuelve público un proyecto privado: pasa con todas sus tareas a la compañía elegida (`POST .../<id>/publish/`).
 * Solo se ofrecen las compañías de la membresía del usuario; si el backend rechaza la elegida
 * («No tienes acceso a esa compañía.») el error se muestra tal cual.
 */
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  project: PrivateProject | null
}>()

const { t } = useI18n()
const { user, organization } = useAuth()
const { publishProject } = usePrivateProjects({ enabled: false })
const { memberships, isPending: membershipsPending, isError: membershipsError } = useProfileCompanyMemberships(
  () => (open.value ? user.value?.id ?? null : null),
)

const companyId = ref<number | undefined>(undefined)

/** Compañías de la membresía; si no se pudieron leer, las de la organización (el backend valida el acceso). */
const companyItems = computed(() => {
  const fromMemberships = memberships.value.map(item => ({ label: item.company_name, value: item.company }))
  if (fromMemberships.length || !membershipsError.value) {
    return fromMemberships
  }
  return (organization.value?.companies ?? []).map(company => ({ label: company.name, value: company.id }))
})

const selectItems = computed(() =>
  withEmptySelectItems(companyItems.value, t('privateProjects.publish.noCompanies'), { pending: membershipsPending.value }),
)

watch(open, (isOpen) => {
  if (isOpen) {
    // Con una sola compañía no hay nada que elegir: queda preseleccionada.
    companyId.value = undefined
  }
})
watch(companyItems, (items) => {
  if (open.value && companyId.value == null && items.length === 1) {
    companyId.value = items[0]!.value
  }
}, { immediate: true })

const canSubmit = computed(() => props.project != null && companyId.value != null && !publishProject.isPending.value)

async function onSubmit() {
  if (!canSubmit.value || !props.project || companyId.value == null) {
    return
  }
  try {
    await publishProject.mutateAsync({ projectId: props.project.id, company: companyId.value })
    open.value = false
  }
  catch {
    // El toast con el error del backend ya se muestra en la mutación.
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('privateProjects.publish.title', { name: project?.name ?? '' })"
    :ui="{ content: 'sm:max-w-md', footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
          <UIcon
            name="i-lucide-triangle-alert"
            class="mt-0.5 h-4 w-4 shrink-0 text-warning"
          />
          <p>{{ t('privateProjects.publish.warning') }}</p>
        </div>

        <UFormField :label="t('privateProjects.publish.company')">
          <USelectMenu
            v-model="companyId"
            value-key="value"
            :items="selectItems"
            :loading="membershipsPending"
            :placeholder="t('privateProjects.publish.companyPlaceholder')"
            :search-input="false"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        :label="t('tasks.form.cancel')"
        color="neutral"
        variant="outline"
        :disabled="publishProject.isPending.value"
        @click="close()"
      />
      <UButton
        :label="t('privateProjects.publish.submit')"
        icon="i-lucide-globe"
        color="warning"
        :loading="publishProject.isPending.value"
        :disabled="!canSubmit"
        @click="onSubmit"
      />
    </template>
  </UModal>
</template>
