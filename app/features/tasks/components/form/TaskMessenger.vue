<script setup lang="ts">
import { useCreateTaskMessage } from '~/features/tasks/composables/form/useCreateTaskMessage'
import { useTaskMessages } from '~/features/tasks/composables/form/useTaskMessages'
import { useTaskMessagesSocket } from '~/features/tasks/composables/form/useTaskMessagesSocket'
import type { TaskMessage } from '~/features/tasks/types/task.types'
import { fileTypeIcon, resolveTaskMessageContent } from '~/features/tasks/utils/form/task-message.util'
import TaskMessageAttachments from '~/features/tasks/components/form/TaskMessageAttachments.vue'
import {
  buildTaskMessageUploadDirectory,
  buildTaskUploadFileName,
} from '~/features/tasks/utils/form/task-file-upload.util'
import { useFirebaseUpload } from '~/shared/composables/useFirebaseUpload'
import { formatDateTime } from '~/shared/utils/date'
import { getInitials } from '~/shared/utils/initials'

const AVATAR_COLORS = [
  '#f59e0b',
  '#28ceab',
  '#0ea5e9',
  '#f97316',
  '#8b5cf6',
  '#ef4444',
  '#22c55e',
  '#ec4899',
] as const

const props = withDefaults(
  defineProps<{
    taskId: number
    /** Tarea archivada: solo lectura, sin composer de mensajes. */
    readonly?: boolean
  }>(),
  {
    readonly: false,
  },
)

const { t, locale } = useI18n()
const { user, organization, selectedCompanyId } = useAuth()
const { uploadFile } = useFirebaseUpload()
const toast = useToast()

const {
  messages,
  isPending,
  isError,
  errorMessage,
} = useTaskMessages(() => props.taskId)

const { status: socketStatus } = useTaskMessagesSocket(() => props.taskId)
const { mutateAsync: createMessage, isPending: isSending } = useCreateTaskMessage()

const draft = ref('')
const listEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
const fileInputEl = ref<HTMLInputElement | null>(null)
const draftInput = useTemplateRef<{ textareaRef: HTMLTextAreaElement | null }>('draftInput')
/** Archivos elegidos, pendientes de subir a Firebase al enviar el mensaje. */
const pendingFiles = ref<File[]>([])
const isUploadingFiles = ref(false)
/** Overlay de drag & drop: activo mientras el usuario arrastra archivos sobre el chat. */
const isDraggingFilesOver = ref(false)
/** Cuenta dragenter/dragleave anidados (hijos del contenedor) para no parpadear el overlay. */
let dragDepth = 0
/** Mientras el usuario esté al final, la vista queda anclada al mensaje más reciente. */
const isPinnedToBottom = ref(true)

const isBusy = computed(() => isSending.value || isUploadingFiles.value)
const canSend = computed(() => (draft.value.trim().length > 0 || pendingFiles.value.length > 0) && !isBusy.value)

const messageCount = computed(() =>
  messages.value.filter(message => !isSystemMessage(message.type)).length,
)

const countLabel = computed(() =>
  t('tasks.messenger.messageCount', { n: messageCount.value }),
)

const socketBadge = computed(() => {
  switch (socketStatus.value) {
    case 'connected':
      return {
        label: t('tasks.messenger.connected'),
        icon: 'i-lucide-wifi',
        color: 'success' as const,
      }
    case 'connecting':
      return {
        label: t('tasks.messenger.connecting'),
        icon: 'i-lucide-loader-circle',
        color: 'warning' as const,
      }
    case 'reconnecting':
      return {
        label: t('tasks.messenger.reconnecting'),
        icon: 'i-lucide-loader-circle',
        color: 'warning' as const,
      }
    case 'error':
      return {
        label: t('tasks.messenger.offline'),
        icon: 'i-lucide-wifi-off',
        color: 'error' as const,
      }
    default:
      return {
        label: t('tasks.messenger.offline'),
        icon: 'i-lucide-wifi-off',
        color: 'neutral' as const,
      }
  }
})

