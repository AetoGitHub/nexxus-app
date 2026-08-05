<script setup lang="ts">
import type { SettingsNavItem, SettingsSectionId } from '~/features/settings/types/settings.types'

defineProps<{
  items: SettingsNavItem[]
  activeId: SettingsSectionId
  completedCount: number
  totalCount: number
  progressPercent: number
}>()

const emit = defineEmits<{
  select: [id: SettingsSectionId]
}>()

const { t } = useI18n()
</script>

<template>
  <div class="shrink-0 min-w-0">
    <div class="md:hidden border-b border-border bg-card">
      <div class="px-4 pt-3 pb-2">
        <p class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
          {{ t('settings.navTitle') }}
        </p>
        <div class="flex items-center gap-2">
          <div class="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              class="h-full rounded-full transition-all bg-aeto-teal"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
          <span class="text-[11px] font-mono text-muted-foreground shrink-0">
            {{ completedCount }}/{{ totalCount }}
          </span>
        </div>
      </div>
      <nav
        class="flex gap-2 overflow-x-auto px-4 pb-3"
        :aria-label="t('settings.navTitle')"
      >
        <UButton
          v-for="item in items"
          :key="item.id"
          :icon="item.icon"
          :label="t(item.labelKey)"
          size="sm"
          :color="activeId === item.id ? 'primary' : 'neutral'"
          :variant="activeId === item.id ? 'subtle' : 'outline'"
          class="shrink-0"
          @click="emit('select', item.id)"
        />
      </nav>
    </div>

    <aside class="hidden md:flex w-60 shrink-0 border-r border-border bg-card flex-col h-full">
      <div class="px-5 py-4 border-b border-border">
        <div class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
          {{ t('settings.navTitle') }}
        </div>
        <div class="flex items-center gap-2">
          <div class="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              class="h-full rounded-full transition-all bg-aeto-teal"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
          <span class="text-[11px] font-mono text-muted-foreground">
            {{ completedCount }}/{{ totalCount }}
          </span>
        </div>
      </div>

      <nav class="flex-1 p-2 space-y-0.5 overflow-y-auto">
        <UButton
          v-for="item in items"
          :key="item.id"
          :icon="item.icon"
          :label="t(item.labelKey)"
          color="neutral"
          :variant="activeId === item.id ? 'subtle' : 'ghost'"
          class="w-full justify-start"
          :class="activeId === item.id
            ? 'bg-aeto-teal-light text-aeto-teal-dark font-medium hover:bg-aeto-teal-light'
            : 'text-muted-foreground'"
          @click="emit('select', item.id)"
        >
          <template
            v-if="item.completed"
            #trailing
          >
            <span class="w-4 h-4 rounded-full flex items-center justify-center bg-aeto-teal">
              <UIcon
                name="i-lucide-check"
                class="h-2.5 w-2.5 text-white"
              />
            </span>
          </template>
        </UButton>
      </nav>
    </aside>
  </div>
</template>
