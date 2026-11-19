<script setup lang="ts">
import type { TaskHistoryEvent } from '~/features/tasks/types/task.types'
import { useTaskHistory } from '~/features/tasks/composables/form/useTaskHistory'
import { useUpdateHistoryEvent } from '~/features/tasks/composables/form/useUpdateHistoryEvent'
import type { EditableHistoryType } from '~/features/tasks/composables/form/useUpdateHistoryEvent'
import { taskStatusMeta } from '~/features/tasks/utils/task-format.util'
import {
  groupTimelineByPhase,
  HISTORY_TONE_CLASSES,
  historyActorName,
  historyChanges,
  historyCommentChange,
  historyDetailNumber,
  historyDetailString,
  historyDetailUrls,
  historyEventIcon,
  historyEventTone,
  historyPhaseIcon,
  historyValueText,
} from '~/features/tasks/utils/form/task-history.util'
import type { HistoryTone } from '~/features/tasks/utils/form/task-history.util'
import { formatDateTime, formatRelativeTime, formatShortDate } from '~/shared/utils/date'
import { getInitials } from '~/shared/utils/initials'
import TaskHistoryRecordEditor from '~/features/tasks/components/form/TaskHistoryRecordEditor.vue'

/**
 * Historial de la tarea: todo lo que se le hizo, en orden cronológico y agrupado por fase (cada `process` abre una).
 */
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  taskId: number
}>()

const { t, locale } = useI18n()
useBackToClose(open)

const historyQuery = useTaskHistory(() => props.taskId, open)

const timeline = computed(() => historyQuery.data.value?.timeline ?? [])
const phases = computed(() => groupTimelineByPhase(timeline.value))
const isNotFound = computed(() => {
  const error = historyQuery.error.value as { statusCode?: number, status?: number } | null
  return (error?.statusCode ?? error?.status) === 404
})

/** Personas distintas que participaron (sin el sistema), en orden de aparición. */
const participants = computed(() => {
  const seen = new Map<number, TaskHistoryEvent>()
  for (const event of timeline.value) {
    if (event.actor != null && !seen.has(event.actor)) {
      seen.set(event.actor, event)
    }
  }
  return [...seen.values()]
})

const summary = computed(() => {
  const events = timeline.value
  return {
    events: events.length,
    phases: events.filter(event => event.type === 'process').length,
    messages: events.filter(event => event.type === 'message' && historyDetailString(event, 'message_type') === 'user').length,
    changes: events.filter(event => event.type === 'task_updated' || event.type === 'subtask_updated').length,
  }
})

function close() {
  open.value = false
}

// Edición de registros (solo super admin, uno a la vez): comentario de una fase o de un archivado, y texto de un
// mensaje del chat (no del sistema ni borrado). El resto de registros no son editables en la API.
const { isSuperuser } = useAuth()
const { mutateAsync: saveHistoryEvent, isPending: isSavingComment } = useUpdateHistoryEvent()
const editing = ref<{ type: EditableHistoryType, id: number } | null>(null)
const draftComment = ref('')
const originalComment = ref('')

function editableRecord(event: TaskHistoryEvent): { type: EditableHistoryType, id: number, text: string } | null {
  if (event.type === 'process' || event.type === 'archive') {
    const type: EditableHistoryType = event.type === 'process' ? 'process' : 'archive'
    const id = historyDetailNumber(event, type)
    return id == null ? null : { type, id, text: historyDetailString(event, 'comment') }
  }
  if (event.type === 'message' && historyDetailString(event, 'message_type') === 'user' && !event.detail?.deleted) {
    const id = historyDetailNumber(event, 'message')
    return id == null ? null : { type: 'message', id, text: event.action }
  }
  return null
}

function canEditRecord(event: TaskHistoryEvent): boolean {
  return isSuperuser.value && editableRecord(event) != null
}

function isEditing(event: TaskHistoryEvent): boolean {
  const record = editableRecord(event)
  return record != null && editing.value?.type === record.type && editing.value.id === record.id
}

function startEditRecord(event: TaskHistoryEvent) {
  const record = editableRecord(event)
  if (!record) {
    return
  }
  originalComment.value = record.text
  draftComment.value = record.text
  editing.value = { type: record.type, id: record.id }
}

function cancelEditComment() {
  editing.value = null
  draftComment.value = ''
}

