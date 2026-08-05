<script setup lang="ts">
import type { BranchFormState } from '~/features/settings/types/settings.types'
import { BRANCH_COLORS, MEXICAN_STATES } from '~/features/settings/types/settings.types'

const open = defineModel<boolean>('open', { required: true })
const form = defineModel<BranchFormState>('form', { required: true })

const emit = defineEmits<{
  save: []
  cancel: []
}>()

const { t } = useI18n()

const stateItems = MEXICAN_STATES.map(value => ({
  label: value,
  value,
}))

const inputClass = 'w-full px-3 py-2 text-sm rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring'

function selectColor(color: string) {
  form.value.color = color
}

function onCancel() {
  open.value = false
  emit('cancel')
}

function onSave() {
  emit('save')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('settings.branchModal.title')"
    scrollable
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="space-y-5">
        <div>
          <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
            {{ t('settings.branchModal.name') }} *
          </label>
          <input
            v-model="form.name"
            type="text"
            :placeholder="t('settings.branchModal.namePlaceholder')"
            :class="inputClass"
          >
        </div>

        <div>
          <label class="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
            {{ t('settings.branchModal.color') }} *
          </label>
          <p class="text-[11px] text-muted-foreground mb-2.5">
            {{ t('settings.branchModal.colorHelp') }}
          </p>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-for="color in BRANCH_COLORS"
              :key="color"
              type="button"
              class="w-7 h-7 rounded-full flex items-center justify-center transition ring-offset-2 ring-offset-card"
              :class="form.color === color ? 'ring-2 ring-foreground/40' : 'hover:scale-105'"
              :style="{ background: color }"
              :aria-label="color"
              @click="selectColor(color)"
            >
              <UIcon
                v-if="form.color === color"
                name="i-lucide-check"
                class="h-3.5 w-3.5 text-white"
              />
            </button>
            <span
              class="w-7 h-7 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground/50"
              :title="t('settings.branchModal.moreColorsSoon')"
            >
              <UIcon
                name="i-lucide-plus"
                class="h-3.5 w-3.5"
              />
            </span>
          </div>
        </div>

        <div class="flex items-start justify-between gap-4 py-1">
          <div class="min-w-0">
            <div class="text-sm text-foreground">
              {{ t('settings.branchModal.isPrimary') }}
            </div>
            <p class="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              {{ t('settings.branchModal.isPrimaryHelp') }}
            </p>
          </div>
          <USwitch v-model="form.isPrimary" />
        </div>

        <div class="border-t border-border" style="border-top-width: 0.5px;" />

        <UCollapsible v-model:open="form.addressOpen">
          <template #default="{ open: isOpen }">
            <button
              type="button"
              class="w-full flex items-center justify-between py-2 text-sm text-foreground hover:text-foreground/80 transition-colors"
            >
              <span>{{ t('settings.branchModal.addressOptional') }}</span>
              <UIcon
                name="i-lucide-chevron-down"
                class="h-4 w-4 text-muted-foreground transition-transform"
                :class="{ 'rotate-180': isOpen }"
              />
            </button>
          </template>

          <template #content>
            <div class="space-y-3 pb-2">
              <div>
                <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  {{ t('settings.branchModal.street') }}
                </label>
                <input
                  v-model="form.address.street"
                  type="text"
                  :class="inputClass"
                >
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  {{ t('settings.branchModal.neighborhood') }}
                </label>
                <input
                  v-model="form.address.neighborhood"
                  type="text"
                  :class="inputClass"
                >
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  {{ t('settings.branchModal.city') }}
                </label>
                <input
                  v-model="form.address.city"
                  type="text"
                  :class="inputClass"
                >
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    {{ t('settings.branchModal.state') }}
                  </label>
                  <USelect
                    v-model="form.address.state"
                    :items="stateItems"
                    :placeholder="t('settings.branchModal.statePlaceholder')"
                    class="w-full"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                    {{ t('settings.branchModal.zip') }}
                  </label>
                  <input
                    v-model="form.address.zip"
                    type="text"
                    :class="inputClass"
                  >
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  {{ t('settings.branchModal.localPhone') }}
                </label>
                <div class="flex">
                  <span class="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-border rounded-l-md">
                    +52
                  </span>
                  <input
                    v-model="form.address.phone"
                    type="text"
                    class="flex-1 px-3 py-2 text-sm rounded-r-md bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
                  >
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  {{ t('settings.branchModal.localEmail') }}
                </label>
                <input
                  v-model="form.address.email"
                  type="email"
                  :class="inputClass"
                >
              </div>
            </div>
          </template>
        </UCollapsible>

        <div class="border-t border-border" style="border-top-width: 0.5px;" />

        <UCollapsible v-model:open="form.rfcOpen">
          <template #default="{ open: isOpen }">
            <button
              type="button"
              class="w-full flex items-center justify-between py-2 text-sm text-foreground hover:text-foreground/80 transition-colors"
            >
              <div class="text-left min-w-0">
                <div>{{ t('settings.branchModal.ownRfcOptional') }}</div>
                <p class="text-[11px] text-muted-foreground mt-0.5">
                  {{ t('settings.branchModal.ownRfcHelp') }}
                </p>
              </div>
              <UIcon
                name="i-lucide-chevron-down"
                class="h-4 w-4 text-muted-foreground shrink-0 transition-transform"
                :class="{ 'rotate-180': isOpen }"
              />
            </button>
          </template>

          <template #content>
            <div class="flex items-center justify-between gap-4 py-2 pb-1">
              <span class="text-sm text-foreground">
                {{ t('settings.branchModal.hasOwnRfc') }}
              </span>
              <USwitch v-model="form.hasOwnRfc" />
            </div>
          </template>
        </UCollapsible>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('settings.branchModal.cancel')"
          @click="onCancel"
        />
        <UButton
          :label="t('settings.branchModal.save')"
          color="primary"
          @click="onSave"
        />
      </div>
    </template>
  </UModal>
</template>
