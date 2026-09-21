<script setup lang="ts">
import type { SelectItem } from '@nuxt/ui'
import { createEmptySubtaskRow, type SubtaskFormRow } from '~/features/tasks/utils/form/task-form.util'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    userItems: SelectItem[]
    usersLoading?: boolean
  }>(),
  {
    disabled: false,
    usersLoading: false,
  },
)

const MAX_IMAGE_SIZE = 25 * 1024 * 1024

const rows = defineModel<SubtaskFormRow[]>('rows', { default: () => [] })

const { t } = useI18n()
const toast = useToast()

const fileInputEls = new Map<string, HTMLInputElement>()

function setFileInputEl(key: string, el: Element | null) {
  if (el) {
    fileInputEls.set(key, el as HTMLInputElement)
  }
  else {
    fileInputEls.delete(key)
  }
}

function addRow() {
  rows.value = [...rows.value, createEmptySubtaskRow()]
}

function removeRow(key: string) {
  rows.value = rows.value.filter(row => row.key !== key)
}

function openImagePicker(key: string) {
  if (props.disabled) {
    return
  }
  fileInputEls.get(key)?.click()
}

function addImagesToRow(key: string, files: File[]) {
  const accepted: File[] = []
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      continue
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.add({
        title: t('tasks.form.subtasks.tooLargeTitle'),
        description: t('tasks.form.subtasks.tooLargeDescription', { name: file.name }),
        color: 'error',
      })
      continue
    }
    accepted.push(file)
  }
  if (!accepted.length) {
    return
  }
  const row = rows.value.find(item => item.key === key)
  if (row) {
    row.pendingImages = [...row.pendingImages, ...accepted]
  }
}

function onImagesSelected(key: string, event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (files.length) {
    addImagesToRow(key, files)
  }
  input.value = ''
}

function removeExistingImage(row: SubtaskFormRow, index: number) {
  row.images = row.images.filter((_, i) => i !== index)
}

function removePendingImage(row: SubtaskFormRow, index: number) {
  row.pendingImages = row.pendingImages.filter((_, i) => i !== index)
}

const objectUrlCache = new Map<File, string>()

function objectUrlFor(file: File): string {
  let url = objectUrlCache.get(file)
  if (!url) {
    url = URL.createObjectURL(file)
    objectUrlCache.set(file, url)
  }
  return url
}

onUnmounted(() => {
  objectUrlCache.forEach(url => URL.revokeObjectURL(url))
})
</script>

<template>
  <div
    v-if="!disabled || rows.length"
    class="space-y-2"
  >
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium text-foreground">
        {{ t('tasks.form.subtasks.label') }}
        <span
          v-if="!disabled"
          class="font-normal text-muted-foreground"
        >({{ t('tasks.form.subtasks.optional') }})</span>
      </p>
      <UButton
        v-if="!disabled"
        icon="i-lucide-plus"
        color="neutral"
        variant="outline"
        size="xs"
        :label="t('tasks.form.subtasks.add')"
        @click="addRow"
      />
    </div>

    <div
      v-if="rows.length"
      class="space-y-3"
    >
      <div
        v-for="row in rows"
        :key="row.key"
        class="rounded-lg border border-border bg-muted/40 p-3 space-y-2.5"
      >
        <div class="flex items-start gap-2">
          <UInput
            v-model="row.shortDescription"
            :placeholder="t('tasks.form.subtasks.namePlaceholder')"
            :disabled="disabled"
            class="w-full"
          />
          <UButton
            v-if="!disabled"
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            :aria-label="t('tasks.form.subtasks.remove')"
            @click="removeRow(row.key)"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <USelectMenu
            v-model="row.assignedTo"
            value-key="value"
            :items="userItems"
            :placeholder="t('tasks.form.subtasks.assignPlaceholder')"
            :loading="usersLoading"
            :disabled="disabled"
            icon="i-lucide-user-search"
            class="w-full"
          />

          <div class="flex flex-wrap items-center gap-1.5">
            <button
              v-if="!disabled"
              type="button"
              class="flex items-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground hover:border-muted-foreground/40"
              @click="openImagePicker(row.key)"
            >
              <UIcon
                name="i-lucide-image-plus"
                class="h-3.5 w-3.5"
              />
              {{ t('tasks.form.subtasks.addImage') }}
            </button>
            <input
              :ref="(el) => setFileInputEl(row.key, el as Element | null)"
              type="file"
              accept="image/*"
              multiple
              class="hidden"
              @change="onImagesSelected(row.key, $event)"
            >

            <div
              v-for="(url, index) in row.images"
              :key="`existing-${index}`"
              class="relative"
            >
              <img
                :src="url"
                class="h-8 w-8 rounded object-cover border border-border"
              >
              <button
                v-if="!disabled"
                type="button"
                class="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-error text-white"
                :aria-label="t('tasks.form.subtasks.removeImage')"
                @click="removeExistingImage(row, index)"
              >
                <UIcon
                  name="i-lucide-x"
                  class="h-2.5 w-2.5"
                />
              </button>
            </div>

            <div
              v-for="(file, index) in row.pendingImages"
              :key="`pending-${index}-${file.name}`"
              class="relative"
            >
              <img
                :src="objectUrlFor(file)"
                class="h-8 w-8 rounded object-cover border border-border"
              >
              <button
                v-if="!disabled"
                type="button"
                class="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-error text-white"
                :aria-label="t('tasks.form.subtasks.removeImage')"
                @click="removePendingImage(row, index)"
              >
                <UIcon
                  name="i-lucide-x"
                  class="h-2.5 w-2.5"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
