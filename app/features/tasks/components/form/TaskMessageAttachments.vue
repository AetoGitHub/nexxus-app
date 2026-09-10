<script setup lang="ts">
import {
  fileNameFromUrl,
  fileTypeIcon,
  isAudioFileUrl,
  isImageFileUrl,
} from '~/features/tasks/utils/form/task-message.util'
import { downloadFileFromUrl } from '~/shared/utils/file-download.util'

const props = withDefaults(
  defineProps<{
    files: string[]
    /** Ajusta el estilo del chip de archivo al fondo de la burbuja (propia vs. entrante). */
    tone?: 'own' | 'incoming'
  }>(),
  {
    tone: 'incoming',
  },
)

const { t } = useI18n()

const audioFiles = computed(() => props.files.filter(isAudioFileUrl))
const otherFiles = computed(() => props.files.filter(fileUrl => !isAudioFileUrl(fileUrl)))

/** Se guarda por URL (no por mensaje): una imagen ya cargada no vuelve a mostrar el loader. */
const loadedImages = reactive<Record<string, boolean>>({})
const erroredImages = reactive<Record<string, boolean>>({})

function onImageLoad(url: string) {
  loadedImages[url] = true
}

function onImageError(url: string) {
  erroredImages[url] = true
}

/** Imagen abierta en el modal de previsualización (null = cerrado). */
const previewUrl = ref<string | null>(null)
const isPreviewOpen = computed({
  get: () => previewUrl.value != null,
  set: (value: boolean) => {
    if (!value) {
      previewUrl.value = null
    }
  },
})

function openPreview(url: string) {
  previewUrl.value = url
}

function download(url: string) {
  void downloadFileFromUrl(url, fileNameFromUrl(url))
}

const chipClass = computed(() =>
  props.tone === 'own'
    ? 'bg-white/10 text-white'
    : 'bg-background text-foreground',
)

const iconButtonHoverClass = computed(() =>
  props.tone === 'own' ? 'hover:bg-white/20' : 'hover:bg-muted',
)
</script>

<template>
  <div class="mt-1.5 flex flex-col gap-1.5">
    <div
      v-for="fileUrl in audioFiles"
      :key="fileUrl"
      class="flex items-center gap-1 rounded-lg py-1 pl-2 pr-1"
      :class="chipClass"
    >
      <audio
        :src="fileUrl"
        controls
        preload="metadata"
        class="h-9 max-w-full min-w-0 flex-1"
      />
      <button
        type="button"
        class="shrink-0 rounded-md p-1.5 transition-colors"
        :class="iconButtonHoverClass"
        :aria-label="t('tasks.messenger.attachments.download')"
        @click="download(fileUrl)"
      >
        <UIcon
          name="i-lucide-download"
          class="h-4 w-4"
        />
      </button>
    </div>

    <div
      v-if="otherFiles.length"
      class="flex flex-wrap gap-1.5"
    >
      <template
        v-for="fileUrl in otherFiles"
        :key="fileUrl"
      >
        <div
          v-if="isImageFileUrl(fileUrl)"
          class="relative h-32 w-32 max-w-full overflow-hidden rounded-lg bg-muted/40"
        >
          <button
            type="button"
            class="absolute inset-0"
            :aria-label="fileNameFromUrl(fileUrl)"
            @click="openPreview(fileUrl)"
          >
            <span
              v-if="!loadedImages[fileUrl] && !erroredImages[fileUrl]"
              class="absolute inset-0 flex items-center justify-center"
            >
              <UIcon
                name="i-lucide-loader-circle"
                class="h-5 w-5 animate-spin text-muted-foreground"
              />
            </span>
            <span
              v-if="erroredImages[fileUrl]"
              class="absolute inset-0 flex items-center justify-center"
            >
              <UIcon
                name="i-lucide-image-off"
                class="h-5 w-5 text-muted-foreground"
              />
            </span>
            <img
              :src="fileUrl"
              class="h-full w-full rounded-lg object-cover transition-opacity duration-200"
              :class="loadedImages[fileUrl] ? 'opacity-100' : 'opacity-0'"
              @load="onImageLoad(fileUrl)"
              @error="onImageError(fileUrl)"
            >
          </button>
          <button
            type="button"
            class="absolute right-1 top-1 rounded-md bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
            :aria-label="t('tasks.messenger.attachments.download')"
            @click.stop="download(fileUrl)"
          >
            <UIcon
              name="i-lucide-download"
              class="h-3.5 w-3.5"
            />
          </button>
        </div>

        <div
          v-else
          class="flex max-w-64 min-w-0 items-center gap-0.5 rounded-lg text-xs"
          :class="chipClass"
        >
          <a
            :href="fileUrl"
            target="_blank"
            rel="noopener noreferrer"
            :title="fileNameFromUrl(fileUrl)"
            class="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pl-2"
          >
            <UIcon
              :name="fileTypeIcon(fileUrl)"
              class="h-4 w-4 shrink-0"
            />
            <span class="min-w-0 truncate">{{ fileNameFromUrl(fileUrl) }}</span>
          </a>
          <button
            type="button"
            class="mr-1 shrink-0 rounded-md p-1.5 transition-colors"
            :class="iconButtonHoverClass"
            :aria-label="t('tasks.messenger.attachments.download')"
            @click="download(fileUrl)"
          >
            <UIcon
              name="i-lucide-download"
              class="h-3.5 w-3.5"
            />
          </button>
        </div>
      </template>
    </div>
  </div>

  <UModal
    v-model:open="isPreviewOpen"
    :title="previewUrl ? fileNameFromUrl(previewUrl) : ''"
    :ui="{ content: 'sm:max-w-3xl', body: 'p-0', footer: 'justify-end' }"
  >
    <template #body>
      <img
        v-if="previewUrl"
        :src="previewUrl"
        class="max-h-[80vh] w-full object-contain"
      >
    </template>
    <template #footer>
      <UButton
        icon="i-lucide-download"
        color="neutral"
        variant="outline"
        :label="t('tasks.messenger.attachments.download')"
        @click="previewUrl && download(previewUrl)"
      />
    </template>
  </UModal>
</template>
