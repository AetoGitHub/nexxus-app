<script setup lang="ts">
import {
  fileNameFromUrl,
  fileTypeIcon,
  isImageFileUrl,
} from '~/features/tasks/utils/form/task-message.util'

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

const chipClass = computed(() =>
  props.tone === 'own'
    ? 'bg-white/10 text-white hover:bg-white/15'
    : 'bg-background text-foreground hover:bg-muted',
)
</script>

<template>
  <div class="mt-1.5 flex flex-wrap gap-1.5">
    <template
      v-for="fileUrl in files"
      :key="fileUrl"
    >
      <button
        v-if="isImageFileUrl(fileUrl)"
        type="button"
        class="relative block h-32 w-32 max-w-full overflow-hidden rounded-lg bg-muted/40"
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

      <a
        v-else
        :href="fileUrl"
        target="_blank"
        rel="noopener noreferrer"
        :title="fileNameFromUrl(fileUrl)"
        class="flex max-w-56 min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors"
        :class="chipClass"
      >
        <UIcon
          :name="fileTypeIcon(fileUrl)"
          class="h-4 w-4 shrink-0"
        />
        <span class="min-w-0 truncate">{{ fileNameFromUrl(fileUrl) }}</span>
      </a>
    </template>
  </div>

  <UModal
    v-model:open="isPreviewOpen"
    :title="previewUrl ? fileNameFromUrl(previewUrl) : ''"
    :ui="{ content: 'sm:max-w-3xl', body: 'p-0' }"
  >
    <template #body>
      <img
        v-if="previewUrl"
        :src="previewUrl"
        class="max-h-[80vh] w-full object-contain"
      >
    </template>
  </UModal>
</template>