/** El contenido de un mensaje es obligatorio; los comentarios sí se pueden vaciar. */
const canSubmit = computed(() => {
  const text = draftComment.value.trim()
  if (text === originalComment.value.trim()) {
    return false
  }
  return editing.value?.type !== 'message' || text.length > 0
})

async function submitComment() {
  if (!editing.value || !canSubmit.value) {
    return
  }
  try {
    await saveHistoryEvent({ taskId: props.taskId, ...editing.value, text: draftComment.value.trim() })
    cancelEditComment()
  }
  catch {
    // El toast de error ya lo muestra la mutación; la edición sigue abierta para corregir.
  }
}

watch(open, (isOpen) => {
  if (!isOpen) {
    cancelEditComment()
  }
})

function retry() {
  void historyQuery.refetch()
}

function actorLabel(event: TaskHistoryEvent): string {
  return historyActorName(event) ?? t('tasks.history.system')
}


function phaseTone(event: TaskHistoryEvent | null): HistoryTone {
  return event ? taskStatusMeta(historyDetailString(event, 'status')).color : 'neutral'
}

function toneClasses(tone: HistoryTone) {
  return HISTORY_TONE_CLASSES[tone]
}

function mentionName(event: TaskHistoryEvent): string {
  const full = [historyDetailString(event, 'first_name'), historyDetailString(event, 'last_name')].filter(Boolean).join(' ')
  return full || historyDetailString(event, 'username')
}

