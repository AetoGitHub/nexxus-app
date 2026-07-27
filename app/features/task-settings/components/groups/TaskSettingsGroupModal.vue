<script setup lang="ts">
import type { GroupFormState } from '~/features/task-settings/types/group.types'
import { THEME_COLORS } from '~/features/projects/types/project.types'
import { useProfiles } from '~/features/auth/composables/useProfiles'

const open = defineModel<boolean>('open', { required: true })
const form = defineModel<GroupFormState>('form', { required: true })

const props = defineProps<{
  loading?: boolean
  /** true = edición; false = alta */
  isEdit?: boolean
}>()

const emit = defineEmits<{
  submit: []
  cancel: []
}>()

const { t } = useI18n()

const { items: profileItems, profilesQuery } = useProfiles(
  () => open.value,
  { no_group: true },
)

const memberItems = computed(() =>
  profileItems.value.filter(item => item.value !== form.value.manager),
)

/** USelect tipa el model como `number | undefined`; el form usa `null`. */
const managerModel = computed({
  get: () => form.value.manager ?? undefined,
  set: (value: number | undefined) => {
    form.value.manager = value ?? null
  },
})

watch(
  () => form.value.manager,
  (managerId) => {
    if (managerId == null) {
      return
    }
    form.value.members = form.value.members.filter(id => id !== managerId)
  },
)

const modalTitle = computed(() =>
  props.isEdit
    ? t('taskSettings.groupModal.editTitle')
    : t('taskSettings.groupModal.title'),
)

const submitLabel = computed(() =>
  props.isEdit
    ? t('taskSettings.groupModal.save')
    : t('taskSettings.groupModal.create'),
)

const canSubmit = computed(() =>
  form.value.name.trim().length > 0
  && !!form.value.color
  && form.value.manager != null,
)

function isSelectedColor(hex: string) {
  return form.value.color.toLowerCase() === hex.toLowerCase()
}

function selectColor(hex: string) {
  form.value.color = hex
}

function onCustomColor(event: Event) {
  const target = event.target as HTMLInputElement
  form.value.color = target.value
}

function onCancel() {
  open.value = false
  emit('cancel')
}

function onSubmit() {
  if (!canSubmit.value) {
    return
  }
  emit('submit')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="modalTitle"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <div class="space-y-5">
        <UFormField
          :label="t('taskSettings.groupModal.name')"
          required
        >
          <UInput
            v-model="form.name"
            :placeholder="t('taskSettings.groupModal.namePlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('taskSettings.groupModal.color')"
          required
        >
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Swatches: no hay equivalente U* para círculos de color -->
            <button
              v-for="option in THEME_COLORS"
              :key="option.name"
              type="button"
              class="w-7 h-7 rounded-full flex items-center justify-center transition ring-offset-2 ring-offset-card"
              :class="isSelectedColor(option.hex) ? 'ring-2 ring-foreground/50' : 'hover:scale-105'"
              :style="{ background: option.hex }"
              :aria-label="option.name"
              @click="selectColor(option.hex)"
            />
            <!-- Color nativo: único control razonable para hex libre -->
            <input
              type="color"
              class="h-7 w-7 rounded-full border-0 cursor-pointer p-0 bg-transparent"
              :title="t('taskSettings.groupModal.customColor')"
              :value="form.color"
              @input="onCustomColor"
            >
          </div>
        </UFormField>

        <UFormField
          :label="t('taskSettings.groupModal.manager')"
          required
        >
          <USelect
            v-model="managerModel"
            :items="profileItems"
            :loading="profilesQuery.isPending.value"
            :placeholder="t('taskSettings.groupModal.managerPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('taskSettings.groupModal.members')"
          :help="t('taskSettings.groupModal.membersHint')"
        >
          <USelect
            v-model="form.members"
            multiple
            :items="memberItems"
            :loading="profilesQuery.isPending.value"
            :placeholder="t('taskSettings.groupModal.membersPlaceholder')"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('taskSettings.groupModal.cancel')"
          @click="onCancel"
        />
        <UButton
          :label="submitLabel"
          class="bg-aeto-teal hover:opacity-90 text-white"
          :disabled="!canSubmit"
          :loading="loading"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
