<script setup lang="ts">
import type { ProjectFormState } from '~/features/task-settings/types/task-settings.types'
import { THEME_COLORS } from '~/features/projects/types/project.types'
import { useProfiles } from '~/features/auth/composables/useProfiles'

const open = defineModel<boolean>('open', { required: true })
const form = defineModel<ProjectFormState>('form', { required: true })

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

const { items: profileItems, profilesQuery } = useProfiles(() => open.value)

const memberSelectItems = computed(() =>
  withEmptySelectItems(profileItems.value, t('common.noUsers'), {
    pending: profilesQuery.isPending.value,
  }),
)

const inputClass = 'w-full px-3 py-2 text-sm rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring'

const modalTitle = computed(() =>
  props.isEdit
    ? t('taskSettings.projectModal.editTitle')
    : t('taskSettings.projectModal.title'),
)

const submitLabel = computed(() =>
  props.isEdit
    ? t('taskSettings.projectModal.save')
    : t('taskSettings.projectModal.create'),
)

const canSubmit = computed(() => form.value.name.trim().length > 0 && !!form.value.color)

function selectColor(name: string) {
  form.value.color = name
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
        <div>
          <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
            {{ t('taskSettings.projectModal.name') }} <span class="text-error">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            :placeholder="t('taskSettings.projectModal.namePlaceholder')"
            :class="inputClass"
          >
        </div>

        <div>
          <label class="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            {{ t('taskSettings.projectModal.color') }} <span class="text-error">*</span>
          </label>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-for="option in THEME_COLORS"
              :key="option.name"
              type="button"
              class="w-7 h-7 rounded-full flex items-center justify-center transition ring-offset-2 ring-offset-card"
              :class="form.color === option.name ? 'ring-2 ring-foreground/50' : 'hover:scale-105'"
              :style="{ background: option.hex }"
              :aria-label="option.name"
              @click="selectColor(option.name)"
            />
            <span
              class="w-7 h-7 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground/50"
              :title="t('taskSettings.projectModal.moreColorsSoon')"
            >
              <UIcon
                name="i-lucide-plus"
                class="h-3.5 w-3.5"
              />
            </span>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
            {{ t('taskSettings.projectModal.members') }}
          </label>
          <USelect
            v-model="form.members"
            multiple
            :items="memberSelectItems"
            :loading="profilesQuery.isPending.value"
            :placeholder="t('taskSettings.projectModal.membersPlaceholder')"
            class="w-full"
          />
        </div>

        <div class="flex items-start gap-2.5 rounded-lg bg-muted/60 border border-border px-3 py-2.5">
          <UIcon
            name="i-lucide-lock"
            class="h-4 w-4 shrink-0 text-muted-foreground mt-0.5"
          />
          <p class="text-[12px] text-muted-foreground leading-relaxed">
            {{ t('taskSettings.projectModal.privacyNote') }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('taskSettings.projectModal.cancel')"
          @click="onCancel"
        />
        <UButton
          :label="submitLabel"
          color="primary"
          :disabled="!canSubmit"
          :loading="loading"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
