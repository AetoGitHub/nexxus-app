<script setup lang="ts">
import type {
  ProfileConfiguration,
  ProfileDefaultView,
  UpdateProfileConfigurationPayload,
} from '~/shared/types/auth.types'

const { t } = useI18n()
const {
  configuration,
  errorMessage,
  isPending: isLoading,
} = useProfileConfiguration()
const updateConfiguration = useUpdateProfileConfiguration()

const viewOptions: { value: ProfileDefaultView, icon: string, labelKey: string }[] = [
  { value: 'list', icon: 'i-lucide-list', labelKey: 'tasks.views.list' },
  { value: 'kanban', icon: 'i-lucide-layout-grid', labelKey: 'tasks.views.kanban' },
  { value: 'calendar', icon: 'i-lucide-calendar', labelKey: 'tasks.views.calendar' },
]

const taskTypeToggles: {
  key: keyof Pick<
    ProfileConfiguration,
    | 'enable_puesto_tasks'
    | 'enable_manual_tasks'
    | 'enable_repeat_tasks'
    | 'enable_trigger_tasks'
  >
  labelKey: string
  helpKey: string
  colorClass: string
}[] = [
  {
    key: 'enable_puesto_tasks',
    labelKey: 'taskSettings.general.types.roleAuto',
    helpKey: 'taskSettings.general.types.roleAutoHelp',
    colorClass: 'bg-info',
  },
  {
    key: 'enable_manual_tasks',
    labelKey: 'taskSettings.general.types.manual',
    helpKey: 'taskSettings.general.types.manualHelp',
    colorClass: 'bg-success',
  },
  {
    key: 'enable_repeat_tasks',
    labelKey: 'taskSettings.general.types.recurring',
    helpKey: 'taskSettings.general.types.recurringHelp',
    colorClass: 'bg-warning',
  },
  {
    key: 'enable_trigger_tasks',
    labelKey: 'taskSettings.general.types.moduleTrigger',
    helpKey: 'taskSettings.general.types.moduleTriggerHelp',
    colorClass: 'bg-primary',
  },
]

function toPayload(value: ProfileConfiguration): UpdateProfileConfigurationPayload {
  return {
    enable_puesto_tasks: value.enable_puesto_tasks,
    enable_manual_tasks: value.enable_manual_tasks,
    enable_repeat_tasks: value.enable_repeat_tasks,
    enable_trigger_tasks: value.enable_trigger_tasks,
    default_view: value.default_view,
    show_system_messages: value.show_system_messages,
  }
}

function updateSetting(
  patch: Partial<UpdateProfileConfigurationPayload>,
) {
  if (!configuration.value || updateConfiguration.isPending.value) {
    return
  }

  updateConfiguration.mutate({
    ...toPayload(configuration.value),
    ...patch,
  })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl font-bold text-foreground">
        {{ t('taskSettings.general.title') }}
      </h2>
      <p class="text-sm text-muted-foreground mt-1">
        {{ t('taskSettings.general.subtitle') }}
      </p>
    </div>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="t('taskSettings.general.loadError')"
      :description="errorMessage"
    />

    <div
      v-if="isLoading && !configuration"
      class="space-y-3"
    >
      <USkeleton class="h-5 w-32" />
      <USkeleton class="h-52 w-full rounded-xl" />
      <USkeleton class="h-28 w-full rounded-xl" />
    </div>

    <template v-else-if="configuration">
      <!-- Tipos de tarea -->
      <section class="space-y-2">
        <div class="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          {{ t('taskSettings.general.types.section') }}
        </div>
        <div class="text-[11px] text-muted-foreground">
          {{ t('taskSettings.general.types.help') }}
        </div>

        <div class="bg-card border border-border rounded-xl px-4 divide-y divide-border">
          <div
            v-for="item in taskTypeToggles"
            :key="item.key"
            class="flex items-start justify-between gap-4 py-3"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span
                  class="h-2 w-2 rounded-full shrink-0"
                  :class="item.colorClass"
                />
                <span class="text-sm font-medium text-foreground">
                  {{ t(item.labelKey) }}
                </span>
              </div>
              <div class="text-[11px] text-muted-foreground mt-0.5">
                {{ t(item.helpKey) }}
              </div>
            </div>
            <USwitch
              :model-value="configuration[item.key]"
              :disabled="updateConfiguration.isPending.value"
              class="shrink-0 pt-0.5"
              @update:model-value="updateSetting({ [item.key]: $event })"
            />
          </div>
        </div>
      </section>

      <!-- Vista predeterminada -->
      <section class="space-y-2">
        <div class="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          {{ t('taskSettings.general.defaultView.section') }}
        </div>
        <div class="text-[11px] text-muted-foreground">
          {{ t('taskSettings.general.defaultView.help') }}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <UButton
            v-for="option in viewOptions"
            :key="option.value"
            color="neutral"
            variant="outline"
            class="h-auto p-4 flex-col items-center gap-1.5"
            :class="configuration.default_view === option.value
              ? 'border-aeto-teal bg-aeto-teal-light text-aeto-teal-dark ring-1 ring-aeto-teal'
              : 'border-border'"
            :disabled="updateConfiguration.isPending.value"
            @click="updateSetting({ default_view: option.value })"
          >
            <UIcon
              :name="option.icon"
              class="h-5 w-5"
            />
            <span class="text-xs font-medium">
              {{ t(option.labelKey) }}
            </span>
          </UButton>
        </div>
      </section>

      <!-- Mensajes del sistema -->
      <section class="space-y-2">
        <div class="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          {{ t('taskSettings.general.systemMessages.section') }}
        </div>

        <div class="bg-card border border-border rounded-xl px-4">
          <div class="flex items-start justify-between gap-4 py-3">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-foreground">
                {{ t('taskSettings.general.systemMessages.label') }}
              </div>
              <div class="text-[11px] text-muted-foreground mt-0.5">
                {{ t('taskSettings.general.systemMessages.help') }}
              </div>
            </div>
            <USwitch
              :model-value="configuration.show_system_messages"
              :disabled="updateConfiguration.isPending.value"
              class="shrink-0 pt-0.5"
              @update:model-value="updateSetting({ show_system_messages: Boolean($event) })"
            />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
