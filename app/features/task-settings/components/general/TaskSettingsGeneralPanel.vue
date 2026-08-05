<script setup lang="ts">
import type { SelectItem } from '@nuxt/ui'
import type { TaskView } from '~/features/tasks/types/task.types'
import { getInitials } from '~/shared/utils/initials'
import {
  buildCapacityExamples,
  createDefaultGeneralSettings,
  createMockPendingSignatures,
  createMockSignatureUsers,
} from '~/features/task-settings/types/general.types'

const { t } = useI18n()
const toast = useToast()

const settings = reactive(createDefaultGeneralSettings())
const signatureUsers = ref(createMockSignatureUsers())
const pendingSignatures = ref(createMockPendingSignatures())
const simulatedUserId = ref(signatureUsers.value[0]?.id ?? 'u1')

const capacityExamples = computed(() => buildCapacityExamples(settings.capacity))

const pendingRows = computed(() =>
  pendingSignatures.value.flatMap((item) => {
    const user = signatureUsers.value.find(entry => entry.id === item.userId)
    return user ? [{ ...item, user }] : []
  }),
)

const viewOptions: { value: TaskView, icon: string, labelKey: string }[] = [
  { value: 'list', icon: 'i-lucide-list', labelKey: 'tasks.views.list' },
  { value: 'kanban', icon: 'i-lucide-layout-grid', labelKey: 'tasks.views.kanban' },
  { value: 'calendar', icon: 'i-lucide-calendar', labelKey: 'tasks.views.calendar' },
]

const frequencyItems = computed<SelectItem[]>(() => [
  { label: t('taskSettings.general.signature.frequencyWeekly'), value: 'weekly' },
  { label: t('taskSettings.general.signature.frequencyBiweekly'), value: 'biweekly' },
  { label: t('taskSettings.general.signature.frequencyMonthly'), value: 'monthly' },
])

const weekdayItems = computed<SelectItem[]>(() => [
  { label: t('taskSettings.general.signature.monday'), value: 'monday' },
  { label: t('taskSettings.general.signature.tuesday'), value: 'tuesday' },
  { label: t('taskSettings.general.signature.wednesday'), value: 'wednesday' },
  { label: t('taskSettings.general.signature.thursday'), value: 'thursday' },
  { label: t('taskSettings.general.signature.friday'), value: 'friday' },
])

const hourItems = computed<SelectItem[]>(() =>
  Array.from({ length: 24 }, (_, hour) => {
    const value = `${String(hour).padStart(2, '0')}:00`
    return { label: value, value }
  }),
)

const simulatedUserItems = computed<SelectItem[]>(() =>
  signatureUsers.value.map(user => ({
    label: user.name,
    value: user.id,
  })),
)

const creationToggles = [
  {
    key: 'urgentDueDateRequired' as const,
    labelKey: 'taskSettings.general.creation.urgentDueDate',
    helpKey: 'taskSettings.general.creation.urgentDueDateHelp',
  },
  {
    key: 'projectRequired' as const,
    labelKey: 'taskSettings.general.creation.projectRequired',
    helpKey: 'taskSettings.general.creation.projectRequiredHelp',
  },
  {
    key: 'assigneeRequired' as const,
    labelKey: 'taskSettings.general.creation.assigneeRequired',
    helpKey: 'taskSettings.general.creation.assigneeRequiredHelp',
  },
]

const taskTypeToggles = [
  {
    key: 'typeRoleAuto' as const,
    labelKey: 'taskSettings.general.types.roleAuto',
    helpKey: 'taskSettings.general.types.roleAutoHelp',
    color: '#4c6ef5',
    locked: false,
  },
  {
    key: 'typeManual' as const,
    labelKey: 'taskSettings.general.types.manual',
    helpKey: 'taskSettings.general.types.manualHelp',
    color: '#28ceab',
    locked: true,
  },
  {
    key: 'typeRecurring' as const,
    labelKey: 'taskSettings.general.types.recurring',
    helpKey: 'taskSettings.general.types.recurringHelp',
    color: '#f97316',
    locked: false,
  },
  {
    key: 'typeModuleTrigger' as const,
    labelKey: 'taskSettings.general.types.moduleTrigger',
    helpKey: 'taskSettings.general.types.moduleTriggerHelp',
    color: '#f59e0b',
    locked: false,
  },
]