function fileName(url: string): string {
  try {
    const path = new URL(url).pathname
    return decodeURIComponent(path.split('/').pop() || url)
  }
  catch {
    return url
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'sm:max-w-2xl', body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <div class="flex w-full items-start gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/25">
          <UIcon
            name="i-lucide-history"
            class="h-5 w-5"
          />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold leading-tight">
            {{ t('tasks.history.modalTitle') }}
          </h2>
          <p class="truncate text-sm text-muted-foreground">
            {{ historyQuery.data.value?.short_description || t('tasks.history.modalDescription') }}
          </p>
        </div>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          square
          :aria-label="t('tasks.form.close')"
          @click="close"
        />
      </div>
    </template>

    <template #body>
      <!-- Cargando -->
      <div
        v-if="historyQuery.isPending.value"
        class="space-y-5 p-4 sm:p-6"
      >
        <div class="flex gap-2">
          <USkeleton
            v-for="n in 4"
            :key="n"
            class="h-14 flex-1 rounded-lg"
          />
        </div>
        <div
          v-for="n in 3"
          :key="`phase-${n}`"
          class="space-y-3 rounded-xl border border-border p-4"
        >
          <USkeleton class="h-5 w-40" />
          <div
            v-for="m in 2"
            :key="m"
            class="flex gap-3"
          >
            <USkeleton class="h-7 w-7 shrink-0 rounded-full" />
            <div class="flex-1 space-y-2">
              <USkeleton class="h-4 w-2/3" />
              <USkeleton class="h-3 w-1/4" />
            </div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div
        v-else-if="historyQuery.isError.value"
        class="flex flex-col items-center gap-3 px-6 py-12 text-center"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
          <UIcon
            :name="isNotFound ? 'i-lucide-lock' : 'i-lucide-circle-alert'"
            class="h-6 w-6"
          />
        </div>
        <p class="text-sm text-muted-foreground">
          {{ isNotFound ? t('tasks.history.notFound') : t('tasks.history.loadError') }}
        </p>
        <UButton
          v-if="!isNotFound"
          :label="t('tasks.history.retry')"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          size="sm"
          @click="retry"
        />
      </div>

      <!-- Vacío -->
      <div
        v-else-if="!phases.length"
        class="flex flex-col items-center gap-3 px-6 py-12 text-center"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UIcon
            name="i-lucide-clock"
            class="h-6 w-6"
          />
        </div>
        <p class="text-sm text-muted-foreground">
          {{ t('tasks.history.empty') }}
        </p>
      </div>

      <div
        v-else
        class="space-y-5 p-4 sm:p-6"
      >
        <!-- Resumen -->
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div
            v-for="stat in [
              { key: 'events', icon: 'i-lucide-activity', value: summary.events },
              { key: 'phases', icon: 'i-lucide-flag', value: summary.phases },
              { key: 'messages', icon: 'i-lucide-message-square', value: summary.messages },
              { key: 'changes', icon: 'i-lucide-square-pen', value: summary.changes },
            ]"
            :key="stat.key"
            class="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2"
          >
            <UIcon
              :name="stat.icon"
              class="h-4 w-4 shrink-0 text-muted-foreground"
            />
            <div class="min-w-0">
              <p class="text-base font-semibold leading-none tabular-nums">
                {{ stat.value }}
              </p>
              <p class="mt-0.5 truncate text-[11px] text-muted-foreground">
                {{ t(`tasks.history.summary.${stat.key}`) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Participantes -->
        <div
          v-if="participants.length"
          class="flex items-center gap-2"
        >
          <span class="text-xs text-muted-foreground">{{ t('tasks.history.participants') }}</span>
          <div class="flex -space-x-1.5">
            <UserAvatar
              v-for="person in participants.slice(0, 8)"
              :key="person.actor!"
              class="ring-2 ring-card"
              :user-id="person.actor"
              :initials="getInitials(actorLabel(person))"
              :name="actorLabel(person)"
              :size="24"
              :font-size="10"
            />
          </div>
          <span
            v-if="participants.length > 8"
            class="text-xs text-muted-foreground"
          >+{{ participants.length - 8 }}</span>
        </div>

        <!-- Fases -->
        <ol class="space-y-4">
          <li
            v-for="(phase, phaseIndex) in phases"
            :key="phaseIndex"
            class="relative overflow-hidden rounded-xl border border-border bg-card"
          >
            <!-- Acento con el color del estatus -->
            <span
              class="absolute inset-y-0 left-0 w-1"
              :class="toneClasses(phaseTone(phase.process)).accent"
            />

            <!-- Encabezado de la fase -->
            <div
              class="flex items-center gap-3 border-b border-border py-3 pl-5 pr-4"
              :class="toneClasses(phaseTone(phase.process)).soft"
            >
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1"
                :class="toneClasses(phaseTone(phase.process)).dot"
              >
                <UIcon
                  :name="phase.process ? historyPhaseIcon(historyDetailString(phase.process, 'status')) : 'i-lucide-sparkles'"
                  class="h-4 w-4"
                />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold">
                  {{ phase.process ? phase.process.action : t('tasks.history.initialPhase') }}
                </p>
                <p
                  v-if="phase.process"
                  class="truncate text-xs text-muted-foreground"
                >
                  {{ actorLabel(phase.process) }}
                  ·
                  <UTooltip :text="formatDateTime(phase.process.date, locale)">
                    <span>{{ formatRelativeTime(phase.process.date, locale) }}</span>
                  </UTooltip>
                </p>
              </div>
              <UBadge
                :label="t('tasks.history.eventsCount', { count: phase.events.length }, phase.events.length)"
                color="neutral"
                variant="subtle"
                size="sm"
                class="shrink-0"
              />
            </div>

            <!-- Comentario / imágenes / fecha original de la fase -->
            <div
              v-if="phase.process"
              class="space-y-2 border-b border-border py-3 pl-5 pr-4"
            >
              <!-- Cada proceso tiene su comentario: siempre se muestra (vacío → «Sin comentario»). -->
              <div class="rounded-lg border border-border bg-muted/40 px-3 py-2">
                <div class="mb-1 flex items-center justify-between gap-2">
                  <p class="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <UIcon
                      name="i-lucide-message-square-quote"
                      class="h-3.5 w-3.5"
                    />
                    {{ t('tasks.history.comment') }}
                  </p>
                  <UTooltip
                    v-if="canEditRecord(phase.process) && !isEditing(phase.process)"
                    :text="t('tasks.history.editComment')"
                  >
                    <UButton
                      icon="i-lucide-pencil"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      square
                      :aria-label="t('tasks.history.editComment')"
                      :disabled="isSavingComment"
                      @click="startEditRecord(phase.process)"
                    />
                  </UTooltip>
                </div>

                <!-- Edición (super admin) -->
                <TaskHistoryRecordEditor
                  v-if="isEditing(phase.process)"
                  v-model="draftComment"
                  :placeholder="t('tasks.history.commentPlaceholder')"
                  :loading="isSavingComment"
                  :can-save="canSubmit"
                  @save="submitComment"
                  @cancel="cancelEditComment"
                />

                <p
                  v-else-if="historyDetailString(phase.process, 'comment').trim()"
                  class="whitespace-pre-line break-words text-sm"
                >
                  {{ historyDetailString(phase.process, 'comment') }}
                </p>
                <p
                  v-else
                  class="text-sm italic text-muted-foreground"
                >
                  {{ t('tasks.history.noComment') }}
                </p>
              </div>
              <p
                v-if="historyDetailString(phase.process, 'original_limit_date')"
                class="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <UIcon
                  name="i-lucide-calendar-clock"
                  class="h-3.5 w-3.5"
                />
                {{ t('tasks.history.originalLimitDate') }}:
                <span class="font-medium text-foreground">{{ formatShortDate(historyDetailString(phase.process, 'original_limit_date'), locale) }}</span>
              </p>
              <div
                v-if="historyDetailUrls(phase.process, 'images').length"
                class="flex flex-wrap gap-2"
              >
                <a
                  v-for="url in historyDetailUrls(phase.process, 'images')"
                  :key="url"
                  :href="url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="group overflow-hidden rounded-lg border border-border"
                >
                  <img
                    :src="url"
                    alt=""
                    class="h-20 w-20 object-cover transition-transform duration-200 group-hover:scale-105"
                  >
                </a>
              </div>
            </div>

            <!-- Eventos -->
            <ol
              v-if="phase.events.length"
              class="relative py-3 pl-5 pr-4"
            >
              <li
                v-for="(event, eventIndex) in phase.events"
                :key="`${event.date}-${eventIndex}`"
                class="relative flex gap-3 pb-4 last:pb-0"
              >
                <!-- Línea que une los puntos -->
                <span
                  v-if="eventIndex < phase.events.length - 1"
                  class="absolute left-[13px] top-7 bottom-0 w-px bg-border"
                />

                <div
                  class="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1"
                  :class="toneClasses(historyEventTone(event)).dot"
                >
                  <UIcon
                    :name="historyEventIcon(event.type)"
                    class="h-3.5 w-3.5"
                  />
                </div>

                <div class="min-w-0 flex-1 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-muted/40">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex min-w-0 items-center gap-1.5">
                      <UserAvatar
                        v-if="event.actor != null"
                        :user-id="event.actor"
                        :initials="getInitials(actorLabel(event))"
                        :name="actorLabel(event)"
                        :size="18"
                        :font-size="8"
                        class="shrink-0"
                      />
                      <UIcon
                        v-else
                        name="i-lucide-bot"
                        class="h-4 w-4 shrink-0 text-muted-foreground"
                      />
                      <p class="min-w-0 text-sm leading-snug">
                        <span class="font-medium">{{ actorLabel(event) }}</span>
                        <span class="text-muted-foreground"> · {{ event.action }}</span>
                      </p>
                    </div>
                    <div class="flex shrink-0 items-center gap-1">
                      <UTooltip :text="formatDateTime(event.date, locale)">
                        <span class="whitespace-nowrap text-[11px] text-muted-foreground tabular-nums">
                          {{ formatRelativeTime(event.date, locale) }}
                        </span>
                      </UTooltip>
                      <UTooltip
                        v-if="canEditRecord(event) && !isEditing(event)"
                        :text="event.type === 'message' ? t('tasks.history.editMessage') : t('tasks.history.editComment')"
                      >
                        <UButton
                          icon="i-lucide-pencil"
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          square
                          class="-my-1"
                          :aria-label="event.type === 'message' ? t('tasks.history.editMessage') : t('tasks.history.editComment')"
                          :disabled="isSavingComment"
                          @click="startEditRecord(event)"
                        />
                      </UTooltip>
                    </div>
                  </div>

                  <!-- Edición en línea del registro (super admin) -->
                  <TaskHistoryRecordEditor
                    v-if="isEditing(event)"
                    v-model="draftComment"
                    class="mt-2"
                    :placeholder="event.type === 'message' ? t('tasks.history.messagePlaceholder') : t('tasks.history.commentPlaceholder')"
                    :loading="isSavingComment"
                    :can-save="canSubmit"
                    @save="submitComment"
                    @cancel="cancelEditComment"
                  />

                  <!-- Detalle según el tipo -->
                  <div
                    v-else-if="event.type === 'task_updated' || event.type === 'subtask_updated'"
                    class="mt-1.5 space-y-1"
                  >
                    <p
                      v-if="event.type === 'subtask_updated' && historyDetailString(event, 'short_description')"
                      class="text-xs text-muted-foreground"
                    >
                      {{ historyDetailString(event, 'short_description') }}
                    </p>
                    <div
                      v-for="(change, changeIndex) in historyChanges(event)"
                      :key="changeIndex"
                      class="flex flex-wrap items-center gap-1.5 text-xs"
                    >
                      <span class="rounded bg-muted px-1.5 py-0.5 font-medium">{{ change.field }}</span>
                      <span class="rounded bg-error/10 px-1.5 py-0.5 text-error line-through decoration-1 break-all">
                        {{ historyValueText(change.old) ?? t('tasks.history.emptyValue') }}
                      </span>
                      <UIcon
                        name="i-lucide-arrow-right"
                        class="h-3 w-3 text-muted-foreground"
                      />
                      <span class="rounded bg-success/10 px-1.5 py-0.5 text-success break-all">
                        {{ historyValueText(change.new) ?? t('tasks.history.emptyValue') }}
                      </span>
                    </div>
                  </div>

                  <template v-else-if="event.type === 'message'">
                    <p
                      v-if="event.detail?.deleted"
                      class="mt-1.5 inline-flex items-center gap-1.5 text-xs italic text-muted-foreground"
                    >
                      <UIcon
                        name="i-lucide-ban"
                        class="h-3.5 w-3.5"
                      />
                      <span>{{ t('tasks.history.deletedMessage') }}</span>
                    </p>
                    <div
                      v-if="historyDetailUrls(event, 'files').length"
                      class="mt-1.5 flex flex-wrap gap-1.5"
                    >
                      <ULink
                        v-for="url in historyDetailUrls(event, 'files')"
                        :key="url"
                        :to="url"
                        target="_blank"
                        class="inline-flex max-w-full items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                      >
                        <UIcon
                          name="i-lucide-paperclip"
                          class="h-3 w-3 shrink-0"
                        />
                        <span class="truncate">{{ fileName(url) }}</span>
                      </ULink>
                    </div>
                  </template>

                  <div
                    v-else-if="event.type === 'message_edited'"
                    class="mt-1.5 space-y-1 text-xs"
                  >
                    <p class="break-words rounded bg-error/10 px-2 py-1 text-error line-through decoration-1">
                      {{ historyDetailString(event, 'old') || t('tasks.history.emptyValue') }}
                    </p>
                    <p class="break-words rounded bg-success/10 px-2 py-1 text-success">
                      {{ historyDetailString(event, 'new') || t('tasks.history.emptyValue') }}
                    </p>
                  </div>

                  <div
                    v-else-if="(event.type === 'process_edited' || event.type === 'archive_edited') && historyCommentChange(event)"
                    class="mt-1.5 space-y-1 text-xs"
                  >
                    <p class="whitespace-pre-line break-words rounded bg-error/10 px-2 py-1 text-error line-through decoration-1">
                      {{ historyCommentChange(event)!.old || t('tasks.history.emptyValue') }}
                    </p>
                    <p class="whitespace-pre-line break-words rounded bg-success/10 px-2 py-1 text-success">
                      {{ historyCommentChange(event)!.new || t('tasks.history.emptyValue') }}
                    </p>
                  </div>

                  <UBadge
                    v-else-if="event.type === 'mention' && mentionName(event)"
                    :label="`@${mentionName(event)}`"
                    color="warning"
                    variant="soft"
                    size="sm"
                    class="mt-1.5"
                  />

                  <ULink
                    v-else-if="event.type === 'file' && historyDetailString(event, 'url')"
                    :to="historyDetailString(event, 'url')"
                    target="_blank"
                    class="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                  >
                    <UIcon
                      name="i-lucide-paperclip"
                      class="h-3 w-3 shrink-0"
                    />
                    <span class="truncate">{{ fileName(historyDetailString(event, 'url')) }}</span>
                  </ULink>

                  <p
                    v-else-if="event.type.startsWith('subtask_') && historyDetailString(event, 'short_description')"
                    class="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-secondary/10 px-2 py-1 text-xs text-secondary"
                  >
                    <UIcon
                      :name="event.type === 'subtask_completed' ? 'i-lucide-square-check' : 'i-lucide-square'"
                      class="h-3.5 w-3.5 shrink-0"
                    />
                    <span :class="{ 'line-through': event.type === 'subtask_deleted' }">
                      {{ historyDetailString(event, 'short_description') }}
                    </span>
                  </p>

                  <p
                    v-else-if="event.type === 'archive' && historyDetailString(event, 'comment')"
                    class="mt-1.5 whitespace-pre-line rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
                  >
                    {{ historyDetailString(event, 'comment') }}
                  </p>
                </div>
              </li>
            </ol>
          </li>
        </ol>
      </div>
    </template>
  </UModal>
</template>
