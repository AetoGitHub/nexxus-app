<script setup lang="ts">
import {
  USER_COLOR_PRESETS,
  USER_IMAGE_MAX_BYTES,
  normalizeUserColor,
  validateUserImageFile,
} from '~/features/users/utils/user-appearance.util'

/**
 * Foto y color de fondo del círculo de un usuario, con vista previa. La foto se elige aquí pero se sube hasta guardar el
 * formulario (`file`); `image` es la URL que el usuario ya tiene. Prioridad igual que en toda la app: foto, color, iniciales.
 */
const props = defineProps<{
  /** Iniciales para la vista previa cuando no hay foto. */
  initials: string
}>()

/** `#rrggbb` o `''` (sin color). */
const color = defineModel<string>('color', { required: true })
/** URL de la foto actual o `''` (sin foto). */
const image = defineModel<string>('image', { required: true })
/** Foto nueva elegida y todavía sin subir. */
const file = defineModel<File | null>('file', { required: true })

const { t } = useI18n()

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const fileError = ref('')

// Vista previa de la foto nueva: URL local que se libera al cambiarla o al cerrar el formulario.
const previewUrl = ref('')
watch(file, (next) => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = next ? URL.createObjectURL(next) : ''
}, { immediate: true })
onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})

const previewAppearance = computed(() => ({
  color: color.value || null,
  image: previewUrl.value || image.value || null,
}))

const hasPhoto = computed(() => !!file.value || !!image.value)

/** El selector nativo solo entiende `#rrggbb`; sin color elegido muestra el primer sugerido. */
const pickerValue = computed(() => color.value || USER_COLOR_PRESETS[0])

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files?.[0]
  input.value = ''
  if (!selected) {
    return
  }

  const error = validateUserImageFile(selected)
  if (error) {
    fileError.value = error === 'type'
      ? t('configuration.user.appearance.invalidType')
      : t('configuration.user.appearance.tooLarge', { max: Math.round(USER_IMAGE_MAX_BYTES / 1024 / 1024) })
    return
  }

  fileError.value = ''
  file.value = selected
}

function removePhoto() {
  fileError.value = ''
  file.value = null
  image.value = ''
}

function onPickColor(event: Event) {
  color.value = normalizeUserColor((event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="flex items-start gap-4">
    <UserAvatar
      class="mt-0.5"
      :initials="props.initials"
      :size="64"
      :font-size="22"
      :appearance="previewAppearance"
      fallback-color="#64748b"
      :aria-label="t('configuration.user.appearance.previewLabel')"
    />

    <div class="min-w-0 flex-1 space-y-4">
      <div class="space-y-1.5">
        <p class="text-sm font-medium text-foreground">
          {{ t('configuration.user.appearance.photo') }}
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onFileChange"
          >
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-image-up"
            :label="hasPhoto ? t('configuration.user.appearance.change') : t('configuration.user.appearance.upload')"
            @click="fileInput?.click()"
          />
          <UButton
            v-if="hasPhoto"
            type="button"
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-trash-2"
            :label="t('configuration.user.appearance.remove')"
            @click="removePhoto"
          />
        </div>
        <p
          v-if="fileError"
          class="text-xs text-error"
          role="alert"
        >
          {{ fileError }}
        </p>
        <p
          v-else
          class="text-xs text-muted-foreground"
        >
          {{ t('configuration.user.appearance.photoHint', { max: Math.round(USER_IMAGE_MAX_BYTES / 1024 / 1024) }) }}
        </p>
      </div>

      <div class="space-y-1.5">
        <p class="text-sm font-medium text-foreground">
          {{ t('configuration.user.appearance.color') }}
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="preset in USER_COLOR_PRESETS"
            :key="preset"
            type="button"
            class="size-6 rounded-full ring-offset-2 ring-offset-card transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aeto-teal"
            :class="color === preset ? 'ring-2 ring-foreground' : 'hover:ring-2 hover:ring-border'"
            :style="{ backgroundColor: preset }"
            :aria-label="preset"
            :aria-pressed="color === preset"
            @click="color = preset"
          />
          <label
            class="relative inline-flex size-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-border text-muted-foreground transition hover:border-foreground"
            :title="t('configuration.user.appearance.customColor')"
          >
            <UIcon
              name="i-lucide-pipette"
              class="size-3.5"
            />
            <input
              type="color"
              class="absolute inset-0 size-full cursor-pointer opacity-0"
              :value="pickerValue"
              :aria-label="t('configuration.user.appearance.customColor')"
              @input="onPickColor"
            >
          </label>
          <UButton
            v-if="color"
            type="button"
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            :label="t('configuration.user.appearance.noColor')"
            @click="color = ''"
          />
        </div>
        <p class="text-xs text-muted-foreground">
          {{ t('configuration.user.appearance.colorHint') }}
        </p>
      </div>
    </div>
  </div>
</template>