const socketTooltip = computed(() =>
  socketStatus.value === 'error'
    ? t('tasks.messenger.connectionErrorTitle')
    : socketBadge.value.label,
)

function isOwnMessage(profileId: number, username: string) {
  const current = user.value
  if (!current) {
    return false
  }
  return current.id === profileId || current.username === username
}

function isSystemMessage(type: string | undefined) {
  return type != null && type !== 'user'
}

function resolveAvatarColor(userId: number) {
  const index = Math.abs(userId) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]!
}

/** Primer mensaje de un bloque consecutivo del mismo remitente (no propio). */
function isFirstIncomingInGroup(message: TaskMessage, index: number) {
  if (isSystemMessage(message.type) || isOwnMessage(message.profile, message.profile_username)) {
    return false
  }

  if (index === 0) {
    return true
  }

  const previous = messages.value[index - 1]
  if (!previous || isSystemMessage(previous.type)) {
    return true
  }

  return previous.profile !== message.profile
}

function formatTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function messageContent(message: TaskMessage) {
  return resolveTaskMessageContent(message, (key, params) => t(key, params ?? {}))
}

function scrollToLatest() {
  if (!listEl.value) {
    return
  }
  listEl.value.scrollTop = listEl.value.scrollHeight
}

async function scrollToLatestAfterRender() {
  await nextTick()
  scrollToLatest()
}

function onListScroll() {
  if (!listEl.value) {
    return
  }

  const distance = listEl.value.scrollHeight
    - listEl.value.scrollTop
    - listEl.value.clientHeight

  isPinnedToBottom.value = distance <= 80
}

function openFilePicker() {
  fileInputEl.value?.click()
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  pendingFiles.value = [...pendingFiles.value, ...files]
  input.value = ''
}

function removePendingFile(index: number) {
  pendingFiles.value = pendingFiles.value.filter((_, i) => i !== index)
}

function isFileDrag(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

function onDragEnter(event: DragEvent) {
  if (props.readonly || !isFileDrag(event)) {
    return
  }
  dragDepth += 1
  isDraggingFilesOver.value = true
}

function onDragLeave() {
  if (dragDepth > 0) {
    dragDepth -= 1
  }
  if (dragDepth === 0) {
    isDraggingFilesOver.value = false
  }
}

function onFilesDropped(event: DragEvent) {
  dragDepth = 0
  isDraggingFilesOver.value = false
  if (props.readonly) {
    return
  }
  const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : []
  if (files.length) {
    pendingFiles.value = [...pendingFiles.value, ...files]
  }
}

/** Sube los adjuntos pendientes a Firebase (vía n8n) y devuelve sus URLs finales. */
async function uploadPendingFiles(): Promise<string[]> {
  const organizationId = organization.value?.id
  const companyId = selectedCompanyId.value
  if (organizationId == null || companyId == null) {
    throw new Error('missing_upload_context')
  }

  const directory = buildTaskMessageUploadDirectory(organizationId, companyId, props.taskId)

  isUploadingFiles.value = true
  try {
    return await Promise.all(
      pendingFiles.value.map(file =>
        uploadFile(file, directory, buildTaskUploadFileName(file.name)),
      ),
    )
  }
  finally {
    isUploadingFiles.value = false
  }
}

async function sendMessage() {
  const content = draft.value.trim()
  if ((!content && pendingFiles.value.length === 0) || isBusy.value) {
    return
  }

  let files: string[] | undefined
  try {
    files = pendingFiles.value.length ? await uploadPendingFiles() : undefined
  }
  catch (error) {
    const isMissingContext = error instanceof Error && error.message === 'missing_upload_context'
    toast.add({
      title: t('tasks.messenger.attachments.uploadErrorTitle'),
      description: isMissingContext
        ? t('tasks.messenger.attachments.missingContext')
        : parseFetchError(error),
      color: 'error',
    })
    return
  }

  await createMessage({
    task: props.taskId,
    content,
    files,
  })
  draft.value = ''
  pendingFiles.value = []
  isPinnedToBottom.value = true
  await scrollToLatestAfterRender()
  draftInput.value?.textareaRef?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void sendMessage()
  }
}

