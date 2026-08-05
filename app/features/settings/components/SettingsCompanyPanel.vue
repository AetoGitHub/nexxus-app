<script setup lang="ts">
import SettingsBranchCard from '~/features/settings/components/SettingsBranchCard.vue'
import type { CompanyBranch, CompanyFormState } from '~/features/settings/types/settings.types'
import { TAX_REGIME_OPTIONS } from '~/features/settings/types/settings.types'

const company = defineModel<CompanyFormState>('company', { required: true })
const branches = defineModel<CompanyBranch[]>('branches', { required: true })

const emit = defineEmits<{
  newBranch: []
  removeBranch: [id: string]
  save: []
}>()

const { t } = useI18n()

const taxRegimeItems = TAX_REGIME_OPTIONS.map(value => ({
  label: value,
  value,
}))

const inputClass = 'w-full px-3 py-2 text-sm rounded-md bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring'
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-bold text-foreground">
        {{ t('settings.company.title') }}
      </h2>
      <p class="text-sm text-muted-foreground mt-1">
        {{ t('settings.company.subtitle') }}
      </p>
    </div>

    <div class="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-5">
      <div>
        <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
          {{ t('settings.company.tradeName') }} *
        </label>
        <input
          v-model="company.tradeName"
          type="text"
          :class="inputClass"
        >
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
            {{ t('settings.company.rfc') }} *
          </label>
          <input
            v-model="company.rfc"
            type="text"
            :class="[inputClass, 'font-mono uppercase']"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
            {{ t('settings.company.taxRegime') }} *
          </label>
          <USelect
            v-model="company.taxRegime"
            :items="taxRegimeItems"
            class="w-full"
          />
        </div>
      </div>

      <div>
        <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
          {{ t('settings.company.legalName') }} *
        </label>
        <input
          v-model="company.legalName"
          type="text"
          :class="inputClass"
        >
      </div>

      <div
        class="pt-4 border-t border-border space-y-4"
        style="border-top-width: 0.5px;"
      >
        <div class="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          {{ t('settings.company.contact') }}
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
            {{ t('settings.company.address') }}
          </label>
          <input
            v-model="company.address"
            type="text"
            :class="inputClass"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
            {{ t('settings.company.phone') }}
          </label>
          <input
            v-model="company.phone"
            type="text"
            :class="[inputClass, 'font-mono']"
          >
        </div>
      </div>

      <div
        class="pt-4 border-t border-border"
        style="border-top-width: 0.5px;"
      >
        <div class="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
          {{ t('settings.company.branches') }}
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
          <div class="min-w-0">
            <div class="text-[13px] text-foreground">
              {{ t('settings.company.branchesTitle') }}
            </div>
            <p class="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              {{ t('settings.company.branchesDescription') }}
            </p>
          </div>
          <UButton
            icon="i-lucide-plus"
            :label="t('settings.company.newBranch')"
            color="neutral"
            variant="ghost"
            size="sm"
            class="self-start shrink-0"
            @click="emit('newBranch')"
          />
        </div>

        <div class="space-y-2">
          <SettingsBranchCard
            v-for="branch in branches"
            :key="branch.id"
            :branch="branch"
            @remove="emit('removeBranch', $event)"
          />
        </div>
      </div>
    </div>

    <div class="flex justify-end">
      <button
        type="button"
        class="px-5 py-2 rounded-md text-white text-sm font-semibold bg-aeto-teal hover:opacity-90 transition-opacity"
        @click="emit('save')"
      >
        {{ t('settings.company.save') }}
      </button>
    </div>
  </div>
</template>
