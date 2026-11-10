<script setup lang="ts">
/** Editor en línea de un registro del historial (comentario de fase/archivado o texto de un mensaje). */
const text = defineModel<string>({ required: true })

defineProps<{
  placeholder: string
  loading: boolean
  canSave: boolean
}>()

const emit = defineEmits<{
  save: []
  cancel: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="space-y-2">
    <UTextarea
      v-model="text"
      :placeholder="placeholder"
      :rows="3"
      autoresize
      autofocus
      class="w-full"
      :disabled="loading"
      @keydown.esc.stop.prevent="emit('cancel')"
    />
    <div class="flex justify-end gap-2">
      <UButton
        :label="t('tasks.history.cancel')"
        color="neutral"
        variant="outline"
        size="xs"
        :disabled="loading"
        @click="emit('cancel')"
      />
      <UButton
        :label="t('tasks.history.save')"
        color="primary"
        size="xs"
        icon="i-lucide-check"
        :loading="loading"
        :disabled="loading || !canSave"
        @click="emit('save')"
      />
    </div>
  </div>
</template>