// El slideover entra animado: el alto real de la lista llega después del primer render,
// así que reanclamos en cada cambio de tamaño mientras el usuario siga al final.
useResizeObserver(contentEl, () => {
  if (isPinnedToBottom.value) {
    scrollToLatest()
  }
})

watch(
  messages,
  () => {
    if (isPinnedToBottom.value) {
      void scrollToLatestAfterRender()
    }
  },
)

watch(
  () => props.taskId,
  () => {
    isPinnedToBottom.value = true
    pendingFiles.value = []
  },
)
</script>

<template>
  <div
    class="relative flex h-full min-h-0 w-full flex-col"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onFilesDropped"
  >
    <UCard
      variant="outline"
      class="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-none"
      :ui="{
        root: 'divide-y divide-border',
        header: 'px-4 py-3',
        body: 'flex-1 min-h-0 overflow-hidden p-0',
        footer: 'px-3 py-3',
      }"
    >
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-1.5">
          <h2 class="font-semibold truncate">
            {{ t('tasks.messenger.title') }}
          </h2>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <slot name="header-actions" />
          <UTooltip :text="socketTooltip">
            <UBadge
              :label="socketBadge.label"
              :icon="socketBadge.icon"
              :color="socketBadge.color"
              variant="subtle"
              size="sm"
              :class="{
                '**:data-[slot=leading-icon]:animate-spin': socketStatus === 'connecting'
                  || socketStatus === 'reconnecting',
              }"
            />
          </UTooltip>
          <span class="text-xs text-muted-foreground">
            {{ countLabel }}
          </span>
        </div>
      </div>
    </template>

    <div
      ref="listEl"
      class="h-full min-h-0 overflow-y-auto p-3"
      @scroll.passive="onListScroll"
    >
      <div
        v-if="isPending"
        class="flex h-full items-center justify-center"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="h-5 w-5 animate-spin text-muted-foreground"
        />
      </div>

      <UAlert
        v-else-if="isError"
        color="error"
        variant="subtle"
        :title="t('tasks.messenger.loadError')"
        :description="errorMessage"
      />

      <div
        v-else-if="messages.length === 0"
        class="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground"
      >
        {{ t('tasks.messenger.empty') }}
      </div>

      <ul
        v-else
        ref="contentEl"
        class="flex flex-col gap-1.5"
      >
        <li
          v-for="(message, index) in messages"
          :key="message.id"
          class="flex"
          :class="isSystemMessage(message.type)
            ? 'justify-center'
            : isOwnMessage(message.profile, message.profile_username)
              ? 'justify-end'
              : 'justify-start'"
        >
          <div
            v-if="isSystemMessage(message.type)"
            class="mb-5 flex w-full max-w-[90%] flex-col items-center gap-2"
          >
            <div class="flex flex-col items-center gap-0.5 px-2 py-1">
              <p class="text-center text-xs text-muted-foreground whitespace-pre-wrap wrap-break-word">
                {{ messageContent(message) }}
              </p>
              <p class="text-center text-[10px] text-muted-foreground/80">
                {{ formatDateTime(message.created_at, locale) }}
              </p>
            </div>
            <USeparator class="w-full" />
          </div>

          <div
            v-else-if="isOwnMessage(message.profile, message.profile_username)"
            class="max-w-[85%] rounded-2xl rounded-br-md bg-primary/70 px-3 py-2 text-sm text-white"
          >
            <p
              v-if="messageContent(message)"
              class="whitespace-pre-wrap wrap-break-word"
            >
              {{ messageContent(message) }}
            </p>
            <TaskMessageAttachments
              v-if="message.files?.length"
              :files="message.files"
              tone="own"
            />
            <p class="mt-1 text-right text-[10px] text-white/80">
              {{ formatTime(message.created_at) }}
            </p>
          </div>

          <div
            v-else
            class="flex max-w-[85%] items-end gap-2"
          >
            <!-- Avatar nativo: círculo de iniciales (mismo patrón que grupos). -->
            <span
              v-if="isFirstIncomingInGroup(message, index)"
              class="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold leading-none text-white select-none"
              :style="{ backgroundColor: resolveAvatarColor(message.profile) }"
              :title="message.profile_username"
            >
              {{ getInitials(message.profile_username) }}
            </span>
            <span
              v-else
              class="size-7 shrink-0"
              aria-hidden="true"
            />

            <div class="min-w-0 rounded-2xl rounded-bl-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
              <p
                v-if="isFirstIncomingInGroup(message, index)"
                class="mb-0.5 text-[12px] font-semibold text-teal-500 dark:text-teal-400"
              >
                {{ message.profile_username }}
              </p>
              <p
                v-if="messageContent(message)"
                class="whitespace-pre-wrap wrap-break-word"
              >
                {{ messageContent(message) }}
              </p>
              <TaskMessageAttachments
                v-if="message.files?.length"
                :files="message.files"
                tone="incoming"
              />
              <p class="mt-1 text-right text-[10px] text-muted-foreground">
                {{ formatTime(message.created_at) }}
              </p>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <template #footer>
      <p
        v-if="props.readonly"
        class="text-center text-xs text-muted-foreground"
      >
        {{ t('tasks.messenger.archivedNotice') }}
      </p>
      <div
        v-else
        class="flex flex-col gap-2"
      >
        <ul
          v-if="pendingFiles.length"
          class="flex flex-wrap gap-1.5"
        >
          <li
            v-for="(file, index) in pendingFiles"
            :key="`${file.name}-${index}`"
            class="flex max-w-56 min-w-0 items-center gap-1.5 rounded-lg border border-border bg-muted/40 py-1 pl-2 pr-1 text-xs text-foreground"
          >
            <UIcon
              :name="fileTypeIcon(file.name)"
              class="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            />
            <span
              class="min-w-0 truncate"
              :title="file.name"
            >{{ file.name }}</span>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              :disabled="isBusy"
              :aria-label="t('tasks.messenger.attachments.remove')"
              @click="removePendingFile(index)"
            />
          </li>
        </ul>

        <div class="flex items-end gap-2">
          <input
            ref="fileInputEl"
            type="file"
            multiple
            class="hidden"
            @change="onFilesSelected"
          >
          <UButton
            icon="i-lucide-paperclip"
            color="neutral"
            variant="ghost"
            size="md"
            square
            :disabled="isBusy"
            :aria-label="t('tasks.messenger.attachments.add')"
            @click="openFilePicker"
          />
          <UTextarea
            ref="draftInput"
            v-model="draft"
            :placeholder="t('tasks.messenger.placeholder')"
            :rows="1"
            autoresize
            class="min-w-0 flex-1"
            :ui="{ base: 'max-h-28' }"
            @keydown="onKeydown"
          />
          <UButton
            icon="i-lucide-send"
            color="primary"
            size="md"
            square
            :loading="isBusy"
            :disabled="!canSend"
            :aria-label="t('tasks.messenger.send')"
            @click="sendMessage"
          />
        </div>
      </div>
    </template>
    </UCard>

    <div
      v-if="isDraggingFilesOver"
      class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm"
    >
      <UIcon
        name="i-lucide-upload"
        class="h-8 w-8 text-primary"
      />
      <p class="text-sm font-medium text-primary">
        {{ t('tasks.messenger.attachments.dropHint') }}
      </p>
    </div>
  </div>
</template>
