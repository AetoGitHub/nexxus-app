<script setup lang="ts">
import type { Form, FormSubmitEvent } from '@nuxt/ui'
import type { UserContextSchema } from '~/features/user-context/schemas/user-context.schema'
import type { EditingUserContext } from '~/features/user-context/types/user-context.types'

interface UserContextFormState {
  company?: number
}

const { t } = useI18n()
const { editingContext, isOpen, closeDialog } = useUserContextDialog()
const updateUserContext = useUpdateUserContext()
const { session } = useAuth()

const profileId = computed(() => editingContext.value?.profileId ?? null)
const {
  memberships,
  errorMessage,
  isError,
  isPending,
  refetch,
} = useProfileCompanyMemberships(profileId)

const open = computed({
  get: () => isOpen.value,
  set: (value: boolean) => {
    if (!value) closeDialog()
  },
})

const form = useTemplateRef<Form<UserContextSchema>>('form')

const schema = computed(() => createUserContextSchema({
  companyRequired: t('configuration.user.context.validation.companyRequired'),
}))

function createInitialState(): UserContextFormState {
  return { company: undefined }
}

const state = reactive<UserContextFormState>(createInitialState())

const currentCompanyId = ref<number | null>(null)
const currentCompanyName = ref<string | null>(null)

/**
 * Garantiza que la compañía actual del usuario aparezca en las opciones aunque
 * la paginación de memberships aún no la haya cargado (evita que el select
 * muestre el id crudo por no encontrar coincidencia en `items`).
 */
const selectItems = computed(() => {
  const id = currentCompanyId.value
  if (id == null || memberships.value.some(m => m.company === id)) {
    return memberships.value
  }

  return [
    {
      id: -1,
      company: id,
      company_name: currentCompanyName.value ?? String(id),
      created_at: '',
    },
    ...memberships.value,
  ]
})

function applyContext(context: EditingUserContext) {
  state.company = context.currentCompanyId ?? undefined
  currentCompanyId.value = context.currentCompanyId
  currentCompanyName.value = context.currentCompanyName
}

function resetForm() {
  Object.assign(state, createInitialState())
  form.value?.clear()
}

watch(editingContext, (context) => {
  if (context) applyContext(context)
})

watch(open, (isOpenValue) => {
  if (!isOpenValue) {
    nextTick(resetForm)
  }
})

function syncSessionSelectedCompany(targetProfileId: number, companyId: number) {
  if (!session.value || session.value.user.id !== targetProfileId) return

  const membership = memberships.value.find(item => item.company === companyId)
  if (!membership) return

  session.value = {
    ...session.value,
    user: {
      ...session.value.user,
      selected_company: { id: membership.company, name: membership.company_name },
    },
  }
}

async function onSubmit(event: FormSubmitEvent<UserContextSchema>) {
  const targetProfileId = editingContext.value?.profileId
  if (!targetProfileId) return

  try {
    await updateUserContext.mutateAsync({
      id: targetProfileId,
      payload: { selected_company: event.data.company },
    })
    syncSessionSelectedCompany(targetProfileId, event.data.company)
    closeDialog()
  }
  catch {
    // El composable presenta el error ya interpretado.
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('configuration.user.context.update.title')"
    :description="t('configuration.user.context.update.description')"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <div
        v-if="isPending"
        class="grid gap-3"
      >
        <USkeleton class="h-10 w-full" />
      </div>

      <UAlert
        v-else-if="isError"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="t('configuration.user.context.loadErrorTitle')"
        :description="errorMessage"
        :actions="[{
          label: t('configuration.user.list.retry'),
          color: 'neutral',
          variant: 'outline',
          icon: 'i-lucide-refresh-cw',
          onClick: () => refetch(),
        }]"
      />

      <UForm
        v-else
        ref="form"
        :state="state"
        :schema="schema"
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField
          name="company"
          :label="t('configuration.user.context.fields.company')"
          required
        >
          <USelectMenu
            v-model="state.company"
            :items="selectItems"
            value-key="company"
            label-key="company_name"
            icon="i-lucide-building-2"
            :placeholder="t('configuration.user.context.companyPlaceholder')"
            class="w-full"
          >
            <template #empty>
              {{ t('configuration.user.context.companyEmpty') }}
            </template>
          </USelectMenu>
        </UFormField>

        <div class="mt-2 flex justify-end">
          <UButton
            type="submit"
            color="primary"
            :label="t('configuration.user.context.update.submit')"
            :loading="updateUserContext.isPending.value"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
