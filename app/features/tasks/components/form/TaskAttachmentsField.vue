<script setup lang="ts">
import { fileNameFromUrl, fileTypeIcon, isImageFileUrl } from '~/features/tasks/utils/form/task-message.util'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const MAX_FILE_SIZE = 25 * 1024 * 1024

/** Archivos locales aún no subidos: se suben hasta confirmar el submit (crear/guardar). */
const pendingFiles = defineModel<File[]>('pendingFiles', { default: () => [] })
/** URLs ya subidas a Firebase (existentes al editar una tarea). */
const existingFiles = defineModel<string[]>('existingFiles', { default: () => [] })

const { t } = useI18n()
const toast = useToast()

const fileInputEl = ref<HTMLInputElement | null>(null)
const isDraggingOver = ref(false)
let dragDepth = 0

interface AttachmentItem {
  key: string
  name: string
  sizeLabel: string | null
  icon: string
  isImage: boolean
  kind: 'existing' | 'pending'
  index: number
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

const items = computed<AttachmentItem[]>(() => [
  ...existingFiles.value.map((url, index): AttachmentItem => {
    const isImage = isImageFileUrl(url)
    return {
      key: `existing-${url}`,
      name: fileNameFromUrl(url),
      sizeLabel: null,
      icon: isImage ? 'i-lucide-image' : fileTypeIcon(url),
      isImage,
      kind: 'existing',
      index,
    }
  }),
  ...pendingFiles.value.map((file, index): AttachmentItem => {
    const isImage = file.type.startsWith('image/')
    return {
      key: `pending-${index}-${file.name}`,
      name: file.name,
      sizeLabel: formatSize(file.size),
      icon: isImage ? 'i-lucide-image' : fileTypeIcon(file.name),
      isImage,
      kind: 'pending',
      index,
    }
  }),
])

function isFileDrag(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

function onDragEnter(event: DragEvent) {
  if (props.disabled || !isFileDrag(event)) {
    return
  }
  dragDepth += 1
  isDraggingOver.value = true
}

function onDragLeave() {
  if (dragDepth > 0) {
    dragDepth -= 1
  }
  if (dragDepth === 0) {
    isDraggingOver.value = false
  }
}

function addFiles(files: File[]) {
  const accepted: File[] = []
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      toast.add({
        title: t('tasks.form.attachments.tooLargeTitle'),
        description: t('tasks.form.attachments.tooLargeDescription', { name: file.name }),
        color: 'error',
      })
      continue
    }
    accepted.push(file)
  }
  if (accepted.length) {
    pendingFiles.value = [...pendingFiles.value, ...accepted]
  }
}

function onDrop(event: DragEvent) {
  dragDepth = 0
  isDraggingOver.value = false
  if (props.disabled) {
    return
  }
  const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : []
  if (files.length) {
    addFiles(files)
  }
}

function openFilePicker() {
  if (props.disabled) {
    return
  }
  fileInputEl.value?.click()
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (files.length) {
    addFiles(files)
  }
  input.value = ''
}

function removeItem(item: AttachmentItem) {
  if (item.kind === 'existing') {
    existingFiles.value = existingFiles.value.filter((_, i) => i !== item.index)
  }
  else {
    pendingFiles.value = pendingFiles.value.filter((_, i) => i !== item.index)
  }
}

/** Object URLs creados para previsualizar/abrir archivos locales; se liberan al desmontar. */
const createdObjectUrls = new Set<string>()

function objectUrlFor(file: File): string {
  const url = URL.createObjectURL(file)
  createdObjectUrls.add(url)
  return url
}

/** Imagen abierta en el modal de previsualización (null = cerrado). */
const previewSrc = ref<string | null>(null)
const previewName = ref('')

const isPreviewOpen = computed({
  get: () => previewSrc.value != null,
  set: (value: boolean) => {
    if (!value) {
      previewSrc.value = null
    }
  },
})

function openItem(item: AttachmentItem) {
  const url = item.kind === 'existing'
    ? existingFiles.value[item.index]!
    : objectUrlFor(pendingFiles.value[item.index]!)

  if (item.isImage) {
    previewName.value = item.name
    previewSrc.value = url
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

onUnmounted(() => {
  createdObjectUrls.forEach(url => URL.revokeObjectURL(url))
})
</script>

<template>
  <div
    v-if="!disabled || items.length"
    class="space-y-2"
  >
    <p class="text-sm font-medium text-foreground">
      {{ t('tasks.form.attachments.label') }}
      <span
        v-if="!disabled"
        class="font-normal text-muted-foreground"
      >({{ t('tasks.form.attachments.optional') }})</span>
    </p>

    <div
      v-if="!disabled"
      class="relative rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer"
      :class="isDraggingOver
        ? 'border-primary bg-primary/5'
        : 'border-border hover:border-muted-foreground/40'"
      @click="openFilePicker"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInputEl"
        type="file"
        multiple
        class="hidden"
        @change="onFilesSelected"
      >
      <UIcon
        name="i-lucide-upload-cloud"
        class="mx-auto h-6 w-6 text-muted-foreground"
      />
      <p class="mt-2 text-sm text-foreground">
        {{ t('tasks.form.attachments.dropHintPrefix') }}
        <span class="font-medium text-primary">{{ t('tasks.form.attachments.browse') }}</span>
      </p>
      <p class="mt-1 text-xs text-muted-foreground">
        {{ t('tasks.form.attachments.hint') }}
      </p>
    </div>

    <ul
      v-if="items.length"
      class="space-y-1.5"
    >
      <li
        v-for="item in items"
        :key="item.key"
        class="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-sm"
      >
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-2 text-left"
          @click="openItem(item)"
        >
          <UIcon
            :name="item.icon"
            class="h-4 w-4 shrink-0 text-muted-foreground"
          />
          <span
            class="min-w-0 flex-1 truncate text-foreground"
            :title="item.name"
          >{{ item.name }}</span>
          <span
            v-if="item.sizeLabel"
            class="shrink-0 text-xs text-muted-foreground"
          >{{ item.sizeLabel }}</span>
        </button>
        <UButton
          v-if="!disabled"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          square
          :aria-label="t('tasks.form.attachments.remove')"
          @click="removeItem(item)"
        />
      </li>
    </ul>

    <UModal
      v-model:open="isPreviewOpen"
      :title="previewName"
      :ui="{ content: 'sm:max-w-3xl', body: 'p-0' }"
    >
      <template #body>
        <img
          v-if="previewSrc"
          :src="previewSrc"
          class="max-h-[80vh] w-full object-contain"
        >
      </template>
    </UModal>
  </div>
</template>