function onArchiveCompleted() {
  toast.add({
    title: t('taskSettings.general.danger.archiveToastTitle'),
    description: t('taskSettings.general.danger.archiveToastDescription'),
    color: 'success',
  })
}

function onCleanEmptyProjects() {
  toast.add({
    title: t('taskSettings.general.danger.cleanToastTitle'),
    description: t('taskSettings.general.danger.cleanToastDescription'),
    color: 'success',
  })
}

function onGenerateWeeklyTasks() {
  toast.add({
    title: t('taskSettings.general.signature.generateToastTitle'),
    description: t('taskSettings.general.signature.generateToastDescription'),
    color: 'success',
  })
}

function onResetSignature(id: string) {
  pendingSignatures.value = pendingSignatures.value.filter(item => item.id !== id)
}

function onReleaseAccess(id: string) {
  pendingSignatures.value = pendingSignatures.value.filter(item => item.id !== id)
  toast.add({
    title: t('taskSettings.general.signature.releaseToastTitle'),
    description: t('taskSettings.general.signature.releaseToastDescription'),
    color: 'success',
  })
}

function selectDefaultView(view: TaskView) {
  settings.defaultView = view
}

function clampCapacity() {
  if (!Number.isFinite(settings.capacity)) {
    settings.capacity = 20
    return
  }
  settings.capacity = Math.min(100, Math.max(5, Math.round(settings.capacity)))
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

    <!-- Creación de tareas -->
    <section class="space-y-2">
      <div class="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        {{ t('taskSettings.general.creation.section') }}
      </div>

      <div class="flex gap-2 items-start p-3 rounded-lg bg-muted/60 border border-border">
        <UIcon
          name="i-lucide-info"
          class="h-4 w-4 text-muted-foreground shrink-0 mt-0.5"
        />
        <p class="text-xs text-muted-foreground">
          {{ t('taskSettings.general.creation.info') }}
        </p>
      </div>

      <div class="bg-card border border-border rounded-xl px-4 divide-y divide-border">
        <div
          v-for="item in creationToggles"
          :key="item.key"
          class="flex items-start justify-between gap-4 py-3"
        >
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-foreground">
              {{ t(item.labelKey) }}
            </div>
            <div class="text-[11px] text-muted-foreground mt-0.5">
              {{ t(item.helpKey) }}
            </div>
          </div>
          <USwitch
            v-model="settings[item.key]"
            class="shrink-0 pt-0.5"
          />
        </div>
      </div>
    </section>

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
                :style="{ background: item.color }"
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
            v-model="settings[item.key]"
            :disabled="item.locked"
            :title="item.locked ? t('taskSettings.general.types.alwaysOn') : undefined"
            class="shrink-0 pt-0.5"
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
          :class="settings.defaultView === option.value
            ? 'border-aeto-teal bg-aeto-teal-light text-aeto-teal-dark ring-1 ring-aeto-teal'
            : 'border-border'"
          @click="selectDefaultView(option.value)"
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

    <!-- Capacidad del equipo -->
    <section class="space-y-2">
      <div class="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        {{ t('taskSettings.general.capacity.section') }}
      </div>
      <div class="text-[11px] text-muted-foreground">
        {{ t('taskSettings.general.capacity.help') }}
      </div>

      <div class="bg-card border border-border rounded-xl px-4 py-3 space-y-2">
        <label class="text-sm font-medium text-foreground">
          {{ t('taskSettings.general.capacity.maxLabel') }}
        </label>
        <div class="flex items-center gap-2">
          <UInput
            v-model.number="settings.capacity"
            type="number"
            :min="5"
            :max="100"
            class="w-24 font-mono"
            @blur="clampCapacity"
          />
          <span class="text-[12px] text-muted-foreground">
            {{ t('taskSettings.general.capacity.points') }}
          </span>
        </div>
        <div class="text-[11px] text-muted-foreground leading-relaxed">
          {{ t('taskSettings.general.capacity.scale') }}
          <br>
          {{ t('taskSettings.general.capacity.example', { n: settings.capacity }) }}
        </div>
      </div>

      <div class="bg-muted/60 border border-border rounded-xl p-3 space-y-2">
        <div class="text-[11px] text-muted-foreground">
          {{ t('taskSettings.general.capacity.previewIntro', { n: settings.capacity }) }}
        </div>
        <div class="space-y-1.5">
          <div class="flex items-center gap-2 text-[11px]">
            <span class="w-44 shrink-0 text-foreground">
              {{ t('taskSettings.general.capacity.quickOnly', { n: capacityExamples.quickOnly }) }}
            </span>
            <span class="inline-flex gap-0.5 flex-wrap">
              <span
                v-for="n in capacityExamples.quickOnly"
                :key="`q-${n}`"
                class="size-1.5 rounded-full bg-[#28cda8]"
              />
            </span>
          </div>
          <div class="flex items-center gap-2 text-[11px]">
            <span class="w-44 shrink-0 text-foreground">
              {{ t('taskSettings.general.capacity.normalMix', {
                normal: capacityExamples.normalCount,
                quick: capacityExamples.quickAfterNormal,
              }) }}
            </span>
            <span class="inline-flex gap-0.5 flex-wrap">
              <span
                v-for="n in capacityExamples.normalCount"
                :key="`n-${n}`"
                class="size-1.5 rounded-full bg-[#ca8a04]"
              />
            </span>
            <span class="inline-flex gap-0.5 flex-wrap">
              <span
                v-for="n in capacityExamples.quickAfterNormal"
                :key="`nq-${n}`"
                class="size-1.5 rounded-full bg-[#28cda8]"
              />
            </span>
          </div>
          <div class="flex items-center gap-2 text-[11px]">
            <span class="w-44 shrink-0 text-foreground">
              {{ t('taskSettings.general.capacity.complexMix') }}
            </span>
            <span class="inline-flex gap-0.5 flex-wrap">
              <span
                v-for="n in capacityExamples.complexCount"
                :key="`c-${n}`"
                class="size-1.5 rounded-full bg-[#e24b4a]"
              />
            </span>
            <span class="inline-flex gap-0.5 flex-wrap">
              <span
                v-for="n in capacityExamples.mixNormal"
                :key="`cn-${n}`"
                class="size-1.5 rounded-full bg-[#ca8a04]"
              />
            </span>
            <span class="inline-flex gap-0.5 flex-wrap">
              <span
                v-for="n in capacityExamples.mixQuick"
                :key="`cq-${n}`"
                class="size-1.5 rounded-full bg-[#28cda8]"
              />
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- Zona de peligro -->
    <section class="space-y-2">
      <div class="text-[11px] uppercase tracking-wider font-semibold text-error">
        {{ t('taskSettings.general.danger.section') }}
      </div>

      <div class="rounded-lg p-4 space-y-4 border border-error/60">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-foreground">
              {{ t('taskSettings.general.danger.archiveTitle') }}
            </div>
            <div class="text-xs text-muted-foreground mt-0.5">
              {{ t('taskSettings.general.danger.archiveHelp') }}
            </div>
          </div>
          <UButton
            :label="t('taskSettings.general.danger.archiveAction')"
            color="error"
            variant="soft"
            size="sm"
            class="self-start sm:shrink-0 font-semibold"
            @click="onArchiveCompleted"
          />
        </div>

        <div class="h-px bg-border" />

        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-foreground">
              {{ t('taskSettings.general.danger.cleanTitle') }}
            </div>
            <div class="text-xs text-muted-foreground mt-0.5">
              {{ t('taskSettings.general.danger.cleanHelp') }}
            </div>
          </div>
          <UButton
            :label="t('taskSettings.general.danger.cleanAction')"
            color="error"
            variant="soft"
            size="sm"
            class="self-start sm:shrink-0 font-semibold"
            @click="onCleanEmptyProjects"
          />
        </div>
      </div>
    </section>

    <!-- Firma de reporte semanal -->
    <section class="space-y-3 pt-2">
      <div class="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        {{ t('taskSettings.general.signature.section') }}
      </div>

      <div class="bg-card border border-border rounded-xl px-4 divide-y divide-border">
        <div class="flex items-center justify-between py-3 gap-3">
          <div class="min-w-0">
            <div class="text-sm font-medium text-foreground">
              {{ t('taskSettings.general.signature.moduleActive') }}
            </div>
            <div class="text-[11px] text-muted-foreground mt-0.5">
              {{ t('taskSettings.general.signature.moduleActiveHelp') }}
            </div>
          </div>
          <USwitch v-model="settings.weeklyReportEnabled" />
        </div>

        <div class="flex items-center justify-between py-3 gap-3">
          <div class="text-sm font-medium text-foreground">
            {{ t('taskSettings.general.signature.frequency') }}
          </div>
          <USelect
            v-model="settings.signatureFrequency"
            :items="frequencyItems"
            class="w-40"
          />
        </div>

        <div class="flex items-center justify-between py-3 gap-3">
          <div class="text-sm font-medium text-foreground">
            {{ t('taskSettings.general.signature.weekday') }}
          </div>
          <USelect
            v-model="settings.signatureWeekday"
            :items="weekdayItems"
            class="w-40"
          />
        </div>

        <div class="flex items-center justify-between py-3 gap-3">
          <div class="text-sm font-medium text-foreground">
            {{ t('taskSettings.general.signature.hour') }}
          </div>
          <USelect
            v-model="settings.signatureHour"
            :items="hourItems"
            class="w-28"
          />
        </div>
      </div>

      <div class="flex items-start gap-2 text-[12px] text-muted-foreground italic">
        <UIcon
          name="i-lucide-info"
          class="h-3.5 w-3.5 mt-0.5 shrink-0"
        />
        {{ t('taskSettings.general.signature.info') }}
      </div>

      <div class="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold pt-2">
        {{ t('taskSettings.general.signature.usersSection') }}
      </div>

      <div class="bg-card border border-border rounded-xl px-4 divide-y divide-border">
        <div
          v-for="user in signatureUsers"
          :key="user.id"
          class="flex items-center justify-between py-2.5 gap-3"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span
              class="inline-flex items-center justify-center size-6 rounded-full text-[11px] font-semibold text-white shrink-0"
              :style="{ background: user.color }"
            >
              {{ getInitials(user.name) }}
            </span>
            <div class="min-w-0">
              <div class="text-sm text-foreground truncate">
                {{ user.name }}
              </div>
              <div class="text-[11px] text-muted-foreground">
                {{ t(user.departmentKey) }}
              </div>
            </div>
          </div>
          <USwitch v-model="user.requiresSignature" />
        </div>
      </div>

      <div class="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold pt-2">
        {{ t('taskSettings.general.signature.simulationSection') }}
      </div>

      <div class="bg-muted/40 border border-border rounded-xl p-3 space-y-2">
        <div class="text-[11px] text-muted-foreground">
          {{ t('taskSettings.general.signature.simulationHelp') }}
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <USelect
            v-model="simulatedUserId"
            :items="simulatedUserItems"
            class="w-48"
          />
          <UButton
            :label="t('taskSettings.general.signature.generateAction')"
            class="bg-aeto-teal hover:opacity-90 text-[#0f1117] font-semibold"
            size="sm"
            @click="onGenerateWeeklyTasks"
          />
        </div>
      </div>

      <div class="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold pt-2">
        {{ t('taskSettings.general.signature.pendingSection') }}
      </div>

      <div class="bg-card border border-border rounded-xl px-2 py-1">
        <p
          v-if="!pendingRows.length"
          class="px-2 py-3 text-sm text-muted-foreground"
        >
          {{ t('taskSettings.general.signature.pendingEmpty') }}
        </p>

        <div
          v-for="(item, index) in pendingRows"
          :key="item.id"
          class="flex items-center justify-between gap-3 px-2 py-2"
          :class="index < pendingRows.length - 1 ? 'border-b border-border' : ''"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span
              class="inline-flex items-center justify-center size-6 rounded-full text-[11px] font-semibold text-white shrink-0"
              :style="{ background: item.user.color }"
            >
              {{ getInitials(item.user.name) }}
            </span>
            <div class="min-w-0">
              <div class="text-sm text-foreground truncate">
                {{ item.user.name }}
                <span class="text-[11px] text-muted-foreground">
                  · {{ t(item.user.departmentKey) }}
                </span>
              </div>
              <div class="text-[11px] text-muted-foreground font-mono">
                {{ t('taskSettings.general.signature.weekLabel', { range: item.weekLabel }) }}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <UButton
              :label="t('taskSettings.general.signature.reset')"
              color="neutral"
              variant="outline"
              size="xs"
              @click="onResetSignature(item.id)"
            />
            <UButton
              :label="t('taskSettings.general.signature.release')"
              size="xs"
              class="bg-aeto-teal hover:opacity-90 text-white font-semibold"
              @click="onReleaseAccess(item.id)"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
